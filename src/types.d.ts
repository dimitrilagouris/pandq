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

export interface ElectronAPI {
  getClients: () => Promise<Client[]>;
  createClient: (name: string, businessName: string, email: string, phone: string, address: string) => Promise<unknown>;
  updateClient: (id: number, name: string, businessName: string, email: string, phone: string, address: string) => Promise<unknown>;
  deleteClient: (id: number) => Promise<unknown>;
  getInvoices: () => Promise<Invoice[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
