import uuid
from datetime import date, timedelta
import pytest

def test_create_and_list_medicines(client, owner_headers):
    """Scenario 10: Create medicines with various regulatory schedules and search them."""
    suffix = uuid.uuid4().hex[:5]
    med_payload = {
        "brand_name": f"Azithral {suffix}",
        "generic_name": "Azithromycin",
        "composition": "Azithromycin 500mg",
        "mrp": 120.0,
        "selling_price": 115.0,
        "purchase_price": 85.0,
        "schedule_type": "SCHEDULE_H",
        "category": "Antibiotic",
        "gst_rate": 12.0,
        "reorder_level": 25
    }
    create_res = client.post("/api/v1/medicines/", json=med_payload, headers=owner_headers)
    assert create_res.status_code == 201
    created_med = create_res.json()
    assert created_med["brand_name"] == med_payload["brand_name"]
    assert created_med["schedule_type"] == "SCHEDULE_H"

    # Search medicine by brand name
    search_res = client.get(f"/api/v1/medicines/?q=Azithral {suffix}", headers=owner_headers)
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) >= 1
    assert results[0]["id"] == created_med["id"]

def test_doctors_and_customers_crud(client, owner_headers):
    """Scenario 11: Master catalogs for Doctors and Customers."""
    suffix = uuid.uuid4().hex[:5]

    # Create Doctor
    doc_payload = {
        "name": f"Dr. Vikram Seth {suffix}",
        "registration_no": f"MCI-KA-{suffix.upper()}",
        "specialization": "Cardiologist",
        "contact": "9876543210"
    }
    doc_res = client.post("/api/v1/master/doctors", json=doc_payload, headers=owner_headers)
    assert doc_res.status_code == 201
    doc_data = doc_res.json()
    assert doc_data["registration_no"] == doc_payload["registration_no"]

    # List Doctors
    docs_list = client.get("/api/v1/master/doctors", headers=owner_headers).json()
    assert any(d["registration_no"] == doc_payload["registration_no"] for d in docs_list)

    # Create Customer
    cust_payload = {
        "name": f"Aakash Sharma {suffix}",
        "phone": f"98111{suffix[:5]}",
        "address": "Apartment 4B, Residency Road",
        "allergies": "Penicillin"
    }
    cust_res = client.post("/api/v1/master/customers", json=cust_payload, headers=owner_headers)
    assert cust_res.status_code == 201
    cust_data = cust_res.json()
    assert cust_data["name"] == cust_payload["name"]

    # List Customers
    custs_list = client.get("/api/v1/master/customers", headers=owner_headers).json()
    assert any(c["id"] == cust_data["id"] for c in custs_list)

def test_fefo_batch_ordering(client, owner_headers):
    """
    Scenario 12 (CRITICAL): FEFO (First-Expiry-First-Out) Ordering.
    When multiple batches exist for a medicine, they must be returned in
    strict chronological order of earliest expiry date first.
    """
    # Create a fresh medicine
    suffix = uuid.uuid4().hex[:5]
    med_res = client.post("/api/v1/medicines/", json={
        "brand_name": f"FEFO-Test-Med-{suffix}",
        "generic_name": "Paracetamol",
        "mrp": 50.0,
        "selling_price": 50.0,
        "purchase_price": 30.0,
        "schedule_type": "OTC",
        "gst_rate": 12.0
    }, headers=owner_headers)
    assert med_res.status_code == 201
    med_id = med_res.json()["id"]

    # Add Batch 1: Expiring in 180 days (Later)
    date_later = (date.today() + timedelta(days=180)).isoformat()
    client.post("/api/v1/inventory/batches", json={
        "medicine_id": med_id,
        "batch_number": f"BATCH-LATER-{suffix}",
        "expiry_date": date_later,
        "quantity_received": 100,
        "quantity_remaining": 100
    }, headers=owner_headers)

    # Add Batch 2: Expiring in 45 days (Earlier)
    date_earlier = (date.today() + timedelta(days=45)).isoformat()
    client.post("/api/v1/inventory/batches", json={
        "medicine_id": med_id,
        "batch_number": f"BATCH-EARLIER-{suffix}",
        "expiry_date": date_earlier,
        "quantity_received": 100,
        "quantity_remaining": 100
    }, headers=owner_headers)

    # Query batches for this medicine
    batches_res = client.get(f"/api/v1/medicines/{med_id}/batches", headers=owner_headers)
    assert batches_res.status_code == 200
    batches = batches_res.json()
    assert len(batches) == 2

    # Verify First-Expiry-First-Out: The 45-day batch MUST come before the 180-day batch
    assert batches[0]["batch_number"] == f"BATCH-EARLIER-{suffix}"
    assert batches[1]["batch_number"] == f"BATCH-LATER-{suffix}"
    assert batches[0]["expiry_date"] < batches[1]["expiry_date"]

def test_inventory_near_expiry_and_low_stock_alerts(client, owner_headers):
    """Scenario 13: Expiry and Low Stock automated alert detection."""
    # Near expiry check
    near_exp_res = client.get("/api/v1/inventory/near-expiry?days=90", headers=owner_headers)
    assert near_exp_res.status_code == 200
    near_exp = near_exp_res.json()
    assert isinstance(near_exp, list)

    # Low stock check
    low_stock_res = client.get("/api/v1/inventory/low-stock", headers=owner_headers)
    assert low_stock_res.status_code == 200
    low_stock = low_stock_res.json()
    assert isinstance(low_stock, list)
