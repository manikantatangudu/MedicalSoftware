import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import type { Customer, Doctor } from "../types";
import { api } from "../api";

interface CustomerMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  initialCustomer?: Customer | null;
  doctors: Doctor[];
}

export const CustomerMasterModal: React.FC<CustomerMasterModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialCustomer,
  doctors,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    code: "9441874161",
    name: "BOSE",
    phone: "9441874161",
    mobile_2: "",
    email: "",
    address: "Near Old Bus Stand",
    locality: "Main Road",
    city: "PARVATHIPURAM",
    pincode: "535501",
    doctor_name: "Dr. A. Sharma (MD, Gen Med)",
    category: "PATIENT",
    gstin: "",
    credit_balance: 0.0,
    discount_percent: 15.0,
    discount_ceiling: 0.0,
    billing_on: "CREDIT",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCustomer) {
      setFormData({ ...initialCustomer });
    } else {
      setFormData({
        code: "",
        name: "",
        phone: "",
        mobile_2: "",
        email: "",
        address: "",
        locality: "",
        city: "PARVATHIPURAM",
        pincode: "535501",
        doctor_name: "",
        category: "PATIENT",
        gstin: "",
        credit_balance: 0.0,
        discount_percent: 10.0,
        discount_ceiling: 0.0,
        billing_on: "CREDIT",
      });
    }
  }, [initialCustomer, isOpen]);

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
    if (!formData.name) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (initialCustomer?.id) {
        const updated = await api.updateCustomer(initialCustomer.id, formData);
        onSaved(updated);
      } else {
        const created = await api.createCustomer(formData);
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save customer in master");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-[#ECE9D8] text-slate-800 rounded-lg shadow-2xl border-2 border-slate-400 w-full max-w-3xl overflow-hidden font-sans my-4">
        {/* GenSoft Windows Header Bar */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white font-mono text-xs px-2 py-0.5 rounded font-bold">
              {initialCustomer ? "EDIT" : "NEW"}
            </span>
            <h2 className="text-sm font-bold tracking-wide uppercase">CUSTOMER MASTER</h2>
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
          {/* Row 1: Code/IP No and Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div>
              <label className="font-bold text-red-700 block mb-1">Code / IP No. (Mobile or ID)</label>
              <input
                type="text"
                placeholder="e.g. 9441874161"
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value,
                    phone: formData.phone || e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-amber-50/50 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-red-700 block mb-1">Customer / Patient Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. BOSE"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold text-slate-900 bg-white outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Row 2: Address & Location in Parvathipuram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Street Address</label>
              <input
                type="text"
                placeholder="Door No, Street Name"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Locality / Area</label>
              <input
                type="text"
                placeholder="e.g. Main Road, RTC Complex"
                value={formData.locality || ""}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">District / City</label>
              <input
                type="text"
                value={formData.city || "PARVATHIPURAM"}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 bg-slate-50 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pin Code</label>
              <input
                type="text"
                value={formData.pincode || "535501"}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={formData.category || "PATIENT"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-bold text-slate-800 outline-none"
              >
                <option value="PATIENT">PATIENT (Regular)</option>
                <option value="COUNTER">COUNTER (Walk-in)</option>
                <option value="WHOLESALE">WHOLESALE (Sub-dealer)</option>
                <option value="STAFF">STAFF / CLINIC</option>
              </select>
            </div>
          </div>

          {/* Row 3: Phones, Email, Doctor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded border border-slate-300 shadow-sm">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mobile 1 (Primary)</label>
              <input
                type="text"
                placeholder="e.g. 9441874161"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mobile 2 (Alternate)</label>
              <input
                type="text"
                placeholder="Optional second number"
                value={formData.mobile_2 || ""}
                onChange={(e) => setFormData({ ...formData, mobile_2: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Prescribing Doctor</label>
              <input
                type="text"
                list="doctor-options-list"
                placeholder="e.g. Dr. A. Sharma"
                value={formData.doctor_name || ""}
                onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 outline-none"
              />
              <datalist id="doctor-options-list">
                {doctors.map((d) => (
                  <option key={d.id} value={`${d.name} (${d.specialization || d.registration_no})`} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 4: Credit / Khata, Default Discount %, GSTIN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50/60 p-3 rounded border border-blue-300 shadow-sm">
            <div>
              <label className="font-bold text-blue-900 block mb-1">Current Khata Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.credit_balance || 0}
                onChange={(e) => setFormData({ ...formData, credit_balance: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-blue-400 bg-white rounded font-mono font-bold text-blue-950 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-blue-900 block mb-1">Customer Discount %</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_percent || 0}
                onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-blue-400 bg-white rounded font-bold text-emerald-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Discount Ceiling (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_ceiling || 0}
                onChange={(e) => setFormData({ ...formData, discount_ceiling: parseFloat(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN (For Wholesale)</label>
              <input
                type="text"
                placeholder="29ABCDE1234F1Z5"
                value={formData.gstin || ""}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded font-mono uppercase text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-300">
            <span className="text-[11px] text-slate-500">
              Customer & Patient Khata Master • Parvathipuram Store
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
