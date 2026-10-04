# Medical Software — Project Implementation & Progress Log

Welcome to the project documentation! This document tracks every step, design decision, technical update, and operational guide for the **Cloud-Based Medical Store Billing & Inventory Management Application**.

---

## 📌 Project Overview & Goals
- **Product:** A multi-tenant Software-as-a-Service (SaaS) application for medical pharmacies/stores.
- **Key Modules:** 
  1. High-Speed Point of Sale (POS) Billing counter with FEFO (First-Expiry-First-Out) batch suggestions.
  2. Regulatory compliance for Schedule H, H1, and X drugs (doctor & prescription enforcement).
  3. Real-time Inventory with batch-wise expiry tracking and low-stock alerts.
  4. Purchase Orders (PO) and Goods Receipt Notes (GRN).
  5. Tax & GST compliance (CGST/SGST/IGST breakdown, HSN codes, invoice generation).
  6. Financial ledgers and comprehensive analytics reports.
- **Budget/Hosting Requirement:** 100% Zero Cost (utilizing perpetually free tiers of Vercel, Render/Koyeb, and Neon/Supabase PostgreSQL).

---

## 🛠️ Technology Stack (Selected)

| Layer | Selected Technology | Why Chosen |
|---|---|---|
| **Frontend** | React (TypeScript) + Vite | Lightning-fast POS counter, no lag, rich user interface. |
| **Styling** | Tailwind CSS + Lucide Icons | Clean, modern medical design system, responsive across desktop and tablet. |
| **Backend** | Python (FastAPI) | High-speed async API, auto-generated interactive documentation, easy to understand. |
| **Database ORM** | SQLAlchemy 2.0 | Dual compatibility: Zero-setup SQLite for local testing, seamlessly connects to PostgreSQL in production. |
| **Authentication** | JWT (JSON Web Tokens) + Password Hashing | Secure role-based login (Owner, Pharmacist, Cashier, Accountant). |

---

## 📋 Implementation Checklist & Milestones

- [x] **Phase 0: Architecture & Project Blueprint Alignment**
  - Requirements and architecture analyzed.
  - Zero-cost hosting and dual-database strategy established.
- [x] **Step 0: Project Setup & Scaffolding**
  - [x] Initialized Python FastAPI backend with isolated virtual environment (`.venv`).
  - [x] Initialized React + TypeScript frontend with Tailwind CSS and Lucide icons.
  - [x] Configured local zero-cost SQLite database with automatic PostgreSQL switch capability.
  - [x] Created one-click Windows launchers (`run_backend.bat`, `run_frontend.bat`).
- [x] **Step 1: Core Database Models & Multi-Tenant Authentication**
  - [x] Created all 19 Core Database Tables (`tenants`, `branches`, `users`, `manufacturers`, `suppliers`, `medicines`, `batches`, `customers`, `doctors`, `purchase_orders`, `goods_receipt_notes`, `grn_items`, `bills`, `bill_items`, `prescriptions`, `schedule_register_entries`, `stock_adjustments`, `payments`, `audit_logs`).
  - [x] Direct Bcrypt password hashing & JWT token issuance/validation.
  - [x] Multi-tenancy row-level isolation via `tenant_id` and RBAC guards.
  - [x] Seeded realistic demo pharmacy: **"City Care Pharmacy"** with Doctor, Customer, Supplier, and Medicine records (OTC, Schedule H, and Schedule H1).
- [x] **Step 2: Core POS Billing Counter & Regulatory Enforcement Engine**
  - [x] Built instant search across medicines and batch stock.
  - [x] Built FEFO (First-Expiry-First-Out) batch recommendation.
  - [x] Statutory validation: Schedule H/H1/X drugs strictly require doctor prescription; Schedule H1/X records patient details in statutory register.
  - [x] Single-transaction atomic stock reduction during checkout.
  - [x] Printable GST tax invoice modal with subtotal, tax breakdown, and grand total.
- [x] **Step 3: Inventory & Expiry Tracking**
  - [x] Batch-wise inventory table with countdown badges.
  - [x] Low stock warnings and near-expiry alerts (30/60/90 days).
  - [x] Opening stock / manual batch intake modal.
- [x] **Step 4: Purchase Management (Purchase Orders -> GRN) & Supplier Ledgers**
  - [x] Purchase Order (PO) creation for distributors.
  - [x] Goods Receipt Note (GRN / Delivery Intake) processing.
  - [x] Automatic physical batch creation in inventory when GRN is received.
  - [x] Accounts payable tracking on supplier ledger with payment recording.
  - [x] Comprehensive automated test in `test_api.py` verifying PO, GRN, stock addition, and ledger reconciliation.
- [x] **Step 5: Full Reports & Analytics Dashboard (Export CSV/PDF)**
  - [x] Built date-filterable Sales Ledger report with invoice breakdown.
  - [x] Implemented GST Tax Summary calculation (CGST 50% and SGST 50% statutory split).
  - [x] Statutory Schedule H1 / Schedule X drug register with official CSV export for Drug Inspector audits.
  - [x] Built interactive multi-view Reports & Compliance Center in the frontend.
- [x] **Step 6: User & Role Access Management & Audit Logs**
  - [x] Added staff user onboarding endpoint (`POST /auth/staff`) allowing Store Owners to provision Pharmacists, Cashiers, and Accountants.
  - [x] Added immutable audit logs trail (`GET /reports/audit-logs`) tracking critical pharmacy transactions.
- [x] **Step 7: Production Deployment Guide (Free Hosting on Render + Vercel + Neon)**
  - [x] Zero-cost cloud database provisioning via Neon.tech / Supabase PostgreSQL.
  - [x] Free backend hosting on Render.com Web Service.
  - [x] Free frontend hosting on Vercel / Netlify.
  - [x] Environment variable configurations and automatic database switcher.

---

## 🚀 How to Run the Application Locally (Zero Setup)

You have two easy ways to run the project on your Windows machine:

### Option A: The One-Click Launchers (Easiest)
1. Double-click `run_backend.bat` in the repository root to start the Python FastAPI backend.
2. Double-click `run_frontend.bat` in the repository root to start the React frontend.
3. Open your browser and navigate to: **`http://localhost:5173`**
4. Double-click `run_tests.bat` in the repository root to run all 25 automated business scenario tests at any time!

### Option B: Terminal Commands
**Terminal 1 (Backend):**
```powershell
cd c:\Users\manik\Repositories\MedicalSoftware\backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
Interactive Swagger Documentation will be accessible at: `http://localhost:8000/docs`

**Terminal 2 (Frontend):**
```powershell
cd c:\Users\manik\Repositories\MedicalSoftware\frontend
npm run dev
```
Open: `http://localhost:5173`

---

## 🔑 Pre-Configured Demo Accounts (Ready to Test)

The database comes pre-seeded with sample pharmacy data for **"City Care Pharmacy"**:
- **Store Owner:** `owner@citycare.com` / `password123`
- **Pharmacist:** `pharmacist@citycare.com` / `password123`
- **Cashier:** `cashier@citycare.com` / `password123`

---

## 📝 Change Log & Work Record

### Entry 1: Project Scaffolding Initialized
- **Date:** October 04, 2026
- Set up project structure: `backend/` and `frontend/`.
- Configured Python virtual environment and installed FastAPI, SQLAlchemy, Pydantic, Bcrypt, and Python-Jose.
- Scaffolding Vite React TypeScript with Tailwind CSS.

### Entry 2: Complete Database Models, Seeding, and POS Billing Engine
- **Date:** October 05, 2026
- Implemented all 19 database tables covering tenancy, users, masters, inventory batches, billing, prescriptions, schedule registers, and audit logs.
- Added seed data for City Care Pharmacy with realistic drug schedules:
  - **Dolo 650:** OTC (Over the counter)
  - **Augmentin 625 Duo:** Schedule H (Requires doctor prescription)
  - **Alprax 0.5:** Schedule H1 (Requires doctor prescription + mandatory patient register entry)
  - **Cetzine 10:** OTC
- Automated testing (`test_api.py`) verified:
  - Auth login & token issuance.
  - FEFO batch listing.
  - Successful billing and atomic stock deduction.
  - Automatic blocking of Schedule H1 drugs when prescription is missing.
- Built interactive frontend with POS Billing counter, inventory alerts, medicine catalog, and statutory register tables.
- Verified production build via `npm run build`.

### Entry 3: Purchase Management, GRN Inward Stock & Supplier Ledgers
- **Date:** October 05, 2026
- Implemented Purchase Orders (`PO`) and Goods Receipt Notes (`GRN`) API endpoints.
- Implemented automatic inventory batch creation when stock is accepted through a GRN.
- Implemented accounts payable ledger tracking for distributors, with support for recording payments.
- Enhanced frontend with a dedicated **Purchases & Suppliers** tab including:
  - PO creation modal.
  - GRN stock intake modal with batch #, expiry date, purchase price, and GST calculation.
  - Distributor accounts payable table with "Record Payment" modal.
- End-to-end automated test (`test_api.py`) confirmed PO -> GRN -> stock increase -> supplier ledger credit -> payment reconciliation flow.

### Entry 4: Comprehensive Reports, GST Tax Summary & Statutory CSV Export
- **Date:** October 05, 2026
- Implemented financial and compliance endpoints in `backend/app/api/v1/endpoints/reports.py`:
  - `GET /reports/sales`: Filterable date range sales ledger, returning invoice counts, revenue, tax, and individual bills.
  - `GET /reports/tax-summary`: Computes 50% CGST and 50% SGST tax split for GST accountant filings.
  - `GET /reports/export/schedule-register-csv`: Generates and streams an official CSV export of Schedule H1/X drug dispensations formatted for Government Drug Inspector audits.
- Upgraded the frontend **Reports & Compliance Center** into a tabbed dashboard:
  - **Sales Report & Invoices:** Interactive date picker, 4 KPI cards (Invoices, Gross Sales, GST Collected, Discounts), and an invoice table with a one-click "Reprint Receipt" modal trigger.
  - **GST Tax Summary:** Central GST (CGST) and State GST (SGST) statutory cards, accompanied by an Indian Pharmacy GST slab guide (0%, 5%, 12%, 18%) and monthly GSTR-1 & GSTR-3B checklist.
  - **Schedule H1 Regulatory Register:** Full statutory register table with "Download Drug Inspector CSV" and "Print Register" actions.
- Verified TypeScript compilation and production build (`npm run build`) succeeded with 0 errors.

### Entry 5: Staff Onboarding, Role-Based Access Control (RBAC) & Immutable Audit Trail
- **Date:** October 05, 2026
- Added employee onboarding endpoints:
  - `GET /auth/staff`: Allows the Store Owner to list all active staff members and their roles.
  - `POST /auth/staff`: Allows the Store Owner to create new login accounts for Pharmacists, Cashiers, and Accountants.
- Added immutable audit trail endpoint (`GET /reports/audit-logs`) tracking critical actions like bill creation and stock adjustments.
- Automated end-to-end test suite (`backend/test_api.py`) expanded to 13 test scenarios covering health, auth, catalog, PO, GRN, stock auto-creation, supplier ledger payments, sales reports, GST split, CSV download, audit logs, and staff creation. All 13 tests passed with 100% success.

### Entry 6: Full Pytest Automated Test Suite (All 25 Business Scenarios)
- **Date:** October 05, 2026
- Implemented a complete, enterprise-grade automated test suite in `backend/tests/` covering **25 critical pharmacy business scenarios**:
  1. **Authentication & Multi-Tenancy Isolation (`tests/test_auth_and_multitenancy.py`)**:
     - `test_health_check`: Health check and database connectivity.
     - `test_tenant_registration`: Registration of new pharmacy tenants with automatic main branch and store owner user.
     - `test_duplicate_registration_fails`: Blocks duplicate tenant admin emails with HTTP 400.
     - `test_login_invalid_password`: Validates password security and rejects incorrect passwords with HTTP 401.
     - `test_unauthenticated_request_rejected`: Verifies protected API routes reject unauthenticated requests (HTTP 401).
     - `test_get_current_user_profile`: Validates `/auth/me` returns current user role and store profile.
     - `test_staff_onboarding_by_owner`: Verifies store owner can create Pharmacist and Cashier accounts.
     - `test_cashier_cannot_create_staff`: Enforces RBAC permissions: Cashiers cannot create staff (HTTP 403 Forbidden).
     - `test_multitenancy_isolation` (**CRITICAL**): Registers a completely distinct store ("Apollo Health Pharmacy") and verifies that Tenant A cannot see Tenant B's medicines or batches, and Tenant B cannot see Tenant A's records.
  2. **POS Billing & Statutory Drug Compliance (`tests/test_billing_and_compliance.py`)**:
     - `test_otc_billing_atomic_stock_deduction`: OTC drug billing automatically and atomically decreases physical batch stock.
     - `test_schedule_h_requires_doctor`: Schedule H drugs (e.g., Augmentin 625) strictly require doctor prescription and fail without it.
     - `test_schedule_h1_register_entry_mandatory`: Schedule H1 drugs (e.g., Alprax 0.5) strictly require patient KYC and doctor, and automatically write an audit entry into `schedule_register_entries`.
     - `test_insufficient_stock_prevention`: Blocks checkout if requested quantity exceeds available batch quantity.
     - `test_get_bill_by_id`: Retrieves full invoice details with line items for printing.
  3. **Master Data & FEFO Inventory Engine (`tests/test_master_and_inventory.py`)**:
     - `test_create_and_list_medicines`: Medicine catalog creation with search filtering.
     - `test_doctors_and_customers_crud`: Doctor and customer registration and lookup.
     - `test_fefo_batch_ordering`: **First-Expiry-First-Out** batch ordering: verifies earlier expiry batches are always dispensed before later expiry batches.
     - `test_inventory_near_expiry_and_low_stock_alerts`: Automated detection of low stock items and near-expiry batches.
  4. **Purchases, GRN Inward & Supplier Ledgers (`tests/test_purchases_and_grn.py`)**:
     - `test_purchase_order_and_grn_workflow`: Full purchase lifecycle: PO creation -> GRN intake -> automatic physical batch creation -> automatic supplier accounts payable ledger update.
     - `test_supplier_payment_reconciliation`: Distributor payment reduces outstanding ledger balance.
  5. **Reports, GST & Statutory Exports (`tests/test_reports_and_audit.py`)**:
     - `test_dashboard_metrics`: Store KPI summary.
     - `test_sales_report_with_date_filtering`: Date-filtered sales ledger report.
     - `test_gst_tax_summary_statutory_split`: GST 50% CGST and 50% SGST tax split.
     - `test_schedule_drug_register_csv_export`: Official Government Drug Inspector CSV export.
     - `test_immutable_audit_logs`: Audit trail validation.
- Created one-click Windows test launcher: [run_tests.bat](file:///c:/Users/manik/Repositories/MedicalSoftware/run_tests.bat).
- Execution result: **25 passed in 4.19s with 0 errors!**


---

## ☁️ Step-by-Step Free Production Deployment Guide (100% Zero Cost)

You can host this entire application online **permanently for ₹0 / $0** using the free tiers of standard, reliable cloud providers.

### Architecture Overview for Free Hosting

```
+---------------------------+       +-------------------------------+       +------------------------------------+
|  Vercel / Netlify         | ----> |  Render.com (Free Web Service)| ----> |  Neon.tech / Supabase (Free Tier)  |
|  React + Vite Frontend    |       |  Python FastAPI Backend       |       |  Managed Cloud PostgreSQL Database |
|  Cost: $0 / month         |       |  Cost: $0 / month             |       |  Cost: $0 / month                  |
+---------------------------+       +-------------------------------+       +------------------------------------+
```

---

### Step 1: Set Up Free Cloud PostgreSQL Database (Neon.tech or Supabase)

1. Go to [https://neon.tech](https://neon.tech) (or [https://supabase.com](https://supabase.com)) and sign up for a free account.
2. Click **Create Project**, give it a name like `medical-software-db`, and choose a region close to your users (e.g., `AWS Asia Pacific - Singapore` or `AWS Asia Pacific - Mumbai`).
3. Once created, Neon provides a PostgreSQL connection string in this format:
   ```
   postgresql://username:password@ep-cool-flower-123456.ap-southeast-1.neon.tech/neondb?sslmode=require
   ```
4. Save this connection string securely. **That is all!** Neon automatically handles backups and encryption at zero cost.

---

### Step 2: Deploy the Python Backend on Render.com (Free)

1. Push your repository to GitHub:
   ```powershell
   git add .
   git commit -m "Complete medical billing application"
   git push origin main
   ```
2. Go to [https://render.com](https://render.com) and create a free account.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name:** `medical-software-api`
   - **Region:** Singapore / Frankfurt
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port 10000
     ```
   - **Instance Type:** `Free` ($0/mo)
6. Add **Environment Variables** under the Environment tab:
   - `DATABASE_URL`: Paste the Neon PostgreSQL connection string from Step 1.
     *(Note: Change `postgresql://` to `postgresql+psycopg2://` if using psycopg2, or our SQLAlchemy engine will handle `postgresql://` automatically).*
   - `SECRET_KEY`: Enter a random secure string (e.g. `medical-secret-super-key-2026`).
   - `ENVIRONMENT`: `production`
7. Click **Deploy Web Service**.
8. Render will build and launch your backend API, giving you a live free URL such as:
   `https://medical-software-api.onrender.com`
9. Once live, seed the initial database by running the seed command once using the Render Shell tab:
   ```bash
   python -m app.seed
   ```

---

### Step 3: Deploy the React Frontend on Vercel (Free)

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository.
4. In the configuration screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and choose `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add an **Environment Variable**:
   - `VITE_API_BASE_URL`: `https://medical-software-api.onrender.com/api/v1`
     *(This connects your live frontend to your live Render backend).*
6. Click **Deploy**.
7. In ~30 seconds, Vercel will give you a production HTTPS URL, such as:
   `https://medical-software.vercel.app`

---

### Step 4: Access Your Live Medical Software!

Open your Vercel URL on any computer, tablet, or mobile phone. You can log in immediately using the pre-seeded store owner credentials:
- **Email:** `owner@citycare.com`
- **Password:** `password123`

You can change passwords, add your staff, and create your real store inventory with zero monthly server costs!

