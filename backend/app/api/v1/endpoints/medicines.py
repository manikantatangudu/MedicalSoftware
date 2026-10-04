from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.models.user import User
from app.models.master import Medicine, DrugSchedule
from app.models.inventory import Batch
from app.schemas.master import MedicineCreate, MedicineResponse
from app.schemas.inventory import BatchResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[MedicineResponse])
def list_medicines(
    q: Optional[str] = Query(None, description="Search by generic name, brand name, composition, or barcode"),
    schedule: Optional[DrugSchedule] = Query(None, description="Filter by drug schedule (OTC, SCHEDULE_H, etc.)"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search and list medicines for the current tenant store.
    """
    query = db.query(Medicine).filter(
        Medicine.tenant_id == current_user.tenant_id,
        Medicine.is_active == True
    )

    if q:
        search_pattern = f"%{q}%"
        query = query.filter(
            or_(
                Medicine.generic_name.ilike(search_pattern),
                Medicine.brand_name.ilike(search_pattern),
                Medicine.composition.ilike(search_pattern),
                Medicine.barcode.ilike(search_pattern)
            )
        )

    if schedule:
        query = query.filter(Medicine.schedule_type == schedule)

    medicines = query.offset(skip).limit(limit).all()
    return medicines

@router.post("/", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    medicine_in: MedicineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a new medicine to the tenant's catalog.
    """
    medicine = Medicine(
        tenant_id=current_user.tenant_id,
        **medicine_in.model_dump()
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return medicine

@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(
    medicine_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a specific medicine."""
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.tenant_id == current_user.tenant_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine

@router.get("/{medicine_id}/batches", response_model=List[BatchResponse])
def get_medicine_batches(
    medicine_id: str,
    include_expired: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches all available batches for a medicine sorted by FEFO (First-Expiry-First-Out).
    Batches with 0 stock are filtered out.
    """
    query = db.query(Batch).filter(
        Batch.medicine_id == medicine_id,
        Batch.tenant_id == current_user.tenant_id,
        Batch.quantity_remaining > 0
    )

    if not include_expired:
        query = query.filter(Batch.expiry_date >= date.today())

    # FEFO sort: Soonest expiry date first!
    batches = query.order_by(Batch.expiry_date.asc()).all()
    return batches
