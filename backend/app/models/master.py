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
    code = Column(String(50), nullable=True, index=True) # e.g. "GLE", "CIP", "SUN"
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
    """Patients and pharmacy retail customers (Customer Master)."""
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True) # Code / IP No. (e.g. "9441874161")
    name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True, index=True) # Mobile 1
    mobile_2 = Column(String(50), nullable=True)          # Mobile 2
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    locality = Column(String(150), nullable=True)
    city = Column(String(100), default="PARVATHIPURAM")
    pincode = Column(String(20), default="535501")
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    doctor_name = Column(String(150), nullable=True)
    category = Column(String(50), default="PATIENT")      # PATIENT, COUNTER, WHOLESALE, STAFF
    gstin = Column(String(50), nullable=True)             # GST Number for B2B
    credit_balance = Column(Float, default=0.0)           # Current Khata / Credit Ledger Balance
    discount_percent = Column(Float, default=0.0)         # Default discount % (e.g. 15.0%)
    discount_ceiling = Column(Float, default=0.0)         # Max discount limit in ₹
    billing_on = Column(String(50), default="CREDIT")     # Billing mode
    allergies = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Medicine(Base):
    """Master record for drugs and medical supplies (Product Master)."""
    __tablename__ = "medicines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)           # Short Product Code (e.g. "ADS")
    brand_name = Column(String(200), nullable=False, index=True)   # Product Name (e.g. "DAPAONE S 10/100 TAB")
    generic_name = Column(String(200), nullable=False, index=True) # Molecule / Generic Type (e.g. "DAPAGLIFLOZIN")
    manufacturer_id = Column(String(36), ForeignKey("manufacturers.id", ondelete="SET NULL"), nullable=True)
    company_name = Column(String(200), nullable=True)              # Manufacturer / Company Name
    product_type = Column(String(50), default="TABLETS")           # Tablets, Capsules, Syrup, Injection, Ointment, Drops
    drug_type = Column(String(50), nullable=True)                  # T, C, S, I, O
    composition = Column(Text, nullable=True)                      # Active salts/ingredients
    strength = Column(String(50), nullable=True)                   # 10/100mg
    packing = Column(String(50), default='10" S')                  # Packing (e.g. 10" S, 10 Tablets)
    conversion = Column(Integer, default=10)                       # Loose tablet conversion factor (1 strip = 10 tablets)
    rack_no = Column(String(50), nullable=True)                    # Rack / Shelf Location in Shop (e.g. "R1-S2")
    hsn_code = Column(String(20), default="30049099")              # Tax HSN code
    gst_rate = Column(Float, default=12.0)                         # Sales Tax % (0%, 5%, 12%, 18%)
    purchase_tax_rate = Column(Float, default=12.0)                # Purchase Tax %
    show_gst_in_purchase = Column(Boolean, default=True)           # In Purchase Invoice Show GST (Y/N)
    mrp = Column(Float, nullable=False)                            # Maximum Retail Price
    purchase_price = Column(Float, default=0.0)                    # Cost price from distributor
    selling_price = Column(Float, nullable=False)                  # Selling price
    schedule_type = Column(SQLEnum(DrugSchedule), nullable=False, default=DrugSchedule.SCHEDULE_H) # Schedule H, H1, X, OTC
    schedule_code = Column(String(10), default="H")                # Short code: H, H1, X, OTC
    max_discount_limit = Column(Float, default=0.0)                # Max Discount Limit %
    sales_discount = Column(Float, default=0.0)                    # Default Sales Discount %
    add_points_percent = Column(Float, default=0.0)                # Loyalty Add Points %
    allow_negative_stock = Column(Boolean, default=False)          # Allow Billing without Stock Updation (Y/N)
    is_narcotic = Column(Boolean, default=False)                   # Narcotic Drug (Y/N)
    reorder_level = Column(Integer, default=10)                    # Minimum stock warning threshold
    reorder_qty = Column(Integer, default=50)                      # Recommended reorder quantity
    unit = Column(String(50), default="Strip")                     # Strip, Bottle, Box, Loose Tablet
    pack_size = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    barcode = Column(String(100), nullable=True, index=True)
    launched_on = Column(String(50), nullable=True)                # Launch Date
    comments = Column(Text, nullable=True)                         # Remarks / Comments
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    manufacturer = relationship("Manufacturer", back_populates="medicines")
    batches = relationship("Batch", back_populates="medicine", cascade="all, delete-orphan")
