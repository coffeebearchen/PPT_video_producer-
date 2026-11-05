import { DatabaseSync } from 'node:sqlite';
import { checkSpecCoverage } from '../lib/spec-check.mjs';
const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`SELECT s.id,s.spec_json FROM specs s WHERE s.id=(SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC,x.created_at DESC LIMIT 1)`).all();
for (const r of rows) {
  const spec = JSON.parse(r.spec_json || '{}');
  if (Number(spec.content_schema_version) < 3) continue;
  const c = checkSpecCoverage(spec);
  console.log(r.id, c.ok ? 'OK' : 'ERR', c.errors.slice(0, 4).map(e => e.message).join(' | '));
}
db.close();
