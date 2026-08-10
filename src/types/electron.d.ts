import type {
  Client,
  Invoice,
  InvoiceDetail,
  Project,
  InvoiceStatus,
  Flag,
  ActivityLog,
} from './models';

// ─── IPC Payload Types ────────────────────────────────────────────────────────

/** Payload for creating a new client. */
export interface CreateClientPayload {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
}

/** Payload for updating an existing client. */
export interface UpdateClientPayload extends CreateClientPayload {
  id: number;
}

/** A single worker entry sent over IPC for a labour line item. */
export interface WorkerPayload {
  name: string;
  hours: number;
  rate: number;
}

/** A single line item as sent over IPC. */
export interface InvoiceItemPayload {
  type: string;
  description: string;
  hours: number | null;
  rate: number;
  quantity: number | null;
  date: string | null;
  workers?: WorkerPayload[];
}

/** Payload for creating a new invoice. */
export interface CreateInvoicePayload {
  clientId: number;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  gstEnabled: boolean;
  displayDueDate: boolean;
  discount: number;
  discountType: string;
  discountDescription?: string;
  price: number;
  items: InvoiceItemPayload[];
  notes: string;
  templateId: string;
}

/** Payload for updating an existing invoice. */
export interface UpdateInvoicePayload extends CreateInvoicePayload {
  invoiceId: number;
}

// ─── IPC Bridge ───────────────────────────────────────────────────────────────

/**
 * Electron IPC bridge exposed to the renderer via contextBridge.
 * Mirrors the handlers registered in electron/preload.ts.
 */
export interface ElectronAPI {
  // Clients
  getClients: () => Promise<Client[]>;
  createClient: (payload: CreateClientPayload) => Promise<void>;
  updateClient: (payload: UpdateClientPayload) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;

  // Invoices
  getInvoices: () => Promise<Invoice[]>;
  getInvoiceById: (id: number) => Promise<InvoiceDetail | null>;
  createInvoice: (payload: CreateInvoicePayload) => Promise<number>;
  updateInvoice: (payload: UpdateInvoicePayload) => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
  updateInvoiceStatus: (id: number, status: string) => Promise<void>;

  // Invoice statuses
  getInvoiceStatuses: () => Promise<InvoiceStatus[]>;
  createInvoiceStatus: (name: string, color: string) => Promise<void>;
  updateInvoiceStatusColor: (name: string, color: string) => Promise<void>;
  deleteInvoiceStatus: (name: string) => Promise<void>;

  // Flags
  getFlags: () => Promise<Flag[]>;
  toggleInvoiceFlag: (invoiceId: number, flagId: number) => Promise<boolean>;

  // Export / email
  printToPDF: (invoiceNumber: string, htmlContent: string) => Promise<boolean>;
  emailInvoice: (invoiceNumber: string, htmlContent: string, recipientEmail: string, clientName: string, grandTotal: number, dueDate: string) => Promise<boolean>;
  emailMultipleInvoices: (invoiceEntries: Array<{ invoiceNumber: string; htmlContent: string; clientName: string; grandTotal: number; dueDate: string }>, recipientEmail: string) => Promise<boolean>;

  // Projects
  getProjects: () => Promise<Project[]>;
  createProject: (name: string, clientId: number | null, description: string, status: string, startDate: string) => Promise<void>;
  updateProject: (id: number, name: string, clientId: number | null, description: string, status: string, startDate: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  // Settings
  getSettings: () => Promise<Record<string, string>>;
  saveSettings: (settings: Record<string, string>) => Promise<boolean>;

  // Activity
  getActivityLogs: () => Promise<ActivityLog[]>;
  getInvoiceActivityLogs: (invoiceId: number) => Promise<ActivityLog[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
