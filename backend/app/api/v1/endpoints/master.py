from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.master import Doctor, Customer, Supplier
from app.schemas.master import (
    DoctorCreate, DoctorResponse,
    CustomerCreate, CustomerResponse,
    SupplierCreate, SupplierResponse
)
from app.api.deps import get_current_user

router = APIRouter()

# --- Doctors ---
@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Doctor).filter(Doctor.tenant_id == current_user.tenant_id).all()

@router.post("/doctors", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(doc_in: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doctor = Doctor(tenant_id=current_user.tenant_id, **doc_in.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor

# --- Customers ---
@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    q: Optional[str] = Query(None, description="Search customer by name or phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer).filter(Customer.tenant_id == current_user.tenant_id)
    if q:
        query = query.filter((Customer.name.ilike(f"%{q}%")) | (Customer.phone.ilike(f"%{q}%")))
    return query.all()

@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(cust_in: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = Customer(tenant_id=current_user.tenant_id, **cust_in.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

# --- Suppliers ---
@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Supplier).filter(Supplier.tenant_id == current_user.tenant_id).all()

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(sup_in: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    supplier = Supplier(tenant_id=current_user.tenant_id, **sup_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier
