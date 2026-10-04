from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.models.purchases import POStatus

class POItemCreate(BaseModel):
    medicine_id: str
    quantity: int
    expected_cost_price: float

class PurchaseOrderCreate(BaseModel):
    branch_id: Optional[str] = None
    supplier_id: str
    items: List[POItemCreate]

class PurchaseOrderResponse(BaseModel):
    id: str
    tenant_id: str
    branch_id: str
    supplier_id: str
    po_number: str
    status: POStatus
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

class GRNItemCreate(BaseModel):
    medicine_id: str
    batch_number: str
    mfg_date: Optional[date] = None
    expiry_date: date
    quantity: int
    purchase_price: float
    tax_rate: float = 12.0

class GRNCreateRequest(BaseModel):
    purchase_order_id: Optional[str] = None
    supplier_id: str
    branch_id: Optional[str] = None
    supplier_invoice_no: Optional[str] = None
    invoice_date: Optional[date] = None
    items: List[GRNItemCreate]

class GRNItemResponse(BaseModel):
    id: str
    medicine_id: str
    batch_number: str
    mfg_date: Optional[date]
    expiry_date: date
    quantity: int
    purchase_price: float
    tax_rate: float
    line_total: float

    class Config:
        from_attributes = True

class GRNResponse(BaseModel):
    id: str
    tenant_id: str
    purchase_order_id: Optional[str]
    supplier_id: str
    grn_number: str
    supplier_invoice_no: Optional[str]
    invoice_date: Optional[date]
    total_amount: float
    received_at: datetime
    items: List[GRNItemResponse] = []

    class Config:
        from_attributes = True

class SupplierPaymentCreate(BaseModel):
    supplier_id: str
    amount: float
    notes: Optional[str] = None
