import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, CORAL, INK, MUTED} from '../engine/tokens';
import {Kicker, useU} from '../engine/ui';

export interface MythBusterStrikeProps {
  badgeLabel?: string;
  beforeText: string;
  afterText: string;
  active: boolean;
}

// 组件 7：认知反转红线粉碎机（SVG 手绘划线 + 震动）
export const MythBusterStrike: React.FC<MythBusterStrikeProps> = ({badgeLabel, beforeText, afterText, active}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shake = active ? Math.sin(frame / 2) * 6 : 0;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', padding: '220px 48px 300px'}}>
      <Kicker color={CORAL}>认 知 反 转</Kicker>
      {badgeLabel ? (
        <div
          style={{
            marginTop: 24,
            fontFamily: FONT,
            fontSize: 35 * u,
            color: CORAL,
            border: `2px solid ${CORAL}`,
            borderRadius: 999,
            padding: '8px 26px',
          }}
        >
          {badgeLabel}
        </div>
      ) : null}

      <div style={{marginTop: 110, position: 'relative', transform: `translateX(${shake}px)`}}>
        <div style={{...glassCard(20 * u, CORAL, 'rgba(255,252,245,0.6)'), padding: '40px 56px'}}>
          <span style={{fontFamily: FONT, fontSize: 74 * u, fontWeight: 400, color: INK}}>{beforeText}</span>
        </div>
        {/* 珊瑚红删除线 */}
        <svg
          style={{position: 'absolute', left: -20 * u, top: -20 * u, width: 620 * u, height: 170 * u, overflow: 'visible', pointerEvents: 'none'}}
          viewBox="0 0 620 170"
        >
          <line
            x1="12" y1="34" x2="600" y2="132"
            stroke={CORAL} strokeWidth={11} strokeLinecap="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw * (active ? 1 : 0)}
            style={{filter: 'drop-shadow(0 0 10px rgba(234,62,74,0.7))'}}
          />
        </svg>
      </div>

      <div
        style={{
          marginTop: 110,
          fontFamily: FONT,
          fontSize: 52 * u,
          color: active ? GOLD : SAGE,
          fontWeight: 400,
          opacity: active ? 1 : 0.3,
          textShadow: active ? '0 0 24px rgba(226,190,92,0.5)' : 'none',
          textAlign: 'center',
        }}
      >
        {afterText}
      </div>
    </AbsoluteFill>
  );
};

