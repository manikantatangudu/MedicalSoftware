import React, { useState, useEffect, useRef } from "react";
import { X, Save, Search, Sparkles, Package } from "lucide-react";
import type { Medicine, Manufacturer } from "../types";
import { api } from "../api";

interface ProductMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (med: Medicine) => void;
  initialMedicine?: Medicine | null;
  manufacturers: Manufacturer[];
}

export const ProductMasterModal: React.FC<ProductMasterModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialMedicine,
  manufacturers,
}) => {
  const [formData, setFormData] = useState<Partial<Medicine>>({
    code: "",
    brand_name: "",
    generic_name: "",
    company_name: "GLENMARK PHARMACEUTICALS LTD.",
    manufacturer_id: "",
    product_type: "TABLETS",
    drug_type: "T",
    packing: '10" S',
    conversion: 10,
    rack_no: "R1-S1",
    hsn_code: "30049099",
    gst_rate: 12.0,
    purchase_tax_rate: 12.0,
    show_gst_in_purchase: true,
    mrp: 120.0,
    purchase_price: 85.0,
    selling_price: 110.0,
    schedule_type: "SCHEDULE_H",
    schedule_code: "H",
    max_discount_limit: 10.0,
    sales_discount: 5.0,
    add_points_percent: 1.0,
    allow_negative_stock: false,
    is_narcotic: false,
    reorder_level: 10,
    reorder_qty: 50,
    unit: "Strip",
    launched_on: new Date().toISOString().split("T")[0],
    comments: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Opening Stock state (allows immediate stock entry when adding/editing product)
  const defaultExp = new Date();
  defaultExp.setFullYear(defaultExp.getFullYear() + 2);
  const [openingStockQty, setOpeningStockQty] = useState<number>(50);
  const [openingBatchNumber, setOpeningBatchNumber] = useState<string>("");
  const [openingExpiryDate, setOpeningExpiryDate] = useState<string>(defaultExp.toISOString().split("T")[0]);

  // Molecule autocomplete search state (matches Image 4)
  const [moleculeQuery, setMoleculeQuery] = useState("");
  const [moleculeList, setMoleculeList] = useState<{ name: string; code: string; category: string }[]>([]);
  const [showMoleculeDropdown, setShowMoleculeDropdown] = useState(false);
  const moleculeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMedicine) {
      setFormData({ ...initialMedicine });
      setMoleculeQuery(initialMedicine.generic_name || "");
      setOpeningStockQty(0);
      setOpeningBatchNumber("");
    } else {
      setOpeningStockQty(50);
      setOpeningBatchNumber("");
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + 2);
      setOpeningExpiryDate(exp.toISOString().split("T")[0]);
      setFormData({
        code: "ADS",
        brand_name: "DAPAONE S 10/100 TAB",
        generic_name: "DAPAGLIFLOZIN",
        company_name: "GLENMARK PHARMACEUTICALS LTD.",
        product_type: "TABLETS",
        drug_type: "T",
        packing: '10" S',
        conversion: 10,
        rack_no: "R1-S1",
        hsn_code: "30049099",
        gst_rate: 12.0,
        purchase_tax_rate: 12.0,
        show_gst_in_purchase: true,
        mrp: 145.0,
        purchase_price: 98.0,
        selling_price: 130.0,
        schedule_type: "SCHEDULE_H",
        schedule_code: "H",
        max_discount_limit: 10.0,
        sales_discount: 0.0,
        add_points_percent: 0.0,
        allow_negative_stock: false,
        is_narcotic: false,
        reorder_level: 15,
        reorder_qty: 50,
        unit: "Strip",
        launched_on: new Date().toISOString().split("T")[0],
        comments: "",
      });
      setMoleculeQuery("DAPAGLIFLOZIN");
    }
  }, [initialMedicine, isOpen]);

  // Load standard molecules
  useEffect(() => {
    if (isOpen) {
      api.getMolecules(moleculeQuery).then(setMoleculeList).catch(() => {});
    }
  }, [isOpen, moleculeQuery]);

  // Keyboard shortcut listener: Ctrl+Enter = Save, Esc = Close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, formData]);

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!formData.brand_name || !formData.generic_name) {
      setError("Please fill Brand Name and Generic/Molecule name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let savedMed: Medicine;
      if (initialMedicine?.id) {
        savedMed = await api.updateMedicine(initialMedicine.id, formData);
      } else {
        savedMed = await api.createMedicine(formData);
      }

      // If opening stock quantity is entered, automatically create opening stock batch
      if (openingStockQty > 0) {
        const batchNum = openingBatchNumber.trim() || `B-${(savedMed.code || savedMed.brand_name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3)).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        try {
          await api.addBatch({
            medicine_id: savedMed.id,
            batch_number: batchNum,
            expiry_date: openingExpiryDate || defaultExp.toISOString().split("T")[0],
            quantity_received: openingStockQty,
            quantity_remaining: openingStockQty
          });
        } catch (bErr) {
          console.warn("Could not create initial stock batch:", bErr);
        }
      }

      onSaved(savedMed);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save product in master");
    } finally {
      setSaving(false);
    }
  }

  function handleAutoCode() {
    // Generate clean 3-4 letter code from brand name
    if (formData.brand_name) {
      const code = formData.brand_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4);
      setFormData((prev) => ({ ...prev, code }));
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-[#ECE9D8] text-slate-800 rounded-lg shadow-2xl border-2 border-slate-400 w-full max-w-4xl overflow-hidden font-sans my-4">
        {/* GenSoft Windows Header Bar */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
              {initialMedicine ? "EDIT" : "NEW"}
            </span>
            <h2 className="text-sm font-bold tracking-wide uppercase">PRODUCT MASTER</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-rose-100 hidden sm:inline">Ctrl + Enter = Save | Esc = Close</span>
            <button
              onClick={onClose}
              className="text-white hover:bg-red-800 p-1 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-800 px-4 py-2 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {/* Row 1: Code and Name */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div>
              <label className="font-bold text-red-700 block mb-1">
                Code <span className="text-slate-500 font-normal">(Short Code)</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  required
                  placeholder="e.g. ADS"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-amber-50/50 uppercase outline-none focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={handleAutoCode}
                  title="Auto Generate Code from Name"
                  className="bg-slate-200 hover:bg-slate-300 px-2 rounded border border-slate-300 text-slate-700 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="font-bold text-red-700 block mb-1">Name (Brand Formulation) *</label>
              <input
                type="text"
                required
                placeholder="e.g. DAPAONE S 10/100 TAB"
                value={formData.brand_name || ""}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Row 2: HSN, Packing, Conversion, Product Type */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">HSN Code (Pharma GST)</label>
              <input
                type="text"
                value={formData.hsn_code || "30049099"}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Packing</label>
              <input
                type="text"
                placeholder='e.g. 10" S, 100ml'
                value={formData.packing || ""}
                onChange={(e) => setFormData({ ...formData, packing: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Conversion <span className="text-[10px] text-blue-700 font-bold">(1 Strip = {formData.conversion || 10} Tabs)</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.conversion || 10}
                onChange={(e) => setFormData({ ...formData, conversion: parseInt(e.target.value) || 1 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 font-bold outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Product Type</label>
              <select
                value={formData.product_type || "TABLETS"}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-medium outline-none"
              >
                <option value="TABLETS">T - TABLETS</option>
                <option value="CAPSULES">C - CAPSULES</option>
                <option value="SYRUP">S - SYRUP</option>
                <option value="INJECTION">I - INJECTION</option>
                <option value="OINTMENT">O - OINTMENT / CREAM</option>
                <option value="DROPS">D - DROPS</option>
                <option value="INHALER">IN - INHALER</option>
                <option value="POWDER">P - POWDER</option>
              </select>
            </div>
          </div>

          {/* Row 3: Rack No, Schedule, Generic / Molecule Autocomplete (GenSoft Image 4!) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm relative">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rack / Shelf No.</label>
              <input
                type="text"
                placeholder="e.g. R1-S2, Shelf-B"
                value={formData.rack_no || ""}
                onChange={(e) => setFormData({ ...formData, rack_no: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-amber-300 bg-amber-50/50 rounded font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Schedule</label>
              <select
                value={formData.schedule_type || "SCHEDULE_H"}
                onChange={(e) => {
                  const val = e.target.value as any;
                  const code = val === "SCHEDULE_H1" ? "H1" : val === "SCHEDULE_X" ? "X" : val === "SCHEDULE_H" ? "H" : "OTC";
                  setFormData({ ...formData, schedule_type: val, schedule_code: code });
                }}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-bold text-slate-800 outline-none"
              >
                <option value="OTC">OTC - Over The Counter</option>
                <option value="SCHEDULE_H">H - Schedule H (Rx Required)</option>
                <option value="SCHEDULE_H1">H1 - Schedule H1 (Register Entry)</option>
                <option value="SCHEDULE_X">X - Schedule X (Narcotics)</option>
              </select>
            </div>

            {/* Searchable Molecule / Generic Salt Popup (Image 4) */}
            <div className="md:col-span-2 relative">
              <label className="font-bold text-red-700 block mb-1 flex items-center justify-between">
                <span>Generic Type / Molecule *</span>
                <span className="text-[10px] text-slate-500 font-normal">Fast Salt Auto-Lookup</span>
              </label>
              <div className="relative">
                <input
                  ref={moleculeInputRef}
                  type="text"
                  required
                  placeholder="Search salt: DAPAGLIFLOZIN, ACECLOFENAC..."
                  value={moleculeQuery}
                  onFocus={() => setShowMoleculeDropdown(true)}
                  onChange={(e) => {
                    setMoleculeQuery(e.target.value);
                    setFormData({ ...formData, generic_name: e.target.value });
                    setShowMoleculeDropdown(true);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 outline-none pr-8"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />

                {/* Dropdown list matching Gensoft Image 4 */}
                {showMoleculeDropdown && moleculeList.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-slate-400 rounded-md shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                    <div className="bg-slate-100 px-3 py-1 font-bold text-[11px] text-slate-600 flex justify-between">
                      <span>GENERIC MOLECULE</span>
                      <span>SALT CODE</span>
                    </div>
                    {moleculeList.map((mol, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setMoleculeQuery(mol.name);
                          setFormData({
                            ...formData,
                            generic_name: mol.name,
                            composition: mol.name,
                          });
                          setShowMoleculeDropdown(false);
                        }}
                        className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center text-xs transition"
                      >
                        <span className="font-semibold text-slate-800">{mol.name}</span>
                        <span className="font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {mol.code}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Company and Tax Slabs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Company / Manufacturer</label>
              <input
                type="text"
                list="company-options-list"
                placeholder="e.g. GLENMARK PHARMACEUTICALS LTD."
                value={formData.company_name || ""}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-800 outline-none"
              />
              <datalist id="company-options-list">
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.code ? `[${m.code}] ` : ""}{m.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sales Tax (GST %)</label>
              <select
                value={formData.gst_rate || 12}
                onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold outline-none"
              >
                <option value={0}>G0 - GST 0% (Exempted)</option>
                <option value={5}>G1 - GST 5% (Life Saving)</option>
                <option value={12}>G2 - GST 12% (Standard Pharma)</option>
                <option value={18}>G3 - GST 18% (Supplements/Cosmetic)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Purchase Tax (GST %)</label>
              <select
                value={formData.purchase_tax_rate || 12}
                onChange={(e) => setFormData({ ...formData, purchase_tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold outline-none"
              >
                <option value={0}>G0 - GST 0%</option>
                <option value={5}>G1 - GST 5%</option>
                <option value={12}>G2 - GST 12%</option>
                <option value={18}>G3 - GST 18%</option>
              </select>
            </div>
          </div>

          {/* Row 5: Pricing (MRP, Purchase Price, Selling Price) */}
          <div className="grid grid-cols-3 gap-3 bg-emerald-50/60 p-3 rounded border border-emerald-300 shadow-sm">
            <div>
              <label className="font-bold text-slate-700 block mb-1">MRP (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.mrp || 0}
                onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-emerald-400 bg-white rounded font-bold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Purchase Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price || 0}
                onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded font-medium text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-emerald-800 block mb-1">Counter Selling Rate (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.selling_price || 0}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-emerald-500 bg-white rounded font-extrabold text-emerald-800 outline-none"
              />
            </div>
            <div className="col-span-3 flex items-center justify-between pt-1 border-t border-emerald-200 text-[11px]">
              <span className="text-slate-600">
                Loose Tablet Rate (Numbers count): <strong className="text-emerald-700">₹{((formData.selling_price || 0) / (formData.conversion || 10)).toFixed(2)}</strong> / tablet
              </span>
              <span className="text-slate-500">
                MRP per Tab: ₹{((formData.mrp || 0) / (formData.conversion || 10)).toFixed(2)} (Based on {formData.conversion || 10} tabs/strip)
              </span>
            </div>
          </div>

          {/* Row 6: Discounts, Controls & Regulatory Flags (GenSoft image 1/3) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Max Discount Limit %</label>
              <input
                type="number"
                step="0.01"
                value={formData.max_discount_limit || 0}
                onChange={(e) => setFormData({ ...formData, max_discount_limit: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Sales Discount %</label>
              <input
                type="number"
                step="0.01"
                value={formData.sales_discount || 0}
                onChange={(e) => setFormData({ ...formData, sales_discount: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Reorder Level (Alert)</label>
              <input
                type="number"
                value={formData.reorder_level || 10}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Reorder Qty</label>
              <input
                type="number"
                value={formData.reorder_qty || 50}
                onChange={(e) => setFormData({ ...formData, reorder_qty: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="allow_neg_stock"
                checked={formData.allow_negative_stock || false}
                onChange={(e) => setFormData({ ...formData, allow_negative_stock: e.target.checked })}
                className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="allow_neg_stock" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                Allow Billing w/o Stock Updation
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_narcotic"
                checked={formData.is_narcotic || false}
                onChange={(e) => setFormData({ ...formData, is_narcotic: e.target.checked })}
                className="rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="is_narcotic" className="text-[11px] font-semibold text-rose-700 cursor-pointer">
                Narcotic / Psychotropic Drug (Y/N)
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Comments / Notes</label>
              <input
                type="text"
                placeholder="Storage temperature, instructions..."
                value={formData.comments || ""}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Row 7: Opening Stock & Physical Batches (Immediately billable at POS) */}
          <div className="bg-amber-50/70 p-3 rounded border border-amber-300 shadow-sm">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="font-bold text-amber-900 block flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-700" />
                <span>Opening Stock Batch (Physical Intake for Immediate Counter Billing)</span>
              </label>
              <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold border border-amber-200">
                {openingStockQty > 0 ? `${openingStockQty} Strips (${openingStockQty * (formData.conversion || 10)} Tabs)` : "Zero Stock"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Opening Quantity ({formData.unit || "Strips"})
                </label>
                <input
                  type="number"
                  min="0"
                  value={openingStockQty}
                  onChange={(e) => setOpeningStockQty(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 50"
                  className="w-full px-2.5 py-1.5 border border-amber-400 rounded font-bold text-slate-900 bg-white outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Batch Number</label>
                <input
                  type="text"
                  value={openingBatchNumber}
                  onChange={(e) => setOpeningBatchNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. B-101 (Auto if blank)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-semibold text-slate-800 bg-white outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={openingExpiryDate}
                  onChange={(e) => setOpeningExpiryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Footer Buttons (Matches GenSoft Ctrl+Enter / Esc) */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-300">
            <span className="text-[11px] text-slate-500">
              Medical Store Product Master Catalog • GST Compliant
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 border border-slate-400 text-slate-800 font-bold rounded cursor-pointer transition shadow-sm"
              >
                Cancel (Esc)
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded cursor-pointer transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save (Ctrl + Enter)"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
