import uuid
from datetime import date, timedelta
import pytest

def test_otc_billing_atomic_stock_deduction(client, owner_headers):
    """
    Scenario 14 (CRITICAL): OTC Medicine Billing & Atomic Stock Deduction.
    Stock must be reduced within the same database transaction as invoice creation.
    """
    # 1. Fetch Dolo 650 (OTC drug from seed)
    meds = client.get("/api/v1/medicines/?q=Dolo 650", headers=owner_headers).json()
    assert len(meds) > 0
    dolo = next((m for m in meds if m.get("selling_price", 0) > 0), meds[0])

    # 2. Get available batch
    batches = client.get(f"/api/v1/medicines/{dolo['id']}/batches", headers=owner_headers).json()
    assert len(batches) > 0
    batch = batches[0]
    initial_stock = batch["quantity_remaining"]
    assert initial_stock >= 5

    # 3. Create Bill for 3 units
    bill_payload = {
        "payment_mode": "CASH",
        "discount": 0.0,
        "items": [
            {
                "medicine_id": dolo["id"],
                "batch_id": batch["id"],
                "quantity": 3,
                "unit_price": dolo["selling_price"],
                "tax_rate": dolo["gst_rate"]
            }
        ]
    }
    bill_res = client.post("/api/v1/billing/", json=bill_payload, headers=owner_headers)
    assert bill_res.status_code == 201, f"Billing failed: {bill_res.text}"
    bill_data = bill_res.json()
    assert "INV-" in bill_data["bill_number"]
    assert bill_data["status"] == "PAID"
    assert bill_data["total"] > 0

    # 4. Verify batch stock was atomically reduced by exactly 3
    updated_batch = client.get(f"/api/v1/medicines/{dolo['id']}/batches", headers=owner_headers).json()[0]
    assert updated_batch["quantity_remaining"] == initial_stock - 3

def test_schedule_h_requires_doctor(client, owner_headers):
    """
    Scenario 15 (REGULATORY COMPLIANCE): Schedule H Drug Enforcement.
    Schedule H drug (Augmentin 625) cannot be billed without a prescribing doctor.
    """
    # Fetch Augmentin 625
    meds = client.get("/api/v1/medicines/?q=Augmentin 625", headers=owner_headers).json()
    assert len(meds) > 0
    aug = meds[0]

    batches = client.get(f"/api/v1/medicines/{aug['id']}/batches", headers=owner_headers).json()
    assert len(batches) > 0
    batch = batches[0]

    # Attempt billing WITHOUT doctor or prescription
    invalid_bill = {
        "payment_mode": "CASH",
        "items": [
            {
                "medicine_id": aug["id"],
                "batch_id": batch["id"],
                "quantity": 1,
                "unit_price": aug["selling_price"],
                "tax_rate": aug["gst_rate"]
            }
        ]
    }
    fail_res = client.post("/api/v1/billing/", json=invalid_bill, headers=owner_headers)
    assert fail_res.status_code == 400
    assert "prescription" in fail_res.json()["detail"].lower() or "doctor" in fail_res.json()["detail"].lower()

    # Now provide doctor in prescription -> Must succeed
    doctors = client.get("/api/v1/master/doctors", headers=owner_headers).json()
    doc_id = doctors[0]["id"]
    valid_bill = {
        "prescription": {
            "doctor_id": doc_id,
            "notes": "Verified prescription"
        },
        "payment_mode": "UPI",
        "items": [
            {
                "medicine_id": aug["id"],
                "batch_id": batch["id"],
                "quantity": 1,
                "unit_price": aug["selling_price"],
                "tax_rate": aug["gst_rate"]
            }
        ]
    }
    success_res = client.post("/api/v1/billing/", json=valid_bill, headers=owner_headers)
    assert success_res.status_code == 201
    assert "INV-" in success_res.json()["bill_number"]

def test_schedule_h1_register_entry_mandatory(client, owner_headers):
    """
    Scenario 16 (REGULATORY COMPLIANCE): Schedule H1 / Schedule X Statutory Register.
    Alprax 0.5 (Schedule H1) requires complete patient KYC and doctor,
    and automatically logs into statutory register for government drug inspector audits.
    """
    meds = client.get("/api/v1/medicines/?q=Alprax", headers=owner_headers).json()
    assert len(meds) > 0
    alprax = meds[0]

    batches = client.get(f"/api/v1/medicines/{alprax['id']}/batches", headers=owner_headers).json()
    assert len(batches) > 0
    batch = batches[0]

    doctors = client.get("/api/v1/master/doctors", headers=owner_headers).json()
    doc_id = doctors[0]["id"]

    # Attempt billing with prescription but WITHOUT schedule entries (patient KYC) -> Fails
    fail_payload = {
        "prescription": {"doctor_id": doc_id},
        "payment_mode": "CASH",
        "items": [
            {
                "medicine_id": alprax["id"],
                "batch_id": batch["id"],
                "quantity": 1,
                "unit_price": alprax["selling_price"],
                "tax_rate": alprax["gst_rate"]
            }
        ]
    }
    fail_res = client.post("/api/v1/billing/", json=fail_payload, headers=owner_headers)
    assert fail_res.status_code == 400
    assert "patient" in fail_res.json()["detail"].lower() or "schedule" in fail_res.json()["detail"].lower()

    # Provide full patient KYC in schedule_entries
    patient_name = f"Patient {uuid.uuid4().hex[:4]}"
    valid_payload = {
        "prescription": {"doctor_id": doc_id},
        "schedule_entries": [
            {
                "medicine_id": alprax["id"],
                "doctor_id": doc_id,
                "patient_name": patient_name,
                "patient_phone": "9876500000",
                "patient_address": "House #12, Brigade Road",
                "quantity": 2
            }
        ],
        "payment_mode": "CARD",
        "items": [
            {
                "medicine_id": alprax["id"],
                "batch_id": batch["id"],
                "quantity": 2,
                "unit_price": alprax["selling_price"],
                "tax_rate": alprax["gst_rate"]
            }
        ]
    }
    res = client.post("/api/v1/billing/", json=valid_payload, headers=owner_headers)
    assert res.status_code == 201

    # Verify entry is recorded in the official Schedule Register
    reg_res = client.get("/api/v1/reports/schedule-register", headers=owner_headers)
    assert reg_res.status_code == 200
    entries = reg_res.json()
    matching_entry = next((e for e in entries if e["patient_name"] == patient_name), None)
    assert matching_entry is not None, "Schedule H1 transaction was not recorded in statutory register!"
    assert matching_entry["quantity"] == 2

def test_insufficient_stock_prevention(client, owner_headers):
    """Scenario 17: Attempting to bill more units than present in a batch returns HTTP 400."""
    meds = client.get("/api/v1/medicines/?q=Dolo 650", headers=owner_headers).json()
    dolo = meds[0]
    batch = client.get(f"/api/v1/medicines/{dolo['id']}/batches", headers=owner_headers).json()[0]

    excessive_qty = batch["quantity_remaining"] + 9999
    payload = {
        "payment_mode": "CASH",
        "items": [
            {
                "medicine_id": dolo["id"],
                "batch_id": batch["id"],
                "quantity": excessive_qty,
                "unit_price": dolo["selling_price"],
                "tax_rate": dolo["gst_rate"]
            }
        ]
    }
    res = client.post("/api/v1/billing/", json=payload, headers=owner_headers)
    assert res.status_code == 400
    assert "insufficient stock" in res.json()["detail"].lower()

def test_get_bill_by_id(client, owner_headers):
    """Scenario 18: Retrieve itemized invoice details for printing."""
    # List recent bills
    bills = client.get("/api/v1/billing/", headers=owner_headers).json()
    assert len(bills) > 0
    bill_id = bills[0]["id"]

    # Fetch specific bill
    single_res = client.get(f"/api/v1/billing/{bill_id}", headers=owner_headers)
    assert single_res.status_code == 200
    bill_details = single_res.json()
    assert bill_details["id"] == bill_id
    assert len(bill_details["items"]) > 0
    assert "unit_price" in bill_details["items"][0]
