from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.master import Doctor, Customer, Supplier, Manufacturer
from app.schemas.master import (
    DoctorCreate, DoctorResponse,
    CustomerCreate, CustomerUpdate, CustomerResponse,
    SupplierCreate, SupplierResponse,
    ManufacturerCreate, ManufacturerResponse
)
from app.api.deps import get_current_user

router = APIRouter()

# Standard Indian Pharma Molecule & Salt Dictionary (Pre-seeded from GenSoft database as seen in image 4)
STANDARD_MOLECULES = [
    {"name": "ACAMPROSATE", "code": "ACP", "category": "Neuro"},
    {"name": "ACARBOSE + METFORMIN", "code": "AC4", "category": "Antidiabetic"},
    {"name": "ACARBOSE", "code": "ACA", "category": "Antidiabetic"},
    {"name": "ACEBROPHYLLINE", "code": "ABP", "category": "Respiratory"},
    {"name": "ACEBROPHYLLINE + N-ACETYLCYSTEINE", "code": "ACAT", "category": "Respiratory"},
    {"name": "ACEBUTOLOL HYDROCHLORIDE", "code": "ACEB", "category": "Cardio"},
    {"name": "ACECLO 100 + THIOCOLCHICOSIDE 4", "code": "ATHCS4", "category": "Analgesic/Muscle Relaxant"},
    {"name": "ACECLO + PARA + TIZANIDINE", "code": "ACEM", "category": "Analgesic"},
    {"name": "ACECLO + PARA + SERRATIOPEPTIDASE", "code": "ACPD", "category": "Analgesic"},
    {"name": "ACECLOFENAC", "code": "ACE", "category": "NSAID"},
    {"name": "ACECLOFENAC + PARA + CHLORZOXAZONE", "code": "ACM", "category": "Analgesic"},
    {"name": "ACECLOFENAC + PARACETAMOL", "code": "AP1", "category": "Analgesic"},
    {"name": "ACECLOFENAC / DROTAVERINE", "code": "AC/DL", "category": "Antispasmodic"},
    {"name": "ACECLO 200 + RABEPRAZOLE 20", "code": "ACP1", "category": "NSAID + PPI"},
    {"name": "ACETAMINO + DICLO + CHLORZOXAZONE", "code": "ADC", "category": "Analgesic"},
    {"name": "ACETAMINOPHEN (PARACETAMOL)", "code": "ACT", "category": "Analgesic/Antipyretic"},
    {"name": "ACETAMINOPHEN + PSEUDOEPHEDRINE", "code": "AP", "category": "Cold/Flu"},
    {"name": "ACETAZOLAMIDE", "code": "ACETA", "category": "Diuretic"},
    {"name": "ACETAZOLAMIDE SUSTAINED", "code": "ASR", "category": "Diuretic"},
    {"name": "ACETYLCYSTEINE", "code": "ACET", "category": "Mucolytic"},
    {"name": "DAPAGLIFLOZIN", "code": "DAPA", "category": "Antidiabetic (SGLT2)"},
    {"name": "DAPAGLIFLOZIN + SITAGLIPTIN", "code": "DAPSIT", "category": "Antidiabetic"},
    {"name": "DAPAGLIFLOZIN + METFORMIN", "code": "DAPMET", "category": "Antidiabetic"},
    {"name": "TELMISARTAN + AMLODIPINE", "code": "TEL-AM", "category": "Antihypertensive"},
    {"name": "PANTOPRAZOLE + DOMPERIDONE", "code": "PAN-D", "category": "Gastro/PPI"},
    {"name": "RABEPRAZOLE + LEVOSULPIRIDE", "code": "RAB-L", "category": "Gastro/PPI"},
    {"name": "ROSUVASTATIN + CLOPIDOGREL", "code": "ROSU-CL", "category": "Cardio/Lipid"},
    {"name": "MONTELUKAST + LEVOCETIRIZINE", "code": "MONT-LC", "category": "Antiallergic"},
    {"name": "AMOXICILLIN + CLAVULANIC ACID", "code": "AMOX-CLAV", "category": "Antibiotic"},
    {"name": "AZITHROMYCIN", "code": "AZI", "category": "Antibiotic"},
    {"name": "CEFPODOXIME PROXETIL", "code": "CEFPO", "category": "Antibiotic"},
    {"name": "METFORMIN + GLIMEPIRIDE", "code": "MET-GLIM", "category": "Antidiabetic"},
    {"name": "PARACETAMOL + PHENYLEPHRINE + CPM", "code": "COLD-REL", "category": "Cold/Flu"},
]

# --- Molecules / Generics Directory (as shown in Gensoft image 4) ---
@router.get("/molecules")
def list_molecules(q: Optional[str] = Query(None)):
    """Searchable list of standard Indian pharma generic salts/molecules."""
    if not q:
        return STANDARD_MOLECULES
    q_lower = q.lower()
    return [m for m in STANDARD_MOLECULES if q_lower in m["name"].lower() or q_lower in m["code"].lower()]

# --- Doctors ---
@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Doctor).filter(Doctor.tenant_id == current_user.tenant_id).all()

@router.post("/doctors", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(doc_in: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doctor = Doctor(tenant_id=current_user.tenant_id, **doc_in.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor

# --- Customers (Customer Master) ---
@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    q: Optional[str] = Query(None, description="Search customer by name, code, or phone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer).filter(Customer.tenant_id == current_user.tenant_id)
    if q:
        search_pattern = f"%{q}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
                Customer.code.ilike(search_pattern),
                Customer.city.ilike(search_pattern),
                Customer.locality.ilike(search_pattern)
            )
        )
    return query.order_by(Customer.name.asc()).all()

@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(cust_in: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = Customer(tenant_id=current_user.tenant_id, **cust_in.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    cust_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_dict = cust_in.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(customer, k, v)

    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(customer)
    db.commit()
    return {"status": "success", "message": "Customer deleted successfully"}

# --- Suppliers / Distributors ---
@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Supplier).filter(Supplier.tenant_id == current_user.tenant_id).all()

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(sup_in: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    supplier = Supplier(tenant_id=current_user.tenant_id, **sup_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

# --- Manufacturers / Companies ---
@router.get("/manufacturers", response_model=List[ManufacturerResponse])
def list_manufacturers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Manufacturer).filter(Manufacturer.tenant_id == current_user.tenant_id).all()

@router.post("/manufacturers", response_model=ManufacturerResponse, status_code=status.HTTP_201_CREATED)
def create_manufacturer(mfg_in: ManufacturerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mfg = Manufacturer(tenant_id=current_user.tenant_id, **mfg_in.model_dump())
    db.add(mfg)
    db.commit()
    db.refresh(mfg)
    return mfg
