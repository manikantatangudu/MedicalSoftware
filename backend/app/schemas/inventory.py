from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.inventory import StockAdjustmentReason

class BatchBase(BaseModel):
    medicine_id: str
    branch_id: Optional[str] = None
    batch_number: str
    mfg_date: Optional[date] = None
    expiry_date: date
    quantity_received: float
    quantity_remaining: float

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: str
    tenant_id: str
    branch_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class StockAdjustmentCreate(BaseModel):
    medicine_id: str
    branch_id: Optional[str] = None
    batch_id: Optional[str] = None
    quantity_change: float
    reason: StockAdjustmentReason
    notes: Optional[str] = None

class StockAdjustmentResponse(BaseModel):
    id: str
    tenant_id: str
    branch_id: str
    medicine_id: str
    batch_id: Optional[str]
    quantity_change: float
    reason: StockAdjustmentReason
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
