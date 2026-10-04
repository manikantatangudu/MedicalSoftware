import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class StockAdjustmentReason(str, Enum):
    DAMAGE = "DAMAGE"
    EXPIRY = "EXPIRY"
    THEFT = "THEFT"
    CORRECTION = "CORRECTION"
    OPENING_STOCK = "OPENING_STOCK"

class Batch(Base):
    """
    Physical drug batch with its specific expiry date and current on-hand quantity.
    FEFO (First-Expiry-First-Out) algorithm sorts by expiry_date ascending.
    """
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = Column(String(100), nullable=False, index=True)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False, index=True)
    quantity_received = Column(Integer, default=0)
    quantity_remaining = Column(Integer, default=0, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    medicine = relationship("Medicine", back_populates="batches")

class StockAdjustment(Base):
    """Audit record for any manual corrections, damages, or shrinkage."""
    __tablename__ = "stock_adjustments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    quantity_change = Column(Integer, nullable=False)  # Positive for additions, negative for write-offs
    reason = Column(SQLEnum(StockAdjustmentReason), nullable=False)
    notes = Column(Text, nullable=True)
    adjusted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
