import fs from 'node:fs';
const BASE = 'http://127.0.0.1:4310';
const specs = [
  ['editorial-5-checklist', 'spec_4ffb7d41'],
  ['noir-5-contrast', 'spec_a0bde2e1'],
  ['earth-5-causal', 'spec_9658b668'],
  ['terminal-5-misconception', 'spec_6ef1ca1c'],
  ['archive-5-boundary', 'spec_c4f267ff'],
  ['earth-6-context', 'spec_b6461777'],
  ['noir-6-agent', 'spec_cffcb793']
];
const post = async (p, b = {}) => {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${p} ${r.status} ${JSON.stringify(d)}`);
  return d;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = [];
for (const [name, id] of specs) {
  try {
    const r = await post(`/api/specs/${id}/preview`);
    let d = null;
    for (let i = 0; i < 90; i++) {
      await sleep(1000);
      const res = await fetch(`${BASE}/api/renders/${r.id}`);
      const data = await res.json();
      if (['preview_ready', 'failed', 'canceled'].includes(data.render.status)) { d = data.render; break; }
    }
    rows.push({ name, id, status: d?.status || 'timeout', issues: d?.layout_issues || [] });
  } catch (e) {
    rows.push({ name, id, status: 'error', issues: [{ reason: e.message }] });
  }
}
const total = rows.reduce((n, r) => n + r.issues.length, 0);
console.log(JSON.stringify({ total, rows }, null, 2));
fs.writeFileSync('data/layout-regression.json', JSON.stringify({ generated_at: new Date().toISOString(), total, rows }, null, 2));
