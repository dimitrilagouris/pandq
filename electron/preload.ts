import { contextBridge, ipcRenderer } from 'electron';

// Expose safe database functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getClients: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-clients');
  },

  getInvoices: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-invoices');
  },
});
