export const COLORS = {background: '#262725', text: '#F0EBD4', current: '#E7C85B', normal: '#A8C9B4', failure: '#EF8581', compare: '#E39BB0', supplement: '#DBA36D', outline: '#858C80'} as const;
export type Role = keyof typeof COLORS;
export const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
export type Icon = 'check' | 'cross' | 'trash' | 'lock' | 'warning' | 'timer' | 'person' | 'money' | 'gear' | 'star' | 'retry' | 'bidirectional';
export type Point = {x: number; y: number};
export type Primitive = {
  id: string; kind: 'rect' | 'ellipse' | 'path' | 'text' | 'icon';
  x?: number; y?: number; w?: number; h?: number; d?: string; text?: string; icon?: Icon;
  role?: Role; fill?: Role; hatch?: boolean; size?: number; align?: 'start' | 'middle' | 'end';
  startMs?: number; durationMs?: number; opacity?: number;
};
export type Scene = {id: string; title: string; takeaway: string; elements: Primitive[]};
export type Item = {label: string; detail?: string; role?: Role; icon?: Icon};
export function invariant(ok: unknown, message: string): asserts ok {if (!ok) throw new Error(`Handdrawn: ${message}`);}
export function count(items: unknown[], min: number, max: number, name: string) {invariant(items.length >= min && items.length <= max, `${name}: expected ${min}–${max} items`);}
export function validateScene(scene: Scene) {
  invariant(/^[a-zA-Z0-9_-]+$/.test(scene.id), 'id must be URL-safe');
  const ids = new Set<string>();
  for (const e of scene.elements) {
    invariant(!ids.has(e.id), 'duplicate primitive id'); ids.add(e.id);
    invariant(!e.role || e.role in COLORS, 'unknown semantic role');
    invariant(!e.fill || e.fill in COLORS, 'unknown fill role');
    for (const n of [e.x,e.y,e.w,e.h,e.size,e.startMs,e.durationMs,e.opacity]) invariant(n === undefined || Number.isFinite(n), 'non-finite geometry/time');
    invariant((e.durationMs ?? 500) > 0 && (e.startMs ?? 0) >= 0, 'invalid animation interval');
    invariant(e.opacity === undefined || (e.opacity >= 0 && e.opacity <= 1), 'invalid opacity');
    if (e.kind !== 'path') invariant(Number.isFinite(e.x) && Number.isFinite(e.y), 'position required');
    if (e.kind === 'icon') invariant(!!e.icon && ['check','cross','trash','lock','warning','timer','person','money','gear','star','retry','bidirectional'].includes(e.icon) && (e.size ?? 32) > 0, 'invalid icon');
    if (e.kind === 'text') invariant((e.size ?? 32) >= 24 && !!e.text, 'text must be nonempty and >=24px');
    if (e.kind === 'rect' || e.kind === 'ellipse') invariant((e.w ?? 0) > 0 && (e.h ?? 0) > 0, 'invalid shape dimensions');
    if (e.kind === 'path') invariant(!!e.d && !/NaN|Infinity/.test(e.d), 'invalid path');
  }
  return scene;
}
