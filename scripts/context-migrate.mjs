import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateContext } from '../lib/generator.mjs';

const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.brief_id, s.spec_json, b.title, b.topic, b.structure_type, b.structure_name
  FROM specs s JOIN briefs b ON b.id=s.brief_id
  WHERE s.id = (SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
`).all();
const results = [];
for (const r of rows) {
  const spec = JSON.parse(r.spec_json || '{}');
  if (Number(spec.content_schema_version) < 3) { results.push({ id: r.id, status: 'skip' }); continue; }
  if (spec.context?.scene && spec.context?.roles && spec.context?.constraint) {
    results.push({ id: r.id, status: 'already' }); continue;
  }
  try {
    const ctx = await generateContext(
      { title: r.title, topic: r.topic, structure_type: r.structure_type, structure_name: r.structure_name },
      spec
    );
    spec.context = {
      ...(spec.context || {}),
      title: r.title,
      scene: ctx.scene,
      roles: ctx.roles,
      constraint: ctx.constraint,
      bottom: ''
    };
    db.prepare('UPDATE specs SET spec_json=?, updated_at=? WHERE id=?').run(JSON.stringify(spec), new Date().toISOString(), r.id);
    results.push({ id: r.id, title: r.title, status: 'ok', context: spec.context });
    console.log('ok', r.id, ctx.scene, '|', ctx.roles, '|', ctx.constraint);
  } catch (e) {
    results.push({ id: r.id, title: r.title, status: 'failed', error: e.message });
    console.log('failed', r.id, e.message);
  }
}
fs.writeFileSync('data/context-migration.json', JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({ total: results.length, ok: results.filter(x => x.status === 'ok').length, failed: results.filter(x => x.status === 'failed').length }, null, 2));
db.close();
