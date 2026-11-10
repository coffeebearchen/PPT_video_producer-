import {spring} from 'remotion';
import type {SpringPreset} from '../types';

// 弹簧物理预设（《规范》3.1 节，以 FPS=60 为基准）
export const SPRING_CONFIGS: Record<SpringPreset, {mass: number; stiffness: number; damping: number}> = {
  snappy: {mass: 0.8, stiffness: 280, damping: 22},
  smooth_camera: {mass: 1.5, stiffness: 120, damping: 26},
  bouncy_emphasis: {mass: 1.0, stiffness: 220, damping: 14},
};

// 从 step 触发帧开始的弹簧进度 0→1
export const springProgress = (
  frame: number,
  triggerFrame: number,
  fps: number,
  preset: SpringPreset,
): number =>
  spring({
    frame: frame - triggerFrame,
    fps,
    config: SPRING_CONFIGS[preset],
    durationInFrames: undefined,
  });

// 常驻呼吸微漂移（《规范》3.2 节）
export const breathDrift = (frame: number): {x: number; y: number} => ({
  x: 4 * Math.sin((2 * Math.PI * frame) / 300),
  y: 3 * Math.cos((2 * Math.PI * frame) / 420),
});
