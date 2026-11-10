import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {useStagger} from '../engine/motion';

export interface Pillar {
  indexLabel: string;
  title: string;
  topFloatingBadge?: {type: 'waveform' | 'chat_wrench' | 'text_badge'; content?: string};
  bottomTakeawayText: string;
}
export interface SpotlightPillarsProps {
  sectionHeader: string;
  pillars: Pillar[];
  activePillarIndex: number | null;
}

const badgeGlyph = (type: string, content?: string) =>
  type === 'text_badge' ? (content ?? '24h') : type === 'waveform' ? '▮▮▮' : '✎';

// 组件 2：三道障碍并列卡片（手绘方框 + 金黄聚光）
export const SpotlightPillars: React.FC<SpotlightPillarsProps> = ({
  sectionHeader,
  pillars,
  activePillarIndex,
}) => {
  const u = useU();
  const {width} = useVideoConfig();
  const gap = 22 * u;
  const cardW = (width - 96 * u - gap * (pillars.length - 1)) / pillars.length;
  const st = useStagger(pillars.length, 8, 12);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>要 跨 过 的 障 碍</Kicker>
      <div style={{marginTop: 14}}>
        <SectionHeader>{sectionHeader}</SectionHeader>
      </div>

      <div style={{display: 'flex', gap, marginTop: 110, alignItems: 'stretch'}}>
        {pillars.map((p, i) => {
          const active = Math.round(activePillarIndex ?? -1) === i;
          const dim = activePillarIndex !== null && !active;
          return (
            <div
              key={p.indexLabel}
              style={{
                ...glassCard(
                  16 * u,
                  dim ? 'rgba(138,145,139,0.32)' : active ? GOLD : SAGE,
                  active ? 'rgba(226,190,92,0.08)' : 'rgba(255,252,245,0.55)',
                ),
                width: cardW,
                minHeight: 560 * u,
                padding: '30px 20px 26px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transform: `translateY(${(1 - st[i]) * 26}px) ${active ? 'scale(1.04)' : `rotate(${i % 2 === 0 ? -0.7 : 0.7}deg)`}`,
                opacity: (dim ? 0.45 : 1) * st[i],
                boxShadow: active ? '0 0 40px rgba(226,190,92,0.4)' : 'none',
                overflow: 'hidden',
              }}
            >
              <div style={{fontFamily: FONT, fontSize: 50 * u, fontWeight: 400, color: active ? GOLD : INK}}>
                {p.indexLabel}
              </div>
              {p.topFloatingBadge ? (
                <div style={{fontFamily: FONT, fontSize: 35 * u, color: active ? GOLD : MUTED, marginTop: 8, letterSpacing: 2}}>
                  {badgeGlyph(p.topFloatingBadge.type, p.topFloatingBadge.content)}
                </div>
              ) : null}
              <div style={{fontFamily: FONT, fontSize: 42 * u, fontWeight: 400, color: INK, marginTop: 14, lineHeight: 1.2}}>
                {p.title}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 30 * u,
                  color: active ? GOLD : MUTED,
                  marginTop: 14,
                  lineHeight: 1.5,
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              >
                {p.bottomTakeawayText}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

