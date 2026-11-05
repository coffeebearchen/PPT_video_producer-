import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.spec_json, b.title, b.structure_type
  FROM specs s JOIN briefs b ON b.id=s.brief_id
  WHERE s.id = (SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
  ORDER BY s.created_at DESC
`).all();
const outDir = 'data/migration-preview';
fs.mkdirSync(outDir, { recursive: true });
const exported = [];
for (const r of rows) {
  const spec = JSON.parse(r.spec_json || '{}');
  if (Number(spec.content_schema_version) !== 2) continue;
  spec.structure_type = r.structure_type || spec.structure_type || 'analogy';
  const file = `${outDir}/${r.id}.json`;
  fs.writeFileSync(file, JSON.stringify(spec, null, 2));
  exported.push({ id: r.id, title: r.title, file });
}
fs.writeFileSync(`${outDir}/index.json`, JSON.stringify(exported, null, 2));
console.log(JSON.stringify({ count: exported.length, exported }, null, 2));
db.close();
