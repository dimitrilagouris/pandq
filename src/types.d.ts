export interface Item {
  id: number;
  name: string;
  created_at: string;
}

export interface ElectronAPI {
  getItems: () => Promise<Item[]>;
  addItem: (name: string) => Promise<{ changes: number; lastInsertRowid: number }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
