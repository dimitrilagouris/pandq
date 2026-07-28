import { ipcMain } from 'electron';
import { getDb } from '../database';
import { insertActivityLog } from '../database/utils';
import type { CreateClientPayload, UpdateClientPayload } from '../../src/types/electron';

/**
 * Registers IPC event handlers for client database operations.
 */
export function registerClientHandlers(): void {
  /** Fetch all clients sorted alphabetically by name. */
  ipcMain.handle('db-get-clients', (): unknown[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
  });

  /** Create a new client record and record an activity log. */
  ipcMain.handle('db-create-client', (_event, payload: CreateClientPayload): unknown => {
    const { name, businessName, email, phone, address } = payload;
    const db = getDb();
    const res = db.prepare(
      'INSERT INTO clients (name, business_name, email, phone, address) VALUES (?, ?, ?, ?, ?)'
    ).run(name, businessName, email, phone, address);

    insertActivityLog(null, null, 'client_created', `Created client "${name}"`);
    return res;
  });

  /** Update an existing client's details and log specific property changes. */
  ipcMain.handle('db-update-client', (_event, payload: UpdateClientPayload): void => {
    const { id, name, businessName, email, phone, address } = payload;
    const db = getDb();

    const oldClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as {
      name: string;
      business_name: string;
      email: string;
      phone: string;
      address: string;
    } | undefined;

    db.prepare(
      'UPDATE clients SET name = ?, business_name = ?, email = ?, phone = ?, address = ? WHERE id = ?'
    ).run(name, businessName, email, phone, address, id);

    if (oldClient) {
      const changes: string[] = [];
      if (oldClient.name !== name) {
        changes.push(`name changed to "${name}"`);
      }
      if (oldClient.business_name !== businessName) {
        changes.push(`business name changed to "${businessName}"`);
      }
      if (oldClient.email !== email) {
        changes.push(`email changed to "${email}"`);
      }
      if (oldClient.phone !== phone) {
        changes.push(`phone changed to "${phone}"`);
      }
      if (oldClient.address !== address) {
        changes.push('address changed');
      }

      const details = changes.length > 0
        ? `Client "${name}" updated: ${changes.join(', ')}`
        : `Client "${name}" updated`;
      insertActivityLog(null, null, 'client_updated', details);
    } else {
      insertActivityLog(null, null, 'client_updated', `Client "${name}" details updated`);
    }
  });

  /** Remove a client record by ID and log deletion activity. */
  ipcMain.handle('db-delete-client', (_event, id: number): void => {
    const db = getDb();
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(id) as { name: string } | undefined;

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    insertActivityLog(null, null, 'client_deleted', `Client "${client?.name || 'N/A'}" was deleted`);
  });
}
