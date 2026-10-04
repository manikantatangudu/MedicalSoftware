# Cloud-Based Medical Billing Application — Requirements Document

**Purpose of this document:** This is a complete, end-to-end requirements specification for a cloud-based medical billing and pharmacy management application. It is intended to be handed to a developer (or an AI coding assistant such as Claude Code) as the single source of truth for building the system from scratch. It covers business requirements, functional modules, data model, user roles, security, compliance, and technical architecture.

---

## 1. Project Overview

### 1.1 What the application is
A cloud-based, multi-tenant Software-as-a-Service (SaaS) application that medical stores (pharmacies) use to:
- Bill customers for medicines (OTC and prescription)
- Manage drug inventory with batch and expiry tracking
- Manage purchases from distributors/suppliers
- Track customers, doctors, and prescriptions
- Generate compliance, tax, and business reports
- Operate across one or many store locations

### 1.2 Who uses it
- **Multiple independent medical shops** (tenants) — each shop's data must be isolated from other shops
- **Multiple users within each shop** — owner/admin, pharmacist, cashier, accountant
- Optionally, a **platform-level super admin** (you, the product owner) who manages all tenant accounts, subscriptions, and billing for the SaaS product itself

### 1.3 Business model assumption
Multi-tenant SaaS: one deployment serves many medical stores, each with their own isolated data, users, and billing subscription to use the software. (If a single-shop-only version is intended instead, Section 15 explains what to drop.)

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Fast, accurate, GST/tax-compliant billing at the counter
- Accurate, real-time stock visibility with expiry tracking to reduce losses
- Support for prescription-controlled drug sales per regulatory schedules
- Usable by non-technical pharmacy staff with minimal training
- Cloud-hosted, accessible from any device/browser, works across multiple store counters
- Scalable to onboard many medical store businesses (multi-tenant)

### 2.2 Non-goals (out of scope for v1)
- Full hospital/clinical EMR (electronic medical records) functionality
- Insurance claims processing (can be a future phase)
- E-commerce/online ordering for end customers (future phase)
- Telemedicine/doctor consultation features

---

## 3. User Roles & Permissions

| Role | Scope | Typical Permissions |
|---|---|---|
| **Super Admin** (platform owner) | Across all tenants | Manage tenant accounts, subscriptions/plans, platform-wide settings, view platform analytics, suspend/activate tenant accounts |
| **Store Owner/Admin** | Single tenant (their store, incl. multi-branch) | Full access within their store: manage users, inventory, purchases, pricing, reports, settings, branches |
| **Pharmacist** | Single tenant | Billing (incl. prescription drugs), verify prescriptions, inventory view/edit, returns |
| **Cashier** | Single tenant | OTC billing only, view stock (read-only), cannot sell Schedule H/H1/X drugs without pharmacist approval, cannot edit master data |
| **Accountant/Manager** | Single tenant | View/export sales, purchase, tax, and profit reports; no billing access required |
| **Branch Manager** (if multi-branch) | One branch within tenant | Admin rights scoped to their branch only |

**Requirement:** Every action in the system must be tied to a logged-in user and store (tenant), for audit trail purposes.

---

## 4. Multi-Tenancy Requirements

- Each medical store (tenant) signs up independently and gets an isolated workspace
- Data isolation: one tenant must never see another tenant's data (enforce at database/query level, not just UI level)
- Each tenant can have **one or multiple branches/outlets** under one account
- Subscription/plan management: trial period, paid plans, usage limits (e.g., number of users, number of branches, number of bills/month)
- Tenant-level settings: store name, address, GST/tax registration number, drug license number, logo, invoice format, currency, timezone

---

## 5. Functional Requirements by Module

### 5.1 Master Data Management

**5.1.1 Medicine / Drug Master**
- Generic name
- Brand name
- Manufacturer/company name
- Drug type (tablet, capsule, syrup, injection, ointment, drops, inhaler, etc.)
- Salt/composition (active ingredients)
- Strength/dosage (e.g., 500mg, 5ml)
- Pack size/unit (e.g., strip of 10, bottle of 100ml)
- Therapeutic category (antibiotic, analgesic, antidiabetic, antacid, etc.)
- HSN code (for tax classification)
- GST/tax rate
- MRP (Maximum Retail Price)
- Purchase price / cost price
- Selling price (if different from MRP where legally allowed)
- Drug schedule classification (see 5.1.2)
- Reorder level / minimum stock threshold
- Unit of measurement (strip, bottle, tube, box, loose tablet)
- Barcode/SKU
- Active/inactive status

**5.1.2 Drug Schedule Classification** (regulatory — adapt to local jurisdiction, e.g., India's Drugs and Cosmetics Act)
- OTC (Over-the-counter — no prescription needed)
- Schedule H (prescription required, dispensed once, no refill without new prescription)
- Schedule H1 (prescription required + mandatory register entry with patient/doctor details, stricter audit)
- Schedule X (narcotics/psychotropic — special license, dedicated register, restricted sale)
- System must enforce: a drug marked Schedule H/H1/X cannot be billed without a prescription record attached and (for H1/X) a register entry

**5.1.3 Manufacturer/Company Master**
- Company name, contact details, license number (if applicable)

**5.1.4 Supplier/Distributor Master**
- Name, contact, address, GSTIN/tax ID, credit terms, outstanding balance

**5.1.5 Customer Master**
- Name, phone number, address
- Optional: age/DOB, gender, known allergies, linked doctor(s)
- Purchase history (auto-linked)
- Loyalty points/credit balance (optional feature)

**5.1.6 Doctor Master**
- Name, registration number, specialization, contact
- Used to link prescriptions to a verifiable doctor

**5.1.7 Tax Master**
- GST slabs (0%, 5%, 12%, 18%, etc., depending on drug category)
- CGST/SGST/IGST split logic (for countries with split tax systems)

---

### 5.2 Inventory Management

- Batch-wise stock tracking: batch number, manufacturing date, expiry date, quantity received, quantity remaining
- FEFO (First-Expiry-First-Out) — system should suggest/enforce selling the batch expiring soonest first
- Stock levels per branch (if multi-branch)
- Low-stock / reorder alerts (configurable threshold per medicine)
- Near-expiry alerts (e.g., medicines expiring within 30/60/90 days — configurable)
- Expired stock handling: auto-flag, block from sale, separate "expired stock" report
- Stock adjustment entries (damage, loss, theft, expiry write-off) with reason codes and approval
- Stock transfer between branches (if multi-branch)
- Opening stock entry (for onboarding existing inventory into the system)
- Barcode/QR code generation and scanning support at billing and stock-entry points

---

### 5.3 Purchase Management

- Purchase order creation (to a supplier, listing medicines and quantities)
- Goods Receipt Note (GRN): record actual received stock against a PO, capturing batch number and expiry date per item
- Purchase invoice entry (linked to GRN, for accounting)
- Purchase returns (damaged/expired/wrong items sent back to supplier)
- Supplier ledger (outstanding payables, payment tracking)
- Partial delivery handling (PO partially fulfilled across multiple GRNs)

---

### 5.4 Billing / Point of Sale (POS)

- Fast search-and-add medicine to bill (by name, barcode, or category)
- Auto-fetch price, tax, and available batches (FEFO suggested batch) for each item
- Loose/strip splitting — ability to sell individual units, not just full packs
- Prescription capture: for Schedule H/H1/X drugs, require prescription image/reference, doctor name, and (for H1/X) patient ID proof details, logged in a prescription register
- Discounts: item-level and bill-level, with role-based limits (e.g., cashier can't exceed X% discount without approval)
- Payment modes: cash, card, UPI/digital wallet, credit (store ledger), split payment
- Credit sales: customer ledger with outstanding balance tracking and payment collection
- Returns/refunds: full or partial, linked to original bill, stock re-added for valid (non-expired, unopened) returns
- Invoice generation: must include store name, address, GSTIN, drug license number, bill number, date/time, itemized list (batch, expiry, qty, rate, tax, total), and total amount in compliant format
- Print and digital (SMS/WhatsApp/email) invoice delivery options
- Hold/resume bill (for interruptions at the counter)
- Day-end cash reconciliation (expected vs. actual cash in drawer)

---

### 5.5 Prescription & Regulatory Register

- Digital register for Schedule H1/X drug sales (patient name, address, doctor, drug, quantity, date — as required by local law)
- Ability to attach/scan prescription image to a bill
- Searchable prescription history per customer

---

### 5.6 Reports & Analytics

- Sales reports: by date range, by medicine, by company/manufacturer, by category, by branch, by cashier
- Purchase reports: by supplier, by date range
- Inventory reports: current stock, stock valuation, fast-moving/slow-moving items, dead stock
- Expiry reports: expired items, near-expiry items (with configurable alert window)
- Schedule drug register report (for regulatory audits/inspections)
- Tax reports: GST collected, GST paid (input credit), tax summary by slab
- Profit/margin reports: per medicine, per category, overall
- Customer reports: top customers, outstanding credit, purchase history
- Supplier reports: outstanding payables
- Dashboard: daily sales summary, low stock alerts, near-expiry alerts, top-selling items (visual widgets)

---

### 5.7 User & Access Management

- User creation with role assignment (per Section 3)
- Login with secure password; optional 2FA/OTP
- Branch-level access restriction for multi-branch tenants
- Full audit trail: every bill, stock adjustment, price change, and user action logged with user ID, timestamp, and IP/device
- Session management (auto-logout after inactivity, especially important for shared store counters)

---

### 5.8 Settings & Configuration

- Store profile (name, address, logo, license numbers, GSTIN)
- Invoice numbering format and customization
- Tax configuration
- Alert thresholds (low stock, near-expiry)
- Printer/receipt configuration (thermal printer support)
- Backup and data export options

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Billing screen must respond in under 1–2 seconds per item add; support at least 50–100 concurrent billing sessions per deployment initially |
| **Availability** | Cloud-hosted with high uptime target (e.g., 99.5%+); automated backups (daily minimum) |
| **Offline resilience** | Billing counter should be able to queue bills locally and sync when internet returns (critical — pharmacies cannot stop billing due to internet drops) |
| **Scalability** | Architecture should support horizontal scaling as more tenants/stores onboard |
| **Security** | Encrypted data in transit (HTTPS/TLS) and at rest; role-based access control; password hashing; audit logs |
| **Data privacy** | Customer health-adjacent data (allergies, prescriptions) must be protected; comply with applicable data protection regulations in the target country |
| **Browser/device support** | Responsive web app usable on desktop (billing counter) and tablet/mobile (for admin/reports on the go) |
| **Localization** | Support for local currency, date format, and (if needed) regional language for the UI |
| **Backup & recovery** | Regular automated backups; documented disaster recovery process |

---

## 7. Core Data Entities (High-Level Data Model)

```
Tenant (Store Account)
 ├─ Branch
 ├─ User (role-linked)
 ├─ Medicine (linked to Manufacturer, Schedule, Tax)
 │   └─ Batch (expiry, quantity, linked to Medicine + Branch)
 ├─ Manufacturer
 ├─ Supplier
 ├─ Customer
 ├─ Doctor
 ├─ PurchaseOrder → GRN → PurchaseInvoice
 ├─ Bill (Invoice)
 │   └─ BillItem (linked to Medicine + Batch)
 ├─ Prescription (linked to Bill, Customer, Doctor)
 ├─ ScheduleDrugRegisterEntry
 ├─ StockAdjustment
 ├─ Payment / CustomerLedger
 └─ AuditLog
```

This should guide the database schema design — each tenant's data should be scoped by a `tenant_id` (or isolated database/schema, depending on chosen multi-tenancy strategy).

---

## 8. Suggested Technical Architecture (for discussion with your developer/AI assistant)

> This section is a starting point, not a fixed decision — your developer/Claude Code can refine it based on your scale and budget.

- **Frontend:** Responsive web application (works on desktop browsers at the billing counter and on tablets/phones for management)
- **Backend:** REST or GraphQL API layer, with clear separation per module (billing, inventory, purchases, reports, users)
- **Database:** Relational database (e.g., PostgreSQL/MySQL) — relational integrity matters a lot here (stock, batches, tax, ledgers)
- **Multi-tenancy strategy:** Shared database with `tenant_id` column on every table (simplest to start, cost-efficient) OR separate schema/database per tenant (more isolation, more ops overhead) — recommend starting with shared DB + `tenant_id` for v1
- **Authentication:** Secure login with hashed passwords, role-based access control (RBAC), optional OTP/2FA
- **Hosting:** Any major cloud provider (AWS/Azure/GCP) or a managed platform-as-a-service to start lean
- **Offline support:** Local caching/queueing at the billing screen with background sync
- **File storage:** Cloud object storage for prescription images, invoices, logos
- **Printing:** Support for thermal receipt printers (common in pharmacies) via browser print or dedicated print service

---

## 9. Compliance Considerations (verify against your local jurisdiction's laws)

- Drug schedule classification and sale restrictions (e.g., Drugs and Cosmetics Act in India, or local equivalent)
- Mandatory register-keeping for controlled substances
- Invoice format requirements (license number, tax ID must appear on bill)
- Tax law compliance (GST or equivalent)
- Data protection/privacy law compliance for customer health-related data
- Drug license renewal/expiry tracking for the store itself (optional feature)

**Note:** This document does not constitute legal advice — confirm exact regulatory requirements with a local pharmacy compliance expert before going live.

---

## 10. Suggested Build Phases (Roadmap)

1. **Phase 1 (MVP):** Master data, inventory with batch/expiry, basic billing (OTC + prescription), single branch, single tenant
2. **Phase 2:** Multi-tenant support, multi-branch, purchase management (PO → GRN), supplier ledger
3. **Phase 3:** Full reporting suite, schedule drug register, audit trail, role-based access refinement
4. **Phase 4:** Offline billing support, barcode scanning, thermal printer integration
5. **Phase 5:** Subscription/plan management for tenants, super admin panel, analytics dashboard
6. **Phase 6 (future):** Customer loyalty, SMS/WhatsApp notifications, multi-language support, insurance integration

---

## 11. Open Questions to Resolve Before/During Development

- Target country/region (determines tax rules, drug schedule laws, invoice format requirements)
- Expected number of tenants and branches at launch (affects architecture sizing)
- Budget and timeline constraints
- Whether thermal printer / barcode scanner hardware integration is needed from day one
- Preferred payment gateway(s) for subscription billing (if selling this as SaaS)
- Whether a mobile app (native) is needed, or responsive web is sufficient initially

---

## 12. Glossary (for reference)

- **MRP:** Maximum Retail Price — the legally fixed maximum selling price printed on medicine packaging in many countries
- **GRN:** Goods Receipt Note — document confirming stock received against a purchase order
- **FEFO:** First-Expiry-First-Out — inventory rule to sell soonest-expiring stock first
- **HSN Code:** Harmonized System of Nomenclature — code used for tax classification of goods
- **Schedule H/H1/X:** Legal drug classifications (India) determining prescription and record-keeping requirements; equivalent classifications exist in other countries under different names
- **GSTIN:** Goods and Services Tax Identification Number (India-specific tax registration ID)
- **Tenant:** In SaaS terminology, one independent customer account (here, one medical store business) using the shared application

---

*End of requirements document. This is intended as a complete starting brief — a developer or AI coding assistant can use it to scope database schema, API endpoints, and UI screens without needing separate medical-domain research.*
