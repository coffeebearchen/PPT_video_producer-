import React from 'react';
import type {ThemePalette} from '../types';
import type {CameraState} from './SceneController';

// 手绘讲解风背景：暖炭灰底 + 极轻暖光晕 + 纸张颗粒 + 暗角
export const AmbientBg: React.FC<{palette: ThemePalette; camera: CameraState}> = ({palette, camera}) => {
  const parX = -camera.offsetX * 0.12;
  const parY = -camera.offsetY * 0.12;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: palette.bgCanvas}}>
      {/* 极轻暖光晕：仅让中心略亮，保持黑板氛围 */}
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          left: -340,
          top: -460,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.030) 0%, transparent 62%)',
          transform: `translate(${parX}px, ${parY}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          right: -360,
          bottom: -480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.018) 0%, transparent 62%)',
          transform: `translate(${parX}px, ${parY}px)`,
        }}
      />

      {/* 纸张颗粒（手绘质感） */}
      <svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.055, mixBlendMode: 'overlay'}}>
        <filter id="vm-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#vm-grain)" />
      </svg>

      {/* 暗角 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(120% 82% at 50% 40%, transparent 42%, rgba(12,12,12,0.8) 100%)',
        }}
      />
    </div>
  );
};

