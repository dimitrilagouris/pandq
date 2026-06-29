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
    discount: number,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ): Promise<unknown> => {
    return ipcRenderer.invoke('db-create-invoice', clientId, invoiceNumber, date, dueDate, gstEnabled, discount, price, items, notes);
  },
});
