import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class AuditLog(Base):
    """
    Immutable audit trail for all business-critical actions:
    bills, returns, stock corrections, price updates, user role changes.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., BILL_CREATED, STOCK_ADJUSTED, PRICE_CHANGED
    entity = Column(String(100), nullable=False)  # e.g., Bill, Batch, Medicine, User
    entity_id = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)   # Additional context in JSON format
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
