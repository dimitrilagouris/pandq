import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

/**
 * Initialise the SQLite database and run migrations.
 */
function initDatabase(): void {
  const dbPath: string = app.isPackaged
    ? path.join(app.getPath('userData'), 'database.sqlite')
    : path.join(__dirname, '../database.sqlite');

  db = new Database(dbPath);
  
  // Enforce foreign key constraints
  db.pragma('foreign_keys = ON');

  try {
    const currentVersion = db.pragma('user_version', { simple: true }) as number;

    // Version 1: Create baseline tables
    if (currentVersion < 1) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          business_name TEXT,
          email TEXT,
          phone TEXT,
          address TEXT
        );

        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT,
          start_date TEXT,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER,
          invoice_number TEXT,
          date TEXT,
          due_date TEXT,
          status TEXT,
          price REAL,
          gst_added BOOLEAN,
          display_due_date BOOLEAN DEFAULT 1,
          template_id TEXT DEFAULT 'classic',
          updated_at TEXT,
          created_at TEXT,
          paid_at TEXT,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER,
          type TEXT,
          description TEXT,
          hours REAL,
          rate REAL,
          quantity REAL,
          date TEXT,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS discounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER,
          description TEXT,
          amount REAL,
          type TEXT,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS activity_actions (
          code TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          category TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER,
          invoice_number TEXT,
          action_code TEXT NOT NULL,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (action_code) REFERENCES activity_actions(code)
        );
      `);

      // Cleanup code for very old pre-release installations that had the "action" column in activity_logs
      try {
        const tableInfo = db.prepare("PRAGMA table_info(activity_logs)").all() as Array<{ name: string }>;
        if (tableInfo.length > 0 && tableInfo.some(col => col.name === 'action')) {
          db.exec('DROP TABLE activity_logs');
          db.exec(`
            CREATE TABLE IF NOT EXISTS activity_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_id INTEGER,
              invoice_number TEXT,
              action_code TEXT NOT NULL,
              details TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (action_code) REFERENCES activity_actions(code)
            );
          `);
        }
      } catch (err) {
        console.error('Failed to run logs migration check:', err);
      }

      db.pragma('user_version = 1');
    }

    // Version 2: Add updated_at column to invoices table
    if (currentVersion < 2) {
      try {
        const invoicesTableInfo = db.prepare("PRAGMA table_info(invoices)").all() as Array<{ name: string }>;
        if (invoicesTableInfo.length > 0 && !invoicesTableInfo.some(col => col.name === 'updated_at')) {
          db.exec('ALTER TABLE invoices ADD COLUMN updated_at TEXT;');
        }
      } catch (err) {
        console.error('Failed to run invoices updated_at migration:', err);
      }
      db.pragma('user_version = 2');
    }

    // Version 3: Ensure display_due_date column exists in invoices (fallback for old DBs)
    if (currentVersion < 3) {
      try {
        const tableInfo = db.prepare("PRAGMA table_info(invoices)").all() as Array<{ name: string }>;
        if (tableInfo.length > 0 && !tableInfo.some((col) => col.name === 'display_due_date')) {
          db.exec("ALTER TABLE invoices ADD COLUMN display_due_date BOOLEAN DEFAULT 1");
        }
      } catch (err) {
        console.error('Failed to run display_due_date migration:', err);
      }
      db.pragma('user_version = 3');
    }

    // Version 4: Ensure date column exists in invoice_items (fallback for old DBs)
    if (currentVersion < 4) {
      try {
        const itemTableInfo = db.prepare("PRAGMA table_info(invoice_items)").all() as Array<{ name: string }>;
        if (itemTableInfo.length > 0 && !itemTableInfo.some((col) => col.name === 'date')) {
          db.exec("ALTER TABLE invoice_items ADD COLUMN date TEXT");
        }
      } catch (err) {
        console.error('Failed to run invoice_items date migration:', err);
      }
      db.pragma('user_version = 4');
    }

    // Version 5: Add template_id column to invoices table
    if (currentVersion < 5) {
      try {
        const invoicesTableInfo = db.prepare("PRAGMA table_info(invoices)").all() as Array<{ name: string }>;
        if (invoicesTableInfo.length > 0 && !invoicesTableInfo.some(col => col.name === 'template_id')) {
          db.exec("ALTER TABLE invoices ADD COLUMN template_id TEXT DEFAULT 'classic';");
        }
      } catch (err) {
        console.error('Failed to run invoices template_id migration:', err);
      }
      db.pragma('user_version = 5');
    }

    // Version 6: Add created_at and paid_at columns to invoices table
    if (currentVersion < 6) {
      try {
        const invoicesTableInfo = db.prepare("PRAGMA table_info(invoices)").all() as Array<{ name: string }>;
        if (invoicesTableInfo.length > 0 && !invoicesTableInfo.some(col => col.name === 'created_at')) {
          db.exec("ALTER TABLE invoices ADD COLUMN created_at TEXT;");
        }
        if (invoicesTableInfo.length > 0 && !invoicesTableInfo.some(col => col.name === 'paid_at')) {
          db.exec("ALTER TABLE invoices ADD COLUMN paid_at TEXT;");
        }
      } catch (err) {
        console.error('Failed to run invoices timestamps migration:', err);
      }
      db.pragma('user_version = 6');
    }

  } catch (err) {
    console.error('Failed to run schema migrations:', err);
  }

  // Pre-populate activity_actions
  try {
    db.exec(`
      INSERT OR IGNORE INTO activity_actions (code, label, category) VALUES
      ('invoice_created', 'Invoice Created', 'Invoice'),
      ('invoice_updated', 'Invoice Updated', 'Invoice'),
      ('invoice_deleted', 'Invoice Deleted', 'Invoice'),
      ('invoice_status_updated', 'Status Updated', 'Invoice'),
      ('invoice_sent', 'Invoice Emailed', 'Invoice'),
      ('client_created', 'Client Created', 'Client'),
      ('client_updated', 'Client Updated', 'Client'),
      ('client_deleted', 'Client Deleted', 'Client'),
      ('item_added', 'Item Added', 'Invoice'),
      ('item_updated', 'Item Updated', 'Invoice'),
      ('item_removed', 'Item Removed', 'Invoice'),
      ('material_added', 'Material Added', 'Invoice'),
      ('material_updated', 'Material Updated', 'Invoice'),
      ('material_removed', 'Material Removed', 'Invoice'),
      ('note_updated', 'Note Updated', 'Invoice'),
      ('discount_updated', 'Discount Updated', 'Invoice'),
      ('gst_toggled', 'GST Settings Changed', 'Invoice'),
      ('date_updated', 'Date Settings Changed', 'Invoice')
    `);
  } catch (err) {
    console.error('Failed to populate activity_actions:', err);
  }
}

/**
 * Create the main application window.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();
  mainWindow.show();

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialise window and database on application ready state
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  // Register database IPC handlers
  ipcMain.handle('db-get-clients', (): unknown[] => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
  });

  ipcMain.handle('db-get-settings', (): Record<string, string> => {
    if (!db) throw new Error('Database not initialised');
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settingsObj: Record<string, string> = {};
    for (const row of rows) {
      settingsObj[row.key] = row.value;
    }
    return settingsObj;
  });

  ipcMain.handle('db-save-settings', (_event, settings: Record<string, string>): boolean => {
    if (!db) throw new Error('Database not initialised');
    const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        insert.run(key, value);
      }
    });
    transaction();
    return true;
  });

  ipcMain.handle('db-create-client', (_event, name: string, businessName: string, email: string, phone: string, address: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    const res = db.prepare('INSERT INTO clients (name, business_name, email, phone, address) VALUES (?, ?, ?, ?, ?)').run(name, businessName, email, phone, address);
    insertActivityLog(null, null, 'client_created', `Created client "${name}"`);
    return res;
  });

  ipcMain.handle('db-update-client', (_event, id: number, name: string, businessName: string, email: string, phone: string, address: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    const oldClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
    const res = db.prepare('UPDATE clients SET name = ?, business_name = ?, email = ?, phone = ?, address = ? WHERE id = ?').run(name, businessName, email, phone, address, id);
    if (oldClient) {
      const changes: string[] = [];
      if (oldClient.name !== name) changes.push(`name changed to "${name}"`);
      if (oldClient.business_name !== businessName) changes.push(`business name changed to "${businessName}"`);
      if (oldClient.email !== email) changes.push(`email changed to "${email}"`);
      if (oldClient.phone !== phone) changes.push(`phone changed to "${phone}"`);
      if (oldClient.address !== address) changes.push(`address changed`);
      
      const details = changes.length > 0 ? `Client "${name}" updated: ${changes.join(', ')}` : `Client "${name}" updated`;
      insertActivityLog(null, null, 'client_updated', details);
    } else {
      insertActivityLog(null, null, 'client_updated', `Client "${name}" details updated`);
    }
    return res;
  });

  ipcMain.handle('db-delete-client', (_event, id: number): unknown => {
    if (!db) throw new Error('Database not initialised');
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(id) as { name: string } | undefined;
    const res = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    insertActivityLog(null, null, 'client_deleted', `Client "${client?.name || 'N/A'}" was deleted`);
    return res;
  });

  ipcMain.handle('db-get-invoices', (): unknown[] => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare(`
      SELECT i.*, c.name AS client_name, c.business_name AS client_business_name, c.email AS client_email, c.address AS client_address,
             (SELECT GROUP_CONCAT(type || ' ' || description, ' ') FROM invoice_items WHERE invoice_id = i.id) AS items_description
      FROM invoices i 
      LEFT JOIN clients c ON i.client_id = c.id 
      ORDER BY i.id DESC
    `).all();
  });

  ipcMain.handle('db-delete-invoice', (_event, id: number): unknown => {
    if (!db) throw new Error('Database not initialised');
    const inv = db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(id) as { invoice_number: string } | undefined;
    const invoiceNumber = inv?.invoice_number || null;
    const res = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    insertActivityLog(null, invoiceNumber, 'invoice_deleted', `Invoice ${invoiceNumber || 'N/A'} was deleted`);
    return res;
  });

  ipcMain.handle('db-update-invoice-status', (_event, id: number, status: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    const inv = db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(id) as { invoice_number: string } | undefined;
    const invoiceNumber = inv?.invoice_number || null;
    
    const isPaid = status.startsWith('paid');
    const paidAt = isPaid ? new Date().toISOString() : null;

    const res = db.prepare('UPDATE invoices SET status = ?, updated_at = ?, paid_at = ? WHERE id = ?').run(status, new Date().toISOString(), paidAt, id);
    insertActivityLog(id, invoiceNumber, 'invoice_status_updated', `Status updated to ${status.split('|')[0] || 'draft'}`);
    return res;
  });

  ipcMain.handle('db-get-invoice-by-id', (_event, id: number): unknown => {
    if (!db) throw new Error('Database not initialised');
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
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
    price: number,
    items: Array<{ type: string; description: string; hours: number | null; rate: number; quantity: number | null; date: string | null }>,
    notes: string,
    templateId: string,
  ): unknown => {
    if (!db) throw new Error('Database not initialised');

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
      updateInvoice.run(clientId, invoiceNumber, date, dueDate, price, gstEnabled ? 1 : 0, displayDueDate ? 1 : 0, new Date().toISOString(), templateId, invoiceId);
      
      deleteItems.run(invoiceId);
      for (const item of items) {
        insertItem.run(invoiceId, item.type, item.description, item.hours, item.rate, item.quantity, item.date);
      }

      deleteDiscounts.run(invoiceId);
      if (discount > 0) {
        insertDiscount.run(invoiceId, 'Discount', discount, 'flat');
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

  ipcMain.handle('db-get-projects', (): unknown[] => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare(`
      SELECT p.*, c.name AS client_name, c.business_name AS client_business_name 
      FROM projects p 
      LEFT JOIN clients c ON p.client_id = c.id 
      ORDER BY p.name ASC
    `).all();
  });

  ipcMain.handle('db-create-project', (_event, name: string, clientId: number | null, description: string, status: string, startDate: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('INSERT INTO projects (name, client_id, description, status, start_date) VALUES (?, ?, ?, ?, ?)').run(name, clientId, description, status, startDate);
  });

  ipcMain.handle('db-update-project', (_event, id: number, name: string, clientId: number | null, description: string, status: string, startDate: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('UPDATE projects SET name = ?, client_id = ?, description = ?, status = ?, start_date = ? WHERE id = ?').run(name, clientId, description, status, startDate, id);
  });

  ipcMain.handle('db-delete-project', (_event, id: number): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('DELETE FROM projects WHERE id = ?').run(id);
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
    price: number,
    items: Array<{ type: string; description: string; hours: number | null; rate: number; quantity: number | null; date: string | null }>,
    notes: string,
    templateId: string,
  ): unknown => {
    if (!db) throw new Error('Database not initialised');

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
      const result = insertInvoice.run(clientId, invoiceNumber, date, dueDate, 'draft', price, gstEnabled ? 1 : 0, displayDueDate ? 1 : 0, now, now, templateId);
      const invoiceId = result.lastInsertRowid as number;

      for (const item of items) {
        insertItem.run(invoiceId, item.type, item.description, item.hours, item.rate, item.quantity, item.date);
      }

      if (discount > 0) {
        insertDiscount.run(invoiceId, 'Discount', discount, 'flat');
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

  ipcMain.handle('print-to-pdf', async (_event, invoiceNumber: string, htmlContent: string): Promise<boolean> => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return false;

    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Save Invoice as PDF',
      defaultPath: `Invoice-${invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!filePath) return false;

    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const tempFilePath = path.join(app.getPath('temp'), `print-${Date.now()}.html`);
    fs.writeFileSync(tempFilePath, htmlContent, 'utf-8');
    
    await printWin.loadFile(tempFilePath);

    const pdfData = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      printBackground: true
    });

    fs.writeFileSync(filePath, pdfData);
    printWin.close();
    
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }

    return true;
  });

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }

  function getDatabaseSettings(): Record<string, string> {
    const settingsObj: Record<string, string> = {};
    if (!db) return settingsObj;
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
      for (const row of rows) {
        settingsObj[row.key] = row.value;
      }
    } catch (err) {
      console.error('Failed to query settings from DB:', err);
    }
    return settingsObj;
  }

  function insertActivityLog(invoiceId: number | null, invoiceNumber: string | null, actionCode: string, details: string | null = null): void {
    if (!db) return;
    try {
      db.prepare('INSERT INTO activity_logs (invoice_id, invoice_number, action_code, details) VALUES (?, ?, ?, ?)').run(
        invoiceId,
        invoiceNumber,
        actionCode,
        details
      );
    } catch (err) {
      console.error('Failed to insert activity log:', err);
    }
  }

  ipcMain.handle('db-get-activity-logs', (): unknown[] => {
    if (!db) throw new Error('Database not initialised');
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
    if (!db) throw new Error('Database not initialised');
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

  ipcMain.handle('email-invoice', async (
    _event,
    invoiceNumber: string,
    htmlContent: string,
    recipientEmail: string,
    clientName: string = '',
    grandTotal: number = 0,
    dueDate: string = ''
  ): Promise<boolean> => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const tempHtmlPath = path.join(app.getPath('temp'), `print-${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');
    
    await printWin.loadFile(tempHtmlPath);

    const pdfData = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      printBackground: true
    });

    printWin.close();
    
    try {
      fs.unlinkSync(tempHtmlPath);
    } catch {}

    const tempPdfPath = path.join(app.getPath('temp'), `Invoice-${invoiceNumber}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfData);

    const settings = getDatabaseSettings();
    const settingSubject = settings['setting_email_subject'] || 'Invoice {invoiceNumber}';
    const settingBody = settings['setting_email_body'] || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\n{orgName}';
    const orgName = settings['setting_org_name'] || 'Your Business';

    const formattedTotal = `$${grandTotal.toFixed(2)}`;
    const formattedDueDate = formatDate(dueDate);

    const subject = settingSubject
      .replace(/{invoiceNumber}/g, invoiceNumber)
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{dueDate}/g, formattedDueDate);

    const body = settingBody
      .replace(/{invoiceNumber}/g, invoiceNumber)
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{dueDate}/g, formattedDueDate)
      .replace(/{orgName}/g, orgName);

    // Write AppleScript to a temp file to avoid shell escaping issues
    const scriptContent = [
      `set theAttachment to POSIX file "${tempPdfPath}" as alias`,
      `tell application "Mail"`,
      `  set newMsg to make new outgoing message with properties {subject:"${subject}", visible:true}`,
      `  tell newMsg`,
      `    set content to "${body.replace(/\n/g, '\\n')}"`,
      `    make new to recipient at end of to recipients with properties {address:"${recipientEmail}"}`,
      `    make new attachment with properties {file name:theAttachment} at after the last paragraph of content of newMsg`,
      `  end tell`,
      `  activate`,
      `end tell`,
    ].join('\n');

    const tempScriptPath = path.join(app.getPath('temp'), `mail-${Date.now()}.scpt`);
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

    return new Promise((resolve) => {
      exec(`osascript "${tempScriptPath}"`, (error) => {
        try { fs.unlinkSync(tempScriptPath); } catch {}
        
        // Log activity
        const inv = db?.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber) as { id: number } | undefined;
        insertActivityLog(inv?.id || null, invoiceNumber, 'invoice_sent', `Emailed to ${recipientEmail}`);

        if (error) {
          console.error('Failed to open Mail.app via AppleScript:', error);
          shell.openExternal(`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });

  ipcMain.handle('email-multiple-invoices', async (
    _event,
    invoiceEntries: Array<{ invoiceNumber: string; htmlContent: string }>,
    recipientEmail: string,
  ): Promise<boolean> => {
    const pdfPaths: string[] = [];

    for (const entry of invoiceEntries) {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      const tempHtmlPath = path.join(app.getPath('temp'), `print-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
      fs.writeFileSync(tempHtmlPath, entry.htmlContent, 'utf-8');
      await printWin.loadFile(tempHtmlPath);

      const pdfData = await printWin.webContents.printToPDF({
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true
      });

      printWin.close();
      try { fs.unlinkSync(tempHtmlPath); } catch {}

      const pdfPath = path.join(app.getPath('temp'), `Invoice-${entry.invoiceNumber}.pdf`);
      fs.writeFileSync(pdfPath, pdfData);
      pdfPaths.push(pdfPath);
    }

    const settings = getDatabaseSettings();
    const settingSubject = settings['setting_email_subject'] || 'Invoice {invoiceNumber}';
    const settingBody = settings['setting_email_body'] || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\n{orgName}';
    const orgName = settings['setting_org_name'] || 'Your Business';

    const totalAmount = invoiceEntries.reduce((sum, e) => sum + (e.grandTotal || 0), 0);
    const clientName = invoiceEntries[0]?.clientName || '';
    const formattedTotal = `$${totalAmount.toFixed(2)}`;
    const dueDates = Array.from(new Set(invoiceEntries.map(e => e.dueDate).filter(Boolean))).map(formatDate).join(', ');

    const invoiceNumbers = invoiceEntries.map(e => e.invoiceNumber).join(', ');
    const subjectRaw = settingSubject.includes('{invoiceNumber}')
      ? settingSubject.replace(/{invoiceNumber}/g, invoiceNumbers)
      : `Invoices: ${invoiceNumbers}`;

    const subject = subjectRaw
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{dueDate}/g, dueDates);

    let bodyRaw = settingBody.includes('{invoiceNumber}')
      ? settingBody.replace(/{invoiceNumber}/g, invoiceNumbers)
      : `Hi,\n\nPlease find attached ${invoiceEntries.length} invoice${invoiceEntries.length > 1 ? 's' : ''}: ${invoiceNumbers}.\n\nKind regards,\n${orgName}`;

    const body = bodyRaw
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{orgName}/g, orgName)
      .replace(/{dueDate}/g, dueDates);

    const attachmentLines = pdfPaths.map(p =>
      `    make new attachment with properties {file name:(POSIX file "${p}" as alias)} at after the last paragraph of content of newMsg`
    ).join('\n');

    const scriptContent = [
      `tell application "Mail"`,
      `  set newMsg to make new outgoing message with properties {subject:"${subject}", visible:true}`,
      `  tell newMsg`,
      `    set content to "${body.replace(/\n/g, '\\n')}"`,
      `    make new to recipient at end of to recipients with properties {address:"${recipientEmail}"}`,
      attachmentLines,
      `  end tell`,
      `  activate`,
      `end tell`,
    ].join('\n');

    const tempScriptPath = path.join(app.getPath('temp'), `mail-batch-${Date.now()}.scpt`);
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

    return new Promise((resolve) => {
      exec(`osascript "${tempScriptPath}"`, (error) => {
        try { fs.unlinkSync(tempScriptPath); } catch {}

        // Log activity for each entry
        for (const entry of invoiceEntries) {
          const inv = db?.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(entry.invoiceNumber) as { id: number } | undefined;
          insertActivityLog(inv?.id || null, entry.invoiceNumber, 'invoice_sent', `Batch emailed to ${recipientEmail}`);
        }

        if (error) {
          console.error('Failed to open Mail.app via AppleScript:', error);
          shell.openExternal(`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Terminate application when all windows are closed on non-macOS platforms
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
