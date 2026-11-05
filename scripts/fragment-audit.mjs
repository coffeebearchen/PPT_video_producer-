import { DatabaseSync } from 'node:sqlite';
import { checkSpecCoverage } from '../lib/spec-check.mjs';
const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.spec_json FROM specs s
  WHERE s.id = (SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
`).all();
for (const r of rows) {
  const spec = JSON.parse(r.spec_json || '{}');
  const c = checkSpecCoverage(spec);
  const fragment = c.warnings.filter(w => w.field === 'fragment');
  console.log(r.id, 'cover=', Boolean(spec.page1?.cover?.lead), 'fragments=', fragment.length);
  if (fragment.length) for (const f of fragment.slice(0, 8)) console.log('  ', f.message);
}
db.close();
