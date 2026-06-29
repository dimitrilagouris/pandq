/** Local state shape for a single invoice line item (not yet persisted). */
export interface LineItem {
  /** Locally-unique identifier for React key and mutation targeting. */
  id: string;
  type: 'labour' | 'materials';
  description: string;
  quantity: number;
  unitPrice: number;
}

/** Full invoice form state held in memory until saved. */
export interface InvoiceFormState {
  invoiceNumber: string;
  dateIssued: string;
  dueDate: string;
  clientId: number | null;
  items: LineItem[];
  gstEnabled: boolean;
  displayDueDate: boolean;
  discount: number;
  notes: string;
}

/** Computed financial totals derived from InvoiceFormState. */
export interface InvoiceTotals {
  subtotal: number;
  gst: number;
  discount: number;
  grandTotal: number;
}
