import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, Text, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class BillStatus(str, Enum):
    PAID = "PAID"
    CREDIT = "CREDIT"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    CANCELLED = "CANCELLED"
    RETURNED = "RETURNED"

class PaymentMode(str, Enum):
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"
    CREDIT = "CREDIT"
    SPLIT = "SPLIT"

class Bill(Base):
    """
    Sales Invoice / Bill generated at the POS counter.
    Must be created inside a single atomic transaction along with stock deduction.
    """
    __tablename__ = "bills"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    bill_number = Column(String(100), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    payment_mode = Column(SQLEnum(PaymentMode), default=PaymentMode.CASH)
    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(SQLEnum(BillStatus), default=BillStatus.PAID)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="bill")
    schedule_entries = relationship("ScheduleRegisterEntry", back_populates="bill")

class BillItem(Base):
    """Individual line item sold on a bill, tied to the exact batch."""
    __tablename__ = "bill_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bill_id = Column(String(36), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="RESTRICT"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    tax_rate = Column(Float, default=12.0)
    line_total = Column(Float, nullable=False)

    bill = relationship("Bill", back_populates="items")

class Prescription(Base):
    """Prescription record attached to a bill for Schedule H/H1/X regulatory dispensing."""
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_id = Column(String(36), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    image_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bill = relationship("Bill", back_populates="prescriptions")

class ScheduleRegisterEntry(Base):
    """
    Statutory register required by the Drugs & Cosmetics Act for Schedule H1 and Schedule X sales.
    Required for government pharmacy audits.
    """
    __tablename__ = "schedule_register_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_id = Column(String(36), ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="RESTRICT"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    patient_name = Column(String(150), nullable=False)
    patient_phone = Column(String(50), nullable=True)
    patient_address = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False)
    dispensed_date = Column(Date, default=lambda: datetime.now(timezone.utc).date())

    bill = relationship("Bill", back_populates="schedule_entries")

class Payment(Base):
    """Payments made towards bills or customer credit balances."""
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    bill_id = Column(String(36), ForeignKey("bills.id", ondelete="SET NULL"), nullable=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    mode = Column(SQLEnum(PaymentMode), default=PaymentMode.CASH)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
