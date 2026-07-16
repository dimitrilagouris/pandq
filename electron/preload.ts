import { contextBridge, ipcRenderer } from 'electron';

// Expose safe database functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getClients: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-clients');
  },

  createClient: (name: string, businessName: string, email: string, phone: string, address: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-create-client', name, businessName, email, phone, address);
  },

  updateClient: (id: number, name: string, businessName: string, email: string, phone: string, address: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-update-client', id, name, businessName, email, phone, address);
  },

  deleteClient: (id: number): Promise<unknown> => {
    return ipcRenderer.invoke('db-delete-client', id);
  },

  getInvoices: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-invoices');
  },

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
    templateId: string,
  ): Promise<unknown> => {
    return ipcRenderer.invoke('db-create-invoice', clientId, invoiceNumber, date, dueDate, gstEnabled, displayDueDate, discount, discountType, price, items, notes, templateId);
  },

  deleteInvoice: (id: number): Promise<unknown> => {
    return ipcRenderer.invoke('db-delete-invoice', id);
  },

  printToPDF: (invoiceNumber: string, htmlContent: string): Promise<boolean> => {
    return ipcRenderer.invoke('print-to-pdf', invoiceNumber, htmlContent);
  },

  emailInvoice: (invoiceNumber: string, htmlContent: string, recipientEmail: string, clientName: string, grandTotal: number, dueDate: string): Promise<boolean> => {
    return ipcRenderer.invoke('email-invoice', invoiceNumber, htmlContent, recipientEmail, clientName, grandTotal, dueDate);
  },

  emailMultipleInvoices: (invoiceEntries: Array<{ invoiceNumber: string; htmlContent: string; clientName: string; grandTotal: number; dueDate: string }>, recipientEmail: string): Promise<boolean> => {
    return ipcRenderer.invoke('email-multiple-invoices', invoiceEntries, recipientEmail);
  },

  getInvoiceById: (id: number): Promise<any> => {
    return ipcRenderer.invoke('db-get-invoice-by-id', id);
  },

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
    templateId: string,
  ): Promise<unknown> => {
    return ipcRenderer.invoke('db-update-invoice', invoiceId, clientId, invoiceNumber, date, dueDate, gstEnabled, displayDueDate, discount, discountType, price, items, notes, templateId);
  },

  getProjects: (): Promise<any[]> => {
    return ipcRenderer.invoke('db-get-projects');
  },

  createProject: (name: string, clientId: number | null, description: string, status: string, startDate: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-create-project', name, clientId, description, status, startDate);
  },

  updateProject: (id: number, name: string, clientId: number | null, description: string, status: string, startDate: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-update-project', id, name, clientId, description, status, startDate);
  },

  deleteProject: (id: number): Promise<unknown> => {
    return ipcRenderer.invoke('db-delete-project', id);
  },

  getSettings: (): Promise<Record<string, string>> => {
    return ipcRenderer.invoke('db-get-settings');
  },

  saveSettings: (settings: Record<string, string>): Promise<boolean> => {
    return ipcRenderer.invoke('db-save-settings', settings);
  },

  updateInvoiceStatus: (id: number, status: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-update-invoice-status', id, status);
  },

  getActivityLogs: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-activity-logs');
  },
  getInvoiceActivityLogs: (invoiceId: number): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-invoice-activity-logs', invoiceId);
  },
  getInvoiceStatuses: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-invoice-statuses');
  },
  createInvoiceStatus: (name: string, color: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-create-invoice-status', name, color);
  },
  updateInvoiceStatusColor: (name: string, color: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-update-invoice-status-color', name, color);
  },
  deleteInvoiceStatus: (name: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-delete-invoice-status', name);
  },
});
