import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateCover } from '../lib/generator.mjs';

const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.brief_id, s.spec_json, b.title, b.topic, b.structure_type, b.structure_name
  FROM specs s JOIN briefs b ON b.id=s.brief_id
  WHERE s.id = (SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
`).all();
const results = [];
for (const r of rows) {
  const spec = JSON.parse(r.spec_json || '{}');
  if (Number(spec.content_schema_version) !== 2) { results.push({ id: r.id, status: 'skip_legacy' }); continue; }
  if (spec.page1?.cover?.lead && spec.page1?.cover?.punch) { results.push({ id: r.id, status: 'already', cover: spec.page1.cover }); continue; }
  try {
    const cover = await generateCover({ title: r.title, topic: r.topic, structure_type: r.structure_type, structure_name: r.structure_name }, spec);
    spec.page1.cover = cover;
    spec.page1.cover_v2 = true;
    spec.updated_at = new Date().toISOString();
    db.prepare('UPDATE specs SET spec_json=?, updated_at=? WHERE id=?').run(JSON.stringify(spec), spec.updated_at, r.id);
    results.push({ id: r.id, title: r.title, status: 'ok', cover });
    console.log('ok', r.id, cover.lead, '/', cover.punch);
  } catch (e) {
    results.push({ id: r.id, title: r.title, status: 'failed', error: e.message });
    console.log('failed', r.id, e.message);
  }
}
const report = { generated_at: new Date().toISOString(), total: results.length, ok: results.filter(x => x.status === 'ok').length, failed: results.filter(x => x.status === 'failed').length, already: results.filter(x => x.status === 'already').length, results };
fs.writeFileSync('data/cover-migration.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.total, ok: report.ok, failed: report.failed, already: report.already }, null, 2));
db.close();
