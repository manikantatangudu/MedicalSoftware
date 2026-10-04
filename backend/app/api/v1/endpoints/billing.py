from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, date
import uuid
from app.core.database import get_db
from app.models.user import User
from app.models.master import Medicine, DrugSchedule, Doctor
from app.models.inventory import Batch
from app.models.billing import (
    Bill, BillItem, Prescription, ScheduleRegisterEntry, BillStatus, PaymentMode
)
from app.models.audit import AuditLog
from app.schemas.billing import BillCreateRequest, BillResponse
from app.api.deps import get_current_user

router = APIRouter()

def generate_bill_number() -> str:
    """Generates a human-readable invoice code: INV-YYYYMMDD-XXXX."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:5].upper()
    return f"INV-{date_str}-{random_suffix}"

@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_in: BillCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    CRITICAL POS TRANSACTION:
    1. Validates batch stock availability for all items.
    2. Enforces statutory Drug Schedule compliance:
       - Schedule H/H1/X requires prescription / doctor link.
       - Schedule H1/X mandates patient & doctor register entry.
    3. Atomically deducts batch stock and creates invoice in one single DB transaction.
    4. Logs immutable audit trail.
    """
    if not bill_in.items:
        raise HTTPException(status_code=400, detail="Cannot create bill with empty cart")

    branch_id = bill_in.branch_id or current_user.branch_id
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch ID required")

    subtotal = 0.0
    total_tax = 0.0
    processed_items = []
    requires_prescription = False
    requires_schedule_register = False
    schedule_medicines = []

    # Step 1: Pre-validation & Stock verification
    for item in bill_in.items:
        medicine = db.query(Medicine).filter(
            Medicine.id == item.medicine_id,
            Medicine.tenant_id == current_user.tenant_id
        ).first()
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine {item.medicine_id} not found")

        # Check schedule type
        if medicine.schedule_type in [DrugSchedule.SCHEDULE_H, DrugSchedule.SCHEDULE_H1, DrugSchedule.SCHEDULE_X]:
            requires_prescription = True
            if medicine.schedule_type in [DrugSchedule.SCHEDULE_H1, DrugSchedule.SCHEDULE_X]:
                requires_schedule_register = True
                schedule_medicines.append((medicine, item.quantity))

        # Check batch stock
        batch = db.query(Batch).filter(
            Batch.id == item.batch_id,
            Batch.tenant_id == current_user.tenant_id
        ).with_for_update().first() if db.bind.dialect.name != "sqlite" else db.query(Batch).filter(
            Batch.id == item.batch_id,
            Batch.tenant_id == current_user.tenant_id
        ).first()

        if not batch:
            raise HTTPException(status_code=404, detail=f"Batch {item.batch_id} not found")

        if batch.quantity_remaining < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {medicine.brand_name} (Batch: {batch.batch_number}). "
                       f"Requested: {item.quantity}, Available: {batch.quantity_remaining}"
            )

        if batch.expiry_date < date.today():
            raise HTTPException(
                status_code=400,
                detail=f"Batch {batch.batch_number} for {medicine.brand_name} expired on {batch.expiry_date}! Sale blocked."
            )

        line_subtotal = item.unit_price * item.quantity
        line_tax = (line_subtotal * (item.tax_rate / 100.0))
        line_total = line_subtotal + line_tax

        subtotal += line_subtotal
        total_tax += line_tax
        processed_items.append({
            "medicine": medicine,
            "batch": batch,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "tax_rate": item.tax_rate,
            "line_total": round(line_total, 2)
        })

    # Step 2: Validate statutory compliance
    if requires_prescription and not bill_in.prescription:
        raise HTTPException(
            status_code=400,
            detail="Bill contains Schedule H/H1/X drugs. A prescription record (doctor/image) is legally required."
        )

    if requires_schedule_register and not bill_in.schedule_entries:
        raise HTTPException(
            status_code=400,
            detail="Bill contains Schedule H1 or Schedule X drugs. Statutory patient details are legally mandated for the register."
        )

    # Step 3: Compute final totals
    discount_amount = bill_in.discount
    final_total = max(0.0, round((subtotal + total_tax) - discount_amount, 2))

    # Step 4: Atomic Execution
    try:
        bill = Bill(
            tenant_id=current_user.tenant_id,
            branch_id=branch_id,
            customer_id=bill_in.customer_id,
            bill_number=generate_bill_number(),
            created_by=current_user.id,
            payment_mode=bill_in.payment_mode,
            subtotal=round(subtotal, 2),
            discount=round(discount_amount, 2),
            tax=round(total_tax, 2),
            total=final_total,
            status=BillStatus.PAID if bill_in.payment_mode != PaymentMode.CREDIT else BillStatus.CREDIT
        )
        db.add(bill)
        db.flush()

        # Deduct stock and attach line items
        for p in processed_items:
            # Atomic stock deduction
            p["batch"].quantity_remaining -= p["quantity"]

            bill_item = BillItem(
                bill_id=bill.id,
                medicine_id=p["medicine"].id,
                batch_id=p["batch"].id,
                quantity=p["quantity"],
                unit_price=p["unit_price"],
                tax_rate=p["tax_rate"],
                line_total=p["line_total"]
            )
            db.add(bill_item)

        # Attach prescription record if provided
        if bill_in.prescription:
            presc = Prescription(
                tenant_id=current_user.tenant_id,
                bill_id=bill.id,
                customer_id=bill_in.customer_id,
                doctor_id=bill_in.prescription.doctor_id,
                image_url=bill_in.prescription.image_url,
                notes=bill_in.prescription.notes
            )
            db.add(presc)

        # Attach Schedule Register Entries if provided
        if bill_in.schedule_entries:
            for s_entry in bill_in.schedule_entries:
                reg_entry = ScheduleRegisterEntry(
                    tenant_id=current_user.tenant_id,
                    bill_id=bill.id,
                    medicine_id=s_entry.medicine_id,
                    doctor_id=s_entry.doctor_id,
                    patient_name=s_entry.patient_name,
                    patient_phone=s_entry.patient_phone,
                    patient_address=s_entry.patient_address,
                    quantity=s_entry.quantity,
                    dispensed_date=date.today()
                )
                db.add(reg_entry)

        # Audit trail
        audit = AuditLog(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            action="BILL_CREATED",
            entity="Bill",
            entity_id=bill.id,
            metadata_json=f'{{"bill_number": "{bill.bill_number}", "total": {bill.total}}}'
        )
        db.add(audit)

        db.commit()
        db.refresh(bill)
        return bill

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Billing transaction failed: {str(e)}")

@router.get("/", response_model=List[BillResponse])
def list_bills(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists recent bills for the store."""
    bills = db.query(Bill).filter(
        Bill.tenant_id == current_user.tenant_id
    ).order_by(Bill.created_at.desc()).offset(skip).limit(limit).all()
    return bills

@router.get("/{bill_id}", response_model=BillResponse)
def get_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve bill details by ID."""
    bill = db.query(Bill).filter(
        Bill.id == bill_id,
        Bill.tenant_id == current_user.tenant_id
    ).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill
