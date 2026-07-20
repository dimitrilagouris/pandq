import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

/**
 * Initialise the SQLite database and run migrations.
 * @param basePath The directory path of the calling module (electron folder).
 */
export function initDatabase(basePath: string): void {
  const dbPath: string = app.isPackaged
    ? path.join(app.getPath('userData'), 'database.sqlite')
    : path.join(basePath, '../database.sqlite');

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

    // Version 7: Create invoice_statuses table and insert default statuses
    if (currentVersion < 7) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS invoice_statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL
          );
        `);
        // Seed default statuses
        const stmt = db.prepare('INSERT OR IGNORE INTO invoice_statuses (name, color) VALUES (?, ?)');
        stmt.run('draft', 'stone');
        stmt.run('sent', 'blue');
        stmt.run('paid', 'lime');
        stmt.run('overdue', 'amber');
        stmt.run('cancelled', 'red');
      } catch (err) {
        console.error('Failed to run Version 7 migration (invoice_statuses):', err);
      }
      db.pragma('user_version = 7');
    }

    // Version 8: Create flags and invoice_flags tables
    if (currentVersion < 8) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            color TEXT UNIQUE NOT NULL
          );

          CREATE TABLE IF NOT EXISTS invoice_flags (
            invoice_id INTEGER NOT NULL,
            flag_id INTEGER NOT NULL,
            PRIMARY KEY (invoice_id, flag_id),
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
            FOREIGN KEY (flag_id) REFERENCES flags(id) ON DELETE CASCADE
          );
        `);
        // Seed default flags
        const stmt = db.prepare('INSERT OR IGNORE INTO flags (color) VALUES (?)');
        const defaultFlags = [
          'bg-red-500',
          'bg-blue-500',
          'bg-green-500',
          'bg-yellow-500',
          'bg-purple-500',
          'bg-orange-500'
        ];
        for (const color of defaultFlags) {
          stmt.run(color);
        }
      } catch (err) {
        console.error('Failed to run Version 8 migration (flags):', err);
      }
      db.pragma('user_version = 8');
    }

    // Version 9: Re-seed flags table in specific order: Orange, Red, Pink, Teal, Yellow, Green
    if (currentVersion < 9) {
      try {
        db.exec('DELETE FROM invoice_flags');
        db.exec('DELETE FROM flags');
        db.exec("DELETE FROM sqlite_sequence WHERE name='flags'");

        const newFlags = [
          'bg-orange-500',
          'bg-red-500',
          'bg-pink-500',
          'bg-teal-500',
          'bg-yellow-500',
          'bg-green-500'
        ];
        const stmt = db.prepare('INSERT INTO flags (color) VALUES (?)');
        for (const color of newFlags) {
          stmt.run(color);
        }
        db.pragma('user_version = 9');
      } catch (err) {
        console.error('Failed to run Version 9 migration (re-seed flags):', err);
      }
    }

  } catch (err) {
    console.error('Failed to run schema migrations:', err);
  }

  // Always ensure the canonical flag set exists in the correct order.
  // Uses INSERT OR IGNORE so existing rows are untouched and no invoice_flags are lost.
  try {
    const desiredFlags: string[] = [
      'bg-orange-500',
      'bg-red-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-yellow-500',
      'bg-green-500',
    ];

    // Remove any colors that are no longer in the desired set
    const placeholders = desiredFlags.map(() => '?').join(', ');
    db.prepare(`DELETE FROM flags WHERE color NOT IN (${placeholders})`).run(...desiredFlags);

    // Check if the legacy 'name' column exists
    const tableInfo = db.pragma('table_info(flags)') as any[];
    const hasNameColumn = tableInfo.some(col => col.name === 'name');

    if (hasNameColumn) {
      const insertFlag = db.prepare('INSERT OR IGNORE INTO flags (name, color) VALUES (?, ?)');
      for (const color of desiredFlags) {
        // extract 'orange' from 'bg-orange-500'
        const colorName = color.split('-')[1] || color;
        insertFlag.run(colorName, color);
      }
    } else {
      const insertFlag = db.prepare('INSERT OR IGNORE INTO flags (color) VALUES (?)');
      for (const color of desiredFlags) {
        insertFlag.run(color);
      }
    }
  } catch (err: any) {
    console.error('Failed to seed flags:', err);
    try {
      require('fs').writeFileSync('/Users/dimitrilagouris/Desktop/Personal Projects/By myself/mikovoice/seed_error.json', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } catch (e) {}
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
 * Gets the current database instance.
 * @returns {Database.Database}
 * @throws If database has not been initialised.
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialised');
  }
  return db;
}
