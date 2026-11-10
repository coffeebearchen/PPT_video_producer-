import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {SketchRect} from '../engine/SketchRect';
import {useSceneStart} from '../engine/sceneContext';

export interface CycleNode {
  id: string;
  label: string;
  sub?: string;
}
export interface CycleFlowProps {
  title?: string;
  kicker?: string;
  nodes: CycleNode[];
  activeStep: number;
  centerText?: string;
  centerSub?: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return {x: cx + r * Math.cos(a), y: cy + r * Math.sin(a)};
};

// 环形循环流程图：节点围成一圈，弧形箭头随语音时间轴逐段生长
export const CycleFlow: React.FC<CycleFlowProps> = ({
  title,
  kicker = '循 环 流 程',
  nodes,
  activeStep,
  centerText,
  centerSub,
}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const start = useSceneStart();
  const pulse = 0.5 + 0.5 * Math.sin((frame - start) / 9);
  const step = Number.isFinite(activeStep) ? activeStep : 0;

  const n = Math.max(nodes.length, 1);
  const cx = 540 * u;
  const cy = 900 * u;
  const R = 275 * u;
  const boxW = 250 * u;
  const boxH = 120 * u;
  const stepDeg = 360 / n;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '210px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      {title ? (
        <div style={{marginTop: 16}}>
          <SectionHeader>{title}</SectionHeader>
        </div>
      ) : null}

      {/* 弧形箭头 */}
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        {nodes.map((_, i) => {
          const a1 = i * stepDeg + 16;
          const a2 = (i + 1) * stepDeg - 16;
          const p1 = polar(cx, cy, R, a1);
          const p2 = polar(cx, cy, R, a2);
          const large = a2 - a1 > 180 ? 1 : 0;
          const d = `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y}`;
          const act = clamp01(step - i - 0.35);
          const len = R * Math.abs((a2 - a1) * Math.PI) / 180;
          const tip = polar(cx, cy, R, a2 + 3);
          const tipBack = polar(cx, cy, R, a2 - 6);
          const rot = (a2 + 90) * (Math.PI / 180);
          const aw = 9 * u;
          const tri = `${tip.x},${tip.y} ${tipBack.x - aw * Math.sin(rot)},${tipBack.y + aw * Math.cos(rot)} ${
            tipBack.x + aw * Math.sin(rot)
          },${tipBack.y - aw * Math.cos(rot)}`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="rgba(16,17,18,0.18)" strokeWidth={2} />
              <path
                d={d}
                fill="none"
                stroke={GOLD}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${len} ${len}`}
                strokeDashoffset={len * (1 - act)}
                style={{filter: act > 0.05 ? 'drop-shadow(0 0 6px rgba(226,190,92,0.8))' : 'none'}}
              />
              <polygon points={tri} fill={act > 0.9 ? GOLD : 'rgba(16,17,18,0.25)'} />
            </g>
          );
        })}
      </svg>

      {/* 节点 */}
      {nodes.map((node, i) => {
        const act = clamp01(step - i);
        const lit = act > 0.15;
        const p = polar(cx, cy, R, i * stepDeg);
        return (
          <div
            key={node.id}
            style={{
              ...glassCard(14 * u, 'transparent', 'transparent'),
              position: 'absolute',
              left: p.x - boxW / 2,
              top: p.y - boxH / 2,
              width: boxW,
              minHeight: boxH,
              padding: '16px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              transform: `translateY(${Math.sin((frame - start) / 20 + i) * 6}px) rotate(${i % 2 === 0 ? -0.8 : 0.8}deg) scale(${0.97 + 0.05 * act + 0.02 * act * pulse})`,
              boxShadow: lit ? `0 0 ${18 + 24 * act}px rgba(226,190,92,${0.2 + 0.3 * act})` : 'none',
            }}
          >
            <SketchRect
              w={boxW}
              h={boxH}
              stroke={lit ? GOLD : 'rgba(138,145,139,0.7)'}
              strokeWidth={lit ? 3 : 2}
              fill={lit ? 'rgba(226,190,92,0.08)' : undefined}
              seed={23 + i * 7}
              roughness={1.1}
            />
            <div style={{fontFamily: FONT, fontSize: 40 * u, color: INK, lineHeight: 1.15}}>{node.label}</div>
            {node.sub ? (
              <div style={{fontFamily: FONT, fontSize: 26 * u, color: lit ? GOLD : MUTED, marginTop: 6}}>{node.sub}</div>
            ) : null}
          </div>
        );
      })}

      {/* 中心大字 */}
      {centerText ? (
        <div
          style={{
            position: 'absolute',
            left: cx - 190 * u,
            top: cy - 60 * u,
            width: 380 * u,
            textAlign: 'center',
            fontFamily: FONT,
            fontSize: 50 * u,
            color: GOLD,
            textShadow: '0 0 24px rgba(226,190,92,0.45)',
          }}
        >
          {centerText}
          {centerSub ? (
            <div style={{fontFamily: FONT, fontSize: 24 * u, color: MUTED, marginTop: 8, textShadow: 'none'}}>{centerSub}</div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

