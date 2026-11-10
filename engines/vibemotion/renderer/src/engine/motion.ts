import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useSceneStart} from './sceneContext';

// ── 运动原语库：所有动画都由「本地帧」确定性驱动，可逐帧复现 ──
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 场景内本地帧 */
export const useLocal = () => {
  const frame = useCurrentFrame();
  const start = useSceneStart();
  return frame - start;
};

/** 逐个入场：返回 N 个 0→1 进度（错峰） */
export const useStagger = (count: number, step = 7, dur = 11): number[] => {
  const local = useLocal();
  return Array.from({length: Math.max(count, 1)}, (_, i) => clamp01((local - i * step) / dur));
};

/** 漂浮：轻微上下左右飘（像纸片/粉笔屑） */
export const useFloat = (amp = 8, speed = 26, phase = 0) => {
  const local = useLocal();
  return {x: Math.cos(local / speed + phase) * amp * 0.6, y: Math.sin(local / (speed * 0.7) + phase) * amp};
};

/** 呼吸缩放 */
export const useBreathe = (amp = 0.025, speed = 30, phase = 0) => {
  const local = useLocal();
  return 1 + Math.sin(local / speed + phase) * amp;
};

/** 光晕脉冲 0..1 */
export const useGlow = (speed = 18, phase = 0) => {
  const local = useLocal();
  return 0.5 + 0.5 * Math.sin(local / speed + phase);
};

/** 歪斜摆动（度） */
export const useWobble = (deg = 0.8, speed = 40, phase = 0) => {
  const local = useLocal();
  return Math.sin(local / speed + phase) * deg;
};

/** 匀速旋转（度） */
export const useSpin = (degPerFrame = 0.6) => useLocal() * degPerFrame;

/** 描边生长 0..1 */
export const useDraw = (dur = 14, delay = 0) => clamp01((useLocal() - delay) / dur);

/** 弹簧入场（带过冲） */
export const useSpringIn = (delay = 0, damping = 14, stiffness = 130) => {
  const local = useLocal();
  const {fps} = useVideoConfig();
  return spring({frame: local - delay, fps, config: {damping, stiffness, mass: 0.6}});
};

/** 数字递增（用于百分比/计数） */
export const useCountUp = (target: number, dur = 20, delay = 0) =>
  target * clamp01((useLocal() - delay) / dur);
