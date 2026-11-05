import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/studio.db');
const rows = db.prepare(`
  SELECT s.id, s.brief_id, s.version, s.status AS spec_status, s.spec_json,
         b.title AS brief_title, b.status AS brief_status, b.structure_type, b.page_count
  FROM specs s JOIN briefs b ON b.id=s.brief_id
  WHERE s.id = (SELECT x.id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
  ORDER BY s.created_at DESC
`).all();

const items = rows.map(r => {
  const s = JSON.parse(r.spec_json || '{}');
  const lines = (s.page1?.lines || []).map(x => String(x || '').trim()).filter(Boolean);
  const p1All = [s.page1?.headline || '', ...lines].join('');
  const highlight = String(s.page1?.highlight || '').trim();
  const issues = [];
  if (!s.content_schema_version) issues.push('缺少 content_schema_version');
  const needsFields = ['causal', 'checklist', 'boundary', 'misconception'].includes(r.structure_type || s.structure_type);
  if (needsFields && !s.structure_fields) issues.push('缺少 structure_fields');
  if (highlight && p1All && !p1All.includes(highlight)) issues.push('Highlight 不属于 P1 主文案');
  if (lines.some(x => x.length <= 2)) issues.push('P1 有过短行');
  const ctx = String(s.context?.title || '');
  if (ctx.length > 18) issues.push('背景标题超过 18 字');
  if (/(资|个|判|负|责)$/.test(ctx) && ctx.length > 10 && !/[。！？；]/.test(ctx)) issues.push('背景标题可能被截断');
  return {
    spec_id: r.id, brief_id: r.brief_id, version: r.version,
    title: r.brief_title, brief_status: r.brief_status, spec_status: r.spec_status,
    structure_type: r.structure_type || s.structure_type || 'analogy',
    page_count: r.page_count, issues,
    can_auto_migrate: !['published', 'approved'].includes(r.brief_status) && !['published', 'approved'].includes(r.spec_status)
  };
});

const summary = {
  generated_at: new Date().toISOString(),
  total: items.length,
  clean: items.filter(x => !x.issues.length).length,
  need_migration: items.filter(x => x.issues.length).length,
  protected: items.filter(x => !x.can_auto_migrate).length,
  by_issue: {},
  by_structure: {},
  items
};
for (const item of items) {
  for (const i of item.issues) summary.by_issue[i] = (summary.by_issue[i] || 0) + 1;
  summary.by_structure[item.structure_type] = (summary.by_structure[item.structure_type] || 0) + 1;
}
fs.writeFileSync('data/spec-audit.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ total: summary.total, clean: summary.clean, need_migration: summary.need_migration, protected: summary.protected, by_issue: summary.by_issue, by_structure: summary.by_structure }, null, 2));
db.close();
