const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'electron/ipc/invoices.ts'),
  path.join(__dirname, 'electron/ipc/system.ts')
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
  console.log(`Cleaned ${file}`);
}
