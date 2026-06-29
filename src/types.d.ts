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
    discount: number,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ) => Promise<unknown>;
  deleteInvoice: (id: number) => Promise<unknown>;
  printToPDF: (invoiceNumber: string, htmlContent: string) => Promise<boolean>;
  getInvoiceById: (id: number) => Promise<any>;
  updateInvoice: (
    invoiceId: number,
    clientId: number,
    invoiceNumber: string,
    date: string,
    dueDate: string,
    gstEnabled: boolean,
    discount: number,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ) => Promise<unknown>;
  getProjects: () => Promise<Project[]>;
  createProject: (name: string, clientId: number | null, description: string, status: string, startDate: string) => Promise<unknown>;
  updateProject: (id: number, name: string, clientId: number | null, description: string, status: string, startDate: string) => Promise<unknown>;
  deleteProject: (id: number) => Promise<unknown>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
