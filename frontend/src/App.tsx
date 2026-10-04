import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Package,
  Pill,
  FileText,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Printer,
  Search,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  Clock,
  Truck,
  DollarSign,
  Download,
  BarChart3,
  Filter
} from "lucide-react";
import { api } from "./api";
import type {
  UserProfile,
  Medicine,
  CartItem,
  Doctor,
  Customer,
  Supplier,
  PurchaseOrder,
  GoodsReceiptNote
} from "./types";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("med_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState("owner@citycare.com");
  const [loginPassword, setLoginPassword] = useState("password123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"billing" | "inventory" | "purchases" | "medicines" | "reports">("billing");

  // POS State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI" | "CREDIT">("CASH");
  const [discountAmount, setDiscountAmount] = useState(0);

  // Completed Bill Modal
  const [completedBill, setCompletedBill] = useState<any | null>(null);

  // Inventory & Alerts state
  const [batches, setBatches] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [nearExpiry, setNearExpiry] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [scheduleRegister, setScheduleRegister] = useState<any[]>([]);

  // Reports State
  const [salesReport, setSalesReport] = useState<any | null>(null);
  const [taxSummary, setTaxSummary] = useState<any | null>(null);
  const [reportsSubTab, setReportsSubTab] = useState<"sales" | "gst" | "schedule">("sales");
  const [dateFilterFrom, setDateFilterFrom] = useState("");
  const [dateFilterTo, setDateFilterTo] = useState("");

  // Purchases State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showReceiveGRNModal, setShowReceiveGRNModal] = useState(false);
  const [showPaySupplierModal, setShowPaySupplierModal] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [supplierPayAmount, setSupplierPayAmount] = useState(1000);

  // New PO State
  const [newPOData, setNewPOData] = useState({
    supplier_id: "",
    medicine_id: "",
    quantity: 50,
    expected_cost_price: 150
  });

  // New GRN State
  const [newGRNData, setNewGRNData] = useState({
    supplier_id: "",
    purchase_order_id: "",
    supplier_invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    medicine_id: "",
    batch_number: "",
    expiry_date: "",
    quantity: 50,
    purchase_price: 150,
    tax_rate: 12
  });

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newMedData, setNewMedData] = useState({
    brand_name: "",
    generic_name: "",
    composition: "",
    mrp: 50,
    selling_price: 50,
    purchase_price: 35,
    schedule_type: "OTC",
    category: "General",
    gst_rate: 12
  });

  const [newBatchData, setNewBatchData] = useState({
    medicine_id: "",
    batch_number: "",
    expiry_date: "",
    quantity_received: 100,
    quantity_remaining: 100
  });

  // Handle Login
  async function handleLogin(e?: React.FormEvent, customEmail?: string, customPass?: string) {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const email = customEmail || loginEmail;
      const pass = customPass || loginPassword;
      const res = await api.login(email, pass);
      localStorage.setItem("med_token", res.access_token);
      localStorage.setItem("med_user", JSON.stringify(res));
      setUser(res);
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("med_token");
    localStorage.removeItem("med_user");
    setUser(null);
  }

  // Load catalog data
  async function loadData() {
    if (!user) return;
    try {
      const [medsRes, docsRes, custsRes, supsRes] = await Promise.all([
        api.getMedicines(searchQuery),
        api.getDoctors(),
        api.getCustomers(),
        api.getSuppliers()
      ]);
      setMedicines(medsRes);
      setDoctors(docsRes);
      setCustomers(custsRes);
      setSuppliers(supsRes);

      if (docsRes.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docsRes[0].id);
      }
      if (supsRes.length > 0 && !newPOData.supplier_id) {
        setNewPOData((prev) => ({ ...prev, supplier_id: supsRes[0].id }));
        setNewGRNData((prev) => ({ ...prev, supplier_id: supsRes[0].id }));
      }
      if (medsRes.length > 0 && !newPOData.medicine_id) {
        setNewPOData((prev) => ({ ...prev, medicine_id: medsRes[0].id }));
        setNewGRNData((prev) => ({ ...prev, medicine_id: medsRes[0].id }));
      }
    } catch (err) {
      console.error("Failed to load catalog data:", err);
    }
  }

  async function loadInventoryData() {
    if (!user) return;
    try {
      const [batchesRes, lowStockRes, nearExpiryRes, dashRes, regRes, posRes, grnsRes, salesRes, taxRes] = await Promise.all([
        api.getBatches(),
        api.getLowStock(),
        api.getNearExpiry(),
        api.getDashboard(),
        api.getScheduleRegister(),
        api.getPurchaseOrders(),
        api.getGRNs(),
        api.getSalesReport(dateFilterFrom || undefined, dateFilterTo || undefined),
        api.getTaxSummary()
      ]);
      setBatches(batchesRes);
      setLowStock(lowStockRes);
      setNearExpiry(nearExpiryRes);
      setDashboard(dashRes);
      setScheduleRegister(regRes);
      setPurchaseOrders(posRes);
      setGrns(grnsRes);
      setSalesReport(salesRes);
      setTaxSummary(taxRes);
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    }
  }

  async function handleFilterSales(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      const res = await api.getSalesReport(dateFilterFrom || undefined, dateFilterTo || undefined);
      setSalesReport(res);
    } catch (err) {
      console.error("Failed to filter sales:", err);
    }
  }

  async function handleResetSalesFilter() {
    setDateFilterFrom("");
    setDateFilterTo("");
    try {
      const res = await api.getSalesReport();
      setSalesReport(res);
    } catch (err) {
      console.error("Failed to reset sales:", err);
    }
  }

  async function handleDownloadScheduleCSV() {
    try {
      await api.downloadScheduleCSV();
    } catch (err: any) {
      alert(err.message || "Failed to download schedule register CSV");
    }
  }

  async function handleReprintBill(billId: string) {
    try {
      const b = await api.getBill(billId);
      setCompletedBill(b);
    } catch (err: any) {
      alert(err.message || "Failed to retrieve invoice receipt");
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
      loadInventoryData();
    }
  }, [user, searchQuery]);

  // Cart operations
  async function addToCart(med: Medicine) {
    try {
      const availableBatches = await api.getMedicineBatches(med.id);
      if (!availableBatches || availableBatches.length === 0) {
        alert(`No stock available for ${med.brand_name}!`);
        return;
      }

      const existingIndex = cart.findIndex((item) => item.medicine.id === med.id);
      if (existingIndex >= 0) {
        const item = cart[existingIndex];
        if (item.quantity + 1 > item.batch.quantity_remaining) {
          alert(`Cannot exceed available batch stock (${item.batch.quantity_remaining})!`);
          return;
        }
        const updated = [...cart];
        updated[existingIndex].quantity += 1;
        const lineSubtotal = updated[existingIndex].quantity * item.unit_price;
        const lineTax = lineSubtotal * (item.tax_rate / 100);
        updated[existingIndex].line_total = parseFloat((lineSubtotal + lineTax).toFixed(2));
        setCart(updated);
      } else {
        const bestBatch = availableBatches[0];
        const lineSubtotal = 1 * med.selling_price;
        const lineTax = lineSubtotal * (med.gst_rate / 100);
        const newItem: CartItem = {
          medicine: med,
          batch: bestBatch,
          quantity: 1,
          unit_price: med.selling_price,
          tax_rate: med.gst_rate,
          line_total: parseFloat((lineSubtotal + lineTax).toFixed(2))
        };
        setCart([...cart, newItem]);
      }
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    }
  }

  function updateQuantity(index: number, newQty: number) {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.batch.quantity_remaining) {
      alert(`Only ${item.batch.quantity_remaining} units available in Batch ${item.batch.batch_number}!`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    const lineSubtotal = newQty * item.unit_price;
    const lineTax = lineSubtotal * (item.tax_rate / 100);
    updated[index].line_total = parseFloat((lineSubtotal + lineTax).toFixed(2));
    setCart(updated);
  }

  function removeFromCart(index: number) {
    setCart(cart.filter((_, i) => i !== index));
  }

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const taxTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity * (item.tax_rate / 100), 0);
  const finalTotal = Math.max(0, parseFloat((subtotal + taxTotal - discountAmount).toFixed(2)));

  // Regulatory Schedule check
  const hasScheduleH = cart.some(
    (item) => item.medicine.schedule_type === "SCHEDULE_H" || item.medicine.schedule_type === "SCHEDULE_H1" || item.medicine.schedule_type === "SCHEDULE_X"
  );
  const hasScheduleH1 = cart.some(
    (item) => item.medicine.schedule_type === "SCHEDULE_H1" || item.medicine.schedule_type === "SCHEDULE_X"
  );

  // Complete Checkout
  async function handleCheckout() {
    if (cart.length === 0) return;

    if (hasScheduleH && !selectedDoctorId) {
      alert("Prescription doctor selection is required for Schedule H/H1 drugs!");
      return;
    }

    if (hasScheduleH1 && !patientName.trim()) {
      alert("Patient Name is legally mandated for Schedule H1 / Schedule X register!");
      return;
    }

    const payload: any = {
      customer_id: selectedCustomerId || undefined,
      items: cart.map((c) => ({
        medicine_id: c.medicine.id,
        batch_id: c.batch.id,
        quantity: c.quantity,
        unit_price: c.unit_price,
        tax_rate: c.tax_rate
      })),
      payment_mode: paymentMode,
      discount: discountAmount
    };

    if (hasScheduleH) {
      payload.prescription = {
        doctor_id: selectedDoctorId,
        notes: "Verified at counter"
      };
    }

    if (hasScheduleH1) {
      payload.schedule_entries = cart
        .filter((c) => c.medicine.schedule_type === "SCHEDULE_H1" || c.medicine.schedule_type === "SCHEDULE_X")
        .map((c) => ({
          medicine_id: c.medicine.id,
          doctor_id: selectedDoctorId,
          patient_name: patientName,
          patient_phone: patientPhone || "Not provided",
          patient_address: patientAddress || "Not provided",
          quantity: c.quantity
        }));
    }

    try {
      const res = await api.createBill(payload);
      setCompletedBill(res);
      setCart([]);
      setPatientName("");
      setPatientPhone("");
      setPatientAddress("");
      loadData();
      loadInventoryData();
    } catch (err: any) {
      alert("Billing Error: " + err.message);
    }
  }

  // Handle Add Medicine
  async function handleAddMedicine(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createMedicine(newMedData);
      setShowAddMedModal(false);
      loadData();
      alert("Medicine added successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Add Batch
  async function handleAddBatch(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.addBatch(newBatchData);
      setShowAddBatchModal(false);
      loadInventoryData();
      alert("Stock batch added successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Create PO
  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createPurchaseOrder({
        supplier_id: newPOData.supplier_id,
        items: [
          {
            medicine_id: newPOData.medicine_id,
            quantity: newPOData.quantity,
            expected_cost_price: newPOData.expected_cost_price
          }
        ]
      });
      setShowCreatePOModal(false);
      loadInventoryData();
      alert("Purchase Order created successfully!");
    } catch (err: any) {
      alert("Error creating PO: " + err.message);
    }
  }

  // Handle Receive GRN
  async function handleReceiveGRN(e: React.FormEvent) {
    e.preventDefault();
    if (!newGRNData.batch_number || !newGRNData.expiry_date) {
      alert("Batch Number and Expiry Date are mandatory for stock intake!");
      return;
    }
    try {
      await api.receiveGRN({
        supplier_id: newGRNData.supplier_id,
        purchase_order_id: newGRNData.purchase_order_id || undefined,
        supplier_invoice_no: newGRNData.supplier_invoice_no || undefined,
        invoice_date: newGRNData.invoice_date || undefined,
        items: [
          {
            medicine_id: newGRNData.medicine_id,
            batch_number: newGRNData.batch_number,
            expiry_date: newGRNData.expiry_date,
            quantity: newGRNData.quantity,
            purchase_price: newGRNData.purchase_price,
            tax_rate: newGRNData.tax_rate
          }
        ]
      });
      setShowReceiveGRNModal(false);
      loadData();
      loadInventoryData();
      alert("GRN Processed! Physical stock added to inventory and supplier ledger updated.");
    } catch (err: any) {
      alert("Error receiving GRN: " + err.message);
    }
  }

  // Handle Pay Supplier
  async function handlePaySupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    try {
      await api.paySupplier(selectedSupplierForPay.id, supplierPayAmount, "Bank Transfer");
      setShowPaySupplierModal(false);
      loadData();
      alert(`Payment of ₹${supplierPayAmount} recorded for ${selectedSupplierForPay.name}!`);
    } catch (err: any) {
      alert("Payment failed: " + err.message);
    }
  }

  // --------------------------------------------------------------------------
  // LOGIN SCREEN
  // --------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-200">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">MedFlow POS</h1>
              <p className="text-xs text-slate-500 font-medium">Cloud Pharmacy & Billing SaaS</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 text-xs text-emerald-800">
            <strong>Quick Demo Sign In:</strong> Click any role below to prefill and log in instantly:
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleLogin(undefined, "owner@citycare.com", "password123")}
                className="bg-white border border-emerald-300 py-1.5 px-2 rounded-lg font-semibold hover:bg-emerald-100 transition text-center cursor-pointer"
              >
                👨‍⚕️ Owner
              </button>
              <button
                type="button"
                onClick={() => handleLogin(undefined, "pharmacist@citycare.com", "password123")}
                className="bg-white border border-emerald-300 py-1.5 px-2 rounded-lg font-semibold hover:bg-emerald-100 transition text-center cursor-pointer"
              >
                💊 Pharmacist
              </button>
              <button
                type="button"
                onClick={() => handleLogin(undefined, "cashier@citycare.com", "password123")}
                className="bg-white border border-emerald-300 py-1.5 px-2 rounded-lg font-semibold hover:bg-emerald-100 transition text-center cursor-pointer"
              >
                💳 Cashier
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg mb-4">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 text-sm cursor-pointer"
            >
              {loginLoading ? "Authenticating..." : "Sign In to Store"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN APP SCREEN
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-none">{user.store_name}</h1>
                <span className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200">
                  DL: 2026-KA-987654
                </span>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200">
                  GST: 29ABCDE1234F1Z5
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Counter 1 • Cloud POS & Inventory</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-right">
              <UserIcon className="w-8 h-8 text-slate-400 bg-slate-100 p-1.5 rounded-full" />
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    user.role === "STORE_OWNER"
                      ? "bg-blue-100 text-blue-800"
                      : user.role === "PHARMACIST"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-6 text-sm font-semibold border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab("billing")}
            className={`py-2.5 flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === "billing"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> POS Billing Counter
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`py-2.5 flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === "inventory"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Package className="w-4 h-4" /> Inventory & Batches
            {(lowStock.length > 0 || nearExpiry.length > 0) && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {lowStock.length + nearExpiry.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("purchases")}
            className={`py-2.5 flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === "purchases"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Truck className="w-4 h-4" /> Purchases & Suppliers (PO / GRN)
          </button>

          <button
            onClick={() => setActiveTab("medicines")}
            className={`py-2.5 flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === "medicines"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Pill className="w-4 h-4" /> Medicines Master
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2.5 flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === "reports"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" /> Reports & Compliance Center
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-4 flex-1 w-full">
        {/* =================================================================== */}
        {/* TAB 1: POS BILLING COUNTER                                          */}
        {/* =================================================================== */}
        {activeTab === "billing" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Medicine Search & List */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[calc(100vh-140px)]">
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search medicine by brand name, salt composition, or barcode (e.g., Dolo, Augmentin, Alprax)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {medicines.map((med) => {
                  const isH1 = med.schedule_type === "SCHEDULE_H1" || med.schedule_type === "SCHEDULE_X";
                  const isH = med.schedule_type === "SCHEDULE_H";

                  return (
                    <div
                      key={med.id}
                      className="p-3 border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition flex items-center justify-between bg-slate-50/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{med.brand_name}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isH1
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : isH
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {med.schedule_type}
                          </span>
                          <span className="text-[11px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {med.pack_size}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <span className="font-medium text-slate-500">Salt:</span> {med.composition || med.generic_name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>
                            MRP: <strong className="text-slate-800">₹{med.mrp}</strong>
                          </span>
                          <span>
                            Rate: <strong className="text-emerald-700">₹{med.selling_price}</strong>
                          </span>
                          <span>GST: {med.gst_rate}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => addToCart(med)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  );
                })}

                {medicines.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Pill className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No medicines found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: POS Checkout Cart */}
            <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[calc(100vh-140px)]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" /> Current Bill
                </h2>
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                  {cart.length} Item{cart.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Customer Selector */}
              <div className="mt-2.5 flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold shrink-0">Customer:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Walk-in Retail Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Regulatory Warnings */}
              {hasScheduleH && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Regulatory Dispensing Check</strong>
                    Schedule H/H1 drugs detected. Prescribing doctor verification required.
                  </div>
                </div>
              )}

              {hasScheduleH1 && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Mandatory Schedule H1 Register Entry</strong>
                    Patient identification details will be logged in the statutory register.
                  </div>
                </div>
              )}

              {/* Cart Table */}
              <div className="flex-1 overflow-y-auto my-3 divide-y divide-slate-100">
                {cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-800 truncate">{item.medicine.brand_name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                          Batch: {item.batch.batch_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Exp: {item.batch.expiry_date} • ₹{item.unit_price} + {item.tax_rate}% GST
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50">
                        <button
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded-l cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded-r cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold text-sm text-slate-900 w-16 text-right">
                        ₹{item.line_total}
                      </span>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Counter is idle. Add medicines to begin billing.</p>
                  </div>
                )}
              </div>

              {/* Regulatory Inputs */}
              {hasScheduleH && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">Prescribing Doctor</label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.registration_no})
                        </option>
                      ))}
                    </select>
                  </div>

                  {hasScheduleH1 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Patient Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Full name"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase">Phone / Contact</label>
                        <input
                          type="text"
                          placeholder="Mobile #"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Billing Summary Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Breakdown (CGST + SGST)</span>
                  <span className="font-semibold text-slate-800">₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Special Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-0.5 bg-white border border-slate-300 rounded text-right font-semibold text-xs"
                  />
                </div>
                <div className="flex justify-between text-slate-900 text-base font-bold pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-emerald-700 font-extrabold">₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="grid grid-cols-4 gap-2 my-3">
                {(["CASH", "CARD", "UPI", "CREDIT"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      paymentMode === mode
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Submit Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" /> Complete Sale & Print Invoice
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: INVENTORY & BATCHES                                          */}
        {/* =================================================================== */}
        {activeTab === "inventory" && (
          <div className="space-y-5">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Active Medicines</span>
                <p className="text-2xl font-bold text-slate-800 mt-1">{dashboard?.total_medicines || 0}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase">Today's Sales Revenue</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">₹{dashboard?.today_sales || "0.00"}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold text-amber-600 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Alerts
                </span>
                <p className="text-2xl font-bold text-amber-600 mt-1">{lowStock.length}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold text-rose-600 uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Near Expiry (90d)
                </span>
                <p className="text-2xl font-bold text-rose-600 mt-1">{nearExpiry.length}</p>
              </div>
            </div>

            {/* Batch List Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Physical Stock Batches (FEFO Tracked)</h2>
                  <p className="text-xs text-slate-500">Every medicine is tracked down to its exact physical batch and expiry date.</p>
                </div>
                <button
                  onClick={() => setShowAddBatchModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Stock Batch
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                      <th className="py-2.5 px-3 font-semibold">Medicine ID</th>
                      <th className="py-2.5 px-3 font-semibold">Batch Number</th>
                      <th className="py-2.5 px-3 font-semibold">Mfg Date</th>
                      <th className="py-2.5 px-3 font-semibold">Expiry Date</th>
                      <th className="py-2.5 px-3 font-semibold">Qty Received</th>
                      <th className="py-2.5 px-3 font-semibold">Current Stock</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((b) => {
                      const isExpired = new Date(b.expiry_date) < new Date();
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{b.medicine_id.slice(0, 8)}...</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{b.batch_number}</td>
                          <td className="py-2.5 px-3 text-slate-600">{b.mfg_date || "N/A"}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{b.expiry_date}</td>
                          <td className="py-2.5 px-3 text-slate-600">{b.quantity_received}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">{b.quantity_remaining}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isExpired
                                  ? "bg-rose-100 text-rose-800"
                                  : b.quantity_remaining <= 10
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isExpired ? "EXPIRED" : b.quantity_remaining <= 10 ? "LOW STOCK" : "ACTIVE"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PURCHASES & SUPPLIERS (PO & GRN)                             */}
        {/* =================================================================== */}
        {activeTab === "purchases" && (
          <div className="space-y-5">
            {/* Top Actions & Summary */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Purchases & Supplier Management</h2>
                <p className="text-xs text-slate-500">
                  Manage distributor orders, receive physical stock via Goods Receipt Notes (GRN), and track accounts payable.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreatePOModal(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Purchase Order (PO)
                </button>
                <button
                  onClick={() => setShowReceiveGRNModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Truck className="w-4 h-4" /> Receive GRN (Stock Intake)
                </button>
              </div>
            </div>

            {/* Suppliers & Outstanding Balances */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Distributors & Accounts Payable Ledger</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                      <th className="py-2.5 px-3 font-semibold">Distributor Name</th>
                      <th className="py-2.5 px-3 font-semibold">Contact / Phone</th>
                      <th className="py-2.5 px-3 font-semibold">GSTIN</th>
                      <th className="py-2.5 px-3 font-semibold">Outstanding Payables</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{s.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.contact || "N/A"}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{s.gstin || "N/A"}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-700">₹{s.outstanding_balance.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedSupplierForPay(s);
                              setSupplierPayAmount(Math.min(1000, s.outstanding_balance || 1000));
                              setShowPaySupplierModal(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Purchase Orders & GRNs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Purchase Orders */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Purchase Orders (POs)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2 px-2.5 font-semibold">PO Number</th>
                        <th className="py-2 px-2.5 font-semibold">Est. Amount</th>
                        <th className="py-2 px-2.5 font-semibold">Status</th>
                        <th className="py-2 px-2.5 font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id}>
                          <td className="py-2 px-2.5 font-bold font-mono text-slate-800">{po.po_number}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-800">₹{po.total_amount}</td>
                          <td className="py-2 px-2.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                po.status === "RECEIVED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-slate-500">{new Date(po.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {purchaseOrders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No Purchase Orders created yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Goods Receipt Notes (GRNs) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Goods Receipt Notes (GRNs / Inward)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2 px-2.5 font-semibold">GRN #</th>
                        <th className="py-2 px-2.5 font-semibold">Supplier Inv #</th>
                        <th className="py-2 px-2.5 font-semibold">Invoice Total</th>
                        <th className="py-2 px-2.5 font-semibold">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grns.map((g) => (
                        <tr key={g.id}>
                          <td className="py-2 px-2.5 font-bold font-mono text-slate-800">{g.grn_number}</td>
                          <td className="py-2 px-2.5 text-slate-600">{g.supplier_invoice_no || "N/A"}</td>
                          <td className="py-2 px-2.5 font-bold text-emerald-700">₹{g.total_amount}</td>
                          <td className="py-2 px-2.5 text-slate-500">{new Date(g.received_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {grns.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No GRNs recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: MEDICINES MASTER CATALOG                                     */}
        {/* =================================================================== */}
        {activeTab === "medicines" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Medicines Master Catalog</h2>
                <p className="text-xs text-slate-500">Master database of all formulations, drug schedules, salts, and tax slabs.</p>
              </div>
              <button
                onClick={() => setShowAddMedModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Medicine
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold">Brand Name</th>
                    <th className="py-2.5 px-3 font-semibold">Generic / Salt Composition</th>
                    <th className="py-2.5 px-3 font-semibold">Schedule Classification</th>
                    <th className="py-2.5 px-3 font-semibold">Unit / Pack</th>
                    <th className="py-2.5 px-3 font-semibold">MRP</th>
                    <th className="py-2.5 px-3 font-semibold">Selling Rate</th>
                    <th className="py-2.5 px-3 font-semibold">GST Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{m.brand_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.composition || m.generic_name}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            m.schedule_type === "SCHEDULE_H1" || m.schedule_type === "SCHEDULE_X"
                              ? "bg-rose-100 text-rose-800"
                              : m.schedule_type === "SCHEDULE_H"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {m.schedule_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.pack_size || m.unit}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">₹{m.mrp}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">₹{m.selling_price}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.gst_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: REPORTS & REGULATORY COMPLIANCE CENTER                        */}
        {/* =================================================================== */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Reports Top Navigation & Subtabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportsSubTab("sales")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    reportsSubTab === "sales"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" /> Sales Report & Invoices
                </button>
                <button
                  onClick={() => setReportsSubTab("gst")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    reportsSubTab === "gst"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> GST Tax Summary (CGST/SGST)
                </button>
                <button
                  onClick={() => setReportsSubTab("schedule")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    reportsSubTab === "schedule"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Schedule H1 / X Register
                </button>
              </div>

              {reportsSubTab === "schedule" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadScheduleCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Drug Inspector CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print Register
                  </button>
                </div>
              )}
            </div>

            {/* --------------------------------------------------------------- */}
            {/* SUBTAB 1: SALES REPORT & INVOICES                               */}
            {/* --------------------------------------------------------------- */}
            {reportsSubTab === "sales" && (
              <div className="space-y-4">
                {/* Date Filter & Control Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <form onSubmit={handleFilterSales} className="flex flex-wrap items-end gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={dateFilterFrom}
                        onChange={(e) => setDateFilterFrom(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg outline-none text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={dateFilterTo}
                        onChange={(e) => setDateFilterTo(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg outline-none text-slate-700"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Filter className="w-3.5 h-3.5" /> Apply Filter
                    </button>
                    {(dateFilterFrom || dateFilterTo) && (
                      <button
                        type="button"
                        onClick={handleResetSalesFilter}
                        className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                      >
                        Reset / Show All
                      </button>
                    )}
                  </form>
                </div>

                {/* Key Revenue & Sales KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Invoices Generated</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{salesReport?.count ?? 0}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Total completed transactions</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Gross Sales Revenue</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      ₹{salesReport?.total_revenue?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Net bill value collected</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Total GST Collected</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      ₹{salesReport?.total_tax_collected?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Included tax liability</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Discounts Given</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                      ₹{salesReport?.total_discount_given?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Special patient concessions</p>
                  </div>
                </div>

                {/* Invoices List Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Invoices & Sales Transactions</h3>
                    <span className="text-xs text-slate-500">Showing {salesReport?.bills?.length ?? 0} invoices</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                          <th className="py-2.5 px-3 font-semibold">Invoice Number</th>
                          <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                          <th className="py-2.5 px-3 font-semibold">Payment Mode</th>
                          <th className="py-2.5 px-3 font-semibold">Subtotal</th>
                          <th className="py-2.5 px-3 font-semibold">Tax (GST)</th>
                          <th className="py-2.5 px-3 font-semibold">Total Paid</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesReport?.bills?.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{b.bill_number}</td>
                            <td className="py-2.5 px-3 text-slate-600">{new Date(b.date).toLocaleString()}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  b.payment_mode === "CASH"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : b.payment_mode === "UPI"
                                    ? "bg-purple-100 text-purple-800"
                                    : b.payment_mode === "CARD"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {b.payment_mode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">₹{b.subtotal.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-600">₹{b.tax.toFixed(2)}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700">₹{b.total.toFixed(2)}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {b.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleReprintBill(b.id)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ml-auto transition cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" /> Reprint Receipt
                              </button>
                            </td>
                          </tr>
                        ))}

                        {(!salesReport?.bills || salesReport.bills.length === 0) && (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-slate-400">
                              No sales bills found for the selected period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* SUBTAB 2: GST TAX SUMMARY (CGST / SGST)                         */}
            {/* --------------------------------------------------------------- */}
            {reportsSubTab === "gst" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Total Taxable Value</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₹{taxSummary?.total_taxable_value?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Value before GST application</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Total GST Collected</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      ₹{taxSummary?.total_gst_collected?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Gross GST payable to govt</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">Central GST (CGST - 50%)</p>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">
                      ₹{taxSummary?.cgst_split?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Central Government share</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">State GST (SGST - 50%)</p>
                    <p className="text-2xl font-bold text-teal-700 mt-1">
                      ₹{taxSummary?.sgst_split?.toFixed(2) ?? "0.00"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">State Government share</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Pharmacy GST Statutory Compliance & Tax Slabs</h3>
                  <p className="text-xs text-slate-600 mb-4">
                    Under Indian GST Law, pharmaceutical goods are classified under HSN Chapter 30 with prescribed tax slabs:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs mb-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <strong className="block text-emerald-800 font-bold mb-1">0% (Nil Rated)</strong>
                      <p className="text-slate-600">Life-saving formulations, human blood, contraceptives, diagnostic kits.</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <strong className="block text-blue-800 font-bold mb-1">5% GST</strong>
                      <p className="text-slate-600">Life-saving drugs, oral rehydration salts (ORS), insulin, vaccines.</p>
                    </div>
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <strong className="block text-indigo-800 font-bold mb-1">12% GST (Most Common)</strong>
                      <p className="text-slate-600">Antibiotics, analgesics, antipyretics, standard allopathic medications.</p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <strong className="block text-purple-800 font-bold mb-1">18% GST</strong>
                      <p className="text-slate-600">Medical cosmetics, medicated soaps, antiseptic skin preparations, hair care.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1">Monthly Accountant Filing Checklist:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li><strong>GSTR-1:</strong> Monthly statement of outward sales supplies (due 11th of each month).</li>
                      <li><strong>GSTR-3B:</strong> Monthly self-declared summary return with CGST/SGST tax liability settlement (due 20th).</li>
                      <li><strong>Input Tax Credit (ITC):</strong> Reconcile purchases against supplier GRNs before claiming credit.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* SUBTAB 3: SCHEDULE H1 STATUTORY REGISTER                        */}
            {/* --------------------------------------------------------------- */}
            {reportsSubTab === "schedule" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" /> Drugs & Cosmetics Act: Schedule H1 / X Register
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mandatory statutory dispensing register required by Central/State Drug Inspectors under Rule 65 of Drugs and Cosmetics Rules 1945.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3 font-semibold">Dispensed Date</th>
                        <th className="py-2.5 px-3 font-semibold">Bill / Invoice #</th>
                        <th className="py-2.5 px-3 font-semibold">Patient Name</th>
                        <th className="py-2.5 px-3 font-semibold">Patient Phone & Address</th>
                        <th className="py-2.5 px-3 font-semibold">Prescribing Doctor</th>
                        <th className="py-2.5 px-3 font-semibold">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scheduleRegister.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700">{r.dispensed_date}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.bill_id.slice(0, 8)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{r.patient_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {r.patient_phone} • {r.patient_address}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{r.doctor_id ? "Registered Doctor" : "N/A"}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-700">{r.quantity} Strips</td>
                        </tr>
                      ))}

                      {scheduleRegister.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            No Schedule H1 / Schedule X sales logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* INVOICE PRINT RECEIPT MODAL                                           */}
      {/* ===================================================================== */}
      {completedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-200">
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h2 className="text-lg font-bold text-slate-900">{user.store_name}</h2>
              <p className="text-xs text-slate-500">Retail Chemist & Druggist</p>
              <p className="text-[11px] text-slate-400 mt-1">DL: 2026-KA-987654 • GSTIN: 29ABCDE1234F1Z5</p>
            </div>

            <div className="my-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <strong className="font-mono text-slate-800">{completedBill.bill_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-700">{new Date(completedBill.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold text-slate-800">{completedBill.payment_mode}</span>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-2 my-2 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 font-semibold pb-1">
                <span>Description</span>
                <span>Amount</span>
              </div>
              {completedBill.items?.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>
                    {it.quantity}x Medicine (₹{it.unit_price})
                  </span>
                  <span>₹{it.line_total}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>₹{completedBill.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (GST):</span>
                <span>₹{completedBill.tax}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-dashed border-slate-300">
                <span>Total Paid:</span>
                <span className="text-emerald-700 font-extrabold">₹{completedBill.total}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Tax Receipt
              </button>
              <button
                onClick={() => setCompletedBill(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD NEW MEDICINE                                               */}
      {/* ===================================================================== */}
      {showAddMedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-3">Add New Medicine to Catalog</h2>
            <form onSubmit={handleAddMedicine} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dolo 650"
                    value={newMedData.brand_name}
                    onChange={(e) => setNewMedData({ ...newMedData, brand_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Generic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol"
                    value={newMedData.generic_name}
                    onChange={(e) => setNewMedData({ ...newMedData, generic_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Salt / Composition</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 650mg"
                  value={newMedData.composition}
                  onChange={(e) => setNewMedData({ ...newMedData, composition: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Schedule</label>
                  <select
                    value={newMedData.schedule_type}
                    onChange={(e) => setNewMedData({ ...newMedData, schedule_type: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="OTC">OTC (General)</option>
                    <option value="SCHEDULE_H">Schedule H</option>
                    <option value="SCHEDULE_H1">Schedule H1</option>
                    <option value="SCHEDULE_X">Schedule X</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newMedData.mrp}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        mrp: parseFloat(e.target.value) || 0,
                        selling_price: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    value={newMedData.gst_rate}
                    onChange={(e) => setNewMedData({ ...newMedData, gst_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save Medicine
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD STOCK BATCH                                                */}
      {/* ===================================================================== */}
      {showAddBatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-3">Add Stock Batch (Opening / Intake)</h2>
            <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Select Medicine *</label>
                <select
                  required
                  value={newBatchData.medicine_id}
                  onChange={(e) => setNewBatchData({ ...newBatchData, medicine_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  <option value="">-- Choose Medicine --</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand_name} ({m.generic_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-99"
                    value={newBatchData.batch_number}
                    onChange={(e) => setNewBatchData({ ...newBatchData, batch_number: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatchData.expiry_date}
                    onChange={(e) => setNewBatchData({ ...newBatchData, expiry_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newBatchData.quantity_remaining}
                  onChange={(e) => {
                    const q = parseInt(e.target.value) || 0;
                    setNewBatchData({ ...newBatchData, quantity_remaining: q, quantity_received: q });
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Add Batch
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE PURCHASE ORDER (PO)                                     */}
      {/* ===================================================================== */}
      {showCreatePOModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-800" /> Create Purchase Order (PO)
            </h2>
            <form onSubmit={handleCreatePO} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Select Distributor / Supplier *</label>
                <select
                  required
                  value={newPOData.supplier_id}
                  onChange={(e) => setNewPOData({ ...newPOData, supplier_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contact || "No phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Select Medicine to Order *</label>
                <select
                  required
                  value={newPOData.medicine_id}
                  onChange={(e) => setNewPOData({ ...newPOData, medicine_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand_name} ({m.generic_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Quantity (Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPOData.quantity}
                    onChange={(e) => setNewPOData({ ...newPOData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Expected Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPOData.expected_cost_price}
                    onChange={(e) => setNewPOData({ ...newPOData, expected_cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold flex justify-between">
                <span>Estimated PO Value:</span>
                <span className="font-bold text-slate-900">
                  ₹{(newPOData.quantity * newPOData.expected_cost_price).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Place Purchase Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePOModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: RECEIVE GRN (STOCK INTAKE)                                     */}
      {/* ===================================================================== */}
      {showReceiveGRNModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" /> Receive Goods Receipt Note (GRN)
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Stock intake: Batch and expiry details will automatically be added into inventory batches, and the distributor ledger will be credited.
            </p>

            <form onSubmit={handleReceiveGRN} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Distributor / Supplier *</label>
                  <select
                    required
                    value={newGRNData.supplier_id}
                    onChange={(e) => setNewGRNData({ ...newGRNData, supplier_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Supplier Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9901"
                    value={newGRNData.supplier_invoice_no}
                    onChange={(e) => setNewGRNData({ ...newGRNData, supplier_invoice_no: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Select Medicine Received *</label>
                <select
                  required
                  value={newGRNData.medicine_id}
                  onChange={(e) => setNewGRNData({ ...newGRNData, medicine_id: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.brand_name} ({m.generic_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Delivered Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-2026-X"
                    value={newGRNData.batch_number}
                    onChange={(e) => setNewGRNData({ ...newGRNData, batch_number: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Batch Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newGRNData.expiry_date}
                    onChange={(e) => setNewGRNData({ ...newGRNData, expiry_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Quantity Delivered *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newGRNData.quantity}
                    onChange={(e) => setNewGRNData({ ...newGRNData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Purchase Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newGRNData.purchase_price}
                    onChange={(e) => setNewGRNData({ ...newGRNData, purchase_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">GST Tax (%)</label>
                  <input
                    type="number"
                    value={newGRNData.tax_rate}
                    onChange={(e) => setNewGRNData({ ...newGRNData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex justify-between items-center text-emerald-900">
                <span>Total Invoice Value (incl. GST):</span>
                <span className="text-base font-extrabold text-emerald-800">
                  ₹
                  {(
                    newGRNData.quantity * newGRNData.purchase_price * (1 + newGRNData.tax_rate / 100)
                  ).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Accept Delivery & Stock
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiveGRNModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PAY SUPPLIER                                                   */}
      {/* ===================================================================== */}
      {showPaySupplierModal && selectedSupplierForPay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" /> Record Supplier Payment
            </h2>
            <p className="text-xs text-slate-500 mb-3">Distributor: {selectedSupplierForPay.name}</p>

            <form onSubmit={handlePaySupplier} className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                <span className="text-slate-500">Current Outstanding:</span>
                <strong className="text-rose-700">₹{selectedSupplierForPay.outstanding_balance.toFixed(2)}</strong>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Amount to Pay (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none text-sm font-bold text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaySupplierModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
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
}
