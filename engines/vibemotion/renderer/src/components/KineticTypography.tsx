import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, GOLD, INK} from '../engine/tokens';
import {useU} from '../engine/ui';
import {useSceneStart} from '../engine/sceneContext';

export interface KineticTypographyProps {
  lines: string[];
  highlightKeywords: string[];
}

// 组件 12：金句动能排版（手写大字 + 关键词金黄高亮）
export const KineticTypography: React.FC<KineticTypographyProps> = ({lines, highlightKeywords}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const start = useSceneStart();
  const local = frame - start;
  const words = highlightKeywords ?? [];

  const renderLine = (line: string, li: number) => {
    // 简单高亮：把行内出现的关键词标金
    let parts: {text: string; hl: boolean}[] = [{text: line, hl: false}];
    for (const w of words) {
      const next: {text: string; hl: boolean}[] = [];
      for (const p of parts) {
        if (p.hl || !p.text.includes(w)) {
          next.push(p);
          continue;
        }
        const segs = p.text.split(w);
        segs.forEach((s, idx) => {
          if (s) next.push({text: s, hl: false});
          if (idx < segs.length - 1) next.push({text: w, hl: true});
        });
      }
      parts = next;
    }

    const p = Math.max(0, Math.min(1, (local - li * 7) / 10));
    return (
      <div
        key={li}
        style={{
          fontFamily: FONT,
          fontSize: 108 * u,
          fontWeight: 400,
          color: INK,
          lineHeight: 1.5,
          letterSpacing: 2,
          marginTop: li === 0 ? 0 : 10 * u,
          textShadow: '0 0 30px rgba(16,17,18,0.10)',
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
        }}
      >
        {parts.map((p, i) =>
          p.hl ? (
            <span
              key={i}
              style={{
                color: GOLD,
                textShadow: '0 0 26px rgba(226,190,92,0.75)',
                borderBottom: `4px solid ${GOLD}`,
              }}
            >
              {p.text}
            </span>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: '360px 64px 300px',
        textAlign: 'center',
        transform: `translateY(${Math.sin(frame / 40) * 4}px)`,
      }}
    >
      {(lines ?? []).map((l, i) => renderLine(l, i))}
    </AbsoluteFill>
  );
};

