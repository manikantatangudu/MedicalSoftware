from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.master import DrugSchedule

# =============================================================================
# MEDICINE (PRODUCT MASTER) SCHEMAS
# =============================================================================
class MedicineBase(BaseModel):
    code: Optional[str] = None                     # Short code e.g. "ADS"
    brand_name: str                               # Product Name e.g. "DAPAONE S 10/100 TAB"
    generic_name: str                             # Molecule / Salt e.g. "DAPAGLIFLOZIN"
    manufacturer_id: Optional[str] = None
    company_name: Optional[str] = None            # e.g. "GLENMARK PHARMACEUTICALS LTD."
    product_type: Optional[str] = "TABLETS"       # TABLETS, CAPSULES, SYRUP, INJECTION, OINTMENT, DROPS
    drug_type: Optional[str] = "T"
    composition: Optional[str] = None
    strength: Optional[str] = None
    packing: Optional[str] = '10" S'              # e.g. 10" S, 100ml
    conversion: int = 10                          # Loose tablet factor
    rack_no: Optional[str] = None                 # Shelf location e.g. "R1-S2"
    hsn_code: Optional[str] = "30049099"          # Indian Pharma GST HSN
    gst_rate: float = 12.0                        # Sales Tax % (0, 5, 12, 18)
    purchase_tax_rate: float = 12.0               # Purchase Tax %
    show_gst_in_purchase: bool = True
    mrp: float
    purchase_price: float = 0.0
    selling_price: float
    schedule_type: DrugSchedule = DrugSchedule.SCHEDULE_H
    schedule_code: Optional[str] = "H"            # H, H1, X, OTC
    max_discount_limit: float = 0.0
    sales_discount: float = 0.0
    add_points_percent: float = 0.0
    allow_negative_stock: bool = False
    is_narcotic: bool = False
    reorder_level: int = 10
    reorder_qty: int = 50
    unit: str = "Strip"
    pack_size: Optional[str] = '10" S'
    category: Optional[str] = "Allopathy"
    barcode: Optional[str] = None
    launched_on: Optional[str] = None
    comments: Optional[str] = None

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    code: Optional[str] = None
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer_id: Optional[str] = None
    company_name: Optional[str] = None
    product_type: Optional[str] = None
    drug_type: Optional[str] = None
    composition: Optional[str] = None
    strength: Optional[str] = None
    packing: Optional[str] = None
    conversion: Optional[int] = None
    rack_no: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    purchase_tax_rate: Optional[float] = None
    show_gst_in_purchase: Optional[bool] = None
    mrp: Optional[float] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    schedule_type: Optional[DrugSchedule] = None
    schedule_code: Optional[str] = None
    max_discount_limit: Optional[float] = None
    sales_discount: Optional[float] = None
    add_points_percent: Optional[float] = None
    allow_negative_stock: Optional[bool] = None
    is_narcotic: Optional[bool] = None
    reorder_level: Optional[int] = None
    reorder_qty: Optional[int] = None
    unit: Optional[str] = None
    pack_size: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    launched_on: Optional[str] = None
    comments: Optional[str] = None

class MedicineResponse(MedicineBase):
    id: str
    tenant_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# =============================================================================
# DOCTOR MASTER SCHEMAS
# =============================================================================
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

# =============================================================================
# CUSTOMER MASTER SCHEMAS
# =============================================================================
class CustomerBase(BaseModel):
    code: Optional[str] = None                    # IP / Customer Code e.g. "9441874161"
    name: str
    phone: Optional[str] = None                   # Mobile 1
    mobile_2: Optional[str] = None                # Mobile 2
    email: Optional[str] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = "PARVATHIPURAM"
    pincode: Optional[str] = "535501"
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    category: Optional[str] = "PATIENT"           # PATIENT, COUNTER, WHOLESALE, STAFF
    gstin: Optional[str] = None
    credit_balance: float = 0.0
    discount_percent: float = 0.0                 # Default discount % e.g. 15.0%
    discount_ceiling: float = 0.0
    billing_on: Optional[str] = "CREDIT"
    allergies: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    mobile_2: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    category: Optional[str] = None
    gstin: Optional[str] = None
    credit_balance: Optional[float] = None
    discount_percent: Optional[float] = None
    discount_ceiling: Optional[float] = None
    billing_on: Optional[str] = None
    allergies: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# =============================================================================
# SUPPLIER / DISTRIBUTOR SCHEMAS
# =============================================================================
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

# =============================================================================
# MANUFACTURER / COMPANY MASTER SCHEMAS
# =============================================================================
class ManufacturerBase(BaseModel):
    code: Optional[str] = None                    # e.g. "GLE", "CIP", "SUN"
    name: str
    license_no: Optional[str] = None
    contact: Optional[str] = None

class ManufacturerCreate(ManufacturerBase):
    pass

class ManufacturerResponse(ManufacturerBase):
    id: str
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True
