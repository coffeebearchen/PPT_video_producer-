import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, GOLD, SAGE, CORAL, AMBER, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {useSceneStart} from '../engine/sceneContext';
import {linePaths, pathPaths, rectPaths} from '../engine/sketch';

export type ChartKind = 'line' | 'step' | 'bar' | 'hbar' | 'area' | 'pie' | 'donut';
export interface ChartSeries {
  name: string;
  values: number[];
  color?: 'gold' | 'sage' | 'coral' | 'amber';
}
export interface ChartProps {
  title?: string;
  kicker?: string;
  kind: ChartKind;
  series: ChartSeries[];
  xLabels?: string[];
  yLabel?: string;
  xLabel?: string;
  unit?: string;
  progress?: number;
  caption?: string;
  centerLabel?: string;
}

const toneHex = (t?: string) => (t === 'sage' ? SAGE : t === 'coral' ? CORAL : t === 'amber' ? AMBER : GOLD);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const PALETTE = [GOLD, SAGE, CORAL, AMBER];

// 统计图：折线 / 阶梯 / 柱状 / 横条 / 面积 / 饼图 / 环形，全部手绘并逐帧生长
export const Chart: React.FC<ChartProps> = ({
  title,
  kicker = '数 据 图 表',
  kind,
  series,
  xLabels,
  yLabel,
  xLabel,
  progress = 1,
  caption,
  centerLabel,
}) => {
  const u = useU();
  const p = clamp01(progress);
  const isPie = kind === 'pie' || kind === 'donut';

  const X0 = 130 * u;
  const X1 = 950 * u;
  const Y0 = 640 * u;
  const Y1 = 1180 * u;
  const allValues = series.flatMap((s) => s.values);
  const yMax = Math.max(...allValues, 1) * 1.15;
  const n = Math.max(series[0]?.values.length ?? 0, 2);
  const xAt = (i: number) => X0 + ((X1 - X0) * i) / (n - 1);
  const yAt = (v: number) => Y1 - ((Y1 - Y0) * v) / yMax;

  const axis = [
    ...linePaths(X0, Y0 - 10 * u, X0, Y1, {stroke: 'rgba(16,17,18,0.6)', strokeWidth: 2.5, seed: 3}),
    ...linePaths(X0, Y1, X1 + 14 * u, Y1, {stroke: 'rgba(16,17,18,0.6)', strokeWidth: 2.5, seed: 5}),
    ...linePaths(X0, Y0 - 10 * u, X0 - 6 * u, Y0 + 6 * u, {stroke: 'rgba(16,17,18,0.6)', strokeWidth: 2.5, seed: 7}),
    ...linePaths(X0, Y0 - 10 * u, X0 + 6 * u, Y0 + 6 * u, {stroke: 'rgba(16,17,18,0.6)', strokeWidth: 2.5, seed: 9}),
    ...linePaths(X1 + 14 * u, Y1, X1 - 2 * u, Y1 - 8 * u, {stroke: 'rgba(16,17,18,0.6)', strokeWidth: 2.5, seed: 11}),
    ...linePaths(X1 + 14 * u, Y1, X1 - 2 * u, Y1 + 8 * u, {stroke: 'rgba(16,17,18,0.6)', strokeWidth: 2.5, seed: 13}),
  ];

  // ── 折线/阶梯/面积 ──
  const drawSeries = (s: ChartSeries, si: number) => {
    const col = toneHex(s.color);
    const m = s.values.length;
    const stepX = (n - 1) / Math.max(m - 1, 1);
    const f = p * (m - 1);
    const last = Math.min(Math.floor(f), m - 1);
    const frac = f - last;

    const pts: {x: number; y: number}[] = [];
    for (let i = 0; i <= last; i++) pts.push({x: xAt(i * stepX), y: yAt(s.values[i])});
    if (last < m - 1 && frac > 0) {
      const x1 = xAt(last * stepX);
      const x2 = xAt((last + 1) * stepX);
      const y1 = yAt(s.values[last]);
      const y2 = yAt(s.values[last + 1]);
      pts.push({x: x1 + (x2 - x1) * frac, y: y1 + (y2 - y1) * frac});
    }
    if (pts.length < 2) return {line: [], area: [], head: pts[0]};

    let d = `M ${pts[0].x} ${pts[0].y}`;
    if (kind === 'step') {
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i - 1].y} L ${pts[i].x} ${pts[i].y}`;
    } else {
      d += pts.slice(1).map((pt) => ` L ${pt.x} ${pt.y}`).join('');
    }

    const line = pathPaths(d, {stroke: col, strokeWidth: 3.2, roughness: 1.1, seed: 21 + si * 9});
    let area: any[] = [];
    if (kind === 'area') {
      const areaD = `${d} L ${pts[pts.length - 1].x} ${Y1} L ${pts[0].x} ${Y1} Z`;
      area = pathPaths(areaD, {stroke: 'transparent', strokeWidth: 0, fill: `url(#areaGrad${si})`, roughness: 1});
    }
    return {line, area, head: pts[pts.length - 1]};
  };

  // ── 饼图 / 环形 ──
  const cx = 540 * u;
  const cy = 900 * u;
  const R = 300 * u;
  const RI = 165 * u;
  const values = series[0]?.values ?? [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;

  const pieSegs = values.map((v, i) => {
    const startDeg = -90 + (acc / total) * 360;
    acc += v;
    const endDeg = -90 + (acc / total) * 360;
    const drawnDeg = startDeg + Math.max(0, Math.min(endDeg - startDeg, (360 * p) / 1 - (startDeg + 90)));
    const a0 = (startDeg * Math.PI) / 180;
    const a1 = (drawnDeg * Math.PI) / 180;
    const large = Math.abs(drawnDeg - startDeg) > 180 ? 1 : 0;
    const x0 = cx + R * Math.cos(a0);
    const y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1);
    const y1 = cy + R * Math.sin(a1);
    let d: string;
    if (kind === 'donut') {
      const xi0 = cx + RI * Math.cos(a0);
      const yi0 = cy + RI * Math.sin(a0);
      const xi1 = cx + RI * Math.cos(a1);
      const yi1 = cy + RI * Math.sin(a1);
      d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${RI} ${RI} 0 ${large} 0 ${xi0} ${yi0} Z`;
    } else {
      d = `M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
    }
    const mid = ((startDeg + endDeg) / 2) * (Math.PI / 180);
    return {
      d,
      color: toneHex(series[0].color) === GOLD && values.length > 1 ? PALETTE[i % PALETTE.length] : toneHex(series[0].color),
      labelPos: {x: cx + (R + 46 * u) * Math.cos(mid), y: cy + (R + 46 * u) * Math.sin(mid)},
      pct: Math.round((v / total) * 100),
      visible: drawnDeg > startDeg + 0.5,
    };
  });

  const barW = Math.min(90 * u, ((X1 - X0) / n) * 0.55);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      {title ? (
        <div style={{marginTop: 14}}>
          <SectionHeader>{title}</SectionHeader>
        </div>
      ) : null}

      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        <defs>
          {[0, 1, 2, 3].map((si) => (
            <linearGradient key={si} id={`areaGrad${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={toneHex(series[si]?.color)} stopOpacity={0.45} />
              <stop offset="100%" stopColor={toneHex(series[si]?.color)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        {!isPie &&
          axis.map((pp, i) => (
            <path key={`ax${i}`} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill="none" strokeLinecap="round" />
          ))}

        {!isPie &&
          [0.25, 0.5, 0.75].map((g, i) => {
            const y = Y1 - (Y1 - Y0) * g;
            return linePaths(X0, y, X1, y, {stroke: 'rgba(16,17,18,0.10)', strokeWidth: 1.5, seed: 31 + i}).map((pp, j) => (
              <path key={`g${i}${j}`} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill="none" />
            ));
          })}

        {/* 饼图/环形 */}
        {isPie &&
          pieSegs.map((seg, i) =>
            seg.visible
              ? pathPaths(seg.d, {stroke: seg.color, strokeWidth: 2.5, fill: `${seg.color}33`, roughness: 1}).map((pp, j) => (
                  <path key={`pie${i}${j}`} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill={pp.fill} strokeLinecap="round" />
                ))
              : null,
          )}

        {/* 柱状 */}
        {kind === 'bar' &&
          series.map((s) =>
            s.values.map((v, i) => {
              const grow = clamp01(p * s.values.length - i);
              const h = (((Y1 - Y0) * v) / yMax) * grow;
              const x = xAt(i * ((n - 1) / Math.max(s.values.length - 1, 1))) - barW / 2;
              return rectPaths(x, Y1 - h, barW, h, {stroke: toneHex(s.color), strokeWidth: 2.5, fill: `${toneHex(s.color)}22`, seed: 41 + i}).map((pp, j) => (
                <path key={`b${i}${j}`} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill={pp.fill} strokeLinecap="round" />
              ));
            }),
          )}

        {/* 横条 */}
        {kind === 'hbar' &&
          series[0]?.values.map((v, i) => {
            const col = toneHex(series[0].color);
            const grow = clamp01(p * series[0].values.length - i);
            const w = (((X1 - X0) * v) / yMax) * grow;
            const y = Y0 + ((Y1 - Y0) * (i + 0.5)) / Math.max(series[0].values.length, 1) - 26 * u;
            return rectPaths(X0, y, Math.max(w, 1), 52 * u, {stroke: col, strokeWidth: 2.5, fill: `${col}22`, seed: 51 + i}).map((pp, j) => (
              <path key={`h${i}${j}`} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill={pp.fill} strokeLinecap="round" />
            ));
          })}

        {/* 折线/阶梯/面积 */}
        {!isPie &&
          kind !== 'bar' &&
          kind !== 'hbar' &&
          series.map((s, si) => {
            const {line, area, head} = drawSeries(s, si);
            return (
              <g key={`s${si}`}>
                {area.map((pp, i) => (
                  <path key={`a${i}`} d={pp.d} stroke="none" fill={pp.fill} />
                ))}
                {line.map((pp, i) => (
                  <path key={`l${i}`} d={pp.d} stroke={pp.stroke} strokeWidth={pp.strokeWidth} fill="none" strokeLinecap="round" />
                ))}
                {head && p > 0.02 && kind !== 'area' ? (
                  <circle cx={head.x} cy={head.y} r={6} fill={toneHex(s.color)} style={{filter: `drop-shadow(0 0 8px ${toneHex(s.color)})`}} />
                ) : null}
              </g>
            );
          })}
      </svg>

      {/* 饼图标签 */}
      {isPie &&
        series[0]?.values.map((v, i) => {
          const seg = pieSegs[i];
          if (!seg.visible) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: seg.labelPos.x - 70 * u,
                top: seg.labelPos.y - 20 * u,
                width: 140 * u,
                textAlign: 'center',
                fontFamily: FONT,
                fontSize: 26 * u,
                color: INK,
              }}
            >
              {seg.pct}%
            </div>
          );
        })}

      {isPie && centerLabel && kind === 'donut' ? (
        <div
          style={{
            position: 'absolute',
            left: cx - 160 * u,
            top: cy - 40 * u,
            width: 320 * u,
            textAlign: 'center',
            fontFamily: FONT,
            fontSize: 44 * u,
            color: GOLD,
          }}
        >
          {centerLabel}
        </div>
      ) : null}

      {/* 轴标签 */}
      {!isPie && xLabel ? (
        <div style={{position: 'absolute', right: 48 * u, top: Y1 + 58 * u, fontFamily: FONT, fontSize: 26 * u, color: MUTED}}>
          {xLabel} →
        </div>
      ) : null}
      {!isPie && yLabel ? (
        <div style={{position: 'absolute', left: 96 * u, top: Y0 - 52 * u, fontFamily: FONT, fontSize: 24 * u, color: MUTED}}>
          ↑ {yLabel}
        </div>
      ) : null}
      {!isPie &&
        (xLabels ?? []).map((lb, i) => (
          <div
            key={lb}
            style={{
              position: 'absolute',
              left: xAt(i * ((n - 1) / Math.max((xLabels ?? []).length - 1, 1))) - 60 * u,
              top: Y1 + 14 * u,
              width: 120 * u,
              textAlign: 'center',
              fontFamily: FONT,
              fontSize: 24 * u,
              color: MUTED,
            }}
          >
            {lb}
          </div>
        ))}

      {caption ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: (isPie ? 1320 : Y1 + 90) * u, textAlign: 'center', fontFamily: FONT, fontSize: 40 * u, color: INK}}>
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

