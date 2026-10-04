# Medical Billing Application — Technical Architecture & Implementation Guide

**Purpose:** This document is the technical companion to the Requirements Document. It defines the recommended tech stack, system architecture, folder structure, database schema, API design, and a step-by-step build sequence. Hand this (together with the Requirements Document) to your development tool (Claude Code / Antigravity) as the engineering blueprint.

---

## 1. Recommended Tech Stack

The application is split into two independent projects — `frontend/` and `backend/` — communicating over a REST API.

| Layer | Technology | Why this choice |
|---|---|---|
| **Frontend** | React + TypeScript (via Vite) | Fast dev server, huge ecosystem, TypeScript catches bugs early — important for billing math and stock logic |
| Styling | Tailwind CSS + shadcn/ui | Rapid, consistent, professional UI; shadcn/ui gives accessible pre-built components (tables, forms, dialogs) ideal for data-heavy screens |
| State/data fetching | TanStack Query (React Query) | Handles server-state caching, auto-refetch, and loading/error states cleanly — important for live stock/price data |
| Local/UI state | Zustand | Lightweight, simple for cart/bill-in-progress state at POS screen |
| Forms & validation | React Hook Form + Zod | Strong validation needed for master data entry (drug details, GST, batch/expiry) |
| Routing | React Router | Standard, well-supported |
| **Backend** | Node.js + NestJS (TypeScript) | NestJS's modular architecture (modules/controllers/services) naturally mirrors your business modules (billing, inventory, purchases, etc.); built-in support for RBAC guards, validation pipes, and dependency injection — this matters a lot for a multi-module, multi-tenant app |
| API style | REST (OpenAPI/Swagger documented) | Simple, well understood by AI coding tools, easy to test with Postman/Swagger UI |
| ORM | Prisma | Type-safe database access, auto-generated types shared with backend logic, easy migrations — reduces bugs in a schema this relational (batches, tax, ledgers) |
| **Database** | PostgreSQL | Strong relational integrity (critical for stock quantities, batch-expiry links, financial ledgers); excellent support for row-level multi-tenancy; JSON columns available if needed for flexible fields |
| Caching/session | Redis | Session/token blacklisting, caching dashboard queries, rate-limiting |
| **Auth** | JWT (access + refresh tokens) + bcrypt password hashing | Stateless, scalable, works well across multiple store counters/devices |
| **File storage** | Cloud object storage (AWS S3 or S3-compatible, e.g., Cloudflare R2) | For prescription images, invoice PDFs, store logos |
| **PDF/Invoice generation** | Backend PDF library (e.g., pdf-lib or Puppeteer-based HTML-to-PDF) | Server-generated so a mobile/offline client never needs heavy PDF logic |
| **Containerization** | Docker + docker-compose | Consistent dev/prod environments; `frontend/`, `backend/`, `postgres`, `redis` as separate services |
| **Hosting (suggested starting point)** | Backend: Render/Railway/AWS ECS; Frontend: Vercel/Netlify/Cloudflare Pages; DB: managed Postgres (Supabase/Neon/RDS) | Keeps infra simple and cheap for an MVP, scales later to full AWS/Azure/GCP if needed |
| **Monitoring/logging** | Sentry (errors) + simple structured logging (Pino) | Billing errors must be caught immediately in production |

**Why not alternatives?**
- *Python/Django* is also a fine choice (strong admin panel, mature ORM), but NestJS+TypeScript was chosen here because sharing types/patterns between a TypeScript frontend and backend reduces mismatches in a schema-heavy domain, and AI coding tools tend to generate very consistent, well-structured NestJS code.
- *MongoDB* was not chosen because billing/stock/tax data is highly relational (a sale must atomically reduce exact batch stock, apply exact tax rates, and reconcile ledgers) — PostgreSQL's transactional integrity fits this far better than a document database.

---

## 2. High-Level Architecture

```
                     ┌─────────────────────────┐
                     │        Browser           │
                     │  (Billing counter /      │
                     │   Admin / Reports)        │
                     └────────────┬─────────────┘
                                  │ HTTPS
                     ┌────────────▼─────────────┐
                     │   frontend/ (React SPA)   │
                     │   Hosted on Vercel/       │
                     │   Netlify/Cloudflare       │
                     └────────────┬─────────────┘
                                  │ REST API (JSON, JWT auth)
                     ┌────────────▼─────────────┐
                     │   backend/ (NestJS API)   │
                     │  Modules: Auth, Tenant,   │
                     │  Medicine, Inventory,     │
                     │  Billing, Purchase,       │
                     │  Reports, Users           │
                     └──────┬─────────┬─────────┘
                            │         │
                 ┌──────────▼──┐   ┌──▼───────────┐
                 │ PostgreSQL   │   │    Redis      │
                 │ (primary DB) │   │ (cache/session)│
                 └──────────────┘   └───────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Cloud Object Storage │
                 │ (prescriptions, logos,│
                 │  generated invoices)  │
                 └───────────────────────┘
```

**Multi-tenancy approach:** Shared database, shared schema, every tenant-scoped table carries a `tenant_id` column. Every API request resolves the tenant from the authenticated user's JWT and the backend enforces `tenant_id` filtering at the service/repository layer — never trust a tenant ID coming from the frontend request body.

---

## 3. Project / Folder Structure

### 3.1 Repository layout (two top-level folders, as you requested)

```
medical-billing-app/
├── frontend/
│   ├── src/
│   │   ├── api/                # API client functions (one file per module)
│   │   ├── components/         # Reusable UI components
│   │   ├── features/           # Feature-based folders (billing, inventory, purchases, reports, settings, auth)
│   │   │   ├── billing/
│   │   │   ├── inventory/
│   │   │   ├── purchases/
│   │   │   ├── customers/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   └── auth/
│   │   ├── hooks/
│   │   ├── layouts/            # App shell, sidebar, billing-counter layout
│   │   ├── lib/                # Utilities (formatting, validation schemas)
│   │   ├── store/              # Zustand stores
│   │   ├── types/               # Shared TypeScript types/interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── .env
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # login, JWT, roles/guards
│   │   │   ├── tenants/         # tenant/store management, branches
│   │   │   ├── users/           # user CRUD, roles
│   │   │   ├── medicines/       # drug master, schedule classification
│   │   │   ├── manufacturers/
│   │   │   ├── suppliers/
│   │   │   ├── customers/
│   │   │   ├── doctors/
│   │   │   ├── inventory/       # batches, stock adjustments, alerts
│   │   │   ├── purchases/       # PO, GRN, purchase returns
│   │   │   ├── billing/         # bills, bill items, payments, returns
│   │   │   ├── prescriptions/   # prescription records, schedule register
│   │   │   ├── reports/         # sales/purchase/inventory/tax reports
│   │   │   └── audit/           # audit log service (used across modules)
│   │   ├── common/
│   │   │   ├── guards/          # RolesGuard, TenantGuard
│   │   │   ├── decorators/      # @CurrentUser(), @Roles()
│   │   │   ├── filters/         # global exception filter
│   │   │   ├── interceptors/    # logging, response transform
│   │   │   └── pipes/           # validation
│   │   ├── config/              # env config, database config
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   └── .env
│
├── docker-compose.yml
├── Medical_Billing_App_Requirements.md
└── Medical_Billing_App_Architecture_and_Implementation_Guide.md
```

**Why feature-based frontend folders and module-based backend folders:** both mirror the business modules from the Requirements Document one-to-one, so there's a direct, unambiguous mapping between "what the business needs" and "where the code lives" — this is exactly the kind of structure that's easiest for an AI coding assistant (or a new developer) to navigate and extend safely.

---

## 4. Database Schema (Core Tables)

This expands the data model from the Requirements Document into concrete tables. (Claude Code/Antigravity should translate this into a `schema.prisma` file.)

```
tenants
  id, name, address, gstin, drug_license_no, plan, created_at

branches
  id, tenant_id, name, address, is_main_branch

users
  id, tenant_id, branch_id (nullable), name, email, password_hash, role, is_active, created_at

manufacturers
  id, tenant_id, name, license_no

suppliers
  id, tenant_id, name, contact, address, gstin, outstanding_balance

medicines
  id, tenant_id, generic_name, brand_name, manufacturer_id, drug_type,
  composition, strength, pack_size, category, hsn_code, gst_rate,
  mrp, purchase_price, selling_price, schedule_type (OTC/H/H1/X),
  reorder_level, unit, barcode, is_active

batches
  id, tenant_id, branch_id, medicine_id, batch_number, mfg_date,
  expiry_date, quantity_received, quantity_remaining

customers
  id, tenant_id, name, phone, address, allergies, credit_balance

doctors
  id, tenant_id, name, registration_no, specialization, contact

purchase_orders
  id, tenant_id, branch_id, supplier_id, status, created_by, created_at

grn (goods_receipt_notes)
  id, tenant_id, purchase_order_id, received_by, received_at

grn_items
  id, grn_id, medicine_id, batch_number, expiry_date, quantity, cost_price

bills
  id, tenant_id, branch_id, customer_id (nullable), bill_number,
  created_by, payment_mode, subtotal, discount, tax, total,
  status (paid/credit/partially_paid), created_at

bill_items
  id, bill_id, medicine_id, batch_id, quantity, unit_price, tax_rate, line_total

prescriptions
  id, tenant_id, bill_id, customer_id, doctor_id, image_url, created_at

schedule_register_entries
  id, tenant_id, bill_id, medicine_id, patient_details, doctor_id, quantity, date

stock_adjustments
  id, tenant_id, branch_id, medicine_id, batch_id, quantity_change,
  reason (damage/expiry/theft/correction), adjusted_by, created_at

payments
  id, tenant_id, bill_id (nullable), customer_id, amount, mode, created_at

audit_logs
  id, tenant_id, user_id, action, entity, entity_id, metadata, created_at
```

**Key relational rules to enforce at the database/service layer:**
- A `bill_item` must always reference a `batch` with sufficient `quantity_remaining` — reducing stock and creating the bill item must happen in a single database transaction (never two separate writes).
- A `medicine` with `schedule_type` of H1 or X cannot be referenced in a `bill_item` unless a matching `schedule_register_entries` row is created in the same transaction.
- Every write to `batches`, `bills`, or `stock_adjustments` should also write an `audit_logs` row.

---

## 5. API Design (REST Endpoints — Representative List)

```
Auth
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout

Tenants & Branches (super admin / store admin)
  GET    /tenants/me
  PATCH  /tenants/me
  GET    /branches
  POST   /branches

Users
  GET    /users
  POST   /users
  PATCH  /users/:id
  DELETE /users/:id

Medicines
  GET    /medicines?search=&category=&schedule=
  POST   /medicines
  PATCH  /medicines/:id
  GET    /medicines/:id/batches

Inventory
  GET    /inventory/low-stock
  GET    /inventory/near-expiry
  POST   /inventory/stock-adjustments
  POST   /inventory/batches          (manual stock/opening stock entry)

Purchases
  GET    /purchase-orders
  POST   /purchase-orders
  POST   /purchase-orders/:id/grn
  POST   /purchase-returns

Billing
  POST   /bills                      (create bill — core transaction)
  GET    /bills/:id
  GET    /bills?date_from=&date_to=&customer_id=
  POST   /bills/:id/return
  POST   /bills/:id/payment

Customers / Doctors / Suppliers / Manufacturers
  GET/POST/PATCH  /customers, /doctors, /suppliers, /manufacturers

Prescriptions & Schedule Register
  POST   /prescriptions
  GET    /schedule-register?date_from=&date_to=

Reports
  GET    /reports/sales
  GET    /reports/purchases
  GET    /reports/inventory-valuation
  GET    /reports/expiry
  GET    /reports/tax-summary
  GET    /reports/profit-margin
```

Every endpoint (except `/auth/login`) requires a valid JWT; the backend extracts `tenant_id` and `role` from the token and applies `TenantGuard` + `RolesGuard` automatically — this should be implemented once as global guards, not repeated per-endpoint.

---

## 6. Security & Multi-Tenancy Enforcement Checklist

- [ ] Every Prisma query in every service includes a `tenant_id` filter — enforce this via a base repository pattern so it can't be forgotten
- [ ] JWT contains `userId`, `tenantId`, `role`, `branchId`
- [ ] Passwords hashed with bcrypt (never stored plain)
- [ ] Role-based guards on every controller route (`@Roles('admin','pharmacist')`)
- [ ] Rate limiting on `/auth/login` to prevent brute force
- [ ] Input validation on every DTO (class-validator with NestJS)
- [ ] HTTPS enforced everywhere; secure, httpOnly cookies or secure token storage on the frontend
- [ ] Audit log entry created for: bill creation, bill return, stock adjustment, price change, user creation/role change
- [ ] File uploads (prescription images) scanned/validated for type and size, stored in private cloud storage with signed URLs

---

## 7. Step-by-Step Implementation Guide

Follow this sequence. Each step is a working checkpoint — don't move to the next step until the current one runs end-to-end.

### Step 0 — Project Setup
1. Create the monorepo root with `frontend/` and `backend/` folders as shown in Section 3.
2. Initialize `backend/` with NestJS CLI (`nest new backend`), add Prisma, Postgres, Redis via `docker-compose.yml`.
3. Initialize `frontend/` with Vite (`npm create vite@latest frontend -- --template react-ts`), add Tailwind + shadcn/ui.
4. Set up `.env` files for both (DB connection string, JWT secret, cloud storage keys).
5. Confirm `docker-compose up` brings up Postgres + Redis locally.

### Step 1 — Auth & Multi-Tenancy Foundation
1. Build `tenants`, `users`, `branches` Prisma models and run first migration.
2. Build Auth module: signup (tenant + first admin user), login, JWT issue/refresh.
3. Build `TenantGuard` and `RolesGuard` as global guards.
4. Frontend: login screen, auth context/store, protected route wrapper.
5. **Checkpoint:** Can create a tenant, log in, and hit a protected "who am I" endpoint from the frontend.

### Step 2 — Master Data Modules
1. Build `manufacturers`, `suppliers`, `doctors`, `customers` modules (simple CRUD each) — backend first, then frontend list/create/edit screens for each.
2. Build `medicines` module, including schedule classification field and validation.
3. **Checkpoint:** Admin user can fully manage all master data from the UI.

### Step 3 — Inventory
1. Build `batches` model and inventory module: opening stock entry, batch listing per medicine, low-stock and near-expiry query endpoints.
2. Frontend: inventory dashboard showing stock by medicine/batch, alerts panel.
3. **Checkpoint:** Can add opening stock with batch/expiry and see it reflected correctly, including alerts.

### Step 4 — Billing (Core Transaction)
1. Build the `bills`/`bill_items` module with the critical transactional logic: deduct batch stock, apply tax, compute totals, enforce schedule-drug prescription requirement — all inside one DB transaction.
2. Frontend: POS screen — search/add medicine, quantity, batch auto-suggestion (FEFO), discount, payment mode, generate invoice.
3. Build invoice PDF generation (backend) and print/download flow (frontend).
4. **Checkpoint:** Can complete a full OTC sale end-to-end, stock reduces correctly, invoice is generated correctly.
5. Extend: prescription capture flow for Schedule H/H1/X items, schedule register entry creation.
6. **Checkpoint:** Attempting to bill a Schedule H1 drug without a prescription is blocked; with a prescription, it's billed and logged in the register.

### Step 5 — Purchases
1. Build `purchase_orders`, `grn`, `purchase_returns` modules — GRN creation must add new batches to inventory.
2. Frontend: create PO, receive GRN against PO, view supplier ledger.
3. **Checkpoint:** Receiving a GRN correctly creates new batch stock.

### Step 6 — Returns, Credit & Payments
1. Build bill return flow (full/partial, stock re-addition for valid returns).
2. Build customer credit ledger and payment collection against outstanding balance.
3. **Checkpoint:** Can process a return and see stock/ledger update correctly.

### Step 7 — Reports & Dashboard
1. Build report endpoints (sales, purchase, inventory valuation, expiry, tax, profit margin).
2. Frontend: reports section with filters and export (CSV/PDF), plus a dashboard home screen summarizing the day.
3. **Checkpoint:** All reports reflect accurate data from Steps 4–6.

### Step 8 — Roles, Audit & Settings Polish
1. Enforce granular role restrictions fully (cashier discount limits, schedule-drug restrictions, etc.).
2. Build audit log viewer (admin only).
3. Build store settings screen (invoice format, tax config, alert thresholds, branding).
4. **Checkpoint:** Full role-based walkthrough as admin, pharmacist, and cashier shows correct access limits.

### Step 9 — Multi-Branch & Offline Resilience
1. Extend inventory/billing to be branch-aware (stock per branch, branch filter on reports).
2. Implement offline bill queueing on the frontend (local storage queue + background sync service worker).
3. **Checkpoint:** Disconnecting internet mid-session still allows billing to continue and sync afterward.

### Step 10 — Deployment
1. Dockerize both `frontend/` and `backend/`.
2. Set up managed Postgres + Redis in the cloud.
3. Deploy backend (Render/Railway/AWS) and frontend (Vercel/Netlify).
4. Set up HTTPS, environment secrets, and automated daily database backups.
5. Set up Sentry error monitoring on both frontend and backend.
6. **Checkpoint:** A real user can sign up a new tenant and use the live system end-to-end.

### Step 11 — Hardening & Launch Prep
1. Load-test the billing endpoint for concurrent usage.
2. Full security review against the checklist in Section 6.
3. Write a short onboarding guide for first-time store users (in-app or PDF).

---

## 8. How to Hand This to Claude Code / Antigravity

Suggested first prompt when starting the project in your coding tool:

> "Here are two documents: a requirements document and an architecture document for a multi-tenant cloud-based medical billing application. Set up the monorepo structure exactly as described in Section 3 of the architecture document, then implement Step 0 and Step 1 of the implementation guide (Section 7). Use NestJS + Prisma + PostgreSQL for the backend and React + TypeScript + Vite + Tailwind + shadcn/ui for the frontend, in separate `frontend/` and `backend/` folders."

Then proceed step by step through Section 7, confirming each checkpoint before moving to the next — this keeps the AI assistant focused on one working module at a time rather than generating the whole system at once (which tends to produce inconsistent, hard-to-debug code).

---

*End of architecture document. Use together with the Requirements Document as the complete engineering brief.*
