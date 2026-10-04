import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Tenant(Base):
    """
    Tenant represents an independent medical store account.
    All business data in the application is strictly partitioned by tenant_id.
    """
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    address = Column(Text, nullable=True)
    gstin = Column(String(50), nullable=True)
    drug_license_no = Column(String(100), nullable=True)
    plan = Column(String(50), default="STARTER")  # STARTER, PRO, ENTERPRISE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    branches = relationship("Branch", back_populates="tenant", cascade="all, delete-orphan")
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")

class Branch(Base):
    """
    Branch represents a specific physical shop/outlet owned by a tenant.
    A tenant can have 1 or more branches.
    """
    __tablename__ = "branches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    address = Column(Text, nullable=True)
    is_main_branch = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="branches")
    users = relationship("User", back_populates="branch")
