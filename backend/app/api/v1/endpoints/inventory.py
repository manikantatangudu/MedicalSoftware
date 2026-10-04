from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.master import Medicine
from app.models.inventory import Batch, StockAdjustment
from app.models.audit import AuditLog
from app.schemas.inventory import BatchCreate, BatchResponse, StockAdjustmentCreate, StockAdjustmentResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/batches", response_model=List[BatchResponse])
def list_batches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List batches in inventory."""
    batches = db.query(Batch).filter(
        Batch.tenant_id == current_user.tenant_id
    ).order_by(Batch.expiry_date.asc()).offset(skip).limit(limit).all()
    return batches

@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Adds a new batch into inventory (e.g., Opening Stock or manual entry).
    """
    # Verify medicine belongs to tenant
    medicine = db.query(Medicine).filter(
        Medicine.id == batch_in.medicine_id,
        Medicine.tenant_id == current_user.tenant_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found in catalog")

    branch_id = batch_in.branch_id or current_user.branch_id
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch ID required")

    batch = Batch(
        tenant_id=current_user.tenant_id,
        branch_id=branch_id,
        medicine_id=batch_in.medicine_id,
        batch_number=batch_in.batch_number,
        mfg_date=batch_in.mfg_date,
        expiry_date=batch_in.expiry_date,
        quantity_received=batch_in.quantity_received,
        quantity_remaining=batch_in.quantity_remaining
    )
    db.add(batch)
    db.flush()

    # Log audit entry
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="BATCH_ADDED",
        entity="Batch",
        entity_id=batch.id,
        metadata_json=f'{{"batch_number": "{batch.batch_number}", "qty": {batch.quantity_remaining}}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/low-stock")
def get_low_stock_medicines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all medicines where current total stock is at or below their reorder threshold.
    """
    medicines = db.query(Medicine).filter(
        Medicine.tenant_id == current_user.tenant_id,
        Medicine.is_active == True
    ).all()

    low_stock = []
    for med in medicines:
        total_stock = db.query(func.coalesce(func.sum(Batch.quantity_remaining), 0)).filter(
            Batch.medicine_id == med.id,
            Batch.tenant_id == current_user.tenant_id
        ).scalar()

        if total_stock <= med.reorder_level:
            low_stock.append({
                "medicine_id": med.id,
                "generic_name": med.generic_name,
                "brand_name": med.brand_name,
                "reorder_level": med.reorder_level,
                "current_stock": int(total_stock),
                "unit": med.unit
            })

    return low_stock

@router.get("/near-expiry")
def get_near_expiry_batches(
    days: int = Query(90, description="Window in days to check for upcoming expiration"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns batches expiring within the specified window (default: 90 days),
    as well as batches that are already expired.
    """
    today = date.today()
    cutoff_date = today + timedelta(days=days)

    batches = db.query(Batch, Medicine).join(Medicine, Batch.medicine_id == Medicine.id).filter(
        Batch.tenant_id == current_user.tenant_id,
        Batch.quantity_remaining > 0,
        Batch.expiry_date <= cutoff_date
    ).order_by(Batch.expiry_date.asc()).all()

    results = []
    for b, med in batches:
        days_left = (b.expiry_date - today).days
        results.append({
            "batch_id": b.id,
            "medicine_id": med.id,
            "brand_name": med.brand_name,
            "generic_name": med.generic_name,
            "batch_number": b.batch_number,
            "expiry_date": str(b.expiry_date),
            "quantity_remaining": b.quantity_remaining,
            "days_left": days_left,
            "is_expired": days_left <= 0
        })

    return results

@router.post("/adjustments", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(
    adj_in: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Logs a stock adjustment (damage, shrinkage, physical audit difference).
    Atomically updates the target batch's remaining quantity.
    """
    branch_id = adj_in.branch_id or current_user.branch_id
    if not branch_id:
        raise HTTPException(status_code=400, detail="Branch ID required")

    batch = None
    if adj_in.batch_id:
        batch = db.query(Batch).filter(
            Batch.id == adj_in.batch_id,
            Batch.tenant_id == current_user.tenant_id
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Update batch quantity safely
        new_qty = batch.quantity_remaining + adj_in.quantity_change
        if new_qty < 0:
            raise HTTPException(status_code=400, detail="Adjustment would result in negative batch quantity")
        batch.quantity_remaining = new_qty

    adjustment = StockAdjustment(
        tenant_id=current_user.tenant_id,
        branch_id=branch_id,
        medicine_id=adj_in.medicine_id,
        batch_id=adj_in.batch_id,
        quantity_change=adj_in.quantity_change,
        reason=adj_in.reason,
        notes=adj_in.notes,
        adjusted_by=current_user.id
    )
    db.add(adjustment)
    db.flush()

    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="STOCK_ADJUSTMENT",
        entity="StockAdjustment",
        entity_id=adjustment.id,
        metadata_json=f'{{"change": {adj_in.quantity_change}, "reason": "{adj_in.reason.value}"}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(adjustment)
    return adjustment
