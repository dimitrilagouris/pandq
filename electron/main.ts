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
    return db.prepare('SELECT * FROM clients ORDER BY id DESC').all();
  });

  ipcMain.handle('db-get-invoices', (): unknown[] => {
    if (!db) throw new Error('Database not initialised');
    return db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
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
