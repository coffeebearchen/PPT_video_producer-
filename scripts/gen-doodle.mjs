// 涂鸦式（doodle）版本：更疯的手绘 + 涂鸦装饰
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
const FONT = '"Microsoft YaHei","PingFang SC","SimHei",sans-serif';
const W = 1080, H = 1920;

// 涂鸦参数：更疯
const R = { roughness: 2.2, bowing: 1.6 };

function P(d) { return gen.toPaths(d).map(p => ({ d: p.d, stroke: p.stroke || C.line, sw: p.strokeWidth || 3, fill: p.fill || 'none' })); }
const rect = (x, y, w, h, o = {}) => P(gen.rectangle(x, y, w, h, { seed: o.seed || 1, roughness: o.r ?? R.roughness, bowing: R.bowing, stroke: o.c || C.line, strokeWidth: o.sw || 3, fill: o.fill, fillStyle: 'solid' }));
const ell = (cx, cy, w, h, o = {}) => P(gen.ellipse(cx, cy, w, h, { seed: o.seed || 1, roughness: o.r ?? R.roughness, stroke: o.c || C.line, strokeWidth: o.sw || 3, fill: o.fill, fillStyle: 'solid' }));
const line = (x1, y1, x2, y2, o = {}) => P(gen.line(x1, y1, x2, y2, { seed: o.seed || 1, roughness: o.r ?? R.roughness, stroke: o.c || C.line, strokeWidth: o.sw || 3 }));
const poly = (pts, o = {}) => P(gen.polygon(pts, { seed: o.seed || 1, roughness: o.r ?? R.roughness, bowing: R.bowing, stroke: o.c || C.line, strokeWidth: o.sw || 3, fill: o.fill, fillStyle: 'solid' }));
const path = (d, o = {}) => P(gen.path(d, { seed: o.seed || 1, roughness: o.r ?? R.roughness, stroke: o.c || C.line, strokeWidth: o.sw || 3 }));

// 涂鸦装饰
function star(x, y, s, c, seed) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.42 : s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  return poly(pts, { c, sw: 3, seed });
}
function squiggle(x, y, len, c, seed) {
  let d = `M${x} ${y}`;
  for (let i = 1; i <= 6; i++) d += ` Q${x + (len / 6) * (i - 0.5)} ${y + (i % 2 ? -8 : 8)} ${x + (len / 6) * i} ${y}`;
  return path(d, { c, sw: 3, seed });
}
function zigArrow(x1, y1, x2, y2, c, seed) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
  const j = 18;
  const p1 = [mx + (nx / len) * j, my + (ny / len) * j];
  const out = path(`M${x1} ${y1} Q${p1[0]} ${p1[1]} ${x2} ${y2}`, { c, sw: 3, seed });
  const a = Math.atan2(y2 - p1[1], x2 - p1[0]);
  out.push(...line(x2, y2, x2 - 20 * Math.cos(a - 0.5), y2 - 20 * Math.sin(a - 0.5), { c, sw: 3 }));
  out.push(...line(x2, y2, x2 - 20 * Math.cos(a + 0.5), y2 - 20 * Math.sin(a + 0.5), { c, sw: 3 }));
  return out;
}
function spiral(cx, cy, r, c, seed) {
  let d = `M${cx} ${cy}`;
  for (let t = 0; t < Math.PI * 4; t += 0.3) d += ` L${cx + Math.cos(t) * (r * t / (Math.PI * 4))} ${cy + Math.sin(t) * (r * t / (Math.PI * 4))}`;
  return path(d, { c, sw: 2.5, seed });
}
function T(x, y, s, o = {}) { return { x, y, s, size: o.size || 32, c: o.c || C.ink, anchor: o.anchor || 'middle', weight: o.weight || 400 }; }

function svg(title, sub, paths, texts, foot) {
  const ps = paths.map(p => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.sw}" fill="${p.fill}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n');
  const ts = texts.map(t => `<text x="${t.x}" y="${t.y}" fill="${t.c}" font-size="${t.size}" text-anchor="${t.anchor}" font-family='${FONT}' font-weight="${t.weight}">${t.s}</text>`).join('\n');
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ch" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="ct" x="-6%" y="-6%" width="112%" height="112%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed="3" result="n"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer></filter>
  </defs>
  <g filter="url(#ch)">${ps}</g>
  <g filter="url(#ct)">${ts}</g>
  <rect width="${W}" height="${H}" filter="url(#gr)" opacity="0.6"/>
  <text x="540" y="150" fill="${C.ink}" font-size="54" text-anchor="middle" font-family='${FONT}' font-weight="600" filter="url(#ct)">${title}</text>
  <text x="540" y="212" fill="${C.muted}" font-size="30" text-anchor="middle" font-family='${FONT}' filter="url(#ct)">${sub}</text>
  ${foot ? `<text x="540" y="1790" fill="${C.yellow}" font-size="34" text-anchor="middle" font-family='${FONT}' filter="url(#ct)">${foot}</text>` : ''}
  </svg>`;
}

const L = {};

// 1 涂鸦树
L.T1 = () => { const p = [], t = [];
  p.push(...rect(430, 340, 220, 90, { c: C.yellow, fill: C.surface, seed: 1 })); t.push(T(540, 398, '拆解', { size: 34, c: C.yellow, weight: 600 }));
  p.push(...line(540, 430, 540, 540, { c: C.green, sw: 3 }), ...line(330, 540, 750, 540, { c: C.green, sw: 3 }));
  [330, 750].forEach((x, i) => { p.push(...line(x, 540, x, 640, { c: C.green, sw: 3 }), ...rect(x - 105, 640, 210, 100, { c: C.green, fill: C.surface, seed: 10 + i })); t.push(T(x, 702, ['A', 'B'][i], { size: 34, c: C.green })); });
  [210, 430, 650, 870].forEach((x, i) => { p.push(...line(x, 740, x, 820, { c: C.green, sw: 3 }), ...rect(x - 85, 820, 170, 85, { c: C.green, fill: C.surface, seed: 20 + i })); t.push(T(x, 872, ['步骤1', '步骤2', '步骤3', '步骤4'][i], { size: 26, c: C.ink })); });
  p.push(...star(900, 380, 26, C.yellow, 30), ...star(150, 420, 18, C.pink, 31), ...squiggle(380, 960, 320, C.yellow, 32));
  return svg('涂鸦 · 树', '更疯的手绘 + 涂鸦装饰', p, t, '每个叶子只负责一件事'); };

// 2 涂鸦循环
L.T2 = () => { const p = [], t = [];
  const cx = 540, cy = 900, r = 280, n = 5;
  const nodes = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; nodes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a }); }
  p.push(...ell(cx, cy, r * 2, r * 2, { c: C.line, seed: 40 }));
  nodes.forEach((nd, i) => { p.push(...rect(nd.x - 85, nd.y - 38, 170, 80, { c: C.green, fill: C.surface, seed: 41 + i })); t.push(T(nd.x, nd.y + 9, ['计划', '执行', '检查', '调整', '复盘'][i], { size: 30, c: C.green })); });
  for (let i = 0; i < n; i++) { const a1 = nodes[i].a, a2 = nodes[(i + 1) % n].a + (i === n - 1 ? Math.PI * 2 : 0), mid = (a1 + a2) / 2; p.push(...zigArrow(cx + Math.cos(mid - 0.2) * r * 1.08, cy + Math.sin(mid - 0.2) * r * 1.08, cx + Math.cos(mid + 0.2) * r * 1.08, cy + Math.sin(mid + 0.2) * r * 1.08, C.yellow, 50 + i)); }
  p.push(...spiral(880, 480, 50, C.pink, 60), ...star(200, 1420, 30, C.yellow, 61));
  return svg('涂鸦 · 循环', '螺旋、星星、歪箭头', p, t, '一轮接一轮，越转越顺'); };

// 3 涂鸦漏斗
L.T3 = () => { const p = [], t = [];
  [{ y: 320, w: 800, label: '全部', n: '300', c: C.line }, { y: 560, w: 600, label: '要处理', n: '80', c: C.green }, { y: 800, w: 400, label: '有价值', n: '20', c: C.yellow }].forEach((r, i) => {
    p.push(...poly([[540 - r.w / 2, r.y], [540 + r.w / 2, r.y], [540 + r.w / 2 * 0.84, r.y + 200], [540 - r.w / 2 * 0.84, r.y + 200]], { c: r.c, fill: C.surface, seed: 70 + i }));
    t.push(T(540, r.y + 88, r.label, { size: 30, c: r.c })); t.push(T(540, r.y + 142, r.n, { size: 36, c: r.c, weight: 600 }));
  });
  p.push(...star(160, 380, 24, C.yellow, 80), ...zigArrow(880, 500, 800, 700, C.pink, 81));
  return svg('涂鸦 · 漏斗', '一层层筛下来', p, t, '消息越多，需要行动的越少'); };

// 4 涂鸦对话
L.T4 = () => { const p = [], t = [];
  p.push(...ell(170, 420, 140, 140, { c: C.yellow, seed: 90 })); t.push(T(170, 435, '用户', { size: 32, c: C.yellow }));
  p.push(...rect(280, 360, 440, 110, { c: C.yellow, fill: C.surface, seed: 91 })); t.push(T(500, 428, '帮我修个 bug', { size: 36, c: C.yellow }));
  p.push(...rect(560, 510, 360, 100, { c: C.green, fill: C.surface, seed: 92 })); t.push(T(740, 575, 'Router：收到', { size: 30, c: C.green }));
  p.push(...rect(260, 760, 560, 220, { c: C.green, fill: C.surface, seed: 93 })); t.push(T(540, 855, 'Router', { size: 60, c: C.green, weight: 600 })); t.push(T(540, 925, '接消息、派活', { size: 34, c: C.muted }));
  p.push(...zigArrow(300, 1000, 300, 1140, C.green, 94), ...zigArrow(540, 1000, 540, 1140, C.green, 95), ...zigArrow(780, 1000, 780, 1140, C.green, 96));
  p.push(...rect(420, 1140, 240, 100, { c: C.green, fill: C.surface, seed: 97 })); t.push(T(540, 1205, 'Worker', { size: 34, c: C.green }));
  p.push(...squiggle(300, 1400, 460, C.yellow, 98), ...star(900, 700, 26, C.pink, 99));
  return svg('涂鸦 · 对话', '气泡 + 歪箭头 + 波浪线', p, t, '后台的 Worker 是异步的'); };

// 5 涂鸦对照
L.T5 = () => { const p = [], t = [];
  [{ c: C.yellow, label: '完整版', sub: '直接给 Worker' }, { c: C.green, label: '全走 Router', sub: '先经过 Router' }, { c: C.red, label: '单会话', sub: '多数不派' }, { c: C.pink, label: '委派提示', sub: '多数会派' }].forEach((r, i) => {
    const y = 300 + i * 300;
    p.push(...rect(70, y, 940, 240, { c: r.c, fill: C.surface, seed: 100 + i, sw: 3 }));
    t.push(T(120, y + 95, r.label, { size: 40, c: r.c, anchor: 'start', weight: 600 }));
    t.push(T(120, y + 165, r.sub, { size: 30, c: C.muted, anchor: 'start' }));
    p.push(...rect(600, y + 70, 140, 80, { c: C.line, seed: 110 + i })); t.push(T(670, y + 122, '消息', { size: 28, c: C.ink }));
    p.push(...zigArrow(750, y + 110, 840, y + 110, r.c, 120 + i));
    p.push(...rect(830, y + 60, 150, 100, { c: r.c, seed: 130 + i })); t.push(T(905, y + 122, i < 2 ? 'Worker' : '会话', { size: 28, c: r.c }));
  });
  p.push(...star(960, 250, 22, C.yellow, 140));
  return svg('涂鸦 · 对照', '四行彩色框 + 歪箭头', p, t, '一个会话加一个能派 subagent 的工具'); };

const samples = [['树', L.T1], ['循环', L.T2], ['漏斗', L.T3], ['对话', L.T4], ['对照', L.T5]];
const cards = samples.map(([n, fn]) => `<div class="card"><div class="t">${n}</div>${fn()}</div>`).join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>涂鸦式</title>
<style>
body{background:#1a1a1a;color:#eee;font-family:system-ui;margin:0;padding:20px}
h1{font-weight:400;font-size:20px}p.sub{color:#888;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;align-items:start}
.card{background:#262725;border:1px solid #3a3a36;border-radius:10px;padding:8px}
.card svg{width:100%;height:auto;display:block;border-radius:6px}
.t{font-size:12px;color:#aaa;margin-bottom:6px}
@media(max-width:1400px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><h1>涂鸦式（doodle）</h1><p class="sub">roughness 2.2 · 粉笔 3.2 · 星星/波浪/螺旋/歪箭头</p><div class="grid">${cards}</div></body></html>`;
fs.mkdirSync('D:/AI数字资产/studio/data/media/doodle', { recursive: true });
fs.writeFileSync('D:/AI数字资产/studio/data/media/doodle/index.html', html);
console.log('written: data/media/doodle/index.html');
