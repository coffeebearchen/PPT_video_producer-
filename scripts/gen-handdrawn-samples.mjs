// 生成 5 个手绘样本（roughjs 抖动描边）→ 一个 HTML 画廊
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const roughUrl = pathToFileURL('D:/AI数字资产/studio/engines/vibemotion/renderer/node_modules/roughjs/bundled/rough.esm.js').href;
const { default: rough } = await import(roughUrl);

const gen = rough.generator();
const C = {
  bg: '#262725', ink: '#F0EBD4', muted: '#BDBAA8',
  yellow: '#E7C85B', green: '#A8C9B4', red: '#EF8581',
  pink: '#E39BB0', orange: '#DBA36D', line: '#858C80', surface: '#30312D'
};

function P(drawable) {
  return gen.toPaths(drawable).map(p => ({
    d: p.d, stroke: p.stroke || C.line, sw: p.strokeWidth || 2.5, fill: p.fill || 'none'
  }));
}
const rect = (x, y, w, h, o = {}) => P(gen.rectangle(x, y, w, h, {
  seed: o.seed || 1, roughness: o.roughness ?? 0.9, bowing: o.bowing ?? 0.8,
  stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5, fill: o.fill, fillStyle: 'solid'
}));
const line = (x1, y1, x2, y2, o = {}) => P(gen.line(x1, y1, x2, y2, {
  seed: o.seed || 1, roughness: o.roughness ?? 0.7, stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5
}));
const ellipse = (cx, cy, w, h, o = {}) => P(gen.ellipse(cx, cy, w, h, {
  seed: o.seed || 1, roughness: o.roughness ?? 0.8, stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5,
  fill: o.fill, fillStyle: 'solid'
}));

function svg(paths, texts, extra = '') {
  const ps = paths.map(p => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.sw}" fill="${p.fill}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n');
  const ts = texts.map(t => `<text x="${t.x}" y="${t.y}" fill="${t.fill || C.ink}" font-size="${t.size || 34}" text-anchor="${t.anchor || 'middle'}" font-family="LXGW WenKai,KaiTi,楷体,serif">${t.s}</text>`).join('\n');
  return `<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">${extra}${ps}${ts}</svg>`;
}

// 1) 树（fork-and-flush）
function tree() {
  const p = [], t = [];
  t.push({ x: 540, y: 150, s: 'fork-and-flush', size: 72, fill: C.green, anchor: 'middle' });
  p.push(...line(540, 220, 540, 520, { stroke: C.green }));
  const xs = [200, 430, 660, 890];
  for (const x of xs) p.push(...line(540, 520, x, 660, { stroke: C.green }));
  xs.forEach((x, i) => {
    p.push(...rect(x - 105, 660, 210, 150, { stroke: C.green, fill: C.surface, seed: 10 + i }));
    t.push({ x, y: 720, s: '代码 ✓', size: 40, fill: C.yellow });
    t.push({ x, y: 780, s: '思维链 ✗', size: 40, fill: C.red });
  });
  t.push({ x: 540, y: 1520, s: '删掉过去的尝试轨迹和思维链', size: 46, fill: C.yellow, anchor: 'middle' });
  return svg(p, t);
}

// 2) 点群（idea basin）
function cluster() {
  const p = [], t = [];
  p.push(...rect(70, 200, 940, 720, { stroke: C.line, seed: 21 }));
  const cl = [
    { x: 300, y: 390, c: C.green }, { x: 780, y: 390, c: C.pink },
    { x: 200, y: 700, c: C.orange }, { x: 540, y: 700, c: C.green }, { x: 860, y: 700, c: C.yellow }
  ];
  cl.forEach((c, i) => {
    const w = 300, h = 200;
    p.push(...ellipse(c.x, c.y, w, h, { stroke: c.c, seed: 30 + i, sw: 3 }));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, r = 20 + (k % 3) * 18;
      p.push(...ellipse(c.x + Math.cos(a) * r * 2.2, c.y + Math.sin(a) * r, 18, 18, { stroke: c.c, sw: 2, seed: 40 + i * 10 + k, fill: c.c }));
    }
  });
  t.push({ x: 540, y: 1080, s: 'idea basin', size: 64, fill: C.yellow });
  t.push({ x: 540, y: 1150, s: '想法盆地', size: 40, fill: C.muted });
  return svg(p, t);
}

// 3) 点阵网格
function matrix() {
  const p = [], t = [];
  const cols = 12, rows = 7, sx = 80, sy = 420, gap = 70;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lit = (r === 0 && c > 0) || (r === 4 && c > 3 && c < 10) || (r === 5 && c < 5);
    p.push(...ellipse(sx + c * gap, sy + r * gap, 34, 34, {
      stroke: lit ? C.yellow : '#4a4a45', sw: 2, seed: 100 + r * 20 + c, fill: lit ? C.yellow : '#3a3a36'
    }));
  }
  t.push({ x: 540, y: 1360, s: '300 条消息  20 条要干活', size: 48, fill: C.ink });
  t.push({ x: 540, y: 1440, s: '其余是闲聊、跟进、叫停', size: 36, fill: C.muted });
  return svg(p, t);
}

// 4) 对话气泡
function chat() {
  const p = [], t = [];
  p.push(...ellipse(160, 420, 120, 120, { stroke: C.yellow, seed: 200 }));
  t.push({ x: 160, y: 432, s: '用户', size: 34, fill: C.yellow });
  p.push(...rect(260, 370, 420, 100, { stroke: C.yellow, fill: C.surface, seed: 201 }));
  t.push({ x: 470, y: 432, s: '帮我修个 bug', size: 38, fill: C.yellow });
  p.push(...rect(520, 500, 380, 90, { stroke: C.green, fill: C.surface, seed: 202 }));
  t.push({ x: 710, y: 558, s: 'Router：收到', size: 34, fill: C.green });
  p.push(...rect(260, 760, 560, 220, { stroke: C.green, fill: C.surface, seed: 203 }));
  t.push({ x: 540, y: 850, s: 'Router', size: 64, fill: C.green });
  t.push({ x: 540, y: 920, s: '接消息、派活', size: 38, fill: C.muted });
  p.push(...line(260, 1100, 300, 1200, { stroke: C.green }), ...line(540, 1100, 540, 1200, { stroke: C.green }), ...line(820, 1100, 780, 1200, { stroke: C.green }));
  t.push({ x: 540, y: 1450, s: '后台的 Worker 是异步的', size: 44, fill: C.yellow });
  return svg(p, t);
}

// 5) 对照行
function compare() {
  const p = [], t = [];
  const rows = [
    { c: C.yellow, label: '完整版 Super-agent', sub: '后续直接发给 Worker' },
    { c: C.green, label: '全走 Router 版', sub: '后续先经过 Router' },
    { c: C.red, label: '单会话 + 中性提示', sub: '多数不派' },
    { c: C.pink, label: '单会话 + 委派提示', sub: '多数会派' }
  ];
  rows.forEach((r, i) => {
    const y = 260 + i * 300;
    p.push(...rect(70, y, 940, 240, { stroke: r.c, fill: C.surface, seed: 300 + i, sw: 3 }));
    t.push({ x: 110, y: y + 90, s: r.label, size: 42, fill: r.c, anchor: 'start' });
    t.push({ x: 110, y: y + 160, s: r.sub, size: 32, fill: C.muted, anchor: 'start' });
    p.push(...rect(560, y + 60, 150, 80, { stroke: C.line, seed: 320 + i }));
    t.push({ x: 635, y: y + 112, s: '消息', size: 30, fill: C.ink });
    p.push(...line(710, y + 100, 800, y + 100, { stroke: r.c }));
    p.push(...rect(800, y + 60, 170, 80, { stroke: r.c, seed: 340 + i }));
    t.push({ x: 885, y: y + 112, s: i < 2 ? 'Worker' : '会话', size: 30, fill: r.c });
  });
  t.push({ x: 540, y: 1600, s: '一个会话加一个能派 subagent 的工具', size: 40, fill: C.yellow });
  return svg(p, t);
}

const samples = [
  { name: '01-树.jpg', title: '① 分叉树（fork-and-flush）', svg: tree() },
  { name: '02-点群.jpg', title: '② 点群（idea basin）', svg: cluster() },
  { name: '03-点阵网格.jpg', title: '③ 点阵网格', svg: matrix() },
  { name: '04-对话气泡.jpg', title: '④ 对话气泡', svg: chat() },
  { name: '05-对照行.jpg', title: '⑤ 对照行', svg: compare() }
];

const cards = samples.map(s => `<div class="card"><div class="t">${s.title}</div>${s.svg}</div>`).join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>手绘样本 5 个</title>
<style>
body{background:#1a1a1a;color:#eee;font-family:system-ui;margin:0;padding:24px}
h1{font-weight:400;font-size:20px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;align-items:start}
.card{background:#262725;border:1px solid #3a3a36;border-radius:10px;padding:10px}
.card svg{width:100%;height:auto;display:block;border-radius:6px}
.t{font-size:12px;color:#aaa;margin-bottom:8px}
@media(max-width:1400px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><h1>手绘样本（roughjs 抖动描边）</h1><div class="grid">${cards}</div></body></html>`;

fs.mkdirSync('D:/AI数字资产/studio/data/media/handdrawn', { recursive: true });
fs.writeFileSync('D:/AI数字资产/studio/data/media/handdrawn/index.html', html);
console.log('written: data/media/handdrawn/index.html');
console.log('samples:', samples.map(s => s.name).join(', '));
