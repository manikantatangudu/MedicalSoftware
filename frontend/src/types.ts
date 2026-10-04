export type UserRole = "SUPER_ADMIN" | "STORE_OWNER" | "PHARMACIST" | "CASHIER" | "ACCOUNTANT" | "BRANCH_MANAGER";

export type DrugSchedule = "OTC" | "SCHEDULE_H" | "SCHEDULE_H1" | "SCHEDULE_X";

export interface UserProfile {
  user_id: string;
  tenant_id: string;
  store_name: string;
  role: UserRole;
  name: string;
  email: string;
  branch_id?: string;
}

export interface Medicine {
  id: string;
  generic_name: string;
  brand_name: string;
  drug_type?: string;
  composition?: string;
  strength?: string;
  pack_size?: string;
  category?: string;
  hsn_code?: string;
  gst_rate: number;
  mrp: number;
  purchase_price: number;
  selling_price: number;
  schedule_type: DrugSchedule;
  reorder_level: number;
  unit: string;
  barcode?: string;
}

export interface Batch {
  id: string;
  medicine_id: string;
  branch_id: string;
  batch_number: string;
  mfg_date?: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
}

export interface Doctor {
  id: string;
  name: string;
  registration_no: string;
  specialization?: string;
  contact?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  credit_balance: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  gstin?: string;
  outstanding_balance: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  total_amount: number;
  created_at: string;
}

export interface GoodsReceiptNote {
  id: string;
  grn_number: string;
  purchase_order_id?: string;
  supplier_id: string;
  supplier_invoice_no?: string;
  invoice_date?: string;
  total_amount: number;
  received_at: string;
}

export interface CartItem {
  medicine: Medicine;
  batch: Batch;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export interface BillResponse {
  id: string;
  bill_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_mode: string;
  status: string;
  created_at: string;
}
