import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, CORAL, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {SketchRect} from '../engine/SketchRect';
import {useSceneStart} from '../engine/sceneContext';

export interface BranchNode {
  label: string;
  sub?: string;
  tone?: 'good' | 'bad' | 'neutral';
}
export interface BranchFlowProps {
  title?: string;
  kicker?: string;
  root: {label: string; sub?: string};
  branches: BranchNode[];
  activeStep: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// 分支决策图：一个起点分叉到多条路径，路径随语音时间轴依次点亮
export const BranchFlow: React.FC<BranchFlowProps> = ({title, kicker = '分 支 决 策', root, branches, activeStep}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const start = useSceneStart();
  const pulse = 0.5 + 0.5 * Math.sin((frame - start) / 9);
  const step = Number.isFinite(activeStep) ? activeStep : 0;

  const n = Math.max(branches.length, 1);
  const rootW = 420 * u;
  const rootH = 150 * u;
  const boxW = Math.min(280 * u, (984 * u - 28 * u * (n - 1)) / n);
  const boxH = 190 * u;

  const rootX = 540 * u;
  const rootY = 560 * u;
  const branchY = 1100 * u;
  const gap = 28 * u;
  const totalW = boxW * n + gap * (n - 1);
  const startX = 540 * u - totalW / 2 + boxW / 2;

  const rootAct = clamp01(step);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '210px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      {title ? (
        <div style={{marginTop: 16}}>
          <SectionHeader>{title}</SectionHeader>
        </div>
      ) : null}

      {/* 连接线 */}
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'}}>
        {branches.map((_, i) => {
          const bx = startX + i * (boxW + gap);
          const act = clamp01(step - i - 0.4);
          const x1 = rootX;
          const y1 = rootY + rootH / 2;
          const x2 = bx;
          const y2 = branchY - boxH / 2;
          const midY = (y1 + y2) / 2;
          const d = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
          const len = Math.abs(y2 - y1) + Math.abs(x2 - x1);
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
            </g>
          );
        })}
      </svg>

      {/* 根节点 */}
      <div
        style={{
          ...glassCard(16 * u, 'transparent', 'transparent'),
          position: 'absolute',
          left: rootX - rootW / 2,
          top: rootY - rootH / 2,
          width: rootW,
          minHeight: rootH,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: rootAct > 0.15 ? '0 0 30px rgba(226,190,92,0.35)' : 'none',
        }}
      >
        <SketchRect w={rootW} h={rootH} stroke={rootAct > 0.15 ? GOLD : 'rgba(138,145,139,0.6)'} strokeWidth={rootAct > 0.15 ? 3 : 2} fill={rootAct > 0.15 ? 'rgba(226,190,92,0.08)' : undefined} seed={71} roughness={1.1} />
        <div style={{fontFamily: FONT, fontSize: 44 * u, color: INK}}>{root.label}</div>
        {root.sub ? <div style={{fontFamily: FONT, fontSize: 28 * u, color: rootAct > 0.15 ? GOLD : MUTED, marginTop: 6}}>{root.sub}</div> : null}
      </div>

      {/* 分支节点 */}
      {branches.map((b, i) => {
        const act = clamp01(step - i - 0.4);
        const lit = act > 0.15;
        const tone = b.tone ?? 'neutral';
        const co = tone === 'bad' ? CORAL : tone === 'good' ? GOLD : SAGE;
        return (
          <div
            key={i}
            style={{
              ...glassCard(14 * u, 'transparent', 'transparent'),
              position: 'absolute',
              left: startX + i * (boxW + gap) - boxW / 2,
              top: branchY - boxH / 2,
              width: boxW,
              minHeight: boxH,
              padding: '20px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              transform: `translateY(${Math.sin((frame - start) / 20 + i) * 6}px) rotate(${i % 2 === 0 ? -0.8 : 0.8}deg) scale(${0.97 + 0.05 * act + 0.02 * act * pulse})`,
              opacity: 0.55 + 0.45 * Math.max(act, 0.4),
              boxShadow: lit ? `0 0 ${18 + 20 * act}px ${tone === 'bad' ? 'rgba(234,62,74' : 'rgba(226,190,92'},${0.2 + 0.3 * act})` : 'none',
            }}
          >
            <SketchRect w={boxW} h={boxH} stroke={lit ? co : 'rgba(138,145,139,0.6)'} strokeWidth={lit ? 3 : 2} fill={lit ? 'rgba(226,190,92,0.06)' : undefined} seed={91 + i * 9} roughness={1.1} />
            <div style={{fontFamily: FONT, fontSize: 40 * u, color: lit ? co : INK, lineHeight: 1.2}}>{b.label}</div>
            {b.sub ? <div style={{fontFamily: FONT, fontSize: 26 * u, color: lit ? co : MUTED, marginTop: 8}}>{b.sub}</div> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

