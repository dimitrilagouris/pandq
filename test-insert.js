import Database from 'better-sqlite3';

const dbPath = '/Users/dimitrilagouris/Desktop/Personal Projects/By myself/mikovoice/database.sqlite';
const db = new Database(dbPath);

try {
  const desiredFlags = [
    'bg-orange-500',
    'bg-red-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-yellow-500',
    'bg-green-500',
  ];

  const tableInfo = db.pragma('table_info(flags)');
  console.log('tableInfo:', tableInfo);
  const hasNameColumn = tableInfo.some((col) => col.name === 'name');

  if (hasNameColumn) {
    console.log('Using name column logic');
    const insertFlag = db.prepare('INSERT OR IGNORE INTO flags (name, color) VALUES (?, ?)');
    for (const color of desiredFlags) {
      const colorName = color.split('-')[1] || color;
      console.log('Inserting', colorName, color);
      insertFlag.run(colorName, color);
    }
  } else {
    console.log('Using color-only logic');
    const insertFlag = db.prepare('INSERT OR IGNORE INTO flags (color) VALUES (?)');
    for (const color of desiredFlags) {
      console.log('Inserting', color);
      insertFlag.run(color);
    }
  }

  console.log('Flags currently in DB:', db.prepare('SELECT * FROM flags').all());
} catch (err) {
  console.error('Error during execution:', err);
}
