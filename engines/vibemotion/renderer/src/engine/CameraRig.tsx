import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {CameraState} from './SceneController';
import {breathDrift} from './spring';

// 2.5D 虚拟摄像机：透视 + 平移缩放旋转 + 常驻呼吸微漂移（《规范》3.2 节）
export const CameraRig: React.FC<{camera: CameraState; children: React.ReactNode}> = ({
  camera,
  children,
}) => {
  const frame = useCurrentFrame();
  const drift = breathDrift(frame);

  const t = `perspective(1200px) translate3d(${camera.offsetX + drift.x}px, ${
    camera.offsetY + drift.y
  }px, 0) scale(${camera.scale}) rotateX(${camera.rotateX}deg) rotateY(${camera.rotateY}deg)`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: t,
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
};

