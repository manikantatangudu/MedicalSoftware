import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    STORE_OWNER = "STORE_OWNER"
    PHARMACIST = "PHARMACIST"
    CASHIER = "CASHIER"
    ACCOUNTANT = "ACCOUNTANT"
    BRANCH_MANAGER = "BRANCH_MANAGER"

class User(Base):
    """
    User account within a tenant (store).
    Permissions and operations are governed by their role.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CASHIER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="users")
    branch = relationship("Branch", back_populates="users")
