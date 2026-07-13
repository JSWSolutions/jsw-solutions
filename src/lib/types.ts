// Shared data types for JSW Solutions dashboard.

export interface Customer {
  id: number;
  company: string;
  contact_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  created_at: string;
}

export interface Machine {
  id: number;
  machine_id: string; // e.g. "LB-15#9701"
  customer_id: number | null;
  created_at: string;
}

export interface LineItem {
  id?: number;
  invoice_id?: number;
  description: string; // e.g. "SERVICE", "TRAVEL", "PARTS"
  cost_per_hour: number | null; // rate, or unit price for parts
  qty: number | null;
  line_total: number;
  sort_order: number;
}

export interface Invoice {
  id: number;
  po_number: string | null;
  invoice_date: string | null; // ISO yyyy-mm-dd
  customer_id: number | null;
  machine_id: number | null;
  work_summary: string | null;
  total: number;
  pdf_url: string | null;
  created_at: string;
}

// A fully-joined invoice for display.
export interface InvoiceFull extends Invoice {
  customer_company: string | null;
  customer_contact: string | null;
  machine_label: string | null;
  line_items: LineItem[];
}

// The shape returned by the PDF parser / posted by the new-invoice form.
export interface ParsedInvoice {
  po_number: string | null;
  invoice_date: string | null; // ISO yyyy-mm-dd
  machine_id: string | null;
  customer_company: string | null;
  customer_contact: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_zip: string | null;
  customer_phone: string | null;
  work_summary: string | null;
  line_items: LineItem[];
  total: number;
}
