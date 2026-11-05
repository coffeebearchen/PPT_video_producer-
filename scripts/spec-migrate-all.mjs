import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.brief_id, s.version, s.status AS spec_status, s.spec_json,
         b.title, b.status AS brief_status, b.structure_type
  FROM specs s JOIN briefs b ON b.id=s.brief_id
  WHERE s.id = (SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
  ORDER BY s.created_at DESC
`).all();
const eligible = rows.filter(r => {
  if (['approved', 'published'].includes(r.brief_status) || ['approved', 'published'].includes(r.spec_status)) return false;
  return Number(JSON.parse(r.spec_json || '{}').content_schema_version || 0) < 2;
});
db.close();

const migrated = [];
const skipped = [];
for (const r of eligible) {
  try {
    const res = await fetch(`http://127.0.0.1:4310/api/specs/${r.id}/migrate`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${res.status}`);
    migrated.push({ source: r.id, new: data.spec.id, title: r.title });
    console.log('migrated', r.id, '->', data.spec.id);
  } catch (e) {
    skipped.push({ source: r.id, title: r.title, reason: e.message });
    console.log('skipped', r.id, e.message);
  }
}
const report = { generated_at: new Date().toISOString(), eligible: eligible.length, migrated: migrated.length, skipped, items: migrated };
fs.writeFileSync('data/spec-migrate-all.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ eligible: eligible.length, migrated: migrated.length, skipped: skipped.length }, null, 2));
