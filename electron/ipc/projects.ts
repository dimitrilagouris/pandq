import { ipcMain } from 'electron';
import { getDb } from '../database';

export function registerProjectHandlers(): void {
  ipcMain.handle('db-get-projects', (): unknown[] => {
    const db = getDb();
    return db.prepare(`
      SELECT p.*, c.name AS client_name, c.business_name AS client_business_name 
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id 
      ORDER BY p.name ASC
    `).all();
  });

  ipcMain.handle('db-create-project', (_event, name: string, clientId: number | null, description: string, status: string, startDate: string): unknown => {
    const db = getDb();
    return db.prepare('INSERT INTO projects (name, client_id, description, status, start_date) VALUES (?, ?, ?, ?, ?)').run(name, clientId, description, status, startDate);
  });

  ipcMain.handle('db-update-project', (_event, id: number, name: string, clientId: number | null, description: string, status: string, startDate: string): unknown => {
    const db = getDb();
    return db.prepare('UPDATE projects SET name = ?, client_id = ?, description = ?, status = ?, start_date = ? WHERE id = ?').run(name, clientId, description, status, startDate, id);
  });

  ipcMain.handle('db-delete-project', (_event, id: number): unknown => {
    const db = getDb();
    return db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
}
