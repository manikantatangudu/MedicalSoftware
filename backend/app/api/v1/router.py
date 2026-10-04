from fastapi import APIRouter
from app.api.v1.endpoints import auth, medicines, inventory, billing, master, reports, purchases

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Tenants"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["Medicines Master"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory & Batches"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing & POS"])
api_router.include_router(purchases.router, prefix="/purchases", tags=["Purchases & GRN"])
api_router.include_router(master.router, prefix="/master", tags=["Master Catalogs"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Statutory Registers"])

