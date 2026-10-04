import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class POStatus(str, Enum):
    DRAFT = "DRAFT"
    ORDERED = "ORDERED"
    PARTIAL = "PARTIAL"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"

class PurchaseOrder(Base):
    """Purchase Order placed with a pharmaceutical distributor."""
    __tablename__ = "purchase_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    po_number = Column(String(100), nullable=False, index=True)
    status = Column(SQLEnum(POStatus), default=POStatus.DRAFT)
    total_amount = Column(Float, default=0.0)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class GoodsReceiptNote(Base):
    """Goods Receipt Note (GRN) capturing actual stock delivery & supplier invoice."""
    __tablename__ = "goods_receipt_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    grn_number = Column(String(100), nullable=False, index=True)
    supplier_invoice_no = Column(String(100), nullable=True)
    invoice_date = Column(Date, nullable=True)
    total_amount = Column(Float, default=0.0)
    received_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    items = relationship("GRNItem", back_populates="grn", cascade="all, delete-orphan")

class GRNItem(Base):
    """Line item on a GRN with batch and expiry details for stock intake."""
    __tablename__ = "grn_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    grn_id = Column(String(36), ForeignKey("goods_receipt_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    batch_number = Column(String(100), nullable=False)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Float, nullable=False)
    tax_rate = Column(Float, default=12.0)
    line_total = Column(Float, nullable=False)

    grn = relationship("GoodsReceiptNote", back_populates="items")
