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

  // Create a sample table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
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
  ipcMain.handle('db-get-items', (): unknown[] => {
    if (!db) {
      throw new Error('Database not initialised');
    }
    return db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  });

  ipcMain.handle('db-add-item', (_event: unknown, name: string): unknown => {
    if (!db) {
      throw new Error('Database not initialised');
    }
    return db.prepare('INSERT INTO items (name) VALUES (?)').run(name);
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
