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
  flags?: string; // Comma separated flag colors
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

export interface ElectronAPI {
  getClients: () => Promise<Client[]>;
  createClient: (name: string, businessName: string, email: string, phone: string, address: string) => Promise<unknown>;
  updateClient: (id: number, name: string, businessName: string, email: string, phone: string, address: string) => Promise<unknown>;
  deleteClient: (id: number) => Promise<unknown>;
  getInvoices: () => Promise<Invoice[]>;
  createInvoice: (
    clientId: number,
    invoiceNumber: string,
    date: string,
    dueDate: string,
    gstEnabled: boolean,
    displayDueDate: boolean,
    discount: number,
    discountType: string,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ) => Promise<unknown>;
  deleteInvoice: (id: number) => Promise<unknown>;
  printToPDF: (invoiceNumber: string, htmlContent: string) => Promise<boolean>;
  emailInvoice: (invoiceNumber: string, htmlContent: string, recipientEmail: string, clientName: string, grandTotal: number, dueDate: string) => Promise<boolean>;
  emailMultipleInvoices: (invoiceEntries: Array<{ invoiceNumber: string; htmlContent: string; clientName: string; grandTotal: number; dueDate: string }>, recipientEmail: string) => Promise<boolean>;
  getInvoiceById: (id: number) => Promise<any>;
  updateInvoice: (
    invoiceId: number,
    clientId: number,
    invoiceNumber: string,
    date: string,
    dueDate: string,
    gstEnabled: boolean,
    displayDueDate: boolean,
    discount: number,
    discountType: string,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ) => Promise<unknown>;
  getProjects: () => Promise<Project[]>;
  createProject: (name: string, clientId: number | null, description: string, status: string, startDate: string) => Promise<unknown>;
  updateProject: (id: number, name: string, clientId: number | null, description: string, status: string, startDate: string) => Promise<unknown>;
  deleteProject: (id: number) => Promise<unknown>;
  getSettings: () => Promise<Record<string, string>>;
  saveSettings: (settings: Record<string, string>) => Promise<boolean>;
  updateInvoiceStatus: (id: number, status: string) => Promise<unknown>;
  getActivityLogs: () => Promise<any[]>;
  getInvoiceActivityLogs: (invoiceId: number) => Promise<any[]>;
  getInvoiceStatuses: () => Promise<InvoiceStatus[]>;
  createInvoiceStatus: (name: string, color: string) => Promise<unknown>;
  updateInvoiceStatusColor: (name: string, color: string) => Promise<unknown>;
  deleteInvoiceStatus: (name: string) => Promise<unknown>;
  getFlags: () => Promise<Flag[]>;
  toggleInvoiceFlag: (invoiceId: number, flagId: number) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
