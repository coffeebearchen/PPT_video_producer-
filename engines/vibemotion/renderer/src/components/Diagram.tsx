import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, GOLD, SAGE, CORAL, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {useSceneStart} from '../engine/sceneContext';
import {rectPaths, circlePaths, linePaths, pathPaths} from '../engine/sketch';

// ─────────── 图模板引擎 ───────────
export type DiagramLayout = 'flow' | 'cycle' | 'tree' | 'network' | 'hub' | 'layers' | 'matrix' | 'pyramid';
export type NodeShape = 'rect' | 'circle' | 'pill';

export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
  shape?: NodeShape;
  tone?: 'gold' | 'sage' | 'coral' | 'neutral';
}
export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'straight' | 'curve' | 'dashed';
}

export interface DiagramProps {
  title?: string;
  kicker?: string;
  layout: DiagramLayout;
  nodes: DiagramNode[];
  edges?: DiagramEdge[];
  centerLabel?: string;
  centerSub?: string;
  activeStep?: number;
}

type Box = {x: number; y: number; w: number; h: number; shape: NodeShape};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const toneColor = (t?: string) =>
  t === 'gold' ? GOLD : t === 'coral' ? CORAL : t === 'sage' ? SAGE : 'rgba(138,145,139,0.85)';

// 8 种布局：全部返回每个节点的盒子（左上角 + 尺寸）
const layoutEngine = (layout: DiagramLayout, n: number, u: number): Box[] => {
  const W = 984 * u;
  const cx = 540 * u;
  const nodeW = 200 * u;
  const nodeH = 108 * u;
  const out: Box[] = [];

  if (layout === 'flow') {
    const gap = (W - nodeW * n) / Math.max(n - 1, 1);
    for (let i = 0; i < n; i++) out.push({x: 48 * u + i * (nodeW + gap), y: 700 * u, w: nodeW, h: nodeH, shape: 'rect'});
    return out;
  }
  if (layout === 'cycle') {
    const R = 300 * u;
    for (let i = 0; i < n; i++) {
      const a = ((i / n) * 360 - 90) * (Math.PI / 180);
      out.push({x: cx + R * Math.cos(a) - nodeW / 2, y: 860 * u + R * Math.sin(a) - nodeH / 2, w: nodeW, h: nodeH, shape: 'rect'});
    }
    return out;
  }
  if (layout === 'tree') {
    const rootW = 260 * u;
    out.push({x: cx - rootW / 2, y: 470 * u, w: rootW, h: 110 * u, shape: 'rect'});
    const kids = n - 1;
    const bw = 200 * u;
    const gap = (W - bw * kids) / Math.max(kids - 1, 1);
    for (let i = 0; i < kids; i++) out.push({x: 48 * u + i * (bw + gap), y: 1000 * u, w: bw, h: 110 * u, shape: 'rect'});
    return out;
  }
  if (layout === 'hub') {
    const hubW = 240 * u;
    out.push({x: cx - hubW / 2, y: 860 * u - hubW / 2, w: hubW, h: hubW, shape: 'circle'});
    const R = 360 * u;
    for (let i = 1; i < n; i++) {
      const a = ((i - 1) / (n - 1)) * 360 * (Math.PI / 180);
      out.push({x: cx + R * Math.cos(a) - nodeW / 2, y: 860 * u + R * Math.sin(a) - nodeH / 2, w: nodeW, h: nodeH, shape: 'rect'});
    }
    return out;
  }
  if (layout === 'layers') {
    const bh = 96 * u;
    const gapY = 24 * u;
    const startY = 700 * u;
    for (let i = 0; i < n; i++) out.push({x: 90 * u, y: startY + i * (bh + gapY), w: W - 84 * u, h: bh, shape: 'rect'});
    return out;
  }
  if (layout === 'matrix') {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cw = 210 * u;
    const ch = 130 * u;
    const gx = 26 * u;
    const gy = 24 * u;
    const totalW = cols * cw + (cols - 1) * gx;
    const startX = cx - totalW / 2;
    const startY = 760 * u - (rows * ch + (rows - 1) * gy) / 2;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      out.push({x: startX + c * (cw + gx), y: startY + r * (ch + gy), w: cw, h: ch, shape: 'rect'});
    }
    return out;
  }
  // network：环形分布（内外两圈交替，避免盒子互压）
  if (layout === 'network') {
    const R = 350 * u;
    for (let i = 0; i < n; i++) {
      const a = ((i / n) * 360 - 90) * (Math.PI / 180);
      const rr = R * (i % 2 === 0 ? 1 : 0.74);
      out.push({
        x: cx + rr * Math.cos(a) - nodeW / 2,
        y: 880 * u + rr * Math.sin(a) - nodeH / 2,
        w: nodeW,
        h: nodeH,
        shape: 'rect',
      });
    }
    return out;
  }
  // pyramid
  const rows: number[] = [];
  let left = n;
  let need = 1;
  while (left > 0) {
    const take = Math.min(need, left);
    rows.push(take);
    left -= take;
    need++;
  }
  let y = 700 * u;
  rows.forEach((count, r) => {
    const bw = 190 * u;
    const gap = 22 * u;
    const total = count * bw + (count - 1) * gap;
    const sx = cx - total / 2;
    for (let c = 0; c < count; c++) out.push({x: sx + c * (bw + gap), y, w: bw, h: 100 * u, shape: 'rect'});
    y += 120 * u;
  });
  return out;
};

// 计算节点顺序（让 activeStep 按拓扑点亮）
const orderIndex = (layout: DiagramLayout, i: number, n: number) => {
  if (layout === 'tree' || layout === 'hub') return i;
  if (layout === 'pyramid' || layout === 'matrix' || layout === 'network') return i;
  return i;
};

export const Diagram: React.FC<DiagramProps> = ({
  title,
  kicker = '图 解 模 板',
  layout,
  nodes,
  edges = [],
  centerLabel,
  centerSub,
  activeStep = 0,
}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const start = useSceneStart();
  const step = Number.isFinite(activeStep) ? activeStep : 0;
  const boxes = useMemo(() => layoutEngine(layout, Math.max(nodes.length, 1), u), [layout, nodes.length, u]);
  const idx: Record<string, number> = {};
  nodes.forEach((nd, i) => (idx[nd.id] = i));
  const center = (i: number) => ({x: boxes[i].x + boxes[i].w / 2, y: boxes[i].y + boxes[i].h / 2});

  const paths = (d: string, stroke: string, w = 2) => pathPaths(d, {stroke, strokeWidth: w, seed: d.length + 3, roughness: 1.4});

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      {title ? (
        <div style={{marginTop: 14}}>
          <SectionHeader>{title}</SectionHeader>
        </div>
      ) : null}

      {/* 连线层 */}
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        {edges.map((e, k) => {
          const a = idx[e.from];
          const b = idx[e.to];
          if (a === undefined || b === undefined) return null;
          const p1 = center(a);
          const p2 = center(b);
          const lit = clamp01(step - Math.max(a, b) + 0.6) > 0.2;
          const col = lit ? GOLD : 'rgba(16,17,18,0.32)';
          let d: string;
          if (e.style === 'curve') {
            const mx = (p1.x + p2.x) / 2 + (p2.y - p1.y) * 0.18;
            const my = (p1.y + p2.y) / 2 - (p2.x - p1.x) * 0.18;
            d = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
          } else {
            d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
          }
          const ps = paths(d, col, 2);
          return (
            <g key={k}>
              {ps.map((p, q) => (
                <path
                  key={q}
                  d={p.d}
                  stroke={col}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={e.style === 'dashed' ? '8 7' : undefined}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* 节点层 */}
      {nodes.map((nd, i) => {
        const b = boxes[i];
        const act = clamp01(step - orderIndex(layout, i, nodes.length));
        const lit = act > 0.15;
        const col = lit ? toneColor(nd.tone ?? 'gold') : toneColor(nd.tone) === 'rgba(138,145,139,0.85)' ? toneColor(nd.tone) : 'rgba(138,145,139,0.75)';
        const shapePaths =
          b.shape === 'circle'
            ? circlePaths(b.w / 2, b.h / 2, Math.min(b.w, b.h) - 4, {stroke: col, strokeWidth: lit ? 3 : 2, fill: lit ? 'rgba(226,190,92,0.08)' : undefined, seed: 11 + i * 7})
            : rectPaths(0, 0, b.w, b.h, {stroke: col, strokeWidth: lit ? 3 : 2, fill: lit ? 'rgba(226,190,92,0.08)' : undefined, seed: 11 + i * 7});
        return (
          <div
            key={nd.id}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              transform: `translateY(${Math.sin((frame - start) / 22 + i) * 4}px) scale(${0.97 + 0.05 * act})`,
            }}
          >
            <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible'}}>
              {shapePaths.map((p, q) => (
                <path key={q} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />
              ))}
            </svg>
            <div
              style={{
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 8px',
              }}
            >
              <div style={{fontFamily: FONT, fontSize: 34 * u, color: INK, lineHeight: 1.15}}>{nd.label}</div>
              {nd.sub ? <div style={{fontFamily: FONT, fontSize: 24 * u, color: lit ? GOLD : MUTED, marginTop: 6}}>{nd.sub}</div> : null}
            </div>
          </div>
        );
      })}

      {/* 中心文字（cycle 用；hub 的中心已有节点标签，避免重叠） */}
      {centerLabel && layout !== 'hub' ? (
        <div
          style={{
            position: 'absolute',
            left: 540 * u - 190 * u,
            top: 860 * u - 50 * u,
            width: 380 * u,
            textAlign: 'center',
            fontFamily: FONT,
            fontSize: layout === 'hub' ? 34 * u : 48 * u,
            color: GOLD,
            textShadow: '0 0 22px rgba(226,190,92,0.4)',
            pointerEvents: 'none',
          }}
        >
          {centerLabel}
          {centerSub ? (
            <div style={{fontFamily: FONT, fontSize: 24 * u, color: MUTED, marginTop: 6, textShadow: 'none'}}>{centerSub}</div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

