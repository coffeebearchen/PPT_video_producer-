import { DatabaseSync } from 'node:sqlite';
import { checkSpecCoverage } from '../lib/spec-check.mjs';
const db = new DatabaseSync('data/studio.db');
const rows = db.prepare("SELECT id,spec_json FROM specs WHERE id LIKE 'spec_demo20_%'").all();
let bad = 0;
for (const r of rows) {
  const c = checkSpecCoverage(JSON.parse(r.spec_json || '{}'));
  if (!c.ok) { bad++; console.log(r.id, c.errors.map(e => e.message).join(' | ')); }
}
console.log('total', rows.length, 'bad', bad);
db.close();
