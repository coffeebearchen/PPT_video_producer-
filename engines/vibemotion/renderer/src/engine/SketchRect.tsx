import React, {useMemo} from 'react';
import {rectPaths, linePaths, circlePaths, type SketchOpts} from './sketch';

// 手绘矩形框（随组件宽度自适应，用于替换 CSS 边框）
export const SketchRect: React.FC<{
  w: number;
  h: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
} & SketchOpts> = ({w, h, x = 0, y = 0, style, ...opts}) => {
  const paths = useMemo(() => rectPaths(x, y, w, h, opts), [w, h, x, y, opts.stroke, opts.strokeWidth, opts.fill, opts.seed]);
  return (
    <svg
      style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', ...style}}
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />
      ))}
    </svg>
  );
};

// 手绘横线（流程连接线）
export const SketchLine: React.FC<{w: number; h: number; x1?: number; y1?: number; x2?: number; y2?: number} & SketchOpts> = ({
  w,
  h,
  x1 = 0,
  y1,
  x2,
  y2,
  ...opts
}) => {
  const yy = y1 ?? h / 2;
  const paths = useMemo(() => linePaths(x1, yy, x2 ?? w, y2 ?? yy, opts), [w, h, x1, x2, yy, opts.stroke, opts.strokeWidth, opts.seed]);
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none'}}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
};

// 手绘圆
export const SketchCircle: React.FC<{size: number; style?: React.CSSProperties} & SketchOpts> = ({size, style, ...opts}) => {
  const paths = useMemo(() => circlePaths(size / 2, size / 2, size - 4, opts), [size, opts.stroke, opts.strokeWidth, opts.fill, opts.seed]);
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, width: size, height: size, overflow: 'visible', pointerEvents: 'none', ...style}}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />
      ))}
    </svg>
  );
};

