import uuid
from datetime import date, timedelta
import pytest

def test_purchase_order_and_grn_workflow(client, owner_headers):
    """
    Scenario 19 & 20 (CRITICAL): Purchase Order (PO) to Goods Receipt Note (GRN) Lifecycle.
    1. Create PO for distributor.
    2. Receive stock intake via GRN.
    3. Verify physical batch auto-creation in inventory.
    4. Verify supplier ledger balance increases.
    """
    # 1. Fetch Supplier and Medicine
    suppliers = client.get("/api/v1/master/suppliers", headers=owner_headers).json()
    assert len(suppliers) > 0
    supplier = suppliers[0]
    initial_balance = supplier["outstanding_balance"]

    meds = client.get("/api/v1/medicines/?query=Cetzine", headers=owner_headers).json()
    assert len(meds) > 0
    cetzine = meds[0]

    # 2. Create Purchase Order
    po_payload = {
        "supplier_id": supplier["id"],
        "items": [
            {
                "medicine_id": cetzine["id"],
                "quantity": 100,
                "expected_cost_price": 25.0
            }
        ]
    }
    po_res = client.post("/api/v1/purchases/purchase-orders", json=po_payload, headers=owner_headers)
    assert po_res.status_code == 201
    po = po_res.json()
    assert "PO-" in po["po_number"]
    assert po["status"] == "ORDERED"
    assert po["total_amount"] == 2500.0

    # 3. Receive Goods Receipt Note (GRN) with batch details
    batch_num = f"CET-{uuid.uuid4().hex[:4].upper()}"
    expiry = (date.today() + timedelta(days=700)).isoformat()
    grn_payload = {
        "purchase_order_id": po["id"],
        "supplier_id": supplier["id"],
        "supplier_invoice_no": f"INV-SUP-{uuid.uuid4().hex[:4]}",
        "invoice_date": date.today().isoformat(),
        "items": [
            {
                "medicine_id": cetzine["id"],
                "batch_number": batch_num,
                "mfg_date": date.today().isoformat(),
                "expiry_date": expiry,
                "quantity": 100,
                "purchase_price": 25.0,
                "tax_rate": 12.0
            }
        ]
    }
    grn_res = client.post("/api/v1/purchases/grn", json=grn_payload, headers=owner_headers)
    assert grn_res.status_code == 201
    grn = grn_res.json()
    assert "GRN-" in grn["grn_number"]
    # 100 * 25 + 12% GST = 2500 + 300 = 2800
    assert grn["total_amount"] == 2800.0

    # 4. Verify batch was automatically created in inventory
    batches = client.get(f"/api/v1/medicines/{cetzine['id']}/batches", headers=owner_headers).json()
    new_batch = next((b for b in batches if b["batch_number"] == batch_num), None)
    assert new_batch is not None, "GRN did not create physical batch in inventory!"
    assert new_batch["quantity_remaining"] == 100

    # 5. Verify Supplier Outstanding Ledger Balance increased by GRN total
    updated_sup = client.get("/api/v1/master/suppliers", headers=owner_headers).json()[0]
    expected_new_balance = round(initial_balance + 2800.0, 2)
    assert updated_sup["outstanding_balance"] == expected_new_balance

def test_supplier_payment_reconciliation(client, owner_headers):
    """
    Scenario 21: Distributor Payment & Ledger Reconciliation.
    Paying a supplier reduces their outstanding accounts payable balance.
    """
    supplier = client.get("/api/v1/master/suppliers", headers=owner_headers).json()[0]
    start_balance = supplier["outstanding_balance"]
    assert start_balance > 0

    pay_amount = 500.0
    pay_res = client.post("/api/v1/purchases/supplier-payments", json={
        "supplier_id": supplier["id"],
        "amount": pay_amount,
        "notes": "Direct NEFT bank transfer"
    }, headers=owner_headers)
    assert pay_res.status_code == 200
    res_data = pay_res.json()
    assert res_data["outstanding_balance"] == round(start_balance - pay_amount, 2)
