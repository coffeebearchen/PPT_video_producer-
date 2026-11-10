import React from 'react';
import {AbsoluteFill, Img, staticFile, useVideoConfig} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, INK, MUTED} from '../engine/tokens';
import {Kicker, useU} from '../engine/ui';

export interface BrowserDOMSpotlightProps {
  screenshotSrc?: string;
  caption?: string;
  highlight?: {x: number; y: number; w: number; h: number};
  dim?: number;
}

// 组件 10：网页/论文截图聚光灯（金色手绘取景框）
export const BrowserDOMSpotlight: React.FC<BrowserDOMSpotlightProps> = ({
  screenshotSrc,
  caption,
  highlight,
  dim = 0.62,
}) => {
  const u = useU();
  const {width} = useVideoConfig();
  const w = width - 96 * u;
  const h = 980 * u;
  const hl = highlight ?? {x: 0.2, y: 0.3, w: 0.5, h: 0.12};

  const mask = `radial-gradient(ellipse ${hl.w * w}px ${hl.h * h}px at ${hl.x * w}px ${hl.y * h}px, transparent 0%, transparent 45%, rgba(6,6,6,${dim}) 100%)`;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>原 文 出 处</Kicker>
      {caption ? (
        <div style={{marginTop: 14, fontFamily: FONT, fontSize: 39 * u, color: INK, lineHeight: 1.4}}>{caption}</div>
      ) : null}

      <div
        style={{
          position: 'relative',
          width: w,
          height: h,
          marginTop: 36,
          borderRadius: 14 * u,
          overflow: 'hidden',
          border: `2px solid ${SAGE}`,
          background: '#1C1C1C',
        }}
      >
        {screenshotSrc ? (
          <Img src={staticFile(screenshotSrc)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT,
              fontSize: 35 * u,
              color: MUTED,
            }}
          >
            · 网页 / 论文截图（放 public/screenshots） ·
          </div>
        )}

        {/* 暗角遮罩 */}
        <div style={{position: 'absolute', inset: 0, background: 'rgba(6,6,6,0.0)', maskImage: mask, WebkitMaskImage: mask}} />

        {/* 金色取景框 */}
        <div
          style={{
            position: 'absolute',
            left: hl.x * w - hl.w * w / 2,
            top: hl.y * h - hl.h * h / 2,
            width: hl.w * w,
            height: hl.h * h,
            border: `3px solid ${GOLD}`,
            borderRadius: 6 * u,
            boxShadow: '0 0 26px rgba(226,190,92,0.6)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

