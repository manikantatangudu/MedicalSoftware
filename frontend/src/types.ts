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
  code?: string;
  brand_name: string;
  generic_name: string;
  company_name?: string;
  manufacturer_id?: string;
  product_type?: string;
  drug_type?: string;
  composition?: string;
  strength?: string;
  packing?: string;
  conversion: number;
  rack_no?: string;
  hsn_code?: string;
  gst_rate: number;
  purchase_tax_rate?: number;
  show_gst_in_purchase?: boolean;
  mrp: number;
  purchase_price: number;
  selling_price: number;
  schedule_type: DrugSchedule;
  schedule_code?: string;
  max_discount_limit?: number;
  sales_discount?: number;
  add_points_percent?: number;
  allow_negative_stock?: boolean;
  is_narcotic?: boolean;
  reorder_level: number;
  reorder_qty?: number;
  unit: string;
  pack_size?: string;
  category?: string;
  barcode?: string;
  launched_on?: string;
  comments?: string;
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
  code?: string;
  name: string;
  phone?: string;
  mobile_2?: string;
  email?: string;
  address?: string;
  locality?: string;
  city?: string;
  pincode?: string;
  doctor_id?: string;
  doctor_name?: string;
  category?: string;
  gstin?: string;
  credit_balance: number;
  discount_percent?: number;
  discount_ceiling?: number;
  billing_on?: string;
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

export interface Manufacturer {
  id: string;
  code?: string;
  name: string;
  license_no?: string;
  contact?: string;
}

export interface Molecule {
  name: string;
  code: string;
  category: string;
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
  strips: number;
  tablets: number;
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
