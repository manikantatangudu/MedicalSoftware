#!/usr/bin/env python3
"""
One-time CSV Product & Opening Stock Importer
Imports products_list.csv (23,545 products) into the dev database (medical_software.db)
"""

import os
import sys
import csv
import re
import uuid
from datetime import datetime, date

# Add parent directory to sys.path so app imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.master import Medicine, DrugSchedule
from app.models.inventory import Batch
from app.models.tenant import Tenant, Branch

def parse_conversion(packing_str: str) -> int:
    """Extract conversion factor (tablets per pack/strip) from packing string."""
    if not packing_str:
        return 10
    packing_clean = packing_str.strip()
    # Pattern: 1*10, 1*15, 1*4
    m = re.search(r'(\d+)\s*\*\s*(\d+)', packing_clean)
    if m:
        v1, v2 = int(m.group(1)), int(m.group(2))
        return v2 if v1 == 1 else (v1 if v2 == 1 else v1 * v2)
    # Pattern: 10'S, 15;S, 10S, 30's
    m = re.search(r'(\d+)\s*[\x27\x22;`]?\s*s\b', packing_clean, re.IGNORECASE)
    if m:
        return int(m.group(1))
    # Pattern: purely numeric like 10, 15
    m = re.match(r'^\s*(\d+)\s*$', packing_clean)
    if m:
        v = int(m.group(1))
        if 1 <= v <= 500:
            return v
    # Liquid or topical units usually have conversion of 1
    if re.search(r'(ml|gm|g|ltr|kg)', packing_clean, re.IGNORECASE):
        return 1
    return 10

def detect_product_type(name: str, packing: str) -> str:
    """Classify product type from name or packing."""
    combined = f"{name} {packing}".upper()
    if any(k in combined for k in ["SYP", "SYRUP", "SUSP", "SUSPENSION", "LIQ", "LIQUID"]):
        return "SYRUP"
    if any(k in combined for k in ["INJ", "AMP", "VIAL", "PFS"]):
        return "INJECTION"
    if any(k in combined for k in ["OINT", "CREAM", "GEL", "LOTION"]):
        return "OINTMENT"
    if any(k in combined for k in ["DROP", "DROPS", "E/D", "E/E"]):
        return "DROPS"
    if any(k in combined for k in ["CAP", "CAPS", "SOFTGEL", "CAPSULE"]):
        return "CAPSULES"
    if any(k in combined for k in ["SOAP", "SHAMPOO", "WASH", "FACEWASH", "DIAPER", "WIPES", "MASK", "NEEDLE", "SYRINGE"]):
        return "GENERAL"
    return "TABLETS"

def run_import():
    csv_candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "products_list.csv"),
        os.path.join(os.path.expanduser("~"), "Downloads", "products_list.csv"),
    ]
    
    csv_path = None
    for cand in csv_candidates:
        if os.path.exists(cand):
            csv_path = cand
            break

    if not csv_path:
        print("ERROR: products_list.csv not found in backend or Downloads directory.")
        sys.exit(1)

    print(f"Reading CSV from: {csv_path}")

    db = SessionLocal()
    error_log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "import_errors.log")

    try:
        # Determine tenant & branch
        tenant = db.query(Tenant).filter(Tenant.name.ilike("%City Care%")).first()
        if not tenant:
            tenant = db.query(Tenant).first()
        if not tenant:
            print("ERROR: No tenant found in database!")
            sys.exit(1)

        tenant_id = tenant.id
        branch = db.query(Branch).filter(Branch.tenant_id == tenant_id).first()
        branch_id = branch.id if branch else None
        print(f"Importing for Tenant: '{tenant.name}' ({tenant_id}) | Branch: {branch_id}")

        # Fetch existing codes & names for this tenant to avoid duplicate inserts
        existing_medicines = db.query(Medicine.code, Medicine.brand_name, Medicine.id).filter(
            Medicine.tenant_id == tenant_id
        ).all()
        existing_codes = {m[0]: m[2] for m in existing_medicines if m[0]}
        existing_names = {m[1].strip().upper(): m[2] for m in existing_medicines if m[1]}

        total_rows = 0
        imported_count = 0
        batch_created_count = 0
        total_stock_count = 0
        skipped_count = 0
        errors = []

        batch_size = 1000
        medicines_to_add = []
        batches_to_add = []

        placeholder_expiry = date(2027, 12, 31)
        now = datetime.utcnow()

        with open(csv_path, mode="r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            
            for line_no, row in enumerate(reader, start=2):
                total_rows += 1
                code = (row.get("Code") or "").strip()
                name = (row.get("Product Name") or "").strip()
                packing = (row.get("Packing") or "").strip()
                stock_str = (row.get("Stock") or "0").strip()

                if not name:
                    errors.append(f"Line {line_no}: Skipped - Missing Product Name. Row data: {row}")
                    skipped_count += 1
                    continue

                try:
                    stock_qty = int(float(stock_str)) if stock_str else 0
                except (ValueError, TypeError):
                    errors.append(f"Line {line_no}: Invalid stock quantity '{stock_str}'. Defaulted to 0.")
                    stock_qty = 0

                # Check if already imported
                name_key = name.upper()
                med_id = existing_codes.get(code) if code else None
                if not med_id:
                    med_id = existing_names.get(name_key)

                if med_id:
                    # Medicine already exists
                    # If it has stock > 0, check if it already has an OPENING-STOCK batch
                    if stock_qty > 0:
                        has_batch = db.query(Batch.id).filter(
                            Batch.medicine_id == med_id,
                            Batch.batch_number == "OPENING-STOCK"
                        ).first()
                        if not has_batch and branch_id:
                            batches_to_add.append(Batch(
                                id=str(uuid.uuid4()),
                                tenant_id=tenant_id,
                                branch_id=branch_id,
                                medicine_id=med_id,
                                batch_number="OPENING-STOCK",
                                mfg_date=date(2024, 1, 1),
                                expiry_date=placeholder_expiry,
                                quantity_received=stock_qty,
                                quantity_remaining=stock_qty,
                                created_at=now
                            ))
                            batch_created_count += 1
                            total_stock_count += stock_qty
                    continue

                # Create new Medicine record
                new_med_id = str(uuid.uuid4())
                conv = parse_conversion(packing)
                ptype = detect_product_type(name, packing)

                med = Medicine(
                    id=new_med_id,
                    tenant_id=tenant_id,
                    code=code if code else None,
                    brand_name=name,
                    generic_name=name,  # Fallback to brand_name to satisfy non-null DB constraint
                    packing=packing if packing else '10" S',
                    pack_size=packing if packing else '10" S',
                    conversion=conv,
                    unit="Strip" if ptype in ["TABLETS", "CAPSULES"] else ("Bottle" if ptype in ["SYRUP", "DROPS"] else "Tube"),
                    product_type=ptype,
                    drug_type=None,
                    manufacturer_id=None,
                    company_name=None,
                    composition=None,
                    strength=None,
                    rack_no=None,
                    hsn_code=None,
                    gst_rate=12.0,
                    purchase_tax_rate=12.0,
                    show_gst_in_purchase=True,
                    mrp=0.0,
                    purchase_price=0.0,
                    selling_price=0.0,
                    schedule_type=DrugSchedule.SCHEDULE_H if any(k in name.upper() for k in ["TAB", "CAP", "SYP", "INJ"]) else DrugSchedule.OTC,
                    schedule_code="H",
                    max_discount_limit=0.0,
                    sales_discount=0.0,
                    add_points_percent=0.0,
                    allow_negative_stock=False,
                    is_narcotic=False,
                    reorder_level=10,
                    reorder_qty=50,
                    category="Allopathy",
                    barcode=None,
                    is_active=True,  # Active so it displays in catalog and POS counter
                    created_at=now
                )

                medicines_to_add.append(med)
                if code:
                    existing_codes[code] = new_med_id
                existing_names[name_key] = new_med_id
                imported_count += 1

                # If stock > 0, create opening-stock batch
                if stock_qty > 0 and branch_id:
                    batch = Batch(
                        id=str(uuid.uuid4()),
                        tenant_id=tenant_id,
                        branch_id=branch_id,
                        medicine_id=new_med_id,
                        batch_number="OPENING-STOCK",
                        mfg_date=date(2024, 1, 1),
                        expiry_date=placeholder_expiry,
                        quantity_received=stock_qty,
                        quantity_remaining=stock_qty,
                        created_at=now
                    )
                    batches_to_add.append(batch)
                    batch_created_count += 1
                    total_stock_count += stock_qty

                # Commit in chunks of batch_size for high speed
                if len(medicines_to_add) >= batch_size:
                    db.add_all(medicines_to_add)
                    db.commit()
                    medicines_to_add = []
                    print(f"  Processed {total_rows} rows (Imported {imported_count} medicines)...")

                if len(batches_to_add) >= batch_size:
                    db.add_all(batches_to_add)
                    db.commit()
                    batches_to_add = []

            # Flush remaining records
            if medicines_to_add:
                db.add_all(medicines_to_add)
                db.commit()
            if batches_to_add:
                db.add_all(batches_to_add)
                db.commit()

        # Write error log if any
        if errors:
            with open(error_log_path, "w", encoding="utf-8") as f_err:
                f_err.write("\n".join(errors))
            print(f"Logged {len(errors)} issues to {error_log_path}")

        print("\n================ IMPORT SUMMARY ================")
        print(f"Total Rows in CSV           : {total_rows:,}")
        print(f"Medicines Imported/Created  : {imported_count:,}")
        print(f"Opening Stock Batches Made  : {batch_created_count:,}")
        print(f"Total Stock Units Loaded    : {total_stock_count:,}")
        print(f"Skipped / Problematic Rows  : {skipped_count}")
        print(f"Status                      : SUCCESS")
        print("================================================")

    except Exception as e:
        db.rollback()
        print(f"\nCRITICAL IMPORT ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_import()
