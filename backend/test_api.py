from fastapi.testclient import TestClient
from app.main import app
import uuid

client = TestClient(app)

def test_system():
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] /health passed:", res.json())

    # 2. Login as Owner
    login_res = client.post("/api/v1/auth/login", json={
        "email": "owner@citycare.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    data = login_res.json()
    token = data["access_token"]
    print(f"[PASS] /auth/login passed! Logged in as: {data['name']} ({data['role']})")

    # 3. Access protected medicines endpoint
    headers = {"Authorization": f"Bearer {token}"}
    meds_res = client.get("/api/v1/medicines/", headers=headers)
    assert meds_res.status_code == 200, f"Medicines list failed: {meds_res.text}"
    meds = meds_res.json()
    print(f"[PASS] Protected /medicines passed! Retrieved {len(meds)} medicines.")

    # 4. Check Suppliers
    suppliers_res = client.get("/api/v1/master/suppliers", headers=headers)
    assert suppliers_res.status_code == 200
    suppliers = suppliers_res.json()
    assert len(suppliers) > 0, "No suppliers found"
    supplier = suppliers[0]
    initial_balance = supplier["outstanding_balance"]
    print(f"[PASS] Supplier loaded: {supplier['name']} | Initial Balance: Rs.{initial_balance}")

    # 5. Create Purchase Order (PO)
    aug_res = client.get("/api/v1/medicines/?q=Augmentin", headers=headers)
    assert aug_res.status_code == 200 and len(aug_res.json()) > 0
    aug_med = aug_res.json()[0]
    po_payload = {
        "supplier_id": supplier["id"],
        "items": [
            {
                "medicine_id": aug_med["id"],
                "quantity": 50,
                "expected_cost_price": 160.0
            }
        ]
    }
    po_res = client.post("/api/v1/purchases/purchase-orders", json=po_payload, headers=headers)
    assert po_res.status_code == 201, f"PO creation failed: {po_res.text}"
    po_data = po_res.json()
    print(f"[PASS] Purchase Order created: {po_data['po_number']} | Est. Total: Rs.{po_data['total_amount']}")

    # 6. Receive Stock via Goods Receipt Note (GRN) with fresh unique batch
    unique_batch_no = f"AUG-{uuid.uuid4().hex[:4].upper()}"
    grn_payload = {
        "purchase_order_id": po_data["id"],
        "supplier_id": supplier["id"],
        "supplier_invoice_no": f"INV-{uuid.uuid4().hex[:4].upper()}",
        "invoice_date": "2026-10-05",
        "items": [
            {
                "medicine_id": aug_med["id"],
                "batch_number": unique_batch_no,
                "mfg_date": "2026-09-01",
                "expiry_date": "2028-05-01",
                "quantity": 50,
                "purchase_price": 160.0,
                "tax_rate": 12.0
            }
        ]
    }
    grn_res = client.post("/api/v1/purchases/grn", json=grn_payload, headers=headers)
    assert grn_res.status_code == 201, f"GRN failed: {grn_res.text}"
    grn_data = grn_res.json()
    print(f"[PASS] GRN Processed: {grn_data['grn_number']} | Invoice Total: Rs.{grn_data['total_amount']}")

    # 7. Verify Batch Stock was automatically created in inventory
    batches_res = client.get(f"/api/v1/medicines/{aug_med['id']}/batches", headers=headers)
    batches = batches_res.json()
    new_batch = next((b for b in batches if b["batch_number"] == unique_batch_no), None)
    assert new_batch is not None, "New batch was not found in inventory!"
    assert new_batch["quantity_remaining"] == 50, f"Expected 50 units in batch, got {new_batch['quantity_remaining']}"
    print(f"[PASS] Stock automatically created in inventory! Batch {new_batch['batch_number']} has {new_batch['quantity_remaining']} units.")

    # 8. Verify Supplier Outstanding Balance increased
    updated_sup_res = client.get("/api/v1/master/suppliers", headers=headers)
    updated_sup = updated_sup_res.json()[0]
    expected_balance = round(initial_balance + grn_data["total_amount"], 2)
    assert updated_sup["outstanding_balance"] == expected_balance, f"Balance mismatch: {updated_sup['outstanding_balance']} != {expected_balance}"
    print(f"[PASS] Supplier ledger updated! Outstanding balance increased to Rs.{updated_sup['outstanding_balance']}")

    # 9. Pay Supplier
    pay_res = client.post("/api/v1/purchases/supplier-payments", json={
        "supplier_id": supplier["id"],
        "amount": 2000.0,
        "notes": "Bank transfer advance"
    }, headers=headers)
    assert pay_res.status_code == 200
    rem_balance = pay_res.json()["outstanding_balance"]
    assert rem_balance == round(expected_balance - 2000.0, 2)
    print(f"[PASS] Supplier payment recorded! Rs.2000 paid. New balance: Rs.{rem_balance}")

    # 10. Reports & Analytics
    sales_rep_res = client.get("/api/v1/reports/sales", headers=headers)
    assert sales_rep_res.status_code == 200
    sales_rep = sales_rep_res.json()
    print(f"[PASS] Sales Analytics: {sales_rep['count']} bills found | Total: Rs.{sales_rep['total_revenue']} | GST: Rs.{sales_rep['total_tax_collected']}")

    tax_summary_res = client.get("/api/v1/reports/tax-summary", headers=headers)
    assert tax_summary_res.status_code == 200
    tax_data = tax_summary_res.json()
    print(f"[PASS] GST Tax Summary: CGST: Rs.{tax_data['cgst_split']} | SGST: Rs.{tax_data['sgst_split']}")

    csv_res = client.get("/api/v1/reports/export/schedule-register-csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    print("[PASS] Statutory Schedule Drug CSV Export generated successfully!")

    # 11. Audit Logs
    audit_res = client.get("/api/v1/reports/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0, "Expected at least 1 audit log"
    print(f"[PASS] Audit Logs: Retrieved {len(logs)} immutable audit trail records.")

    # 12. Staff Onboarding (Owner creates new Pharmacist)
    new_staff_email = f"staff_{uuid.uuid4().hex[:4]}@citycare.com"
    staff_res = client.post("/api/v1/auth/staff", json={
        "name": "Dr. Rohit Sharma",
        "email": new_staff_email,
        "password": "password123",
        "role": "PHARMACIST"
    }, headers=headers)
    assert staff_res.status_code == 201, f"Staff creation failed: {staff_res.text}"
    staff_data = staff_res.json()
    assert staff_data["email"] == new_staff_email
    print(f"[PASS] Staff Onboarding: Successfully created {staff_data['name']} as {staff_data['role']}")

    # 13. List Staff
    list_staff_res = client.get("/api/v1/auth/staff", headers=headers)
    assert list_staff_res.status_code == 200
    staff_list = list_staff_res.json()
    print(f"[PASS] Staff List: Store now has {len(staff_list)} active employees.")

if __name__ == "__main__":
    test_system()

