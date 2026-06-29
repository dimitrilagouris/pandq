import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
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

  // Create schema tables
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
  `);
}

/**
 * Create the main application window.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
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

  ipcMain.handle('db-create-client', (_event, name: string, businessName: string, email: string, phone: string, address: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('INSERT INTO clients (name, business_name, email, phone, address) VALUES (?, ?, ?, ?, ?)').run(name, businessName, email, phone, address);
  });

  ipcMain.handle('db-update-client', (_event, id: number, name: string, businessName: string, email: string, phone: string, address: string): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('UPDATE clients SET name = ?, business_name = ?, email = ?, phone = ?, address = ? WHERE id = ?').run(name, businessName, email, phone, address, id);
  });

  ipcMain.handle('db-delete-client', (_event, id: number): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  });

  ipcMain.handle('db-get-invoices', (): unknown[] => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare(`
      SELECT i.*, c.name AS client_name, c.business_name AS client_business_name 
      FROM invoices i 
      LEFT JOIN clients c ON i.client_id = c.id 
      ORDER BY i.id DESC
    `).all();
  });

  ipcMain.handle('db-delete-invoice', (_event, id: number): unknown => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
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
    discount: number,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ): unknown => {
    if (!db) throw new Error('Database not initialised');

    const updateInvoice = db.prepare(
      'UPDATE invoices SET client_id = ?, invoice_number = ?, date = ?, due_date = ?, price = ?, gst_added = ? WHERE id = ?'
    );
    const deleteItems = db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?');
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, type, description, hours, rate, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const deleteDiscounts = db.prepare('DELETE FROM discounts WHERE invoice_id = ?');
    const insertDiscount = db.prepare(
      'INSERT INTO discounts (invoice_id, description, amount, type) VALUES (?, ?, ?, ?)'
    );
    const updateNoteStatus = db.prepare(
      'UPDATE invoices SET status = ? WHERE id = ?'
    );

    const transaction = db.transaction(() => {
      updateInvoice.run(clientId, invoiceNumber, date, dueDate, price, gstEnabled ? 1 : 0, invoiceId);
      
      deleteItems.run(invoiceId);
      for (const item of items) {
        insertItem.run(invoiceId, item.type, item.description, null, item.rate, item.quantity);
      }

      deleteDiscounts.run(invoiceId);
      if (discount > 0) {
        insertDiscount.run(invoiceId, 'Discount', discount, 'flat');
      }

      const notesVal = notes.trim() ? `draft|${notes.trim()}` : 'draft';
      updateNoteStatus.run(notesVal, invoiceId);
    });

    transaction();
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
    discount: number,
    price: number,
    items: Array<{ type: string; description: string; quantity: number; rate: number }>,
    notes: string,
  ): unknown => {
    if (!db) throw new Error('Database not initialised');

    // Persist invoice, items, and optional discount atomically
    const insertInvoice = db.prepare(
      'INSERT INTO invoices (client_id, invoice_number, date, due_date, status, price, gst_added) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, type, description, hours, rate, quantity) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertDiscount = db.prepare(
      'INSERT INTO discounts (invoice_id, description, amount, type) VALUES (?, ?, ?, ?)'
    );
    const insertNote = db.prepare(
      'UPDATE invoices SET status = ? WHERE id = ?'
    );

    const transaction = db.transaction(() => {
      const result = insertInvoice.run(clientId, invoiceNumber, date, dueDate, 'draft', price, gstEnabled ? 1 : 0);
      const invoiceId = result.lastInsertRowid as number;

      for (const item of items) {
        insertItem.run(invoiceId, item.type, item.description, null, item.rate, item.quantity);
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

    return transaction();
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
