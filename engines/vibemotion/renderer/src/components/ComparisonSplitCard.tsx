import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, glassCard, CORAL, GOLD, INK, MUTED} from '../engine/tokens';
import {Kicker, useU} from '../engine/ui';
import {breathDrift} from '../engine/spring';

export interface ComparisonSplitCardProps {
  headline: string;
  question: string;
  left: {title: string; sub: string; tone: 'waiting' | 'active'};
  right: {title: string; sub: string; tone: 'waiting' | 'active'};
}

// 组件 8：二元痛点对称对比器 + 手绘问号
export const ComparisonSplitCard: React.FC<ComparisonSplitCardProps> = ({headline, question, left, right}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();
  const drift = breathDrift(frame);

  const tone = (t: 'waiting' | 'active') => (t === 'active' ? GOLD : CORAL);

  const Card = ({side}: {side: typeof left}) => (
    <div
      style={{
        ...glassCard(20 * u, tone(side.tone), 'rgba(255,252,245,0.6)'),
        width: (width - 96 * u) / 2 - 14 * u,
        padding: '38px 30px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{fontFamily: FONT, fontSize: 33 * u, color: tone(side.tone), fontWeight: 400, letterSpacing: 2}}>
        {side.title}
      </div>
      <div style={{fontFamily: FONT, fontSize: 32 * u, color: 'rgba(16,17,18,0.72)', marginTop: 12, lineHeight: 1.5}}>
        {side.sub}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>开 场 · 矛 盾 对 比</Kicker>
      <div style={{marginTop: 20, textAlign: 'center'}}>
        <span style={{fontFamily: FONT, fontSize: 62 * u, fontWeight: 400, color: INK, letterSpacing: 2, lineHeight: 1.3}}>{headline}</span>
      </div>

      <div style={{marginTop: 120, position: 'relative', width: '100%'}}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -60%) translate(${drift.x}px, ${drift.y}px)`,
            width: 130 * u,
            height: 130 * u,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(226,190,92,0.55), rgba(226,190,92,0) 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          <span style={{fontFamily: FONT, fontSize: 100 * u, fontWeight: 400, color: GOLD, textShadow: '0 0 26px rgba(226,190,92,0.9)'}}>
            {question}
          </span>
        </div>

        <div style={{display: 'flex', gap: 28 * u, justifyContent: 'space-between'}}>
          <Card side={left} />
          <Card side={right} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

