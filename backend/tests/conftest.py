import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.core.database import Base, engine

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure database schema is created and initial seed data exists."""
    Base.metadata.create_all(bind=engine)
    seed_database()

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient instance."""
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def owner_token(client):
    """JWT bearer token for City Care Pharmacy store owner."""
    res = client.post("/api/v1/auth/login", json={
        "email": "owner@citycare.com",
        "password": "password123"
    })
    assert res.status_code == 200, f"Owner login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}

@pytest.fixture(scope="session")
def pharmacist_token(client):
    """JWT bearer token for City Care Pharmacy pharmacist."""
    res = client.post("/api/v1/auth/login", json={
        "email": "pharmacist@citycare.com",
        "password": "password123"
    })
    assert res.status_code == 200, f"Pharmacist login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def pharmacist_headers(pharmacist_token):
    return {"Authorization": f"Bearer {pharmacist_token}"}

@pytest.fixture(scope="session")
def cashier_token(client):
    """JWT bearer token for City Care Pharmacy cashier."""
    res = client.post("/api/v1/auth/login", json={
        "email": "cashier@citycare.com",
        "password": "password123"
    })
    assert res.status_code == 200, f"Cashier login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def cashier_headers(cashier_token):
    return {"Authorization": f"Bearer {cashier_token}"}

@pytest.fixture(scope="session")
def tenant_b_context(client):
    """
    Registers a distinct second pharmacy store ('Apollo Health Pharmacy')
    to rigorously test multi-tenancy row-level isolation and cross-tenant leakage prevention.
    """
    unique_suffix = uuid.uuid4().hex[:6]
    b_email = f"owner_apollo_{unique_suffix}@apollohealth.com"
    reg_payload = {
        "store_name": f"Apollo Health Pharmacy {unique_suffix}",
        "store_address": "77 Ring Road, Indiranagar",
        "gstin": "29XYZAB9876C1Z4",
        "drug_license_no": f"DL-APOLLO-{unique_suffix}",
        "admin_name": "Suresh Nair",
        "admin_email": b_email,
        "admin_password": "securepassword123"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Tenant B registration failed: {reg_res.text}"
    b_data = reg_res.json()
    b_token = b_data["access_token"]
    headers = {"Authorization": f"Bearer {b_token}"}
    return {
        "tenant_id": b_data["tenant_id"],
        "store_name": b_data["store_name"],
        "email": b_email,
        "token": b_token,
        "headers": headers
    }
