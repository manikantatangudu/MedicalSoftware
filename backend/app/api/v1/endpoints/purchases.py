from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.models.user import User
from app.models.master import Supplier, Medicine
from app.models.inventory import Batch
from app.models.purchases import PurchaseOrder, GoodsReceiptNote, GRNItem, POStatus
from app.models.audit import AuditLog
from app.schemas.purchases import (
    PurchaseOrderCreate, PurchaseOrderResponse,
    GRNCreateRequest, GRNResponse, SupplierPaymentCreate
)
from app.api.deps import get_current_user

router = APIRouter()

def generate_doc_number(prefix: str) -> str:
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:4].upper()
    return f"{prefix}-{date_str}-{random_suffix}"

# --- Purchase Orders ---
@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all purchase orders for the store."""
    return db.query(PurchaseOrder).filter(
        PurchaseOrder.tenant_id == current_user.tenant_id
    ).order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new Purchase Order (PO) to send to a pharmaceutical distributor.
    """
    supplier = db.query(Supplier).filter(
        Supplier.id == po_in.supplier_id,
        Supplier.tenant_id == current_user.tenant_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    branch_id = po_in.branch_id or current_user.branch_id
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch ID required")

    total_est = sum(item.quantity * item.expected_cost_price for item in po_in.items)

    po = PurchaseOrder(
        tenant_id=current_user.tenant_id,
        branch_id=branch_id,
        supplier_id=supplier.id,
        po_number=generate_doc_number("PO"),
        status=POStatus.ORDERED,
        total_amount=round(total_est, 2),
        created_by=current_user.id
    )
    db.add(po)
    db.flush()

    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="PO_CREATED",
        entity="PurchaseOrder",
        entity_id=po.id,
        metadata_json=f'{{"po_number": "{po.po_number}", "supplier": "{supplier.name}", "total": {po.total_amount}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(po)
    return po

# --- Goods Receipt Notes (GRN - Stock Intake) ---
@router.get("/grn", response_model=List[GRNResponse])
def list_grns(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all Goods Receipt Notes (GRNs)."""
    return db.query(GoodsReceiptNote).filter(
        GoodsReceiptNote.tenant_id == current_user.tenant_id
    ).order_by(GoodsReceiptNote.received_at.desc()).offset(skip).limit(limit).all()

@router.post("/grn", response_model=GRNResponse, status_code=status.HTTP_201_CREATED)
def receive_grn(
    grn_in: GRNCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RECEIVES GOODS RECEIPT NOTE (STOCK INTAKE):
    1. Validates supplier.
    2. For each delivered item:
       - Adds exact Batch into inventory (batch_number, expiry, quantity).
       - Calculates line cost and tax.
    3. Increases Supplier outstanding ledger balance by invoice total.
    4. Marks linked Purchase Order as RECEIVED.
    5. Creates immutable audit log.
    All inside one atomic database transaction!
    """
    supplier = db.query(Supplier).filter(
        Supplier.id == grn_in.supplier_id,
        Supplier.tenant_id == current_user.tenant_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    branch_id = grn_in.branch_id or current_user.branch_id
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch ID required")

    total_grn_amount = 0.0

    try:
        grn = GoodsReceiptNote(
            tenant_id=current_user.tenant_id,
            purchase_order_id=grn_in.purchase_order_id,
            supplier_id=supplier.id,
            grn_number=generate_doc_number("GRN"),
            supplier_invoice_no=grn_in.supplier_invoice_no,
            invoice_date=grn_in.invoice_date,
            total_amount=0.0,
            received_by=current_user.id
        )
        db.add(grn)
        db.flush()

        for it in grn_in.items:
            medicine = db.query(Medicine).filter(
                Medicine.id == it.medicine_id,
                Medicine.tenant_id == current_user.tenant_id
            ).first()
            if not medicine:
                raise HTTPException(status_code=404, detail=f"Medicine {it.medicine_id} not found")

            # Calculate cost + GST
            line_cost = it.purchase_price * it.quantity
            line_tax = line_cost * (it.tax_rate / 100.0)
            item_total = round(line_cost + line_tax, 2)
            total_grn_amount += item_total

            # Create GRN item line
            grn_item = GRNItem(
                grn_id=grn.id,
                medicine_id=medicine.id,
                batch_number=it.batch_number,
                mfg_date=it.mfg_date,
                expiry_date=it.expiry_date,
                quantity=it.quantity,
                purchase_price=it.purchase_price,
                tax_rate=it.tax_rate,
                line_total=item_total
            )
            db.add(grn_item)

            # AUTOMATIC INVENTORY STOCK CREATION:
            # Check if this exact batch already exists for this medicine in this branch
            existing_batch = db.query(Batch).filter(
                Batch.tenant_id == current_user.tenant_id,
                Batch.branch_id == branch_id,
                Batch.medicine_id == medicine.id,
                Batch.batch_number == it.batch_number
            ).first()

            if existing_batch:
                existing_batch.quantity_received += it.quantity
                existing_batch.quantity_remaining += it.quantity
            else:
                new_batch = Batch(
                    tenant_id=current_user.tenant_id,
                    branch_id=branch_id,
                    medicine_id=medicine.id,
                    batch_number=it.batch_number,
                    mfg_date=it.mfg_date,
                    expiry_date=it.expiry_date,
                    quantity_received=it.quantity,
                    quantity_remaining=it.quantity
                )
                db.add(new_batch)

        # Update GRN total amount
        grn.total_amount = round(total_grn_amount, 2)

        # Update Supplier Outstanding Balance
        supplier.outstanding_balance = round(supplier.outstanding_balance + grn.total_amount, 2)

        # Update linked PO if present
        if grn_in.purchase_order_id:
            po = db.query(PurchaseOrder).filter(
                PurchaseOrder.id == grn_in.purchase_order_id,
                PurchaseOrder.tenant_id == current_user.tenant_id
            ).first()
            if po:
                po.status = POStatus.RECEIVED

        # Audit Log
        audit = AuditLog(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            action="GRN_RECEIVED",
            entity="GoodsReceiptNote",
            entity_id=grn.id,
            metadata_json=f'{{"grn_number": "{grn.grn_number}", "supplier": "{supplier.name}", "total": {grn.total_amount}}}'
        )
        db.add(audit)

        db.commit()
        db.refresh(grn)
        return grn

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process GRN: {str(e)}")

# --- Supplier Payment ---
@router.post("/supplier-payments")
def record_supplier_payment(
    payment_in: SupplierPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Records a payment made to a distributor/supplier and reduces their outstanding balance.
    """
    supplier = db.query(Supplier).filter(
        Supplier.id == payment_in.supplier_id,
        Supplier.tenant_id == current_user.tenant_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    supplier.outstanding_balance = round(max(0.0, supplier.outstanding_balance - payment_in.amount), 2)

    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="SUPPLIER_PAYMENT",
        entity="Supplier",
        entity_id=supplier.id,
        metadata_json=f'{{"amount_paid": {payment_in.amount}, "remaining_balance": {supplier.outstanding_balance}}}'
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Payment recorded successfully",
        "supplier_id": supplier.id,
        "supplier_name": supplier.name,
        "amount_paid": payment_in.amount,
        "outstanding_balance": supplier.outstanding_balance
    }
