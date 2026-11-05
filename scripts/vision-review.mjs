#!/usr/bin/env node
/**
 * Vision review bridge.
 *
 * Takes screenshots of the Studio UI with headless Chrome, asks Qwen-VL
 * (DashScope OpenAI-compatible endpoint) to review them, and writes a report.
 *
 * Setup (do this once, locally; never commit the key):
 *   1. create studio/.env containing:
 *        DASHSCOPE_API_KEY=sk-...
 *        VISION_MODEL=qwen3-vl-plus
 *   2. node scripts/vision-review.mjs
 *
 * Optional:
 *   node scripts/vision-review.mjs "#/briefs" "#/soul"
 *   VISION_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'out', 'vision-review');
const STUDIO = process.env.STUDIO_URL || 'http://127.0.0.1:4310';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = process.env.VISION_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = process.env.VISION_MODEL || 'qwen3-vl-plus';

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const value = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function slug(route) {
  return route.replace(/^#?\//, '').replace(/[^a-z0-9\u4e00-\u9fa5-]+/gi, '-').replace(/^-|-$/g, '') || 'dashboard';
}

function screenshot(route) {
  fs.mkdirSync(OUT, { recursive: true });
  const name = slug(route);
  const file = path.join(OUT, `${name}.png`);
  const url = `${STUDIO}/${route.startsWith('#') ? route : '#' + route}`;
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1600,1400', '--virtual-time-budget=7000',
    `--screenshot=${file}`, url
  ], { stdio: 'ignore', timeout: 60000 });
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) throw new Error(`截图失败: ${url}`);
  return { file, url };
}

async function review(file, url) {
  const b64 = fs.readFileSync(file).toString('base64');
  const prompt = `你是资深中文 SaaS 后台 UI/UX 评审。看这张 1600px 宽的界面截图，只基于截图内容回答，不要编造。
输出四段：
1. 这个页面在做什么（一句话）
2. 视觉层级：标题、主按钮、次要信息是否一眼能分清
3. 具体问题：对齐、留白、字号、颜色对比、信息密度、溢出、按钮太挤或太散；指出大致区域
4. 最值得改的 3 条，按优先级排序
如果截图里有明显的文字截断、遮挡、空状态或错误提示，请优先指出。`;

  const body = {
    model: MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } }
      ]
    }],
    temperature: 0.2,
    max_tokens: 1400
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 800)}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`空响应: ${text.slice(0, 800)}`);
  return content;
}

loadDotEnv();

if (!process.env.DASHSCOPE_API_KEY) {
  console.error('缺少 DASHSCOPE_API_KEY。请在 studio/.env 写入 DASHSCOPE_API_KEY=sk-...，或设置同名环境变量。');
  process.exit(1);
}

const routes = process.argv.slice(2);
if (!routes.length) routes.push('#/', '#/briefs', '#/analogies', '#/soul', '#/settings', '#/publish');

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (const route of routes) {
  const { file, url } = screenshot(route);
  console.log(`\n===== ${url} =====`);
  console.log(`screenshot: ${file}`);
  const content = await review(file, url);
  console.log(content);
  report.push(`## ${url}\n\n![${slug(route)}](${path.basename(file)})\n\n${content}\n`);
}
fs.writeFileSync(path.join(OUT, 'review.md'), `# Vision review\n\nmodel: ${MODEL}\n\n${report.join('\n')}`, 'utf8');
console.log(`\nreport: ${path.join(OUT, 'review.md')}`);
