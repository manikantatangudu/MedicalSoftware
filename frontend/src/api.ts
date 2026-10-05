const API_BASE = "/api/v1";

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem("med_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    return res.json();
  },

  async registerTenant(data: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  // Medicines
  async getMedicines(query = "") {
    const url = query ? `${API_BASE}/medicines/?q=${encodeURIComponent(query)}` : `${API_BASE}/medicines/`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load medicines");
    return res.json();
  },

  async getMedicineBatches(medicineId: string) {
    const res = await fetch(`${API_BASE}/medicines/${medicineId}/batches`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load batches");
    return res.json();
  },

  async createMedicine(data: any) {
    const res = await fetch(`${API_BASE}/medicines/`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to add medicine" }));
      throw new Error(err.detail || "Failed to add medicine");
    }
    return res.json();
  },

  async updateMedicine(id: string, data: any) {
    const res = await fetch(`${API_BASE}/medicines/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update medicine" }));
      throw new Error(err.detail || "Failed to update medicine");
    }
    return res.json();
  },

  async deleteMedicine(id: string) {
    const res = await fetch(`${API_BASE}/medicines/${id}`, {
      method: "DELETE",
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error("Failed to delete medicine");
    return res.json();
  },

  // Inventory
  async getBatches() {
    const res = await fetch(`${API_BASE}/inventory/batches`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load inventory batches");
    return res.json();
  },

  async getLowStock() {
    const res = await fetch(`${API_BASE}/inventory/low-stock`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load low stock");
    return res.json();
  },

  async getNearExpiry() {
    const res = await fetch(`${API_BASE}/inventory/near-expiry`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load near expiry");
    return res.json();
  },

  async addBatch(data: any) {
    const res = await fetch(`${API_BASE}/inventory/batches`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to add batch" }));
      throw new Error(err.detail || "Failed to add batch");
    }
    return res.json();
  },

  // Master Catalogs
  async getDoctors() {
    const res = await fetch(`${API_BASE}/master/doctors`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async createDoctor(data: any) {
    const res = await fetch(`${API_BASE}/master/doctors`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to add doctor");
    return res.json();
  },

  async getCustomers(query = "") {
    const url = query ? `${API_BASE}/master/customers?q=${encodeURIComponent(query)}` : `${API_BASE}/master/customers`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async createCustomer(data: any) {
    const res = await fetch(`${API_BASE}/master/customers`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to save customer" }));
      throw new Error(err.detail || "Failed to save customer");
    }
    return res.json();
  },

  async updateCustomer(id: string, data: any) {
    const res = await fetch(`${API_BASE}/master/customers/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update customer" }));
      throw new Error(err.detail || "Failed to update customer");
    }
    return res.json();
  },

  async deleteCustomer(id: string) {
    const res = await fetch(`${API_BASE}/master/customers/${id}`, {
      method: "DELETE",
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error("Failed to delete customer");
    return res.json();
  },

  async getSuppliers() {
    const res = await fetch(`${API_BASE}/master/suppliers`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async createSupplier(data: any) {
    const res = await fetch(`${API_BASE}/master/suppliers`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to add supplier");
    return res.json();
  },

  async getManufacturers() {
    const res = await fetch(`${API_BASE}/master/manufacturers`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async createManufacturer(data: any) {
    const res = await fetch(`${API_BASE}/master/manufacturers`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to add company");
    return res.json();
  },

  async getMolecules(query = "") {
    const url = query ? `${API_BASE}/master/molecules?q=${encodeURIComponent(query)}` : `${API_BASE}/master/molecules`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  // Purchases & GRN
  async getPurchaseOrders() {
    const res = await fetch(`${API_BASE}/purchases/purchase-orders`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async createPurchaseOrder(data: any) {
    const res = await fetch(`${API_BASE}/purchases/purchase-orders`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "PO creation failed" }));
      throw new Error(err.detail || "PO creation failed");
    }
    return res.json();
  },

  async getGRNs() {
    const res = await fetch(`${API_BASE}/purchases/grn`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async receiveGRN(data: any) {
    const res = await fetch(`${API_BASE}/purchases/grn`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "GRN processing failed" }));
      throw new Error(err.detail || "GRN processing failed");
    }
    return res.json();
  },

  async paySupplier(supplierId: string, amount: number, notes?: string) {
    const res = await fetch(`${API_BASE}/purchases/supplier-payments`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ supplier_id: supplierId, amount, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Payment recording failed" }));
      throw new Error(err.detail || "Payment recording failed");
    }
    return res.json();
  },

  // Billing
  async createBill(data: any) {
    const res = await fetch(`${API_BASE}/billing/`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Billing failed" }));
      throw new Error(err.detail || "Billing failed");
    }
    return res.json();
  },

  async getRecentBills() {
    const res = await fetch(`${API_BASE}/billing/`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async getBill(id: string) {
    const res = await fetch(`${API_BASE}/billing/${id}`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load invoice");
    return res.json();
  },

  // Reports
  async getDashboard() {
    const res = await fetch(`${API_BASE}/reports/dashboard`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to load dashboard");
    return res.json();
  },

  async getSalesReport(startDate?: string, endDate?: string) {
    let url = `${API_BASE}/reports/sales`;
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) return { count: 0, total_revenue: 0, total_tax_collected: 0, total_discount_given: 0, bills: [] };
    return res.json();
  },

  async getTaxSummary() {
    const res = await fetch(`${API_BASE}/reports/tax-summary`, { headers: getAuthHeader() });
    if (!res.ok) return null;
    return res.json();
  },

  async getScheduleRegister() {
    const res = await fetch(`${API_BASE}/reports/schedule-register`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  },

  async downloadScheduleCSV() {
    const res = await fetch(`${API_BASE}/reports/export/schedule-register-csv`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to download CSV");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule_drug_register.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
