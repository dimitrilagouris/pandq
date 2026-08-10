/** Domain model types shared across the renderer process. */

export interface Client {
  id: number;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Invoice {
  id: number;
  client_id: number;
  invoice_number: string;
  date: string;
  due_date: string;
  status: string;
  price: number;
  gst_added: boolean;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
  display_due_date?: boolean;
  client_name?: string;
  client_business_name?: string;
  client_email?: string;
  client_address?: string;
  items_description?: string;
  template_id?: string;
  /** Comma-separated flag colours, e.g. "bg-red-500,bg-blue-500" */
  flags?: string;
}

export interface Flag {
  id: number;
  color: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  type: string;
  description: string;
  hours: number | null;
  rate: number;
  quantity: number;
}

export interface Discount {
  id: number;
  invoice_id: number;
  description: string;
  amount: number;
  type: string;
}

export interface Project {
  id: number;
  client_id: number | null;
  name: string;
  description: string;
  status: string;
  start_date: string;
  client_name?: string;
  client_business_name?: string;
}

export interface InvoiceStatus {
  id: number;
  name: string;
  color: string;
}

export interface ActivityLog {
  id: number;
  invoice_id: number | null;
  invoice_number: string | null;
  action_code: string;
  action_label: string;
  action_category: string;
  invoice_status: string | null;
  details: string | null;
  timestamp: string;
}

/** A single worker row persisted against a labour line item. */
export interface PersistedWorker {
  id: number;
  item_id: number;
  name: string;
  hours: number;
  rate: number;
}

/** A single persisted line item, as returned from the DB. */
export interface PersistedInvoiceItem {
  id: number;
  invoice_id: number;
  type: string;
  description: string;
  hours: number | null;
  rate: number;
  quantity: number | null;
  date: string | null;
  workers?: PersistedWorker[];
}

/** A persisted discount row. */
export interface PersistedDiscount {
  id: number;
  invoice_id: number;
  description: string;
  amount: number;
  type: 'flat' | 'percentage';
}

/**
 * Full invoice detail as returned by `getInvoiceById`.
 * Extends the list-level Invoice with nested items, discounts, and client fields.
 */
export interface InvoiceDetail extends Invoice {
  client_phone?: string;
  template_id: string;
  items: PersistedInvoiceItem[];
  discounts: PersistedDiscount[];
}
