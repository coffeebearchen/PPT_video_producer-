// Authored geometry from scripts/gen-handdrawn-samples.mjs @ 2fe3858.
// SVG serialization replaced by scene data; only data binding/cardinality/safe-area adaptations.
import rough from 'roughjs';
const gen = rough.generator();

const C = {
  bg: '#262725', ink: '#F0EBD4', muted: '#858C80',
  yellow: '#E7C85B', green: '#A8C9B4', red: '#EF8581',
  pink: '#E39BB0', orange: '#DBA36D', line: '#858C80', surface: '#262725'
};
const FONT = '"Microsoft YaHei","PingFang SC","SimHei",sans-serif';
const W = 1080, H = 1920;

let markSerial=0;
function P(d) { const group=markSerial++; return gen.toPaths(d).map(p => ({ group, d: p.d, stroke: p.stroke || C.line, sw: p.strokeWidth || 3, fill: p.fill || 'none' })); }
const DR = 2.2, DB = 1.6;
const rect = (x, y, w, h, o = {}) => P(gen.rectangle(x, y, w, h, { seed: o.seed || 1, roughness: o.r ?? DR, bowing: DB, stroke: o.c || C.line, strokeWidth: o.sw || 3, fill: o.fill, fillStyle: 'solid' }));
const ell = (cx, cy, w, h, o = {}) => P(gen.ellipse(cx, cy, w, h, { seed: o.seed || 1, roughness: o.r ?? DR, stroke: o.c || C.line, strokeWidth: o.sw || 3, fill: o.fill, fillStyle: 'solid' }));
const line = (x1, y1, x2, y2, o = {}) => P(gen.line(x1, y1, x2, y2, { seed: o.seed || 1, roughness: o.r ?? DR, stroke: o.c || C.line, strokeWidth: o.sw || 3 }));
const poly = (pts, o = {}) => P(gen.polygon(pts, { seed: o.seed || 1, roughness: o.r ?? DR, bowing: DB, stroke: o.c || C.line, strokeWidth: o.sw || 3, fill: o.fill, fillStyle: 'solid' }));

function arrow(x1, y1, x2, y2, o = {}) {
  const out = line(x1, y1, x2, y2, o);
  const a = Math.atan2(y2 - y1, x2 - x1), s = o.head || 18;
  out.push(...line(x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45), o));
  out.push(...line(x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45), o));
  return out;
}
function T(x, y, s, o = {}) { return { x, y, s, size: o.size || 32, c: o.c || C.ink, anchor: o.anchor || 'middle', weight: o.weight || 400 }; }

// 涂鸦装饰：星星 / 波浪 / 螺旋
function starPath(x, y, s, c, seed) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.42 : s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return poly(pts, { c, sw: 3, seed }); }
function squigglePath(x, y, len, c, seed) { let d = `M${x} ${y}`; for (let i = 1; i <= 5; i++) d += ` Q${x + (len / 5) * (i - 0.5)} ${y + (i % 2 ? -10 : 10)} ${x + (len / 5) * i} ${y}`; return P(gen.path(d, { seed, roughness: 2.4, stroke: c, strokeWidth: 3 })); }
function decor(seed) {
  const rnd = (i) => ((seed * 9301 + i * 49297) % 233280) / 233280;
  const out = [];
  const cols = [C.yellow, C.pink, C.green];
  for (let i = 0; i < 3; i++) {
    const x = 120 + rnd(i * 2) * 840, y = 280 + rnd(i * 2 + 1) * 1300;
    if (i % 2) out.push(...starPath(x, y, 16 + rnd(i + 7) * 16, cols[i % 3], seed + i));
    else out.push(...squigglePath(x, y, 100 + rnd(i + 3) * 120, cols[i % 3], seed + i));
  }
  return out;
}

// 图标（手绘）
export function icon(name, x, y, size, c) {
  const s = size / 100, o = { c, sw: 4 };
  switch (name) {
    case 'check': return [...line(x - 35 * s, y, x - 8 * s, y + 28 * s, o), ...line(x - 8 * s, y + 28 * s, x + 38 * s, y - 30 * s, o)];
    case 'cross': return [...line(x - 30 * s, y - 30 * s, x + 30 * s, y + 30 * s, o), ...line(x + 30 * s, y - 30 * s, x - 30 * s, y + 30 * s, o)];
    case 'warning': return [...poly([[x, y - 40 * s], [x + 42 * s, y + 34 * s], [x - 42 * s, y + 34 * s]], o), ...line(x, y - 12 * s, x, y + 10 * s, o), ...line(x, y + 24 * s, x, y + 26 * s, o)];
    case 'lock': return [...rect(x - 28 * s, y - 4 * s, 56 * s, 44 * s, { ...o, fill: C.surface }), ...P(gen.arc(x, y - 6 * s, 36 * s, 36 * s, Math.PI, Math.PI * 2, false, { seed: 3, roughness: 1, stroke: c, strokeWidth: 4 }))];
    case 'trash': return [...rect(x - 26 * s, y - 22 * s, 52 * s, 58 * s, o), ...line(x - 36 * s, y - 28 * s, x + 36 * s, y - 28 * s, o), ...line(x - 12 * s, y - 36 * s, x + 12 * s, y - 36 * s, o), ...line(x - 8 * s, y - 8 * s, x - 8 * s, y + 24 * s, o), ...line(x + 8 * s, y - 8 * s, x + 8 * s, y + 24 * s, o)];
    case 'timer': return [...ell(x, y, 64 * s, 64 * s, o), ...line(x, y, x, y - 22 * s, o), ...line(x, y, x + 18 * s, y + 8 * s, o), ...line(x - 10 * s, y - 40 * s, x + 10 * s, y - 40 * s, o)];
    case 'person': return [...ell(x, y - 18 * s, 34 * s, 34 * s, o), ...P(gen.arc(x, y + 30 * s, 56 * s, 48 * s, Math.PI, Math.PI * 2, false, { seed: 4, roughness: 1, stroke: c, strokeWidth: 4 }))];
    case 'money': return [...ell(x, y, 64 * s, 64 * s, o), ...line(x - 16 * s, y - 16 * s, x, y, o), ...line(x + 16 * s, y - 16 * s, x, y, o), ...line(x, y, x, y + 20 * s, o)];
    case 'gear': return [...ell(x, y, 52 * s, 52 * s, o), ...line(x, y - 40 * s, x, y - 24 * s, o), ...line(x, y + 24 * s, x, y + 40 * s, o), ...line(x - 40 * s, y, x - 24 * s, y, o), ...line(x + 24 * s, y, x + 40 * s, y, o)];
    case 'star': { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 18 * s : 40 * s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return poly(pts, o); }
    case 'retry': return [...P(gen.arc(x, y, 64 * s, 64 * s, -Math.PI * 0.2, Math.PI * 1.5, false, { seed: 5, roughness: 1, stroke: c, strokeWidth: 4 })), ...line(x + 20 * s, y - 34 * s, x + 34 * s, y - 18 * s, o), ...line(x + 20 * s, y - 34 * s, x + 4 * s, y - 30 * s, o)];
    case 'bidirectional': return [...line(x - 34 * s, y, x + 34 * s, y, o), ...line(x - 34 * s, y, x - 18 * s, y - 14 * s, o), ...line(x - 34 * s, y, x - 18 * s, y + 14 * s, o), ...line(x + 34 * s, y, x + 18 * s, y - 14 * s, o), ...line(x + 34 * s, y, x + 18 * s, y + 14 * s, o)];
    default: return [];
  }
}

function svg(title, sub, paths, texts, foot) {
  let seed=0;for(const ch of title)seed=(seed*31+ch.charCodeAt(0))%997;
  return {title,sub,paths:[...paths,...decor(seed)],texts,foot};
}

// ===== 布局 =====
export const rawLayouts = {};
const L = rawLayouts;

L.A01 = (data = {}) => { const p = [], t = [];
  t.push(T(540, 330, '总任务', { size: 34, c: C.yellow, weight: 600 }));
  p.push(...rect(430, 380, 220, 90, { c: C.yellow, fill: C.surface, seed: 1 }));
  t.push(T(540, 438, '拆解', { size: 34, c: C.yellow }));
  p.push(...line(540, 470, 540, 560, { c: C.green }), ...line(330, 560, 750, 560, { c: C.green }));
  p.push(...line(330, 560, 330, 640, { c: C.green }), ...line(750, 560, 750, 640, { c: C.green }));
  [330, 750].forEach((x, i) => { p.push(...rect(x - 110, 640, 220, 100, { c: C.green, fill: C.surface, seed: 10 + i })); t.push(T(x, 702, ['子任务 A', '子任务 B'][i], { size: 32, c: C.green })); });
  [220, 440, 640, 860].forEach((x, i) => { p.push(...line(x, 740, x, 820, { c: C.green }), ...rect(x - 90, 820, 180, 80, { c: C.green, fill: C.surface, seed: 20 + i })); t.push(T(x, 870, ['步骤1', '步骤2', '步骤3', '步骤4'][i], { size: 28, c: C.ink })); });
  return svg('A01 树形树', '目录、组织、任务拆解，多级父子关系', p, t, '每个叶子只负责一件事'); };

L.A02 = (data = {}) => { const p = [], t = [];
  p.push(...rect(390, 300, 300, 90, { c: C.yellow, fill: C.surface, seed: 2 }));
  t.push(T(540, 358, '先猜一条路', { size: 32, c: C.yellow }));
  p.push(...line(540, 390, 540, 520, { c: C.line }));
  p.push(...poly([[540, 520], [620, 580], [540, 640], [460, 580]], { c: C.yellow, fill: C.surface, seed: 3 }));
  p.push(...line(540, 640, 380, 760, { c: C.green }), ...line(540, 640, 700, 760, { c: C.red }));
  p.push(...rect(270, 760, 220, 110, { c: C.green, fill: C.surface, seed: 4 }));
  t.push(T(380, 812, '猜对 ✓', { size: 34, c: C.green }), T(380, 850, '直接用', { size: 28, c: C.muted }));
  p.push(...rect(590, 760, 220, 110, { c: C.red, fill: C.surface, seed: 5 }));
  t.push(T(700, 812, '猜错 ✗', { size: 34, c: C.red }), T(700, 850, '扔掉', { size: 28, c: C.muted }));
  return svg('A02 决策分叉', '条件判断、猜对/猜错、一条路径产生多个结果', p, t, '猜错就丢弃，随时可直接用'); };

L.A03 = (data = {}) => { const p = [], t = [];
  const cx = 540, cy = 900, r = 300;
  p.push(...rect(cx - 90, cy - 45, 180, 90, { c: C.yellow, fill: C.surface, seed: 6 }));
  t.push(T(cx, cy + 10, 'Router', { size: 38, c: C.yellow, weight: 600 }));
  const sats = [{ a: -Math.PI / 2, label: '接消息', c: C.green }, { a: -Math.PI / 2 + 1.25, label: '记录日志', c: C.pink }, { a: -Math.PI / 2 + 2.5, label: '分派任务', c: C.green }, { a: -Math.PI / 2 + 3.75, label: '检查结果', c: C.orange }, { a: -Math.PI / 2 + 5.0, label: '总结', c: C.green }];
  sats.forEach((s, i) => {
    const x = cx + Math.cos(s.a) * r, y = cy + Math.sin(s.a) * r;
    p.push(...line(cx, cy, x, y, { c: C.line }));
    p.push(...rect(x - 85, y - 38, 170, 76, { c: s.c, fill: C.surface, seed: 30 + i }));
    t.push(T(x, y + 8, s.label, { size: 28, c: s.c }));
  });
  return svg('A03 中心辐射', '一个核心连接多个能力、模块或参与者', p, t, '统一入口，明确每项能力'); };

L.A04 = (data = {}) => { const p = [], t = [];
  const layers = [{ c: C.yellow, label: '交互入口', items: ['用户消息', '状态面板', '结果输出'] }, { c: C.green, label: '任务编排', items: ['Router', '任务队列', '结果汇总'] }, { c: C.green, label: '执行能力', items: ['代码修复', '测试验证', '资料检索'] }, { c: C.orange, label: '运行保障', items: ['权限', '日志', '资源限制'] }];
  layers.forEach((l, i) => {
    const y = 330 + i * 340;
    p.push(...rect(140, y, 800, 290, { c: l.c, fill: C.surface, seed: 40 + i, sw: 3 }));
    t.push(T(180, y + 62, l.label, { size: 32, c: l.c, anchor: 'start', weight: 600 }));
    l.items.forEach((it, j) => {
      const x = 200 + j * 250;
      p.push(...rect(x, y + 110, 220, 80, { c: C.line, seed: 50 + i * 3 + j }));
      t.push(T(x + 110, y + 160, it, { size: 26, c: C.ink }));
    });
  });
  return svg('A04 分层架构', '应用层、服务层、基础设施等层间职责', p, t, '上层调用能力，下层提供保障'); };

L.A05 = (data = {}) => { const p = [], t = [];
  p.push(...rect(120, 300, 840, 900, { c: C.line, seed: 60 })); t.push(T(160, 350, '工作空间', { size: 28, c: C.muted, anchor: 'start' }));
  p.push(...rect(180, 400, 720, 720, { c: C.line, seed: 61 })); t.push(T(220, 450, '项目', { size: 28, c: C.muted, anchor: 'start' }));
  p.push(...rect(240, 500, 600, 540, { c: C.yellow, fill: C.surface, seed: 62 })); t.push(T(280, 550, '任务', { size: 28, c: C.yellow, anchor: 'start' }));
  p.push(...rect(300, 600, 480, 380, { c: C.green, fill: C.surface, seed: 63 })); t.push(T(340, 650, '执行', { size: 28, c: C.green, anchor: 'start' }));
  return svg('A05 嵌套框', '系统边界、容器归属、模块包含关系', p, t, '权限边界逐层收敛'); };

L.A06 = (data = {}) => { const p = [], t = [];
  [{ label: '输入', y: 340, c: C.green }, { label: '动作', y: 480, c: C.green }, { label: '结果', y: 620, c: C.green }].forEach((r, i) => { p.push(...rect(300, r.y, 480, 90, { c: r.c, fill: C.surface, seed: 70 + i })); t.push(T(540, r.y + 56, r.label, { size: 32, c: C.ink })); });
  p.push(...line(250, 340, 210, 340, { c: C.yellow }), ...line(210, 340, 210, 710, { c: C.yellow }), ...line(210, 710, 250, 710, { c: C.yellow }));
  t.push(T(160, 535, '前置', { size: 28, c: C.yellow }));
  [{ label: '验证', y: 780 }, { label: '修复', y: 900 }, { label: '验证', y: 1020 }].forEach((r, i) => { p.push(...rect(300, r.y, 480, 90, { c: C.pink, fill: C.surface, seed: 80 + i })); t.push(T(540, r.y + 56, r.label, { size: 32, c: C.ink })); });
  p.push(...line(250, 780, 210, 780, { c: C.pink }), ...line(210, 780, 210, 1110, { c: C.pink }), ...line(210, 1110, 250, 1110, { c: C.pink }));
  t.push(T(160, 955, '循环', { size: 28, c: C.pink }));
  return svg('A06 括号分组', '多个并列项目归属于同一概念', p, t, '把输入、动作和结果分清'); };

L.A07 = (data = {}) => { const p = [], t = [];
  const rows = [{ y: 340, w: 320, label: '交付', c: C.yellow }, { y: 600, w: 520, label: '验证', c: C.green }, { y: 860, w: 720, label: '执行', c: C.green }, { y: 1120, w: 900, label: '基础', c: C.orange }];
  rows.forEach((r, i) => { p.push(...poly([[540 - r.w / 2, r.y], [540 + r.w / 2, r.y], [540 + r.w / 2 * 0.9, r.y + 240], [540 - r.w / 2 * 0.9, r.y + 240]], { c: r.c, fill: C.surface, seed: 90 + i })); t.push(T(540, r.y + 140, r.label, { size: 34, c: r.c, weight: 600 })); });
  return svg('A07 金字塔', '能力层级、优先级、基础与上层依赖', p, t, '可靠交付，先打牢底层'); };

L.A08 = (data = {}) => { const p = [], t = [];
  const rows = [{ y: 320, w: 820, label: '全部消息', n: '300 条', c: C.line }, { y: 540, w: 640, label: '需要处理', n: '80 条', c: C.green }, { y: 760, w: 460, label: '真正有价值', n: '20 条', c: C.yellow }];
  rows.forEach((r, i) => { p.push(...poly([[540 - r.w / 2, r.y], [540 + r.w / 2, r.y], [540 + r.w / 2 * 0.85, r.y + 190], [540 - r.w / 2 * 0.85, r.y + 190]], { c: r.c, fill: C.surface, seed: 100 + i })); t.push(T(540, r.y + 85, r.label, { size: 30, c: r.c })); t.push(T(540, r.y + 135, r.n, { size: 34, c: r.c, weight: 600 })); });
  return svg('A08 漏斗', '筛选、转化、淘汰，数量逐级减少', p, t, '消息越多，需要行动的越少'); };

L.A09 = (data = {}) => { const p = [], t = [];
  [{ r: 380, c: C.line, label: '外围', lx: 540, ly: 400 }, { r: 260, c: C.green, label: '影响范围', lx: 540, ly: 540 }, { r: 150, c: C.yellow, label: '核心', lx: 540, ly: 660 }].forEach((x, i) => {
    p.push(...ell(540, 900, x.r * 2, x.r * 2, { c: x.c, seed: 110 + i }));
    t.push(T(x.lx, x.ly, x.label, { size: 28, c: x.c }));
  });
  return svg('A09 同心圆', '核心与外围、影响范围、权限边界', p, t, '一个核心，层层向外'); };

L.B01 = (data = {}) => { const p = [], t = [];
  ['接收消息', '判断意图', '分派任务', '汇总结果'].forEach((s, i) => {
    const y = 330 + i * 300;
    p.push(...rect(340, y, 400, 110, { c: i === 0 ? C.yellow : C.green, fill: C.surface, seed: 120 + i }));
    t.push(T(540, y + 62, s, { size: 32, c: i === 0 ? C.yellow : C.ink }));
    if (i < 3) p.push(...arrow(540, y + 110, 540, y + 300, { c: C.green }));
  });
  return svg('B01 纵向流程', '从输入到输出逐步讲解，适合竖屏', p, t, '一步接一步，不跳步'); };

L.B02 = (data = {}) => { const p = [], t = [];
  const xs = [120, 420, 720];
  ['输入', '处理', '输出'].forEach((s, i) => {
    p.push(...rect(xs[i], 760, 240, 120, { c: i === 1 ? C.yellow : C.green, fill: C.surface, seed: 130 + i }));
    t.push(T(xs[i] + 120, 826, s, { size: 32, c: i === 1 ? C.yellow : C.ink }));
    if (i < 2) p.push(...arrow(xs[i] + 240, 820, xs[i + 1], 820, { c: C.green }));
  });
  p.push(...line(840, 820, 940, 730, { c: C.orange }), ...line(840, 820, 940, 910, { c: C.orange }));
  t.push(T(980, 700, '分支', { size: 26, c: C.orange }), T(980, 940, '分支', { size: 26, c: C.orange }));
  return svg('B02 横向流程', '同屏解释短链路、管线、处理阶段', p, t, '一眼看清上下游'); };

L.B03 = (data = {}) => { const p = [], t = [];
  const cx = 540, cy = 820, r = 260, n = 4;
  const nodes = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; nodes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a }); }
  p.push(...ell(cx, cy, r * 2, r * 2, { c: C.line, seed: 140 }));
  nodes.forEach((nd, i) => { p.push(...rect(nd.x - 85, nd.y - 38, 170, 76, { c: C.green, fill: C.surface, seed: 141 + i })); t.push(T(nd.x, nd.y + 8, ['计划', '执行', '检查', '调整'][i], { size: 30, c: C.green })); });
  for (let i = 0; i < n; i++) { const a1 = nodes[i].a, a2 = nodes[(i + 1) % n].a + (i === n - 1 ? Math.PI * 2 : 0), mid = (a1 + a2) / 2; p.push(...arrow(cx + Math.cos(mid - 0.15) * r * 1.05, cy + Math.sin(mid - 0.15) * r * 1.05, cx + Math.cos(mid + 0.15) * r * 1.05, cy + Math.sin(mid + 0.15) * r * 1.05, { c: C.yellow, head: 14 })); }
  return svg('B03 循环', '反馈、重试、迭代、持续优化', p, t, '一轮接一轮，越转越顺'); };

L.B04 = (data = {}) => { const p = [], t = [];
  ['原因', '影响', '结果'].forEach((s, i) => {
    const y = 380 + i * 380;
    p.push(...rect(320, y, 440, 120, { c: i === 0 ? C.yellow : i === 2 ? C.red : C.green, fill: C.surface, seed: 150 + i }));
    t.push(T(540, y + 68, s, { size: 32, c: i === 0 ? C.yellow : i === 2 ? C.red : C.ink }));
    if (i < 2) { p.push(...arrow(540, y + 120, 540, y + 380, { c: C.line })); t.push(T(620, y + 250, i === 0 ? '导致' : '最终', { size: 26, c: C.muted })); }
  });
  return svg('B04 因果链', '原因如何传递并产生结果', p, t, '原因一路传下来，结果才清楚'); };

L.B05 = (data = {}) => { const p = [], t = [];
  (data.lanes ?? [{label:'用户',steps:['提需求','补信息','收结果']},{label:'Router',steps:['接消息','判断意图','派活']},{label:'Worker',steps:['复现','修复','汇报']}]).forEach((lane,i)=>{
    const y=340+i*350,c=i===1?C.yellow:C.green;
    p.push(...rect(120,y,840,280,{c:C.line,seed:160+i}));t.push(T(170,y+45,lane.label,{size:30,c,anchor:'start'}));
    lane.steps.forEach((label,j)=>{const x=180+j*265;p.push(...rect(x,y+100,220,90,{c,fill:C.surface,seed:170+i*3+j}));t.push(T(x+110,y+155,label,{size:28,c:C.ink}));});
    if(i<2)p.push(...arrow(820,y+280,820,y+350,{c:C.green}));
  });
  return svg('B05 泳道', '多角色、多系统交接，强调谁在何时做什么', p, t, '分清前后台，谁在干活'); };

L.B06 = (data = {}) => { const p = [], t = [];
  const cells = (data.states ?? [[true,false],[true,true],[false,true]]).map(row=>row.map(v=>v?C.green:C.red));
  const rows = ['方案甲', '方案乙', '方案丙'], cols = ['能修', '能测'];
  t.push(T(240, 330, '', {})); t.push(T(240, 340, '', {}));
  cols.forEach((c, j) => t.push(T(430 + j * 260, 340, c, { size: 28, c: C.muted })));
  rows.forEach((r, i) => {
    const y = 400 + i * 260;
    t.push(T(240, y + 140, r, { size: 30, c: C.ink }));
    cols.forEach((c, j) => { const x = 330 + j * 260; p.push(...rect(x, y, 220, 240, { c: C.line, seed: 180 + i * 2 + j })); p.push(...icon(cells[i][j] === C.red ? 'cross' : 'check', x + 110, y + 120, 90, cells[i][j])); });
  });
  return svg('B06 关系矩阵', '对象之间是否依赖、兼容、负责', p, t, '一行一行对照，谁行谁不行'); };

L.B07 = (data = {}) => { const p = [], t = [];
  [{ x: 80, label: '改造前', c: C.pink }, { x: 560, label: '改造后', c: C.green }].forEach((panel, i) => {
    p.push(...rect(panel.x, 320, 440, 900, { c: panel.c, seed: 190 + i }));
    t.push(T(panel.x + 220, 380, panel.label, { size: 30, c: panel.c, weight: 600 }));
    [0, 1, 2].forEach(j => { p.push(...rect(panel.x + 60, 440 + j * 240, 320, 90, { c: C.line, fill: C.surface, seed: 200 + i * 3 + j })); t.push(T(panel.x + 220, 495 + j * 240, i === 0 ? ['消息', 'Router', 'Worker'][j] : ['消息', 'Worker', 'Worker'][j], { size: 28, c: C.ink })); if (j < 2) p.push(...arrow(panel.x + 220, 530 + j * 240, panel.x + 220, 680 + j * 240, { c: C.line, head: 14 })); });
  });
  p.push(...line(500, 480, 560, 480, { c: C.yellow, sw: 5 }), ...line(500, 520, 560, 520, { c: C.yellow, sw: 5 }));
  t.push(T(530, 460, '改', { size: 26, c: C.yellow }));
  return svg('B07 机制前后对比', '改造前后，路由、依赖或处理路径发生变化', p, t, '少绕一步，结果更快'); };

L.B08 = (data = {}) => { const p = [], t = [];
  const cols = ['方案', '耗时', '通过'], rows = (data.rows ?? [{label:'甲',duration:'2 天',passed:true},{label:'乙',duration:'1 天',passed:true},{label:'丙',duration:'3 天',passed:false}]).map(r=>[r.label,r.duration,r.passed?'✓':'✗']);
  const x0 = 120, y0 = 380, cw = 280, rh = 110;
  cols.forEach((c, j) => t.push(T(x0 + cw / 2 + j * cw, y0 - 20, c, { size: 28, c: C.muted })));
  rows.forEach((r, i) => { t.push(T(x0 + cw / 2, y0 + rh / 2 + i * rh + 10, r[0], { size: 30, c: C.ink })); t.push(T(x0 + cw + cw / 2, y0 + rh / 2 + i * rh + 10, r[1], { size: 30, c: C.ink })); p.push(...icon(r[2] === '✓' ? 'check' : 'cross', x0 + cw * 2 + cw / 2, y0 + rh / 2 + i * rh, 80, r[2] === '✓' ? C.green : C.red)); });
  for (let i = 0; i <= rows.length; i++) p.push(...line(x0, y0 + i * rh, x0 + cw * 3, y0 + i * rh, { c: C.line, sw: 2 }));
  for (let j = 0; j <= 3; j++) p.push(...line(x0 + j * cw, y0, x0 + j * cw, y0 + rh * rows.length, { c: C.line, sw: 2 }));
  return svg('B08 手绘表格', '对齐比较多个对象的多个属性', p, t, '几行几列，一比就清楚'); };

L.B09 = (data = {}) => { const p = [], t = [];
  p.push(...line(140, 900, 940, 900, { c: C.line, sw: 4 }));
  [{ x: 240, label: '2023', sub: '起步' }, { x: 540, label: '2024', sub: '爆发' }, { x: 840, label: '2025', sub: '成熟' }].forEach((pt, i) => { p.push(...ell(pt.x, 900, 46, 46, { c: C.yellow, seed: 210 + i, fill: C.yellow })); t.push(T(pt.x, 830, pt.label, { size: 34, c: C.yellow, weight: 600 })); t.push(T(pt.x, 990, pt.sub, { size: 28, c: C.muted })); });
  return svg('B09 时间线', '事件先后，或任务起止、重叠与依赖', p, t, '三个关键节点'); };

// ===== C 数据类 =====
L.C01 = (data = {}) => { const p = [], t = [];
  const ax = 160, ay = 1300;
  p.push(...line(ax, 1300, ax, 340, { c: C.line, sw: 3 }), ...line(ax, ay, 940, ay, { c: C.line, sw: 3 }));
  [{ v: 0.55, c: C.green, l: '甲' }, { v: 0.78, c: C.yellow, l: '乙' }, { v: 0.4, c: C.orange, l: '丙' }, { v: 0.92, c: C.red, l: '丁' }].forEach((x, i) => { const h = (data.values?.[i] ?? x.v) * 820, bx = 240 + i * 190; p.push(...rect(bx, ay - h, 110, h, { c: x.c, fill: x.c, seed: 400 + i })); t.push(T(bx + 55, ay - h - 18, String(Math.round((data.values?.[i] ?? x.v) * 100)), { size: 30, c: x.c, weight: 600 })); t.push(T(bx + 55, ay + 44, x.l, { size: 28, c: C.muted })); });
  return svg('C01 柱状图', '比较数量、耗时、成本', p, t, '一眼看高低'); };

L.C02 = (data = {}) => { const p = [], t = [];
  p.push(...line(160, 1300, 160, 340, { c: C.line, sw: 3 }), ...line(160, 1300, 940, 1300, { c: C.line, sw: 3 }));
  const pts = (data.values ?? [0.15,0.30,0.25,0.50,0.60,0.74,0.82]).map((v,i,vs)=>[240+i*680/(vs.length-1),1300-v*1000]);
  for (let i = 1; i < pts.length; i++) p.push(...line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { c: C.green, sw: 4 }));
  pts.forEach(([x, y], i) => { p.push(...ell(x, y, 22, 22, { c: i === pts.length - 1 ? C.yellow : C.green, fill: i === pts.length - 1 ? C.yellow : C.green, seed: 410 + i })); });
  t.push(T(560, 1560, '次数 →', { size: 28, c: C.muted }), T(260, 1500, '分数 ↑', { size: 28, c: C.muted, anchor: 'start' }));
  return svg('C02 折线图', '随时间或算力变化的趋势', p, t, '分数一路往上'); };

L.C03 = (data = {}) => { const p = [], t = [];
  p.push(...line(160, 1300, 160, 340, { c: C.line, sw: 3 }), ...line(160, 1300, 940, 1300, { c: C.line, sw: 3 }));
  const groups = [{ c: C.green, pts: [[300, 1000], [360, 900], [420, 950], [330, 1040], [390, 860]] }, { c: C.pink, pts: [[680, 600], [740, 560], [700, 660], [780, 620]] }, { c: C.yellow, pts: [[520, 760], [560, 800], [530, 730]] }];
  groups.forEach((g, gi) => (data.groups?.[gi]?.points ?? g.pts).forEach(([x, y], i) => p.push(...ell(x, y, 34, 34, { c: g.c, fill: g.c, seed: 420 + gi * 10 + i }))));
  return svg('C03 散点图', '两个数值变量的关系、分布和离群点', p, t, '不同组聚在不同区域'); };

L.C04 = (data = {}) => { const p = [], t = [];
  const cols = 10, rows = 6, x0 = 180, y0 = 420, cw = 76, ch = 76;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = data.values?.[r]?.[c] ?? (Math.sin((r + 1) * 1.7 + (c + 1) * 0.9) + 1) / 2;
    const col = v > 0.66 ? C.red : v > 0.33 ? C.yellow : C.green;
    p.push(...rect(x0 + c * cw, y0 + r * ch, cw - 4, ch - 4, { c: col, fill: col, seed: 440 + r * 10 + c, r: 0.7 }));
  }
  t.push(T(560, 1560, '低 → 高', { size: 28, c: C.muted }));
  return svg('C04 热力图', '数值在两个维度上的强弱分布', p, t, '颜色越暖，数值越高'); };

L.C05 = (data = {}) => { const p = [], t = [];
  const cx = 540, cy = 980, r = 300;
  p.push(...P(gen.arc(cx, cy, r * 2, r * 2, Math.PI, Math.PI * 1.5, false, { seed: 450, roughness: 1.05, stroke: C.green, strokeWidth: 16 })));
  p.push(...P(gen.arc(cx, cy, r * 2, r * 2, Math.PI * 1.5, Math.PI * 1.75, false, { seed: 451, roughness: 1.05, stroke: C.yellow, strokeWidth: 16 })));
  p.push(...line(cx, cy, cx + Math.cos(Math.PI+(data.value ?? 72)/100*Math.PI) * r * 0.85, cy + Math.sin(Math.PI+(data.value ?? 72)/100*Math.PI) * r * 0.85, { c: C.ink, sw: 5 }));
  p.push(...ell(cx, cy, 40, 40, { c: C.ink, fill: C.ink, seed: 452 }));
  t.push(T(cx, cy - 120, String(data.value ?? 72), { size: 80, c: C.yellow, weight: 600 }));
  t.push(T(cx, cy + 120, '目标 '+(data.target ?? 80), { size: 30, c: C.muted }));
  return svg('C05 仪表图', '一个指标相对于目标或阈值的位置', p, t, '离目标还差一点'); };

L.C06 = (data = {}) => { const p = [], t = [];
  const cx = 540, cy = 900, R = 300, n = 5;
  const axes = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; axes.push(a); }
  axes.forEach((a, i) => { p.push(...line(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, { c: C.line, sw: 2 })); t.push(T(cx + Math.cos(a) * (R + 40), cy + Math.sin(a) * (R + 40), ['速度', '质量', '成本', '稳定', '易用'][i], { size: 26, c: C.muted })); });
  [0.5, 0.75].forEach((rr, gi) => { const pts = axes.map((a, i) => [cx + Math.cos(a) * R * (data.series?.[gi]?.[i] ?? (rr + (gi === 0 ? 0.05 : -0.05) * ((i % 2) ? 1 : -1))), cy + Math.sin(a) * R * (data.series?.[gi]?.[i] ?? (rr + (gi === 0 ? 0.05 : -0.05) * ((i % 2) ? 1 : -1)))]); p.push(...poly(pts, { c: gi === 0 ? C.green : C.pink, sw: 3, fill: gi === 0 ? `${C.green}22` : 'none', seed: 460 + gi })); });
  return svg('C06 雷达图', '同量纲归一化后比较多维能力', p, t, '主对象 vs 对照'); };

L.C07 = (data = {}) => { const p = [], t = [];
  const cx = 540, cy = 900, R = 300, w = 120;
  [{ f: 0.5, c: C.green, l: '正常' }, { f: 0.3, c: C.yellow, l: '重点' }, { f: 0.2, c: C.pink, l: '对照' }].reduce((acc, s, i) => { const start = acc, end = acc + (data.segments?.[i]?.value ?? s.f) * Math.PI * 2 - 0.06; p.push(...P(gen.arc(cx, cy, R * 2, R * 2, start, end, false, { seed: 470 + i, roughness: 1.05, stroke: s.c, strokeWidth: w }))); t.push(T(cx + Math.cos((start + end) / 2) * (R + 60), cy + Math.sin((start + end) / 2) * (R + 60), s.l, { size: 28, c: s.c })); return end + 0.06; }, -Math.PI / 2);
  t.push(T(cx, cy + 12, '占比', { size: 34, c: C.muted }));
  return svg('C07 环形图', '少量类别的整体占比', p, t, '三块拼起来'); };

L.C08 = (data = {}) => { const p = [], t = [];
  const total=data.total ?? 300, active=data.activeIndices ?? Array.from({length:20},(_,i)=>i*13),cols=20,rows=Math.ceil(total/cols),sx=160,sy=400,gap=40;
  for(let i=0;i<total;i++){const lit=active.includes(i);p.push(...ell(sx+(i%cols)*gap,sy+Math.floor(i/cols)*gap,24,24,{c:lit?C.yellow:C.line,sw:2,seed:480+i,fill:lit?C.yellow:C.bg}).map(p=>({...p,cell:i,lit})));}
  t.push(T(540,1220,`${total} 条消息 · ${active.length} 条要干活`,{size:40,c:C.ink}));
  return svg('C08 点阵网格', '离散比例：多少里有多少有效', p, t, '其余是闲聊、跟进、叫停'); };

L.C09 = (data = {}) => { const p = [], t = [];
  ['甲', '乙', '丙'].forEach((l, i) => {
    const y = 500 + i * 340, x = 180, w = 500;
    p.push(...rect(120, y - 80, 840, 220, { c: C.line, seed: 500 + i }));
    t.push(T(200, y - 20, l, { size: 30, c: C.ink, anchor: 'start' }));
    const vals = data.values?.[i] ?? [0.3, 0.45, 0.4, 0.6, 0.55, 0.8, 0.75];
    for (let k = 1; k < vals.length; k++) p.push(...line(x + (k - 1) * 70, y + 90 - vals[k - 1] * 140, x + k * 70, y + 90 - vals[k] * 140, { c: i === 2 ? C.yellow : C.green, sw: 3 }));
  });
  return svg('C09 迷你趋势', '在表格、角色卡旁补充短期走势', p, t, '小趋势放进卡片里'); };

L.C10 = (data = {}) => { const p = [], t = [];
  p.push(...line(160, 1300, 160, 340, { c: C.line, sw: 3 }), ...line(160, 1300, 940, 1300, { c: C.line, sw: 3 }));
  const pts = (data.values ?? [.2,.4,.35,.6,.78]).map((v,i)=>[240+i*165,1300-v*1000]);
  const area = 'M240 1300 '+pts.map(([x,y])=>`L${x} ${y}`).join(' ')+' L900 1300 Z';
  p.push(...P(gen.path(area, { seed: 510, roughness: 1.05, stroke: 'none', strokeWidth: 0, fill: `${C.green}33`, fillStyle: 'solid' })));
  for (let i = 1; i < pts.length; i++) p.push(...line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { c: C.green, sw: 4 }));
  return svg('C10 面积图', '展示数量随时间累计或组成变化', p, t, '整体趋势一眼看到'); };

// ===== D 示意类 =====
L.D01 = (data = {}) => { const p = [], t = [];
  p.push(...rect(70, 260, 940, 760, { c: C.line, seed: 520 }));
  [{ x: 300, y: 450, c: C.green }, { x: 780, y: 450, c: C.pink }, { x: 200, y: 760, c: C.orange }, { x: 540, y: 760, c: C.green }, { x: 860, y: 760, c: C.yellow }].forEach((c, i) => {
    p.push(...ell(c.x, c.y, 300, 200, { c: c.c, seed: 530 + i, sw: 3 }));
    for (let k = 0; k < (data.counts?.[i] ?? 8); k++) { const a = (k / (data.counts?.[i] ?? 8)) * Math.PI * 2, r = 20 + (k % 3) * 18; p.push(...ell(c.x + Math.cos(a) * r * 2.2, c.y + Math.sin(a) * r, 20, 20, { c: c.c, sw: 2, seed: 540 + i * 10 + k, fill: c.c })); }
  });
  t.push(T(540, 1200, 'idea basin', { size: 56, c: C.yellow, weight: 600 }), T(540, 1270, '想法盆地', { size: 36, c: C.muted }));
  return svg('D01 点群 / 聚类', '不同方案集中在不同区域', p, t, '每次运行的方案都挤在自己的一小块区域里'); };

L.D02 = (data = {}) => { const p = [], t = [];
  p.push(...ell(170, 400, 140, 140, { c: C.yellow, seed: 560 })); t.push(T(170, 415, '用户', { size: 32, c: C.yellow }));
  p.push(...rect(280, 340, 440, 110, { c: C.yellow, fill: C.surface, seed: 561 })); t.push(T(500, 408, '帮我修个 bug', { size: 36, c: C.yellow }));
  p.push(...rect(560, 490, 360, 100, { c: C.green, fill: C.surface, seed: 562 })); t.push(T(740, 555, 'Router：收到', { size: 30, c: C.green }));
  p.push(...rect(260, 740, 560, 220, { c: C.green, fill: C.surface, seed: 563 })); t.push(T(540, 835, 'Router', { size: 60, c: C.green, weight: 600 }), T(540, 905, '接消息、派活', { size: 34, c: C.muted }));
  [260, 540, 820].forEach((x, i) => p.push(...arrow(x, 960, x, 1120, { c: C.green })));
  p.push(...rect(420, 1120, 240, 100, { c: C.green, fill: C.surface, seed: 564 })); t.push(T(540, 1185, 'Worker', { size: 34, c: C.green }));
  t.push(T(540, 1500, '后台的 Worker 是异步的', { size: 40, c: C.yellow }));
  return svg('D02 对话气泡', '用户、Router、Agent 等交替发言', p, t, '群里的消息，Router 接住'); };

L.D03 = (data = {}) => { const p = [], t = [];
  [{ x: 70, l: '修复前', c: C.pink }, { x: 560, l: '修复后', c: C.green }].forEach((pan, i) => { p.push(...rect(pan.x, 300, 450, 800, { c: pan.c, seed: 570 + i })); t.push(T(pan.x + 225, 360, pan.l, { size: 30, c: pan.c, weight: 600 })); p.push(...rect(pan.x + 60, 440, 330, 200, { c: C.line, fill: C.surface, seed: 580 + i })); p.push(...icon((data.passed?.[i] ?? (i===1)) ? 'check' : 'cross', pan.x + 225, 540, 90, (data.passed?.[i] ?? (i===1)) ? C.green : C.red)); });
  p.push(...arrow(520, 700, 560, 700, { c: C.yellow }));
  return svg('D03 状态前后对比', '修复前后、界面变化、同一对象状态变化', p, t, '修好了，就差这一步'); };

L.D04 = (data = {}) => { const p = [], t = [];
  p.push(...rect(60, 300, 460, 900, { c: C.green, seed: 590 })); t.push(T(290, 370, '收益', { size: 32, c: C.green, weight: 600 }));
  ['更快', '更稳', '省人'].forEach((s, i) => { t.push(T(140, 480 + i * 150, '✓ ' + s, { size: 32, c: C.green, anchor: 'start' })); });
  p.push(...rect(560, 300, 460, 900, { c: C.red, seed: 591 })); t.push(T(790, 370, '代价', { size: 32, c: C.red, weight: 600 }));
  ['要学', '有风险', '成本'].forEach((s, i) => { t.push(T(640, 480 + i * 150, '✗ ' + s, { size: 32, c: C.red, anchor: 'start' })); });
  t.push(T(540, 1420, '权衡之后：先小步试', { size: 40, c: C.yellow }));
  return svg('D04 利弊对照', '方案收益与代价', p, t, '算清楚再动手'); };

L.D05 = (data = {}) => { const p = [], t = [];
  ['接口通了', '数据对了', '样式稳了', '性能达标'].forEach((s, i) => {
    const y = 360 + i * 260;
    p.push(...rect(260, y, 560, 150, { c: C.line, fill: C.surface, seed: 600 + i }));
    p.push(...icon((data.passed?.[i] ?? i<3) ? 'check' : 'cross', 320, y + 75, 70, (data.passed?.[i] ?? i<3) ? C.green : C.red));
    t.push(T(560, y + 92, s, { size: 32, c: C.ink }));
  });
  return svg('D05 清单 / 检查项', '验收、排查、完成情况', p, t, '一项一项过'); };

L.D06 = (data = {}) => { const p = [], t = [];
  [{ i: 'gear', l: '准备环境', c: C.green }, { i: 'person', l: '执行任务', c: C.yellow }, { i: 'check', l: '验收结果', c: C.green }].forEach((s, i) => {
    const y = 400 + i * 380;
    p.push(...rect(200, y, 680, 220, { c: s.c, fill: C.surface, seed: 610 + i }));
    p.push(...icon(s.i, 300, y + 110, 90, s.c));
    t.push(T(560, y + 125, s.l, { size: 36, c: s.c, weight: 600 }));
    if (i < 2) p.push(...arrow(540, y + 220, 540, y + 380, { c: C.line }));
  });
  return svg('D06 带图标的步骤', '操作教程、阶段任务', p, t, '三步走完'); };

L.D07 = (data = {}) => { const p = [], t = [];
  [{ x: 140, l: '用户', c: C.yellow }, { x: 540, l: 'Router', c: C.green }, { x: 900, l: 'Worker', c: C.green }].forEach((s, i) => { p.push(...ell(s.x, 400, 150, 150, { c: s.c, seed: 620 + i })); t.push(T(s.x, 415, s.l, { size: 30, c: s.c })); });
  [0, 1].forEach(i => { const y = 620 + i * 220; p.push(...arrow(230, y, 460, y, { c: C.green })); t.push(T(345, y - 18, ['请求', '派活'][i], { size: 26, c: C.muted })); p.push(...arrow(620, y + 100, 820, y + 100, { c: C.green })); t.push(T(720, y + 82, ['执行', '返回'][i], { size: 26, c: C.muted })); });
  t.push(T(540, 1400, '请求、回复、异步通知', { size: 40, c: C.yellow }));
  return svg('D07 消息流', '请求、回复、异步通知、队列', p, t, '消息怎么走，一目了然'); };

L.D08 = (data = {}) => { const p = [], t = [];
  [{ x: 180, l: '用户', r: '提需求' }, { x: 540, l: 'Router', r: '派活' }, { x: 900, l: 'Worker', r: '干活' }].forEach((s, i) => {
    p.push(...rect(s.x - 140, 400, 280, 260, { c: C.green, fill: C.surface, seed: 630 + i }));
    t.push(T(s.x, 470, s.l, { size: 34, c: C.green, weight: 600 }));
    t.push(T(s.x, 560, s.r, { size: 30, c: C.muted }));
  });
  [0, 1].forEach(i => { p.push(...arrow(460 + i * 240, 530, 520 + i * 240, 530, { c: C.green })); t.push(T(490 + i * 240, 500, ['交接', '交接'][i], { size: 24, c: C.muted })); });
  t.push(T(540, 1000, '谁是负责人，一眼清', { size: 40, c: C.yellow }));
  return svg('D08 角色分工', 'Router 派活、Worker 执行', p, t, '各干各的，干完汇报'); };

// ===== E 标注类 =====
L.E01 = (data = {}) => { const p = [], t = [];
  p.push(...rect(180, 480, 420, 180, { c: C.line, fill: C.surface, seed: 640 })); t.push(T(390, 585, '目标对象', { size: 32, c: C.ink }));
  p.push(...rect(560, 700, 360, 180, { c: C.yellow, fill: C.surface, seed: 641 })); t.push(T(740, 800, '这里要注意', { size: 30, c: C.yellow }));
  p.push(...line(430, 660, 560, 740, { c: C.yellow }));
  return svg('E01 气泡标注', '对局部对象补一句解释或提醒', p, t, '加一句说明'); };

L.E02 = (data = {}) => { const p = [], t = [];
  p.push(...rect(300, 500, 480, 200, { c: C.line, fill: C.surface, seed: 650 })); t.push(T(540, 610, '目标', { size: 34, c: C.ink }));
  p.push(...arrow(150, 900, 480, 700, { c: C.yellow, sw: 4 })); t.push(T(200, 940, '看这里', { size: 32, c: C.yellow }));
  return svg('E02 箭头标注', '引导视线，指出目标或方向', p, t, '顺着箭头看'); };

L.E03 = (data = {}) => { const p = [], t = [];
  p.push(...rect(200, 480, 680, 400, { c: C.line, seed: 660 })); p.push(...rect(360, 620, 220, 120, { c: C.yellow, fill: C.surface, seed: 661, sw: 5 })); p.push(...ell(750, 800, 140, 140, { c: C.pink, seed: 662, sw: 5 })); t.push(T(540, 1000, '框中框 + 圈中圈', { size: 34, c: C.muted }));
  return svg('E03 高亮框 / 圈', '从密集画面中选中一个对象或区域', p, t, '圈出来，别漏了'); };

L.E04 = (data = {}) => { const p = [], t = [];
  [{ l: '当前', c: C.yellow, x: 160 }, { l: '完成', c: C.green, x: 400 }, { l: '失败', c: C.red, x: 640 }, { l: '补充', c: C.orange, x: 880 }].forEach((b, i) => { p.push(...rect(b.x - 100, 600, 200, 80, { c: b.c, fill: C.surface, seed: 670 + i })); t.push(T(b.x, 652, b.l, { size: 30, c: b.c })); });
  t.push(T(540, 800, '短状态用徽标', { size: 34, c: C.muted }));
  return svg('E04 徽标 / 标签', '当前、完成、失败、补充等短状态', p, t, '一眼看到状态'); };

L.E05 = (data = {}) => { const p = [], t = [];
  p.push(...line(400, 400, 320, 400, { c: C.line, sw: 3 }), ...line(320, 400, 320, 800, { c: C.line, sw: 3 }), ...line(320, 800, 400, 800, { c: C.line, sw: 3 }));
  ['第一行', '第二行', '第三行'].forEach((s, i) => t.push(T(480, 470 + i * 120, s, { size: 32, c: C.ink, anchor: 'start' })));
  t.push(T(240, 620, '三行一起', { size: 28, c: C.yellow }));
  return svg('E05 括号注释', '指明跨度、范围、多个对象共同性质', p, t, '这三行是一组'); };

L.E06 = (data = {}) => { const p = [], t = [];
  p.push(...rect(120, 400, 400, 520, { c: C.line, seed: 680 })); t.push(T(320, 470, '原画面', { size: 28, c: C.muted }));
  p.push(...rect(360, 660, 120, 120, { c: C.yellow, seed: 681, sw: 4 }));
  p.push(...rect(620, 700, 340, 340, { c: C.yellow, seed: 682, sw: 4 })); t.push(T(790, 900, '放大', { size: 32, c: C.yellow }));
  p.push(...line(480, 720, 620, 740, { c: C.line }), ...line(480, 780, 620, 960, { c: C.line }));
  return svg('E06 局部放大', '原画面细节太小，保留上下文再放大', p, t, '这里放大看'); };

// ===== 补充 3 种 =====
L.P01 = (data = {}) => { const p = [], t = [];
  p.push(...ell(420, 800, 460, 460, { c: C.green, seed: 690 })); p.push(...ell(660, 800, 460, 460, { c: C.pink, seed: 691 })); t.push(T(340, 700, 'A', { size: 34, c: C.green }), T(740, 700, 'B', { size: 34, c: C.pink })); t.push(T(540, 820, '交集', { size: 32, c: C.yellow }));
  return svg('P01 交集图（Venn）', '两个集合的重叠、共同点', p, t, '重叠的就是交集'); };

L.P02 = (data = {}) => { const p = [], t = [];
  p.push(...line(540, 400, 540, 1300, { c: C.line, sw: 3 }), ...line(220, 850, 860, 850, { c: C.line, sw: 3 }));
  t.push(T(380, 620, '重要 + 急', { size: 30, c: C.red }), T(700, 620, '重要 + 不急', { size: 30, c: C.green }), T(380, 1080, '急 + 不重要', { size: 30, c: C.orange }), T(700, 1080, '都不', { size: 30, c: C.muted }));
  return svg('P02 2×2 象限', '二维定位：重要 vs 急、成本 vs 收益', p, t, '四个格子，四类判断'); };

L.P03 = (data = {}) => { const p = [], t = [];
  p.push(...rect(140, 400, 800, 700, { c: C.line, seed: 700 }));
  ['$ npm run start', '→ server ready', '$ git commit', '✓ done'].forEach((s, i) => { t.push(T(200, 500 + i * 110, s, { size: 30, c: i === 3 ? C.green : C.muted, anchor: 'start' })); });
  return svg('P03 代码块 / 终端', '技术教程里的命令、输出', p, t, '几步命令，跑起来'); };


export function drawLayout(id,data){markSerial=0;return rawLayouts[id](data);}
