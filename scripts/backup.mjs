import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = path.join('backups', `manual-${stamp}`);
fs.mkdirSync(dir, { recursive: true });
const dbPath = path.join(dir, 'studio.db');
const db = new DatabaseSync('data/studio.db');
db.exec(`VACUUM INTO '${dbPath.replaceAll("'", "''")}'`);
db.close();
for (const file of ['data/batches.json', 'data/music/library.json']) {
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(dir, path.basename(file)));
}
const files = fs.readdirSync(dir).map(name => {
  const full = path.join(dir, name);
  return { name, bytes: fs.statSync(full).size };
});
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ created_at: new Date().toISOString(), files }, null, 2));
console.log(JSON.stringify({ backup: dir, files }, null, 2));
