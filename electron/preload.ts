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
});
