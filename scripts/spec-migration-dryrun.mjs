import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.brief_id, s.version, s.status AS spec_status, s.spec_json,
         b.title AS brief_title, b.status AS brief_status, b.structure_type,
         b.structure_snapshot, b.must_include, b.page_count
  FROM specs s JOIN briefs b ON b.id=s.brief_id
  ORDER BY s.created_at DESC
`).all();
const clean = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
function shortHeading(value, max = 18) {
  const text = clean(value);
  if (text.length <= max) return text;
  const parts = text.split(/[：:，,。；;]/).map(clean).filter(Boolean);
  const good = parts.find(p => p.length >= 6 && p.length <= max) || parts[0] || text;
  return good.slice(0, max);
}
function mappingOf(brief) {
  try { return JSON.parse(brief.structure_snapshot || '{}').mapping || []; } catch { return []; }
}
function deriveFields(brief, spec) {
  const type = brief.structure_type || spec.structure_type || 'analogy';
  const mapping = mappingOf(brief);
  if (type === 'causal') return { causal: mapping.map(m => clean(m.to)).filter(Boolean).slice(0, 3) };
  if (type === 'checklist') {
    const items = String(brief.must_include || '').split(/[；;\n]/).map(clean).filter(Boolean);
    return { checklist: (items.length ? items : mapping.map(m => clean(m.to))).filter(Boolean).slice(0, 5) };
  }
  if (type === 'boundary') {
    const fit = mapping.slice(0, 3).map(m => clean(m.from)).filter(Boolean).join('、');
    const no = mapping.slice(-1).map(m => clean(m.from)).filter(Boolean).join('、');
    return { boundary: [fit || '查资料、写初稿、提建议', no || '签字、承担后果'] };
  }
  if (type === 'misconception') {
    const first = mapping[0] || {};
    return { misconception: [clean(first.from) || '常见误解', clean(first.to) || '正确认知'] };
  }
  return null;
}

const proposals = [];
for (const r of rows) {
  const spec = JSON.parse(r.spec_json || '{}');
  const brief = { structure_type: r.structure_type, structure_snapshot: r.structure_snapshot, must_include: r.must_include };
  const next = JSON.parse(JSON.stringify(spec));
  const issues = [];
  const lines = (next.page1?.lines || []).map(clean).filter(Boolean);
  const merged = [];
  for (const line of lines) {
    if (line.length <= 2 && merged.length) merged[merged.length - 1] += line;
    else merged.push(line);
  }
  if (merged.length && merged[0].length <= 2 && merged[1]) { merged[1] = merged[0] + merged[1]; merged.shift(); }
  if (merged.join('') !== lines.join('')) issues.push('P1 短行合并');
  next.page1 = next.page1 || {};
  next.page1.lines = merged;
  next.page1.headline = clean(next.page1.headline || merged.join(''));
  next.page1.emphasis = Array.isArray(next.page1.emphasis) && next.page1.emphasis.length ? next.page1.emphasis : [clean(next.page1.highlight)].filter(Boolean);
  next.page1.max_lines = Math.max(2, Math.min(3, Number(next.page1.max_lines) || merged.length || 3));
  const p1All = [next.page1.headline, ...merged].join('');
  const highlight = clean(next.page1.highlight);
  if (highlight && !p1All.includes(highlight)) {
    next.page1.highlight = clean(merged[merged.length - 1] || merged[0] || '').slice(0, 12);
    issues.push('修正 Highlight');
  }
  next.context = next.context || {};
  const oldTitle = clean(next.context.title);
  const signature = clean(JSON.parse(r.structure_snapshot || '{}').signature);
  if (oldTitle.length > 18 || /(资|个|判|负|责)$/.test(oldTitle)) {
    next.context.title = shortHeading(oldTitle || signature, 18);
    if (/(资|个|判|负|责)$/.test(next.context.title) || next.context.title.length > 18) {
      next.context.title = shortHeading(signature || r.brief_title, 18);
    }
    issues.push('修正背景标题');
  }
  const fields = deriveFields(brief, next);
  if (fields) {
    const key = Object.keys(fields)[0];
    const existing = next.structure_fields?.[key];
    if (!Array.isArray(existing) || !existing.length) {
      next.structure_fields = { ...(next.structure_fields || {}), ...fields };
    }
    if (!next.structure_fields?.[key]?.length) issues.push('结构字段为空');
  }
  next.content_schema_version = 2;
  next.structure_type = brief.structure_type || next.structure_type || 'analogy';
  proposals.push({
    spec_id: r.id, brief_id: r.brief_id, title: r.brief_title,
    structure_type: next.structure_type, page_count: r.page_count,
    protected: ['approved', 'published'].includes(r.brief_status) || ['approved', 'published'].includes(r.spec_status),
    issues,
    before: { context_title: oldTitle, highlight, lines, fields: spec.structure_fields || null },
    after: { context_title: next.context.title, highlight: next.page1.highlight, lines: merged, fields: next.structure_fields || null }
  });
}
const report = {
  generated_at: new Date().toISOString(),
  total: proposals.length,
  proposed: proposals.filter(x => x.issues.length && !x.protected).length,
  protected: proposals.filter(x => x.protected).length,
  proposals
};
fs.writeFileSync('data/spec-migration-proposals.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.total, proposed: report.proposed, protected: report.protected, sample: proposals.slice(0, 4) }, null, 2));
db.close();
