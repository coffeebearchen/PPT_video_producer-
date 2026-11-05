import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateSpec } from '../lib/generator.mjs';
import { checkSpecCoverage } from '../lib/spec-check.mjs';

const THEMES = ['terminal', 'archive', 'editorial', 'noir', 'earth'];
const STRUCTS = [
  ['analogy', '类比'], ['contrast', '对照'], ['causal', '因果'],
  ['misconception', '误区'], ['boundary', '边界'], ['checklist', '清单']
];
const TOPICS = [
  ['AI Agent 不是聊天机器人', 'AI Agent', 5, 0, 0],
  ['RAG 不是知识库', 'RAG 知识库', 6, 1, 1],
  ['上下文窗口不是记忆力', '上下文窗口', 4, 2, 2],
  ['提示词不是越长越好', '提示词', 5, 3, 3],
  ['微调不是 RAG 的替代品', '微调与 RAG', 6, 4, 4],
  ['AI 编程不是自动写完', 'AI 编程', 5, 0, 5],
  ['AI 搜索不是 AI 研究', 'AI 搜索', 4, 1, 1],
  ['AI 写作为什么越写越像', 'AI 写作同质化', 5, 2, 2],
  ['AI 自动化不是接个 API', 'AI 自动化', 4, 3, 3],
  ['AI 评测不是跑分', 'AI 评测', 5, 4, 5],
  ['AI 权限不是账号密码', 'AI 权限', 6, 0, 4],
  ['Token 成本不是单价', 'Token 成本', 5, 1, 2],
  ['AI 延迟不是模型慢', 'AI 延迟', 4, 2, 1],
  ['AI 幻觉不是模型笨', 'AI 幻觉', 6, 3, 3],
  ['AI 记忆不是聊天记录', 'AI 记忆', 4, 4, 0],
  ['AI 工作流不是提示词集合', 'AI 工作流', 5, 0, 5],
  ['模型选型不是看榜单', '模型选型', 6, 1, 3],
  ['AI 数据治理不是删数据', 'AI 数据治理', 5, 2, 4],
  ['AI 客服不是问答机器人', 'AI 客服', 6, 3, 2],
  ['AI 内容运营不是批量生成', 'AI 内容运营', 5, 4, 1]
];

const now = new Date().toISOString();
const db = new DatabaseSync('data/studio.db');
db.exec("DELETE FROM specs WHERE id LIKE 'spec_demo20_%'; DELETE FROM briefs WHERE id LIKE 'brief_demo20_%';");
const results = [];
for (let i = 0; i < TOPICS.length; i++) {
  const [title, topic, pages, themeIndex, structIndex] = TOPICS[i];
  const [structureType, structureName] = STRUCTS[structIndex];
  const briefId = `brief_demo20_${String(i + 1).padStart(2, '0')}`;
  const specId = `spec_demo20_${String(i + 1).padStart(2, '0')}`;
  const mapping = [
    { from: '入口', to: '输入', note: '先确认输入稳定' },
    { from: '路径', to: '流程', note: '再看执行路径' },
    { from: '回执', to: '验收', note: '最后看能否验收' }
  ];
  const snapshot = {
    name: title, structure_type: structureType,
    source_domain: '日常流程', target_domain: topic,
    mapping, boundary: `只适用于${topic}的常见工作流，不适用于一次性尝试。`,
    signature: `${title}，关键不在表面，在结构。`
  };
  const brief = {
    id: briefId, title, topic, audience: '想用 AI 提效的职场人',
    quantity: 3, analogy_domains: '[]', must_include: '输入；流程；验收',
    must_avoid: '不夸大、不编造事实', channels: '["视频号","公众号"]',
    tone: '克制、类比、判断', cta: '把这条转给正在用 AI 的同事。',
    deadline: '', status: 'script_ready', created_at: now, updated_at: now,
    structure_id: '', structure_name: structureName, structure_type: structureType,
    structure_snapshot: JSON.stringify(snapshot), page_count: pages,
    page_plan: '[]', theme: THEMES[themeIndex], template_id: ''
  };
  db.prepare(`INSERT INTO briefs (id,title,topic,audience,quantity,analogy_domains,must_include,must_avoid,channels,tone,cta,deadline,status,created_at,updated_at,structure_id,structure_name,structure_type,structure_snapshot,page_count,page_plan,theme,template_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    brief.id, brief.title, brief.topic, brief.audience, brief.quantity, brief.analogy_domains,
    brief.must_include, brief.must_avoid, brief.channels, brief.tone, brief.cta, brief.deadline,
    brief.status, brief.created_at, brief.updated_at, brief.structure_id, brief.structure_name,
    brief.structure_type, brief.structure_snapshot, brief.page_count, brief.page_plan, brief.theme, brief.template_id
  );
  const angle = { title: title, thesis: `${title}：先看结构，再看工具。`, analogy_map: mapping };
  try {
    const spec = await generateSpec(brief, angle, []);
    spec.id = specId;
    spec.brief_id = briefId;
    spec.theme = THEMES[themeIndex];
    spec.page_count = pages;
    spec.content_schema_version = 3;
    const coverage = checkSpecCoverage(spec);
    db.prepare(`INSERT INTO specs (id,brief_id,angle_id,version,spec_json,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?)`).run(specId, briefId, null, 1, JSON.stringify(spec), 'ready', now, now);
    results.push({ index: i + 1, id: specId, title, pages, theme: spec.theme, structure: structureType, ok: coverage.ok, errors: coverage.errors.map(x => x.message), cover: spec.page1?.cover || null });
    console.log('ok', i + 1, title, spec.page1?.cover?.lead, '/', spec.page1?.cover?.punch);
  } catch (e) {
    results.push({ index: i + 1, id: specId, title, error: e.message });
    console.log('failed', i + 1, title, e.message);
  }
}
fs.writeFileSync('data/demo20-generation.json', JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({ total: results.length, ok: results.filter(x => x.ok).length, failed: results.filter(x => x.error).length }, null, 2));
db.close();
