"""
Seed script to populate initial demo data for 'City Care Pharmacy'.
Creates:
1. Tenant 'City Care Pharmacy' & Main Branch
2. Users: Admin/Owner, Pharmacist, Cashier
3. Doctors & Customers
4. Medicines (OTC, Schedule H, Schedule H1)
5. Physical Batches with realistic expiry dates
"""
from datetime import date, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.tenant import Tenant, Branch
from app.models.user import User, UserRole
from app.models.master import Manufacturer, Supplier, Doctor, Customer, Medicine, DrugSchedule
from app.models.inventory import Batch

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if tenant already exists
    existing_tenant = db.query(Tenant).filter(Tenant.name == "City Care Pharmacy").first()
    if existing_tenant:
        print("Demo data already seeded!")
        db.close()
        return

    print("Seeding initial medical store demo data...")

    # 1. Tenant & Branch
    tenant = Tenant(
        name="City Care Pharmacy",
        address="Shop #4, Metro Health Complex, MG Road",
        gstin="29ABCDE1234F1Z5",
        drug_license_no="DL-2026-KA-987654",
        plan="PRO"
    )
    db.add(tenant)
    db.flush()

    branch = Branch(
        tenant_id=tenant.id,
        name="City Care Pharmacy - Counter 1",
        address="Shop #4, Metro Health Complex, MG Road",
        is_main_branch=True
    )
    db.add(branch)
    db.flush()

    # 2. Users (Owner, Pharmacist, Cashier)
    owner = User(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name="Dr. Rajesh Sharma",
        email="owner@citycare.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.STORE_OWNER
    )
    pharmacist = User(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name="Sunita Nair (R.Ph)",
        email="pharmacist@citycare.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.PHARMACIST
    )
    cashier = User(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name="Amit Kumar",
        email="cashier@citycare.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.CASHIER
    )
    db.add_all([owner, pharmacist, cashier])
    db.flush()

    # 3. Manufacturer & Supplier
    mfg1 = Manufacturer(tenant_id=tenant.id, name="Cipla Healthcare Ltd.", license_no="MFG-CIP-001", contact="+91 22 2482 6000")
    mfg2 = Manufacturer(tenant_id=tenant.id, name="Sun Pharma Laboratories", license_no="MFG-SUN-002", contact="+91 22 4324 4324")
    db.add_all([mfg1, mfg2])
    db.flush()

    sup1 = Supplier(
        tenant_id=tenant.id,
        name="Apex Medico Distributors",
        contact="+91 98765 43210",
        address="Warehouse 12, Industrial Area",
        gstin="29XYZAB5678C1Z2"
    )
    db.add(sup1)
    db.flush()

    # 4. Doctors & Customers
    doc1 = Doctor(
        tenant_id=tenant.id,
        name="Dr. Vikram Sen, MD",
        registration_no="MCI-1998-04561",
        specialization="General Physician",
        contact="+91 98450 12345"
    )
    doc2 = Doctor(
        tenant_id=tenant.id,
        name="Dr. Ananya Roy, MBBS, DCH",
        registration_no="MCI-2005-09823",
        specialization="Pediatrician",
        contact="+91 98450 67890"
    )
    db.add_all([doc1, doc2])

    cust1 = Customer(
        tenant_id=tenant.id,
        name="Ramesh Patel",
        phone="9876500001",
        address="Flat 202, Sunrise Apts",
        allergies="Sulfa drugs"
    )
    cust2 = Customer(
        tenant_id=tenant.id,
        name="Priya Deshmukh",
        phone="9876500002",
        address="14/A, Rose Villa"
    )
    db.add_all([cust1, cust2])
    db.flush()

    # 5. Medicines (OTC, Schedule H, Schedule H1)
    # A. Paracetamol (Dolo 650) - OTC
    med_dolo = Medicine(
        tenant_id=tenant.id,
        generic_name="Paracetamol",
        brand_name="Dolo 650",
        manufacturer_id=mfg1.id,
        drug_type="Tablet",
        composition="Paracetamol 650mg",
        strength="650mg",
        pack_size="Strip of 15",
        category="Analgesic / Antipyretic",
        hsn_code="300490",
        gst_rate=12.0,
        mrp=34.50,
        purchase_price=24.00,
        selling_price=34.50,
        schedule_type=DrugSchedule.OTC,
        reorder_level=20,
        unit="Strip",
        barcode="890111700101"
    )

    # B. Amoxicillin & Clavulanate (Augmentin 625 Duo) - Schedule H
    med_aug = Medicine(
        tenant_id=tenant.id,
        generic_name="Amoxicillin and Potassium Clavulanate",
        brand_name="Augmentin 625 Duo",
        manufacturer_id=mfg2.id,
        drug_type="Tablet",
        composition="Amoxicillin 500mg + Clavulanic Acid 125mg",
        strength="625mg",
        pack_size="Strip of 10",
        category="Antibiotic",
        hsn_code="300410",
        gst_rate=12.0,
        mrp=204.00,
        purchase_price=160.00,
        selling_price=204.00,
        schedule_type=DrugSchedule.SCHEDULE_H,
        reorder_level=15,
        unit="Strip",
        barcode="890111700202"
    )

    # C. Alprazolam (Alprax 0.5) - Schedule H1 (Strict Prescription & Register)
    med_alprax = Medicine(
        tenant_id=tenant.id,
        generic_name="Alprazolam",
        brand_name="Alprax 0.5",
        manufacturer_id=mfg1.id,
        drug_type="Tablet",
        composition="Alprazolam 0.5mg",
        strength="0.5mg",
        pack_size="Strip of 15",
        category="Anxiolytic / Sedative",
        hsn_code="300490",
        gst_rate=12.0,
        mrp=62.00,
        purchase_price=45.00,
        selling_price=62.00,
        schedule_type=DrugSchedule.SCHEDULE_H1,
        reorder_level=10,
        unit="Strip",
        barcode="890111700303"
    )

    # D. Cetirizine (Cetzine 10) - OTC
    med_cetzine = Medicine(
        tenant_id=tenant.id,
        generic_name="Cetirizine Hydrochloride",
        brand_name="Cetzine 10",
        manufacturer_id=mfg2.id,
        drug_type="Tablet",
        composition="Cetirizine 10mg",
        strength="10mg",
        pack_size="Strip of 10",
        category="Antihistamine",
        hsn_code="300490",
        gst_rate=12.0,
        mrp=22.00,
        purchase_price=15.00,
        selling_price=22.00,
        schedule_type=DrugSchedule.OTC,
        reorder_level=25,
        unit="Strip",
        barcode="890111700404"
    )

    db.add_all([med_dolo, med_aug, med_alprax, med_cetzine])
    db.flush()

    # 6. Physical Batches with realistic expiry dates
    today = date.today()

    # Dolo 650 batches (one expiring in 6 months, one expiring in 18 months)
    b_dolo_1 = Batch(
        tenant_id=tenant.id,
        branch_id=branch.id,
        medicine_id=med_dolo.id,
        batch_number="DL-2025-01",
        mfg_date=today - timedelta(days=180),
        expiry_date=today + timedelta(days=180),  # FEFO priority 1
        quantity_received=100,
        quantity_remaining=45
    )
    b_dolo_2 = Batch(
        tenant_id=tenant.id,
        branch_id=branch.id,
        medicine_id=med_dolo.id,
        batch_number="DL-2025-02",
        mfg_date=today - timedelta(days=30),
        expiry_date=today + timedelta(days=540),  # FEFO priority 2
        quantity_received=150,
        quantity_remaining=150
    )

    # Augmentin 625 batch
    b_aug = Batch(
        tenant_id=tenant.id,
        branch_id=branch.id,
        medicine_id=med_aug.id,
        batch_number="AUG-8871",
        mfg_date=today - timedelta(days=60),
        expiry_date=today + timedelta(days=300),
        quantity_received=50,
        quantity_remaining=28
    )

    # Alprax 0.5 batch
    b_alprax = Batch(
        tenant_id=tenant.id,
        branch_id=branch.id,
        medicine_id=med_alprax.id,
        batch_number="ALP-9921",
        mfg_date=today - timedelta(days=90),
        expiry_date=today + timedelta(days=400),
        quantity_received=30,
        quantity_remaining=18
    )

    # Cetzine batch
    b_cetzine = Batch(
        tenant_id=tenant.id,
        branch_id=branch.id,
        medicine_id=med_cetzine.id,
        batch_number="CTZ-4412",
        mfg_date=today - timedelta(days=40),
        expiry_date=today + timedelta(days=420),
        quantity_received=80,
        quantity_remaining=60
    )

    db.add_all([b_dolo_1, b_dolo_2, b_aug, b_alprax, b_cetzine])
    db.commit()
    db.close()
    print("Seed complete! Demo credentials created:")
    print("  Store: City Care Pharmacy")
    print("  Owner Login: owner@citycare.com / password123")
    print("  Pharmacist Login: pharmacist@citycare.com / password123")
    print("  Cashier Login: cashier@citycare.com / password123")

if __name__ == "__main__":
    seed_database()
