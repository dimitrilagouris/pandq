import { ipcMain } from 'electron';
import { getDb } from '../database';

export function registerActivityHandlers(): void {
  ipcMain.handle('db-get-activity-logs', (): unknown[] => {
    const db = getDb();
    return db.prepare(`
      SELECT 
        l.*, 
        a.label AS action_label, 
        a.category AS action_category,
        i.status AS invoice_status
      FROM activity_logs l
      LEFT JOIN activity_actions a ON l.action_code = a.code
      LEFT JOIN invoices i ON l.invoice_id = i.id
      ORDER BY l.id DESC LIMIT 500
    `).all();
  });

  ipcMain.handle('db-get-invoice-activity-logs', (_event, invoiceId: number): unknown[] => {
    const db = getDb();
    return db.prepare(`
      SELECT 
        l.*, 
        a.label AS action_label, 
        a.category AS action_category,
        i.status AS invoice_status
      FROM activity_logs l
      LEFT JOIN activity_actions a ON l.action_code = a.code
      LEFT JOIN invoices i ON l.invoice_id = i.id
      WHERE l.invoice_id = ?
      ORDER BY l.id DESC LIMIT 100
    `).all(invoiceId);
  });
}
