import React from 'react';
import {useVideoConfig} from 'remotion';
import {FONT, FONT_HEADING, glassCard, GOLD, INK, MUTED} from './tokens';

export const useU = () => {
  const {width} = useVideoConfig();
  return width / 1080;
};

// 小标签（参考图里的小号手写说明）
export const Kicker: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = MUTED}) => {
  const u = useU();
  return (
    <div
      style={{
        fontFamily: FONT_HEADING,
        fontSize: 36 * u,
        letterSpacing: 3,
        color,
        fontWeight: 400,
        opacity: 0.95,
      }}
    >
      {children}
    </div>
  );
};

// 大标题（参考图里的超大居中手写标题）
export const SectionHeader: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = INK}) => {
  const u = useU();
  return (
    <div
      style={{
        fontFamily: FONT_HEADING,
        fontSize: 72 * u,
        fontWeight: 400,
        color,
        lineHeight: 1.25,
        letterSpacing: 2,
        textShadow: '0 0 26px rgba(16,17,18,0.14)',
      }}
    >
      {children}
    </div>
  );
};

// 手绘框
export const HandBox: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  radius?: number;
  stroke?: string;
  fill?: string;
}> = ({children, style, radius = 18, stroke, fill}) => {
  const u = useU();
  return <div style={{...glassCard((radius ?? 18) * u, stroke ?? `${GOLD}cc`, fill), ...style}}>{children}</div>;
};

export const Glass = HandBox;

