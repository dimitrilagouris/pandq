import { ipcMain } from 'electron';
import { getDb } from '../database';

export function registerSettingsHandlers(): void {
  ipcMain.handle('db-get-settings', (): Record<string, string> => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settingsObj: Record<string, string> = {};
    for (const row of rows) {
      settingsObj[row.key] = row.value;
    }
    return settingsObj;
  });

  ipcMain.handle('db-save-settings', (_event, settings: Record<string, string>): boolean => {
    const db = getDb();
    const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        insert.run(key, value);
      }
    });
    transaction();
    return true;
  });
}
