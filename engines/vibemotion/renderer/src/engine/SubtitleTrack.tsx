import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {Subtitle, ThemePalette} from '../types';
import {FONT} from './tokens';

// 底部字幕轨：核心关键词高亮 + 逐句淡入（《规范》timelineDSL.subtitles）
export const SubtitleTrack: React.FC<{subtitles: Subtitle[]; palette: ThemePalette}> = ({
  subtitles,
  palette,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;

  const active = subtitles.find((s) => ms >= s.startMs && ms <= s.endMs);
  if (!active) return null;

  const fadeIn = Math.min(1, (ms - active.startMs) / 160);
  const fadeOut = Math.min(1, (active.endMs - ms) / 160);
  const opacity = Math.max(0, Math.min(fadeIn, fadeOut));

  // 高亮关键词
  const parts: {text: string; hl: boolean}[] = [];
  let rest = active.text;
  for (const kw of active.highlightKeywords) {
    const idx = rest.indexOf(kw);
    if (idx >= 0) {
      if (idx > 0) parts.push({text: rest.slice(0, idx), hl: false});
      parts.push({text: kw, hl: true});
      rest = rest.slice(idx + kw.length);
    }
  }
  if (rest) parts.push({text: rest, hl: false});

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 148,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 96px',
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 46,
          fontWeight: 400,
          lineHeight: 1.45,
          color: '#FDFDFB',
          textAlign: 'center',
          background: 'rgba(18,18,18,0.55)',
          border: '2px solid rgba(16,17,18,0.12)',
          borderRadius: 16,
          padding: '10px 30px',
          textShadow: '0 4px 22px rgba(0,0,0,0.7)',
        }}
      >
        {parts.map((p, i) => (
          <span
            key={i}
            style={
              p.hl
                ? {color: palette.highlightGold, fontWeight: 800}
                : undefined
            }
          >
            {p.text}
          </span>
        ))}
      </div>
    </div>
  );
};

