// Central motion model for the hybrid/legacy visual language.
// This file is intentionally data-only: dashboard can read/edit it
// without touching renderer layout code.

export const MOTION_MODEL_VERSION = 1;

export const ELEMENT_MOTION_CATALOG = [
  { id: 'drop',  label: '下落', axis: 'y', direction: 'down' },
  { id: 'rise',  label: '上浮', axis: 'y', direction: 'up' },
  { id: 'slide', label: '横移', axis: 'x', direction: 'right' },
  { id: 'sway',  label: '漂移', axis: 'xy', direction: 'loop' },
  { id: 'orbit', label: '环绕', axis: 'xy', direction: 'loop' },
  { id: 'pulse', label: '呼吸', axis: 'scale', direction: 'loop' },
  { id: 'flip',  label: '翻转', axis: 'x', direction: 'loop' },
  { id: 'draw',  label: '描画', axis: 'y', direction: 'down' },
  { id: 'rotate',label: '旋转', axis: 'rotate', direction: 'loop' }
];

export const MOTION_DEFAULTS = {
  elementSpeed: 1,
  elementSpeedMin: 0.06,
  elementSpeedMax: 0.80,
  elementOpacityMax: 0.85,
  textEnterDuration: 0.55,
  highlightDuration: 0.60,
  markDrawDuration: 0.55,
  pageTransitionDuration: 0.90
};

export function resolveMotionConfig(input = {}) {
  const src = input || {};
  const elementSpeed = Number.isFinite(Number(src.elementSpeed))
    ? Number(src.elementSpeed)
    : MOTION_DEFAULTS.elementSpeed;
  return {
    ...MOTION_DEFAULTS,
    ...src,
    elementSpeed: Math.max(MOTION_DEFAULTS.elementSpeedMin, Math.min(2, elementSpeed))
  };
}
