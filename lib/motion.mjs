export const MOTION_TYPES = ['slideX', 'slideY', 'rotateIn', 'scaleIn', 'float', 'none'];

const E = {
  meta: { type: 'slideY', fromY: -18, toY: 0, start: -0.80, duration: 0.50, ease: 'outCubic', fade: true },
  kicker: { type: 'slideY', fromY: 30, toY: 0, start: -0.80, duration: 0.60, ease: 'outCubic', fade: true },
  ip: { type: 'scaleIn', fromScale: 0.94, start: -0.70, duration: 0.58, ease: 'outCubic', fade: true },
  foot: { type: 'slideY', fromY: 18, toY: 0, start: 0.85, duration: 0.55, ease: 'outCubic', fade: true }
};

export const MOTION_PRESETS = {
  flow: {
    transition: { mode: 'slide', duration: 0.90 },
    envelope: { type: 'slideX', start: 0.82, duration: 2.35, fromX: -300, toX: 0, fromRot: -7, toRot: 0, ease: 'outCubic' },
    nas: { type: 'slideX', start: 5.08, duration: 0.55, fromX: -110, toX: 0, fromY: 32, toY: 0, ease: 'outCubic', fade: true },
    cloud: { type: 'slideX', start: 5.64, duration: 0.50, fromX: 110, toX: 0, fromY: 32, toY: 0, ease: 'outCubic', fade: true },
    elements: {
      'p1-meta': E.meta,
      'p1-kicker': E.kicker,
      'p1-ip': E.ip,
      'p1-mail': { type: 'slideY', fromY: 24, toY: 0, start: 0.10, duration: 0.55, ease: 'outCubic', fade: true },
      'p1-foot': E.foot,
      'p2-meta': { ...E.meta, start: 4.92 },
      'p2-kicker': { ...E.kicker, start: 5.00 },
      'p2-conclusion': { type: 'slideY', fromY: 26, toY: 0, start: 6.02, duration: 0.40, ease: 'outCubic', fade: true },
      'p2-foot': { ...E.foot, start: 6.40 },
      'p3-meta': { ...E.meta, start: 10.98 },
      'p3-kicker': { ...E.kicker, start: 11.04 },
      'p3-info': { type: 'slideY', fromY: 24, toY: 0, start: 11.38, duration: 0.55, ease: 'outCubic', fade: true },
      'p3-note': { type: 'slideY', fromY: 20, toY: 0, start: 11.66, duration: 0.55, ease: 'outCubic', fade: true },
      'p3-bottom': { type: 'slideY', fromY: 16, toY: 0, start: 11.76, duration: 0.55, ease: 'outCubic', fade: true }
    }
  },
  strong: {
    transition: { mode: 'wipe_up', duration: 0.78 },
    envelope: { type: 'slideX', start: 0.72, duration: 1.75, fromX: -380, toX: 0, fromRot: -13, toRot: 0, ease: 'outBack' },
    nas: { type: 'slideX', start: 5.06, duration: 0.45, fromX: -170, toX: 0, fromY: 44, toY: 0, ease: 'outBack', fade: true },
    cloud: { type: 'slideX', start: 5.60, duration: 0.42, fromX: 170, toX: 0, fromY: 44, toY: 0, ease: 'outBack', fade: true },
    elements: {
      'p1-meta': { ...E.meta, fromY: -28, duration: 0.42 },
      'p1-kicker': { ...E.kicker, fromY: 44 },
      'p1-ip': { type: 'scaleIn', fromScale: 0.86, fromRot: -4, start: -0.70, duration: 0.62, ease: 'outBack', fade: true },
      'p1-mail': { type: 'slideX', fromX: -80, toX: 0, start: 0.10, duration: 0.55, ease: 'outBack', fade: true },
      'p1-foot': { ...E.foot, fromY: 28 },
      'p2-meta': { ...E.meta, start: 4.92, fromY: -28 },
      'p2-kicker': { ...E.kicker, start: 5.00, fromY: 44 },
      'p2-conclusion': { type: 'slideY', fromY: 40, toY: 0, start: 6.02, duration: 0.38, ease: 'outBack', fade: true },
      'p2-foot': { ...E.foot, start: 6.40, fromY: 26 },
      'p3-meta': { ...E.meta, start: 10.98, fromY: -28 },
      'p3-kicker': { ...E.kicker, start: 11.04, fromY: 44 },
      'p3-info': { type: 'slideY', fromY: 38, toY: 0, start: 11.38, duration: 0.48, ease: 'outBack', fade: true },
      'p3-note': { type: 'slideY', fromY: 30, toY: 0, start: 11.66, duration: 0.48, ease: 'outBack', fade: true },
      'p3-bottom': { type: 'slideY', fromY: 24, toY: 0, start: 11.76, duration: 0.48, ease: 'outBack', fade: true }
    }
  },
  none: {
    transition: { mode: 'slide', duration: 0.90 },
    envelope: { type: 'none', start: 0.01, duration: 0.01 },
    nas: { type: 'none', start: 5.08, duration: 0.01, fade: true },
    cloud: { type: 'none', start: 5.64, duration: 0.01, fade: true },
    elements: {}
  }
};

export function buildMotion(presetId = 'flow', overrides = {}) {
  const preset = MOTION_PRESETS[presetId] || MOTION_PRESETS.flow;
  const out = { ...preset, elements: { ...(preset.elements || {}) } };
  for (const key of Object.keys(overrides || {})) {
    if (key === 'elements') continue;
    if (key === 'transition') out.transition = { ...(preset.transition || {}), ...(overrides.transition || {}) };
    else if (key === 'envelope' || key === 'nas' || key === 'cloud') out[key] = { ...(preset[key] || {}), ...(overrides[key] || {}) };
  }
  out.elements = { ...(preset.elements || {}), ...((overrides && overrides.elements) || {}) };
  out.preset = presetId;
  return out;
}
