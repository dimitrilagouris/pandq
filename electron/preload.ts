import { contextBridge, ipcRenderer } from 'electron';

// Expose safe database functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Fetch all items from the database.
   */
  getItems: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('db-get-items');
  },

  /**
   * Add a new item to the database.
   */
  addItem: (name: string): Promise<unknown> => {
    return ipcRenderer.invoke('db-add-item', name);
  },
});
