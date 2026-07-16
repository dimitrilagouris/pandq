import { ipcMain } from 'electron';
import { getDb } from '../database';
import { insertActivityLog, formatDate } from '../database/utils';

export function registerInvoiceHandlers(): void {
  ipcMain.handle('db-get-invoices', (): unknown[] => {
    const db = getDb();
    return db.prepare(`
      SELECT i.*, c.name AS client_name, c.business_name AS client_business_name, c.email AS client_email, c.address AS client_address,
             (SELECT GROUP_CONCAT(type || ' ' || description, ' ') FROM invoice_items WHERE invoice_id = i.id) AS items_description
      FROM invoices i 
      LEFT JOIN clients c ON i.client_id = c.id 
      ORDER BY i.id DESC
    `).all();
  });

  ipcMain.handle('db-delete-invoice', (_event, id: number): unknown => {
    const db = getDb();
    const inv = db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(id) as { invoice_number: string } | undefined;
    const invoiceNumber = inv?.invoice_number || null;
    const res = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    insertActivityLog(null, invoiceNumber, 'invoice_deleted', `Invoice ${invoiceNumber || 'N/A'} was deleted`);
    return res;
  });

  ipcMain.handle('db-update-invoice-status', (_event, id: number, status: string): unknown => {
    const db = getDb();
    const inv = db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(id) as { invoice_number: string } | undefined;
    const invoiceNumber = inv?.invoice_number || null;
    
    const isPaid = status.startsWith('paid');
    const paidAt = isPaid ? new Date().toISOString() : null;

    const res = db.prepare('UPDATE invoices SET status = ?, updated_at = ?, paid_at = ? WHERE id = ?').run(status, new Date().toISOString(), paidAt, id);
    insertActivityLog(id, invoiceNumber, 'invoice_status_updated', `Status updated to ${status.split('|')[0] || 'draft'}`);
    return res;
  });

  ipcMain.handle('db-get-invoice-by-id', (_event, id: number): unknown => {
    const db = getDb();
    const invoice = db.prepare(`
      SELECT i.*, c.name AS client_name, c.business_name AS client_business_name, c.email AS client_email, c.address AS client_address, c.phone AS client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ?
    `).get(id) as any;
    if (!invoice) return null;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    const discounts = db.prepare('SELECT * FROM discounts WHERE invoice_id = ?').all(id);
    return { ...invoice, items, discounts };
  });

  ipcMain.handle('db-update-invoice', (
    _event,
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
    items: Array<{ type: string; description: string; hours: number | null; rate: number; quantity: number | null; date: string | null }>,
    notes: string,
    templateId: string,
  ): unknown => {
    const db = getDb();

    // 1. Fetch old details for comparison
    const oldInv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    const oldItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId) as any[];
    const oldDiscounts = db.prepare('SELECT * FROM discounts WHERE invoice_id = ?').all(invoiceId) as any[];
    
    const updateInvoice = db.prepare(
      'UPDATE invoices SET client_id = ?, invoice_number = ?, date = ?, due_date = ?, price = ?, gst_added = ?, display_due_date = ?, updated_at = ?, template_id = ? WHERE id = ?'
    );
    const deleteItems = db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?');
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, type, description, hours, rate, quantity, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const deleteDiscounts = db.prepare('DELETE FROM discounts WHERE invoice_id = ?');
    const insertDiscount = db.prepare(
      'INSERT INTO discounts (invoice_id, description, amount, type) VALUES (?, ?, ?, ?)'
    );
    const updateNoteStatus = db.prepare(
      'UPDATE invoices SET status = ? WHERE id = ?'
    );

    const transaction = db.transaction(() => {
      updateInvoice.run(clientId ?? null, invoiceNumber ?? null, date ?? null, dueDate ?? null, price ?? null, gstEnabled ? 1 : 0, displayDueDate ? 1 : 0, new Date().toISOString(), templateId ?? null, invoiceId);
      
      deleteItems.run(invoiceId);
      for (const item of items) {
        insertItem.run(invoiceId, item.type ?? null, item.description ?? null, item.hours ?? null, item.rate ?? null, item.quantity ?? null, item.date ?? null);
      }

      deleteDiscounts.run(invoiceId);
      if (discount > 0) {
        insertDiscount.run(invoiceId, 'Discount', discount, discountType ?? null);
      }

      const notesVal = notes.trim() ? `draft|${notes.trim()}` : 'draft';
      updateNoteStatus.run(notesVal, invoiceId);
    });

    transaction();

    // 2. Perform delta logging comparisons
    if (oldInv) {
      // GST toggle
      const oldGst = oldInv.gst_added === 1;
      if (oldGst !== gstEnabled) {
        insertActivityLog(invoiceId, invoiceNumber, 'gst_toggled', gstEnabled ? 'GST enabled' : 'GST disabled');
      }

      // Client Link
      if (oldInv.client_id !== clientId) {
        const oldClient = db.prepare('SELECT name FROM clients WHERE id = ?').get(oldInv.client_id) as { name: string } | undefined;
        const newClient = db.prepare('SELECT name FROM clients WHERE id = ?').get(clientId) as { name: string } | undefined;
        insertActivityLog(
          invoiceId,
          invoiceNumber,
          'client_updated',
          `Linked client changed from "${oldClient?.name || 'N/A'}" to "${newClient?.name || 'N/A'}"`
        );
      }

      // Dates
      if (oldInv.date !== date) {
        insertActivityLog(invoiceId, invoiceNumber, 'date_updated', `Invoice date updated to ${formatDate(date)}`);
      }
      if (oldInv.due_date !== dueDate) {
        insertActivityLog(invoiceId, invoiceNumber, 'date_updated', `Invoice due date updated to ${formatDate(dueDate)}`);
      }

      // Discount
      const oldDiscVal = oldDiscounts.length > 0 ? oldDiscounts[0].amount : 0;
      if (oldDiscVal !== discount) {
        insertActivityLog(invoiceId, invoiceNumber, 'discount_updated', `Discount updated to $${discount.toFixed(2)}`);
      }

      // Notes
      const oldStatusParts = oldInv.status.split('|');
      const oldNotes = oldStatusParts.slice(1).join('|').trim();
      if (oldNotes !== notes.trim()) {
        insertActivityLog(invoiceId, invoiceNumber, 'note_updated', 'Invoice notes updated');
      }

      // Items & Materials Comparison
      const oldServices = oldItems.filter(i => i.type === 'service');
      const newServices = items.filter(i => i.type === 'service');

      // Detect added/updated services
      for (const newS of newServices) {
        const matched = oldServices.find(oldS => oldS.description === newS.description);
        if (!matched) {
          insertActivityLog(invoiceId, invoiceNumber, 'item_added', `Service added: "${newS.description}"`);
        } else {
          if (matched.rate !== newS.rate || matched.hours !== newS.hours) {
            insertActivityLog(invoiceId, invoiceNumber, 'item_updated', `Service updated: "${newS.description}"`);
          }
        }
      }
      // Detect removed services
      for (const oldS of oldServices) {
        const matched = newServices.find(newS => newS.description === oldS.description);
        if (!matched) {
          insertActivityLog(invoiceId, invoiceNumber, 'item_removed', `Service removed: "${oldS.description}"`);
        }
      }

      // Check Materials
      const oldMaterials = oldItems.filter(i => i.type === 'material');
      const newMaterials = items.filter(i => i.type === 'material');

      // Detect added/updated materials
      for (const newM of newMaterials) {
        const matched = oldMaterials.find(oldM => oldM.description === newM.description);
        if (!matched) {
          insertActivityLog(invoiceId, invoiceNumber, 'material_added', `Material added: "${newM.description}"`);
        } else {
          if (matched.rate !== newM.rate || matched.quantity !== newM.quantity) {
            insertActivityLog(invoiceId, invoiceNumber, 'material_updated', `Material updated: "${newM.description}"`);
          }
        }
      }
      // Detect removed materials
      for (const oldM of oldMaterials) {
        const matched = newMaterials.find(newM => newM.description === oldM.description);
        if (!matched) {
          insertActivityLog(invoiceId, invoiceNumber, 'material_removed', `Material removed: "${oldM.description}"`);
        }
      }
    }

    insertActivityLog(invoiceId, invoiceNumber, 'invoice_updated', 'Updated invoice details');
    return true;
  });

  ipcMain.handle('db-create-invoice', (
    _event,
    clientId: number,
    invoiceNumber: string,
    date: string,
    dueDate: string,
    gstEnabled: boolean,
    displayDueDate: boolean,
    discount: number,
    discountType: string,
    price: number,
    items: Array<{ type: string; description: string; hours: number | null; rate: number; quantity: number | null; date: string | null }>,
    notes: string,
    templateId: string,
  ): unknown => {
    const db = getDb();

    // Persist invoice, items, and optional discount atomically
    const insertInvoice = db.prepare(
      'INSERT INTO invoices (client_id, invoice_number, date, due_date, status, price, gst_added, display_due_date, updated_at, created_at, template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, type, description, hours, rate, quantity, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertDiscount = db.prepare(
      'INSERT INTO discounts (invoice_id, description, amount, type) VALUES (?, ?, ?, ?)'
    );
    const insertNote = db.prepare(
      'UPDATE invoices SET status = ? WHERE id = ?'
    );

    const transaction = db.transaction(() => {
      const now = new Date().toISOString();
      const result = insertInvoice.run(clientId ?? null, invoiceNumber ?? null, date ?? null, dueDate ?? null, 'draft', price ?? null, gstEnabled ? 1 : 0, displayDueDate ? 1 : 0, now, now, templateId ?? null);
      const invoiceId = result.lastInsertRowid as number;

      for (const item of items) {
        insertItem.run(invoiceId, item.type ?? null, item.description ?? null, item.hours ?? null, item.rate ?? null, item.quantity ?? null, item.date ?? null);
      }

      if (discount > 0) {
        insertDiscount.run(invoiceId, 'Discount', discount, discountType ?? null);
      }

      // Store notes in status field temporarily — future migration can add a notes column
      if (notes.trim()) {
        insertNote.run(`draft|${notes.trim()}`, invoiceId);
      }

      return invoiceId;
    });

    const invoiceId = transaction();
    insertActivityLog(invoiceId, invoiceNumber, 'invoice_created', 'Created new invoice');
    return invoiceId;
  });

  ipcMain.handle('db-get-invoice-statuses', (): unknown[] => {
    const db = getDb();
    return db.prepare('SELECT * FROM invoice_statuses').all();
  });

  ipcMain.handle('db-create-invoice-status', (_event, name: string, color: string): unknown => {
    const db = getDb();
    return db.prepare('INSERT OR IGNORE INTO invoice_statuses (name, color) VALUES (?, ?)').run(name, color);
  });

  ipcMain.handle('db-update-invoice-status-color', (_event, name: string, color: string): unknown => {
    const db = getDb();
    return db.prepare('UPDATE invoice_statuses SET color = ? WHERE name = ?').run(color, name);
  });

  ipcMain.handle('db-delete-invoice-status', (_event, name: string): unknown => {
    const db = getDb();
    return db.prepare('DELETE FROM invoice_statuses WHERE name = ?').run(name);
  });
}
