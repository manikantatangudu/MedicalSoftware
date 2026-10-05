import React, { useState, useEffect } from "react";
import {
  Pill,
  Users,
  Building2,
  FileSpreadsheet,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Database,
  PackagePlus
} from "lucide-react";
import type { Medicine, Customer, Manufacturer } from "../types";
import { api } from "../api";

interface MasterDatabaseViewProps {
  medicines: Medicine[];
  customers: Customer[];
  onOpenNewProduct: () => void;
  onEditProduct: (med: Medicine) => void;
  onDeleteProduct: (medId: string) => void;
  onOpenNewCustomer: () => void;
  onEditCustomer: (cust: Customer) => void;
  onDeleteCustomer: (custId: string) => void;
  onNavigateTab: (tab: "billing" | "inventory" | "purchases" | "reports") => void;
  onAddStock?: (med: Medicine) => void;
}

export const MasterDatabaseView: React.FC<MasterDatabaseViewProps> = ({
  medicines,
  customers,
  onOpenNewProduct,
  onEditProduct,
  onDeleteProduct,
  onOpenNewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onNavigateTab,
  onAddStock,
}) => {
  const [subTab, setSubTab] = useState<"products" | "customers" | "companies" | "molecules" | "tax">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [molecules, setMolecules] = useState<{ name: string; code: string; category: string }[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [newCompany, setNewCompany] = useState({ name: "", code: "", contact: "" });
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);

  useEffect(() => {
    api.getMolecules().then(setMolecules).catch(() => {});
    api.getManufacturers().then(setManufacturers).catch(() => {});
  }, []);

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany.name) return;
    try {
      const created = await api.createManufacturer(newCompany);
      setManufacturers((prev) => [...prev, created]);
      setNewCompany({ name: "", code: "", contact: "" });
      setShowAddCompanyModal(false);
    } catch (err: any) {
      alert("Failed to add manufacturer: " + err.message);
    }
  }

  // Filtered lists
  const filteredMedicines = medicines.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.brand_name && m.brand_name.toLowerCase().includes(q)) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
      (m.code && m.code.toLowerCase().includes(q)) ||
      (m.rack_no && m.rack_no.toLowerCase().includes(q)) ||
      (m.company_name && m.company_name.toLowerCase().includes(q))
    );
  });

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.locality && c.locality.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  const filteredMolecules = molecules.filter((mol) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return mol.name.toLowerCase().includes(q) || mol.code.toLowerCase().includes(q) || mol.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Store Branding Header (Matches GenSoft Footer/Header) */}
      <div className="bg-gradient-to-r from-sky-800 via-blue-900 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-sky-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded">
              PHARMACY ERP MASTER
            </span>
            <span className="text-sky-300 text-xs font-mono">DL: 2026-AP-535501</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight mt-0.5">
            SRI BHAVANI MEDICAL & GENERAL STORES
          </h2>
          <p className="text-xs text-sky-200 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> PARVATHIPURAM, ANDHRA PRADESH (Pin: 535501)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-right">
            <p className="text-[10px] text-sky-200">Customer Care & Support</p>
            <p className="font-bold font-mono text-amber-300">9133263637</p>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[10px] text-emerald-300">Data Backup Status</p>
              <p className="font-semibold text-white">Backup taken today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Process Flowchart (Matches GenSoft Home Screen Grid from image 5!) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" /> Pharmacy Business Flow & Quick Navigation
          </h3>
          <span className="text-[11px] text-slate-400">Click any process tile to open</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Row 1: Masters */}
          <button
            onClick={() => setSubTab("companies")}
            className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>🏢 Company Master</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
          </button>
          <button
            onClick={() => setSubTab("products")}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>💊 Product Master</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
          </button>
          <button
            onClick={() => setSubTab("customers")}
            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>👥 Customer Master</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          </button>
          <button
            onClick={() => onNavigateTab("purchases")}
            className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>🚚 Distributor / Suppliers</span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
          </button>

          {/* Row 2: Transactions */}
          <button
            onClick={() => onNavigateTab("billing")}
            className="p-3 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>🛒 Counter POS Billing</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
          </button>
          <button
            onClick={() => onNavigateTab("purchases")}
            className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>📄 Purchase Invoice / GRN</span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
          </button>
          <button
            onClick={() => setSubTab("molecules")}
            className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>🧬 Molecule Directory</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
          </button>
          <button
            onClick={() => setSubTab("tax")}
            className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-left font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>🏷️ Pharma Tax Master</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Master Catalogs Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 pt-3 pb-2 bg-slate-50 flex-wrap gap-2">
          {/* Sub tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSubTab("products"); setSearchQuery(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "products"
                  ? "bg-red-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Pill className="w-3.5 h-3.5" /> Product Master ({medicines.length})
            </button>

            <button
              onClick={() => { setSubTab("customers"); setSearchQuery(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "customers"
                  ? "bg-red-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Customer Master ({customers.length})
            </button>

            <button
              onClick={() => { setSubTab("companies"); setSearchQuery(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "companies"
                  ? "bg-red-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Company Master ({manufacturers.length})
            </button>

            <button
              onClick={() => { setSubTab("molecules"); setSearchQuery(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "molecules"
                  ? "bg-red-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Molecule / Generic Salt Master ({molecules.length})
            </button>

            <button
              onClick={() => { setSubTab("tax"); setSearchQuery(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "tax"
                  ? "bg-red-600 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Tax Slabs (GST)
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {subTab === "products" && (
              <button
                onClick={onOpenNewProduct}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" /> Add Product (Alt+N)
              </button>
            )}

            {subTab === "customers" && (
              <button
                onClick={onOpenNewCustomer}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" /> Add Customer (Alt+N)
              </button>
            )}

            {subTab === "companies" && (
              <button
                onClick={() => setShowAddCompanyModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" /> Add Company (Alt+N)
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {(subTab === "products" || subTab === "customers" || subTab === "molecules") && (
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  subTab === "products"
                    ? "Search product by code (ADS), brand, salt, rack (R1-S2)..."
                    : subTab === "customers"
                    ? "Search customer by name, phone (9441874161), locality..."
                    : "Search molecule name or code (ACEM, DAPA, AP1)..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 1: PRODUCT MASTER TABLE                                     */}
        {/* ------------------------------------------------------------------ */}
        {subTab === "products" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-100 font-bold">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Generic / Molecule</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Packing</th>
                  <th className="py-2.5 px-3">Rack</th>
                  <th className="py-2.5 px-3">Schedule</th>
                  <th className="py-2.5 px-3">MRP (₹)</th>
                  <th className="py-2.5 px-3">Selling (₹)</th>
                  <th className="py-2.5 px-3">GST %</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-red-700 bg-red-50/30">
                      {m.code || "---"}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{m.brand_name}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{m.generic_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{m.company_name || "---"}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      <span className="font-bold">{m.packing || m.pack_size || "10'S"}</span>
                      <span className="text-[10px] text-blue-700 font-sans block">({m.conversion || 10} tabs)</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-amber-100 text-amber-900 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                        {m.rack_no || "Rack 1"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.schedule_type === "SCHEDULE_H"
                            ? "bg-amber-100 text-amber-800"
                            : m.schedule_type === "SCHEDULE_H1" || m.schedule_type === "SCHEDULE_X"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {m.schedule_code || m.schedule_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">₹{m.mrp}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      ₹{m.selling_price}
                      <span className="text-[10px] text-slate-500 font-normal font-sans block">
                        ₹{((m.selling_price || 0) / (m.conversion || 10)).toFixed(2)}/tab
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{m.gst_rate}%</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAddStock?.(m)}
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded transition cursor-pointer"
                          title="+ Add Stock Batch"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProduct(m)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(m.id)}
                          className="p-1 text-rose-600 hover:bg-rose-100 rounded transition cursor-pointer"
                          title="Deactivate / Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredMedicines.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No medicines found matching "{searchQuery}". Click <strong>Add Product</strong> above to register.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 2: CUSTOMER MASTER TABLE                                    */}
        {/* ------------------------------------------------------------------ */}
        {subTab === "customers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-100 font-bold">
                  <th className="py-2.5 px-3">Code / IP No.</th>
                  <th className="py-2.5 px-3">Customer / Patient Name</th>
                  <th className="py-2.5 px-3">Mobile 1</th>
                  <th className="py-2.5 px-3">Locality / Address</th>
                  <th className="py-2.5 px-3">District / City</th>
                  <th className="py-2.5 px-3">Pin</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Khata Balance (₹)</th>
                  <th className="py-2.5 px-3">Discount %</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700 bg-blue-50/30">
                      {c.code || c.phone || "---"}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{c.phone || "---"}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.locality || c.address || "---"}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{c.city || "PARVATHIPURAM"}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{c.pincode || "535501"}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                        {c.category || "PATIENT"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={c.credit_balance > 0 ? "text-rose-700" : "text-emerald-700"}>
                        ₹{(c.credit_balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      {(c.discount_percent || 0).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => onEditCustomer(c)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCustomer(c.id)}
                          className="p-1 text-rose-600 hover:bg-rose-100 rounded transition cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No customers found. Click <strong>Add Customer</strong> above to register a patient or shop customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 3: COMPANY / MANUFACTURER MASTER                            */}
        {/* ------------------------------------------------------------------ */}
        {subTab === "companies" && (
          <div className="overflow-x-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {manufacturers.map((mfg) => (
                <div key={mfg.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-100 text-amber-900 font-mono font-bold text-xs px-2 py-0.5 rounded border border-amber-300">
                      {mfg.code || "GLE"}
                    </span>
                    <span className="text-[10px] text-slate-400">Pharma Mfg</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{mfg.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Lic: {mfg.license_no || "KA-PH-2026"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 4: MOLECULES / SALTS DIRECTORY (Image 4)                   */}
        {/* ------------------------------------------------------------------ */}
        {subTab === "molecules" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-100 font-bold">
                  <th className="py-2.5 px-3">Salt Short Code</th>
                  <th className="py-2.5 px-3">Generic Molecule / Formulation</th>
                  <th className="py-2.5 px-3">Therapeutic Category</th>
                  <th className="py-2.5 px-3 text-right">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMolecules.map((mol, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 bg-blue-50/20">
                      {mol.code}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900">{mol.name}</td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {mol.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">Standard Molecule</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUBTAB 5: PHARMA TAX MASTER                                        */}
        {/* ------------------------------------------------------------------ */}
        {subTab === "tax" && (
          <div className="p-4 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Indian GST Pharma Slabs & HSN Reference</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3">
                <span className="bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">G0</span>
                <h5 className="font-bold text-slate-900 mt-2 text-sm">GST 0% (Exempt)</h5>
                <p className="text-slate-500 mt-1">Human blood, contraceptives, certain basic surgical aids.</p>
              </div>

              <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[11px]">G1</span>
                <h5 className="font-bold text-blue-950 mt-2 text-sm">GST 5% (Life Saving)</h5>
                <p className="text-blue-700 mt-1">Insulin, oral rehydration salts, critical vaccines, diagnostic kits.</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3">
                <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[11px]">G2</span>
                <h5 className="font-bold text-emerald-950 mt-2 text-sm">GST 12% (Standard Pharma)</h5>
                <p className="text-emerald-700 mt-1">Antibiotics, painkillers, hypertension, diabetic tablets (HSN: 3004).</p>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[11px]">G3</span>
                <h5 className="font-bold text-amber-950 mt-2 text-sm">GST 18% (Supplements)</h5>
                <p className="text-amber-700 mt-1">Cosmeceuticals, nutrition drinks, dental care, disinfectants.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Manufacturer */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Add Pharma Manufacturer</h3>
            <form onSubmit={handleAddCompany} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Code (e.g. GLE)</label>
                <input
                  type="text"
                  placeholder="GLE, CIP, SUN..."
                  value={newCompany.code}
                  onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold uppercase outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GLENMARK PHARMACEUTICALS LTD."
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer"
                >
                  Save Company
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
