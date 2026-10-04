from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.billing import PaymentMode, BillStatus

class BillItemCreate(BaseModel):
    medicine_id: str
    batch_id: str
    quantity: int
    unit_price: float
    tax_rate: float = 12.0

class BillItemResponse(BaseModel):
    id: str
    medicine_id: str
    batch_id: str
    quantity: int
    unit_price: float
    tax_rate: float
    line_total: float

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    doctor_id: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None

class ScheduleEntryCreate(BaseModel):
    medicine_id: str
    doctor_id: Optional[str] = None
    patient_name: str
    patient_phone: Optional[str] = None
    patient_address: Optional[str] = None
    quantity: int

class BillCreateRequest(BaseModel):
    branch_id: Optional[str] = None
    customer_id: Optional[str] = None
    payment_mode: PaymentMode = PaymentMode.CASH
    discount: float = 0.0
    items: List[BillItemCreate]
    prescription: Optional[PrescriptionCreate] = None
    schedule_entries: Optional[List[ScheduleEntryCreate]] = None

class BillResponse(BaseModel):
    id: str
    tenant_id: str
    branch_id: str
    customer_id: Optional[str] = None
    bill_number: str
    payment_mode: PaymentMode
    subtotal: float
    discount: float
    tax: float
    total: float
    status: BillStatus
    created_at: datetime
    items: List[BillItemResponse] = []

    class Config:
        from_attributes = True
