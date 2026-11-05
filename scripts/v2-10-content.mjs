import fs from 'node:fs';
import { generateLiteSpec } from '../lib/generator.mjs';
import { checkSpecCoverage } from '../lib/spec-check.mjs';

const topics = [
  ['AI Agent 不是聊天机器人','AI Agent'],
  ['RAG 不是知识库','RAG'],
  ['上下文窗口不是记忆力','上下文窗口'],
  ['提示词不是越长越好','提示词'],
  ['微调不是 RAG 的替代品','微调'],
  ['AI 编程不是自动写完','AI 编程'],
  ['AI 搜索不是 AI 研究','AI 搜索'],
  ['AI 写作为什么越写越像','AI 写作'],
  ['AI 自动化不是接个 API','AI 自动化'],
  ['AI 评测不是跑分','AI 评测']
];
fs.mkdirSync('data/v2-specs', { recursive: true });
const report = [];
for (let i = 0; i < topics.length; i++) {
  const [title, topic] = topics[i];
  const page_count = [4,5,6][i % 3];
  const palette = ['b1','b2','b3'][i % 3];
  const brief = { title, topic, page_count, theme: palette, palette, structure_type: ['contrast','causal','boundary'][i%3], structure_name: ['对照','因果','边界'][i%3], must_include: '输入；流程；验收', must_avoid: '夸大；编造' };
  try {
    const spec = await generateLiteSpec(brief, { title, thesis: topic, analogy_map: [] });
    spec.page_count = page_count;
    spec.palette = palette;
    const coverage = checkSpecCoverage(spec);
    fs.writeFileSync(`data/v2-specs/${String(i+1).padStart(2,'0')}.json`, JSON.stringify(spec, null, 2));
    report.push({ index: i+1, id: `${String(i+1).padStart(2,'0')}`, title, page_count, palette, ok: coverage.ok, errors: coverage.errors.slice(0,4) });
    console.log('ok', i+1, title, page_count, palette, coverage.ok);
  } catch (e) {
    report.push({ index: i+1, title, error: e.message });
    console.log('failed', i+1, e.message);
  }
}
fs.writeFileSync('data/v2-specs/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.length, ok: report.filter(x=>x.ok).length }, null, 2));
