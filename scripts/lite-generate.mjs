import fs from 'node:fs';
import crypto from 'node:crypto';
import { generateLiteSpec } from '../lib/generator.mjs';
import { checkSpecCoverage } from '../lib/spec-check.mjs';

const input = process.argv[2]
  ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  : { title: 'RAG 不是知识库', topic: 'RAG', page_count: 5, theme: 'archive', structure_type: 'contrast', structure_name: '对照', must_include: '检索；生成；边界', must_avoid: '夸大；编造' };
const key = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
const cachePath = 'data/lite-cache.json';
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
let spec = cache[key];
const wasCached = Boolean(spec);
if (!spec) {
  const brief = { ...input, audience: '想用 AI 提效的职场人', cta: '把这条转给正在用 AI 的同事。' };
  spec = await generateLiteSpec(brief, { title: input.title, thesis: input.topic, analogy_map: [] });
  cache[key] = spec;
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}
const coverage = checkSpecCoverage(spec);
fs.mkdirSync('data/lite-output', { recursive: true });
fs.writeFileSync(`data/lite-output/${key}.json`, JSON.stringify(spec, null, 2));
console.log(JSON.stringify({ key, cached: wasCached, ok: coverage.ok, errors: coverage.errors, warnings: coverage.warnings.slice(0, 8), spec: `data/lite-output/${key}.json` }, null, 2));
