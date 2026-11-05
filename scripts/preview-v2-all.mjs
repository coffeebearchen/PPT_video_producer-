import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const exported = JSON.parse(fs.readFileSync('data/migration-preview/index.json', 'utf8'));
const rows = [];
for (const item of exported) {
  const out = `data/migration-preview/${item.id}-frames`;
  const r = spawnSync(process.execPath, ['renderer/render.mjs', '--spec', item.file, '--out', out, '--mode', 'preview'], { encoding: 'utf8', timeout: 180000 });
  const lines = String(r.stdout || '').split(/\r?\n/).filter(Boolean);
  let done = null;
  for (const line of lines) {
    try { const j = JSON.parse(line); if (j.type === 'done') done = j; } catch {}
  }
  rows.push({ id: item.id, title: item.title, status: r.status, issues: done?.layout_issues || [], previews: done?.previews || 0 });
  console.log(item.id, r.status, (done?.layout_issues || []).length);
}
const report = { generated_at: new Date().toISOString(), total: rows.length, with_issues: rows.filter(x => x.issues.length).length, rows };
fs.writeFileSync('data/migration-preview/layout-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.total, with_issues: report.with_issues }, null, 2));
