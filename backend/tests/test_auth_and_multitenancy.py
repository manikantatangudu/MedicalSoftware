import uuid
import pytest

def test_health_check(client):
    """Scenario 1: Health check endpoint responds with service status."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

def test_tenant_registration(client):
    """Scenario 2: Successful registration of a new pharmacy tenant."""
    unique_suffix = uuid.uuid4().hex[:6]
    email = f"owner_{unique_suffix}@newstore.com"
    payload = {
        "store_name": f"Green Valley Chemist {unique_suffix}",
        "store_address": "Main Market, Sector 14",
        "gstin": "07AAAAA0000A1Z5",
        "drug_license_no": f"DL-GV-{unique_suffix}",
        "admin_name": "Deepak Verma",
        "admin_email": email,
        "admin_password": "password123"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["email"] == email
    assert data["role"] == "STORE_OWNER"
    assert data["store_name"] == payload["store_name"]

def test_duplicate_registration_fails(client):
    """Scenario 3: Attempting to register an already existing email returns HTTP 400."""
    payload = {
        "store_name": "Duplicate Pharmacy",
        "admin_name": "Test User",
        "admin_email": "owner@citycare.com",  # Already exists from seed
        "admin_password": "password123"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()

def test_login_invalid_password(client):
    """Scenario 4: Login with incorrect password returns HTTP 401."""
    res = client.post("/api/v1/auth/login", json={
        "email": "owner@citycare.com",
        "password": "wrongpassword_xyz"
    })
    assert res.status_code == 401
    assert "incorrect email or password" in res.json()["detail"].lower()

def test_unauthenticated_request_rejected(client):
    """Scenario 5: Calling protected endpoints without Authorization header returns HTTP 401."""
    res = client.get("/api/v1/medicines/")
    assert res.status_code == 401

def test_get_current_user_profile(client, owner_headers):
    """Scenario 6: /auth/me returns the profile and role of authenticated user."""
    res = client.get("/api/v1/auth/me", headers=owner_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "owner@citycare.com"
    assert data["role"] == "STORE_OWNER"

def test_staff_onboarding_by_owner(client, owner_headers):
    """Scenario 7: Store Owner can create and list staff accounts (Pharmacist, Cashier)."""
    unique_suffix = uuid.uuid4().hex[:6]
    staff_email = f"staff_{unique_suffix}@citycare.com"
    staff_payload = {
        "name": f"Pharmacist John {unique_suffix}",
        "email": staff_email,
        "password": "password123",
        "role": "PHARMACIST"
    }
    res = client.post("/api/v1/auth/staff", json=staff_payload, headers=owner_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == staff_email
    assert data["role"] == "PHARMACIST"

    # List staff
    list_res = client.get("/api/v1/auth/staff", headers=owner_headers)
    assert list_res.status_code == 200
    staff_list = list_res.json()
    assert any(s["email"] == staff_email for s in staff_list)

def test_cashier_cannot_create_staff(client, cashier_headers):
    """Scenario 8: Non-owner roles (Cashier) are forbidden from creating staff (HTTP 403)."""
    payload = {
        "name": "Unauthorized Staff",
        "email": f"unauth_{uuid.uuid4().hex[:4]}@citycare.com",
        "password": "password123",
        "role": "PHARMACIST"
    }
    res = client.post("/api/v1/auth/staff", json=payload, headers=cashier_headers)
    assert res.status_code == 403

def test_multitenancy_isolation(client, owner_headers, tenant_b_context):
    """
    Scenario 9 (CRITICAL): Multi-Tenant Data Isolation.
    Data created in Tenant B must NEVER appear in Tenant A, and vice-versa.
    """
    # 1. Tenant B creates a unique medicine
    b_med_name = f"ApolloUniqueMed-{uuid.uuid4().hex[:6]}"
    b_res = client.post("/api/v1/medicines/", json={
        "brand_name": b_med_name,
        "generic_name": "Test Molecule",
        "mrp": 99.0,
        "selling_price": 90.0,
        "purchase_price": 60.0,
        "schedule_type": "OTC",
        "gst_rate": 12.0
    }, headers=tenant_b_context["headers"])
    assert b_res.status_code == 201
    b_med = b_res.json()

    # 2. Tenant A lists medicines -> b_med MUST NOT be present
    a_meds_res = client.get("/api/v1/medicines/", headers=owner_headers)
    assert a_meds_res.status_code == 200
    a_med_names = [m["brand_name"] for m in a_meds_res.json()]
    assert b_med_name not in a_med_names, "Data leak! Tenant A saw Tenant B's medicine!"

    # 3. Tenant B lists medicines -> Tenant A's seed medicines (Dolo 650) MUST NOT be present
    b_meds_res = client.get("/api/v1/medicines/", headers=tenant_b_context["headers"])
    assert b_meds_res.status_code == 200
    b_med_brands = [m["brand_name"] for m in b_meds_res.json()]
    assert "Dolo 650" not in b_med_brands, "Data leak! Tenant B saw Tenant A's Dolo 650!"
    assert b_med_name in b_med_brands

    # 4. Cross-tenant batch query isolation
    # Tenant A attempts to view batches for Tenant B's medicine -> Must return empty list
    leak_test = client.get(f"/api/v1/medicines/{b_med['id']}/batches", headers=owner_headers)
    assert leak_test.status_code == 200
    assert len(leak_test.json()) == 0
