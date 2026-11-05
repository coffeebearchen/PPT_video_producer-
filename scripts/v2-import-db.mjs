import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/studio.db');
const now = new Date().toISOString();
db.exec("DELETE FROM specs WHERE id LIKE 'spec_v2_%'; DELETE FROM briefs WHERE id LIKE 'brief_v2_%';");
for (let i = 1; i <= 10; i++) {
  const n = String(i).padStart(2, '0');
  const file = `data/v2-specs/${n}.json`;
  if (!fs.existsSync(file)) continue;
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const briefId = `brief_v2_${n}`;
  const specId = `spec_v2_${n}`;
  const title = spec.page1?.cover?.lead || spec.title || `V2 ${n}`;
  db.prepare(`INSERT INTO briefs (id,title,topic,audience,quantity,analogy_domains,must_include,must_avoid,channels,tone,cta,deadline,status,created_at,updated_at,structure_id,structure_name,structure_type,structure_snapshot,page_count,page_plan,theme,template_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    briefId, title, title, '想用 AI 提效的职场人', 1, '[]', '输入；流程；验收', '夸大；编造',
    '["视频号","公众号"]', '克制、类比、判断', '把这条转给正在用 AI 的同事。', '', 'script_ready', now, now,
    '', '对照', 'contrast', '{}', spec.page_count || 5, '[]', spec.palette || 'b1', ''
  );
  spec.renderer = 'v2';
  spec.content_schema_version = 3;
  db.prepare(`INSERT INTO specs (id,brief_id,angle_id,version,spec_json,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(specId, briefId, null, 1, JSON.stringify(spec), 'ready', now, now);
  console.log('inserted', specId);
}
db.close();
