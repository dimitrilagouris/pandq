import { getDb } from './index';

/**
 * Gets the database settings.
 * @returns A record containing key-value pairs of settings.
 */
export function getDatabaseSettings(): Record<string, string> {
  const settingsObj: Record<string, string> = {};
  let db;

  try {
    db = getDb();
  }

  catch {
    return settingsObj;
  }

  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;

    for (const row of rows) {
      settingsObj[row.key] = row.value;
    }
  }

  catch (err) {
    console.error('Failed to query settings from DB:', err);
  }

  return settingsObj;
}

/**
 * Inserts an activity log into the database.
 * @param invoiceId The invoice ID.
 * @param invoiceNumber The invoice number.
 * @param actionCode The action code.
 * @param details Additional details for the log.
 */
export function insertActivityLog(
  invoiceId: number | null,
  invoiceNumber: string | null,
  actionCode: string,
  details: string | null = null
): void {
  let db;

  try {
    db = getDb();
  }

  catch {
    return;
  }

  try {
    db.prepare('INSERT INTO activity_logs (invoice_id, invoice_number, action_code, details) VALUES (?, ?, ?, ?)').run(
      invoiceId ?? null,
      invoiceNumber ?? null,
      actionCode ?? null,
      details ?? null
    );
  }

  catch (err) {
    console.error('Failed to insert activity log:', err);
  }
}

/**
 * Formats a date string (YYYY-MM-DD) into DD/MM/YYYY.
 * @param dateStr The date string to format.
 * @returns The formatted date string.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '';
  }

  const parts = dateStr.split('-');

  if (parts.length !== 3) {
    return dateStr;
  }

  const [y, m, d] = parts;

  return `${d}/${m}/${y}`;
}
