from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.master import DrugSchedule

class MedicineBase(BaseModel):
    generic_name: str
    brand_name: str
    manufacturer_id: Optional[str] = None
    drug_type: Optional[str] = "Tablet"
    composition: Optional[str] = None
    strength: Optional[str] = None
    pack_size: Optional[str] = "Strip of 10"
    category: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: float = 12.0
    mrp: float
    purchase_price: float = 0.0
    selling_price: float
    schedule_type: DrugSchedule = DrugSchedule.OTC
    reorder_level: int = 10
    unit: str = "Strip"
    barcode: Optional[str] = None

class MedicineCreate(MedicineBase):
    pass

class MedicineResponse(MedicineBase):
    id: str
    tenant_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Doctor schemas
class DoctorBase(BaseModel):
    name: str
    registration_no: str
    specialization: Optional[str] = None
    contact: Optional[str] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorResponse(DoctorBase):
    id: str
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Customer schemas
class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    allergies: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: str
    tenant_id: str
    credit_balance: float
    created_at: datetime

    class Config:
        from_attributes = True

# Supplier schemas
class SupplierBase(BaseModel):
    name: str
    contact: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: str
    tenant_id: str
    outstanding_balance: float
    created_at: datetime

    class Config:
        from_attributes = True
