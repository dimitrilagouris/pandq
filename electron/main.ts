import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
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
    return db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
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
