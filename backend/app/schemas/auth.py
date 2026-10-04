from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

# Schema for tenant (store) registration
class TenantRegisterRequest(BaseModel):
    store_name: str
    store_address: Optional[str] = None
    gstin: Optional[str] = None
    drug_license_no: Optional[str] = None
    admin_name: str
    admin_email: EmailStr
    admin_password: str

# Schema for user login
class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

# Schema for JWT response
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str
    store_name: str
    role: str
    name: str
    email: str
    branch_id: Optional[str] = None

# Current user profile
class UserProfileResponse(BaseModel):
    id: str
    tenant_id: str
    branch_id: Optional[str] = None
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Tenant info
class TenantInfoResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    gstin: Optional[str] = None
    drug_license_no: Optional[str] = None
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True

# Staff onboarding schema
class StaffCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    branch_id: Optional[str] = None
