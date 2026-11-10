import rough from 'roughjs';

const gen = rough.generator();

export type SketchOpts = {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  seed?: number;
  roughness?: number;
  bowing?: number;
};

type Path = {d: string; stroke: string; strokeWidth: number; fill: string};

const mk = (o: SketchOpts) => ({
  stroke: o.stroke ?? '#8A918B',
  strokeWidth: o.strokeWidth ?? 2,
  roughness: o.roughness ?? 1.25,
  bowing: o.bowing ?? 1.1,
  seed: o.seed ?? 1,
  ...(o.fill ? {fill: o.fill, fillStyle: 'solid' as const} : {}),
});

const toPaths = (drawable: any): Path[] =>
  gen.toPaths(drawable).map((p: any) => ({
    d: p.d,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    fill: p.fill ?? 'none',
  }));

/** 手绘矩形（Rough.js 生成，真正的多次抖动描边） */
export const rectPaths = (x: number, y: number, w: number, h: number, o: SketchOpts = {}): Path[] =>
  toPaths(gen.rectangle(x, y, w, h, mk(o)));

/** 手绘直线 */
export const linePaths = (x1: number, y1: number, x2: number, y2: number, o: SketchOpts = {}): Path[] =>
  toPaths(gen.line(x1, y1, x2, y2, mk(o)));

/** 手绘圆 */
export const circlePaths = (cx: number, cy: number, d: number, o: SketchOpts = {}): Path[] =>
  toPaths(gen.circle(cx, cy, d, mk(o)));

/** 手绘圆弧（CycleFlow 用） */
export const arcPaths = (
  cx: number,
  cy: number,
  w: number,
  h: number,
  start: number,
  stop: number,
  o: SketchOpts = {},
): Path[] => toPaths(gen.arc(cx, cy, w, h, start, stop, false, mk(o)));

/** 手绘任意路径（曲线连线用） */
export const pathPaths = (d: string, o: SketchOpts = {}): Path[] => toPaths(gen.path(d, mk(o)));
