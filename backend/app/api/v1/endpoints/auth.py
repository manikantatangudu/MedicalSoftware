from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.tenant import Tenant, Branch
from app.models.user import User, UserRole
from app.schemas.auth import (
    TenantRegisterRequest, UserLoginRequest, TokenResponse, UserProfileResponse, StaffCreateRequest
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_tenant(req: TenantRegisterRequest, db: Session = Depends(get_db)):
    """
    Onboards a new independent pharmacy store (Tenant).
    Creates:
    1. Tenant record (store name, license, GSTIN)
    2. Default 'Main Branch'
    3. Store Owner / Admin user account
    4. Automatically returns signed JWT token
    """
    # Check if user email already exists
    existing_user = db.query(User).filter(User.email == req.admin_email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # 1. Create Tenant
    tenant = Tenant(
        name=req.store_name,
        address=req.store_address,
        gstin=req.gstin,
        drug_license_no=req.drug_license_no,
        plan="STARTER"
    )
    db.add(tenant)
    db.flush()

    # 2. Create Default Main Branch
    branch = Branch(
        tenant_id=tenant.id,
        name=f"{req.store_name} - Main Branch",
        address=req.store_address,
        is_main_branch=True
    )
    db.add(branch)
    db.flush()

    # 3. Create Store Owner User
    owner_user = User(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=req.admin_name,
        email=req.admin_email.lower(),
        password_hash=get_password_hash(req.admin_password),
        role=UserRole.STORE_OWNER,
        is_active=True
    )
    db.add(owner_user)
    db.commit()
    db.refresh(owner_user)

    # 4. Issue JWT Access Token
    token_payload = {
        "sub": owner_user.email,
        "user_id": owner_user.id,
        "tenant_id": tenant.id,
        "branch_id": branch.id,
        "role": owner_user.role.value
    }
    access_token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=owner_user.id,
        tenant_id=tenant.id,
        store_name=tenant.name,
        role=owner_user.role.value,
        name=owner_user.name,
        email=owner_user.email,
        branch_id=branch.id
    )

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user, verifies their password, and issues a JWT token.
    """
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is disabled"
        )

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    store_name = tenant.name if tenant else "Medical Store"

    token_payload = {
        "sub": user.email,
        "user_id": user.id,
        "tenant_id": user.tenant_id,
        "branch_id": user.branch_id,
        "role": user.role.value
    }
    access_token = create_access_token(data=token_payload)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        tenant_id=user.tenant_id,
        store_name=store_name,
        role=user.role.value,
        name=user.name,
        email=user.email,
        branch_id=user.branch_id
    )

@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns the profile of the logged-in user."""
    return current_user

@router.get("/staff", response_model=List[UserProfileResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STORE_OWNER]))
):
    """Lists all staff accounts for this pharmacy tenant."""
    users = db.query(User).filter(User.tenant_id == current_user.tenant_id).order_by(User.created_at.asc()).all()
    return users

@router.post("/staff", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    req: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.STORE_OWNER]))
):
    """Creates a new employee/staff account (Pharmacist, Cashier, Accountant)."""
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    branch_id = req.branch_id or current_user.branch_id
    new_user = User(
        tenant_id=current_user.tenant_id,
        branch_id=branch_id,
        name=req.name,
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        role=req.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

