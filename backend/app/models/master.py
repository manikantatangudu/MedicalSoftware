import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Integer, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class DrugSchedule(str, Enum):
    OTC = "OTC"                    # Over-The-Counter: No prescription needed
    SCHEDULE_H = "SCHEDULE_H"      # Prescription required, dispensed once
    SCHEDULE_H1 = "SCHEDULE_H1"    # Prescription + mandatory patient/doctor register entry
    SCHEDULE_X = "SCHEDULE_X"      # Narcotics/psychotropics, special license + dedicated register

class Manufacturer(Base):
    """Pharmaceutical manufacturing companies."""
    __tablename__ = "manufacturers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    license_no = Column(String(100), nullable=True)
    contact = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    medicines = relationship("Medicine", back_populates="manufacturer")

class Supplier(Base):
    """Distributors and wholesale suppliers."""
    __tablename__ = "suppliers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    contact = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    gstin = Column(String(50), nullable=True)
    outstanding_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Doctor(Base):
    """Registered medical practitioners prescribing medicines."""
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    registration_no = Column(String(100), nullable=False)
    specialization = Column(String(150), nullable=True)
    contact = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Customer(Base):
    """Patients and pharmacy retail customers."""
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True, index=True)
    address = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    credit_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Medicine(Base):
    """Master record for drugs and medical supplies."""
    __tablename__ = "medicines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    generic_name = Column(String(200), nullable=False, index=True)
    brand_name = Column(String(200), nullable=False, index=True)
    manufacturer_id = Column(String(36), ForeignKey("manufacturers.id", ondelete="SET NULL"), nullable=True)
    drug_type = Column(String(50), nullable=True)  # Tablet, Capsule, Syrup, Injection, Ointment
    composition = Column(Text, nullable=True)      # Active salts/ingredients
    strength = Column(String(50), nullable=True)   # 500mg, 5ml, etc.
    pack_size = Column(String(50), nullable=True)  # Strip of 10, Bottle of 100ml
    category = Column(String(100), nullable=True)  # Antibiotic, Analgesic, etc.
    hsn_code = Column(String(20), nullable=True)   # Tax HSN code
    gst_rate = Column(Float, default=12.0)         # GST rate percentage (e.g. 5, 12, 18)
    mrp = Column(Float, nullable=False)            # Maximum Retail Price
    purchase_price = Column(Float, default=0.0)    # Cost price from distributor
    selling_price = Column(Float, nullable=False)  # Selling price
    schedule_type = Column(SQLEnum(DrugSchedule), nullable=False, default=DrugSchedule.OTC)
    reorder_level = Column(Integer, default=10)    # Minimum stock warning threshold
    unit = Column(String(50), default="Strip")     # Strip, Bottle, Box, Loose Tablet
    barcode = Column(String(100), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    manufacturer = relationship("Manufacturer", back_populates="medicines")
    batches = relationship("Batch", back_populates="medicine", cascade="all, delete-orphan")
