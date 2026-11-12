// 生成手绘样本（roughjs 抖动描边），支持切换字体
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
const FONTS = {
  hei: '"Microsoft YaHei","PingFang SC","SimHei",sans-serif',
  kai: '"KaiTi","STKaiti","楷体",serif',
  hand: '"LXGW WenKai","KaiTi",serif'
};

function P(d) { return gen.toPaths(d).map(p => ({ d: p.d, stroke: p.stroke || C.line, sw: p.strokeWidth || 2.5, fill: p.fill || 'none' })); }
const rect = (x, y, w, h, o = {}) => P(gen.rectangle(x, y, w, h, { seed: o.seed || 1, roughness: o.roughness ?? 0.9, bowing: o.bowing ?? 0.8, stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5, fill: o.fill, fillStyle: 'solid' }));
const line = (x1, y1, x2, y2, o = {}) => P(gen.line(x1, y1, x2, y2, { seed: o.seed || 1, roughness: o.roughness ?? 0.7, stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5 }));
const ellipse = (cx, cy, w, h, o = {}) => P(gen.ellipse(cx, cy, w, h, { seed: o.seed || 1, roughness: o.roughness ?? 0.8, stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5, fill: o.fill, fillStyle: 'solid' }));
const poly = (pts, o = {}) => P(gen.polygon(pts, { seed: o.seed || 1, roughness: o.roughness ?? 0.9, bowing: o.bowing ?? 0.8, stroke: o.stroke || C.line, strokeWidth: o.sw || 2.5, fill: o.fill, fillStyle: 'solid' }));

function svg(paths, texts, font) {
  const ps = paths.map(p => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.sw}" fill="${p.fill}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n');
  const ts = texts.map(t => `<text x="${t.x}" y="${t.y}" fill="${t.fill || C.ink}" font-size="${t.size || 34}" text-anchor="${t.anchor || 'middle'}" font-family='${font}' font-weight="${t.weight || 400}">${t.s}</text>`).join('\n');
  return `<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="chalk" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="chalkText" x="-6%" y="-6%" width="112%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="chalkGrain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="3" result="n"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.10"/></feComponentTransfer>
    </filter>
  </defs>
  <g filter="url(#chalk)">${ps}</g>
  <g filter="url(#chalkText)">${ts}</g>
  <rect width="1080" height="1920" filter="url(#chalkGrain)" opacity="0.55"/>
  </svg>`;
}

function tree(font) {
  const p = [], t = [];
  t.push({ x: 540, y: 150, s: 'fork-and-flush', size: 72, fill: C.green, anchor: 'middle', weight: 600 });
  p.push(...line(540, 220, 540, 520, { stroke: C.green }));
  const xs = [200, 430, 660, 890];
  for (const x of xs) p.push(...line(540, 520, x, 660, { stroke: C.green }));
  xs.forEach((x, i) => {
    p.push(...rect(x - 105, 660, 210, 150, { stroke: C.green, fill: C.surface, seed: 10 + i }));
    t.push({ x, y: 720, s: '代码 ✓', size: 40, fill: C.yellow });
    t.push({ x, y: 780, s: '思维链 ✗', size: 40, fill: C.red });
  });
  t.push({ x: 540, y: 1520, s: '删掉过去的尝试轨迹和思维链', size: 46, fill: C.yellow });
  return svg(p, t, font);
}
function cluster(font) {
  const p = [], t = [];
  p.push(...rect(70, 200, 940, 720, { stroke: C.line, seed: 21 }));
  const cl = [{ x: 300, y: 390, c: C.green }, { x: 780, y: 390, c: C.pink }, { x: 200, y: 700, c: C.orange }, { x: 540, y: 700, c: C.green }, { x: 860, y: 700, c: C.yellow }];
  cl.forEach((c, i) => {
    p.push(...ellipse(c.x, c.y, 300, 200, { stroke: c.c, seed: 30 + i, sw: 3 }));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r = 20 + (k % 3) * 18; p.push(...ellipse(c.x + Math.cos(a) * r * 2.2, c.y + Math.sin(a) * r, 18, 18, { stroke: c.c, sw: 2, seed: 40 + i * 10 + k, fill: c.c })); }
  });
  t.push({ x: 540, y: 1080, s: 'idea basin', size: 64, fill: C.yellow, weight: 600 });
  t.push({ x: 540, y: 1150, s: '想法盆地', size: 40, fill: C.muted });
  return svg(p, t, font);
}
function matrix(font) {
  const p = [], t = [];
  const cols = 12, rows = 7, sx = 80, sy = 420, gap = 70;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lit = (r === 0 && c > 0) || (r === 4 && c > 3 && c < 10) || (r === 5 && c < 5);
    p.push(...ellipse(sx + c * gap, sy + r * gap, 34, 34, { stroke: lit ? C.yellow : '#4a4a45', sw: 2, seed: 100 + r * 20 + c, fill: lit ? C.yellow : '#3a3a36' }));
  }
  t.push({ x: 540, y: 1360, s: '300 条消息  20 条要干活', size: 48, fill: C.ink });
  t.push({ x: 540, y: 1440, s: '其余是闲聊、跟进、叫停', size: 36, fill: C.muted });
  return svg(p, t, font);
}
function chat(font) {
  const p = [], t = [];
  p.push(...ellipse(160, 420, 120, 120, { stroke: C.yellow, seed: 200 }));
  t.push({ x: 160, y: 432, s: '用户', size: 34, fill: C.yellow });
  p.push(...rect(260, 370, 420, 100, { stroke: C.yellow, fill: C.surface, seed: 201 }));
  t.push({ x: 470, y: 432, s: '帮我修个 bug', size: 38, fill: C.yellow });
  p.push(...rect(520, 500, 380, 90, { stroke: C.green, fill: C.surface, seed: 202 }));
  t.push({ x: 710, y: 558, s: 'Router：收到', size: 34, fill: C.green });
  p.push(...rect(260, 760, 560, 220, { stroke: C.green, fill: C.surface, seed: 203 }));
  t.push({ x: 540, y: 850, s: 'Router', size: 64, fill: C.green, weight: 600 });
  t.push({ x: 540, y: 920, s: '接消息、派活', size: 38, fill: C.muted });
  p.push(...line(260, 1100, 300, 1200, { stroke: C.green }), ...line(540, 1100, 540, 1200, { stroke: C.green }), ...line(820, 1100, 780, 1200, { stroke: C.green }));
  t.push({ x: 540, y: 1450, s: '后台的 Worker 是异步的', size: 44, fill: C.yellow });
  return svg(p, t, font);
}
function compare(font) {
  const p = [], t = [];
  const rows = [{ c: C.yellow, label: '完整版 Super-agent', sub: '后续直接发给 Worker' }, { c: C.green, label: '全走 Router 版', sub: '后续先经过 Router' }, { c: C.red, label: '单会话 + 中性提示', sub: '多数不派' }, { c: C.pink, label: '单会话 + 委派提示', sub: '多数会派' }];
  rows.forEach((r, i) => {
    const y = 260 + i * 300;
    p.push(...rect(70, y, 940, 240, { stroke: r.c, fill: C.surface, seed: 300 + i, sw: 3 }));
    t.push({ x: 110, y: y + 90, s: r.label, size: 42, fill: r.c, anchor: 'start', weight: 600 });
    t.push({ x: 110, y: y + 160, s: r.sub, size: 32, fill: C.muted, anchor: 'start' });
    p.push(...rect(560, y + 60, 150, 80, { stroke: C.line, seed: 320 + i }));
    t.push({ x: 635, y: y + 112, s: '消息', size: 30, fill: C.ink });
    p.push(...line(710, y + 100, 800, y + 100, { stroke: r.c }));
    p.push(...rect(800, y + 60, 170, 80, { stroke: r.c, seed: 340 + i }));
    t.push({ x: 885, y: y + 112, s: i < 2 ? 'Worker' : '会话', size: 30, fill: r.c });
  });
  t.push({ x: 540, y: 1600, s: '一个会话加一个能派 subagent 的工具', size: 40, fill: C.yellow });
  return svg(p, t, font);
}

// 6) 时间线
function timeline(font) {
  const p = [], t = [];
  t.push({ x: 540, y: 160, s: '时间线', size: 64, fill: C.ink, weight: 600 });
  p.push(...line(140, 700, 940, 700, { stroke: C.line, sw: 4 }));
  [{ x: 240, label: '2023', sub: '起步' }, { x: 540, label: '2024', sub: '爆发' }, { x: 840, label: '2025', sub: '成熟' }].forEach((pt, i) => {
    p.push(...ellipse(pt.x, 700, 44, 44, { stroke: C.yellow, sw: 3, seed: 500 + i, fill: C.yellow }));
    t.push({ x: pt.x, y: 640, s: pt.label, size: 40, fill: C.yellow, weight: 600 });
    t.push({ x: pt.x, y: 790, s: pt.sub, size: 34, fill: C.muted });
  });
  t.push({ x: 540, y: 1200, s: '三个关键节点', size: 42, fill: C.ink });
  return svg(p, t, font);
}

// 7) 循环
function cycle(font) {
  const p = [], t = [];
  t.push({ x: 540, y: 160, s: '循环', size: 64, fill: C.ink, weight: 600 });
  const cx = 540, cy = 780, r = 280, n = 5;
  const nodes = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; nodes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a }); }
  p.push(...ellipse(cx, cy, r * 2, r * 2, { stroke: C.line, sw: 2, seed: 600 }));
  nodes.forEach((nd, i) => {
    p.push(...rect(nd.x - 90, nd.y - 40, 180, 80, { stroke: C.green, fill: C.surface, seed: 610 + i }));
    t.push({ x: nd.x, y: nd.y + 10, s: ['计划', '执行', '检查', '调整', '复盘'][i], size: 34, fill: C.green });
  });
  for (let i = 0; i < n; i++) {
    const a1 = nodes[i].a, a2 = nodes[(i + 1) % n].a + (i === n - 1 ? Math.PI * 2 : 0);
    const mid = (a1 + a2) / 2;
    t.push({ x: cx + Math.cos(mid) * r * 1.18, y: cy + Math.sin(mid) * r * 1.18, s: '→', size: 44, fill: C.yellow });
  }
  t.push({ x: 540, y: 1500, s: '一轮接一轮，越转越顺', size: 42, fill: C.yellow });
  return svg(p, t, font);
}

// 8) 漏斗
function funnel(font) {
  const p = [], t = [];
  t.push({ x: 540, y: 160, s: '漏斗', size: 64, fill: C.ink, weight: 600 });
  [{ w: 780, label: '认识', c: C.yellow }, { w: 600, label: '兴趣', c: C.green }, { w: 420, label: '行动', c: C.orange }, { w: 240, label: '转化', c: C.red }].forEach((r, i) => {
    const y = 320 + i * 220, h = 200;
    p.push(...poly([[540 - r.w / 2, y], [540 + r.w / 2, y], [540 + r.w / 2 * 0.86, y + h], [540 - r.w / 2 * 0.86, y + h]], { stroke: r.c, fill: C.surface, seed: 700 + i, sw: 3 }));
    t.push({ x: 540, y: y + 115, s: r.label, size: 40, fill: r.c, weight: 600 });
  });
  t.push({ x: 540, y: 1450, s: '一层层筛下来', size: 42, fill: C.ink });
  return svg(p, t, font);
}

// 9) 括号分组
function bracket(font) {
  const p = [], t = [];
  t.push({ x: 540, y: 160, s: '分组', size: 64, fill: C.ink, weight: 600 });
  p.push(...line(180, 360, 140, 360, { stroke: C.yellow, sw: 3 }));
  p.push(...line(180, 360, 180, 700, { stroke: C.yellow, sw: 3 }));
  p.push(...line(180, 700, 140, 700, { stroke: C.yellow, sw: 3 }));
  t.push({ x: 110, y: 545, s: '前置', size: 34, fill: C.yellow });
  ['输入', '处理', '输出'].forEach((s, i) => {
    p.push(...rect(260, 320 + i * 150, 560, 110, { stroke: C.green, fill: C.surface, seed: 800 + i }));
    t.push({ x: 540, y: 385 + i * 150, s: s, size: 36, fill: C.ink });
  });
  t.push({ x: 540, y: 1100, s: '三步一组', size: 42, fill: C.yellow });
  return svg(p, t, font);
}

// 10) 柱状图
function bars(font) {
  const p = [], t = [];
  t.push({ x: 540, y: 160, s: '对比', size: 64, fill: C.ink, weight: 600 });
  p.push(...line(120, 1300, 960, 1300, { stroke: C.line, sw: 3 }));
  [{ v: 0.55, c: C.green, label: '甲' }, { v: 0.78, c: C.yellow, label: '乙' }, { v: 0.4, c: C.orange, label: '丙' }, { v: 0.92, c: C.red, label: '丁' }].forEach((x, i) => {
    const h = x.v * 800, bx = 190 + i * 210;
    p.push(...rect(bx, 1300 - h, 120, h, { stroke: x.c, fill: x.c, seed: 900 + i, sw: 3 }));
    t.push({ x: bx + 60, y: 1300 - h - 20, s: Math.round(x.v * 100) + '', size: 34, fill: x.c, weight: 600 });
    t.push({ x: bx + 60, y: 1350, s: x.label, size: 32, fill: C.muted });
  });
  t.push({ x: 540, y: 1600, s: '一眼看高低', size: 42, fill: C.ink });
  return svg(p, t, font);
}

const samples = [
  { name: '⑥ 时间线', fn: timeline }, { name: '⑦ 循环', fn: cycle }, { name: '⑧ 漏斗', fn: funnel },
  { name: '⑨ 括号分组', fn: bracket }, { name: '⑩ 柱状对比', fn: bars }
];

const font = FONTS.hei;
const cards = samples.map(s => `<div class="card"><div class="t">${s.name}</div>${s.fn(font)}</div>`).join('\n');
const fontCards = ['hei', 'kai', 'hand'].map(k => `<div class="card"><div class="t">${k === 'hei' ? '黑体' : k === 'kai' ? '楷体' : '手写（LXGW）'}</div>${tree(FONTS[k])}</div>`).join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>手绘样本（黑体）</title>
<style>
body{background:#1a1a1a;color:#eee;font-family:system-ui;margin:0;padding:24px}
h1{font-weight:400;font-size:20px}h2{font-weight:400;font-size:15px;color:#aaa;margin:28px 0 10px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;align-items:start}
.card{background:#262725;border:1px solid #3a3a36;border-radius:10px;padding:10px}
.card svg{width:100%;height:auto;display:block;border-radius:6px}
.t{font-size:12px;color:#aaa;margin-bottom:8px}
@media(max-width:1400px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><h1>手绘样本 · 黑体</h1><div class="grid">${cards}</div>
<h2>字体对比（同一个树，三种字体）</h2><div class="grid">${fontCards}</div></body></html>`;

fs.mkdirSync('D:/AI数字资产/studio/data/media/handdrawn', { recursive: true });
fs.writeFileSync('D:/AI数字资产/studio/data/media/handdrawn/index.html', html);
console.log('written: data/media/handdrawn/index.html');
