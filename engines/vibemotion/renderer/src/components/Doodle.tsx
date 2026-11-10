import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {rectPaths, circlePaths, linePaths, pathPaths} from '../engine/sketch';
import {GOLD, SAGE, CORAL, INK, MUTED} from '../engine/tokens';
import {LottieSprite} from './LottieSprite';

// ── 手绘小配件库（Rough.js 绘制 + 自带小动画）──
export type DoodleType =
  | 'image'
  | 'lottie'
  | 'star'
  | 'sparkle'
  | 'robot'
  | 'magnifier'
  | 'arrow'
  | 'check'
  | 'cross'
  | 'question'
  | 'hatchedCircle'
  | 'hatchedDot'
  | 'wave'
  | 'circleMark'
  | 'bulb'
  | 'chatBubble'
  | 'bolt'
  | 'underline';

export type DoodleAnim = 'twinkle' | 'bob' | 'spin' | 'wiggle' | 'pulse' | 'static' | 'reveal' | 'slideIn' | 'pop';

export interface DoodleItem {
  type: DoodleType;
  /** 0~1 相对画面坐标 */
  x: number;
  y: number;
  size?: number;
  tone?: 'gold' | 'sage' | 'coral' | 'ink' | 'muted';
  anim?: DoodleAnim;
  /** 延迟出现（帧） */
  delay?: number;
  /** type=image 时的图片路径，如 assets/star.png（相对 public/） */
  src?: string;
  opacity?: number;
  /** 图片滤镜，例如深底上把黑线稿反白：invert(1) hue-rotate(180deg) */
  filter?: string;
}

const toneHex = (t?: string) => (t === 'sage' ? SAGE : t === 'coral' ? CORAL : t === 'ink' ? INK : t === 'muted' ? MUTED : GOLD);

type P = {d: string; stroke: string; strokeWidth: number; fill: string};

const starD = (s: number) => {
  const cx = s / 2;
  const cy = s / 2;
  const R = s * 0.46;
  const r = s * 0.2;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? R : r;
    pts.push(`${(cx + rr * Math.cos(ang)).toFixed(1)} ${(cy + rr * Math.sin(ang)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
};

const build = (type: DoodleType, s: number, tone?: string): P[] => {
  const col = toneHex(tone);
  const sw = Math.max(1.6, s * 0.05);
  const o = {stroke: col, strokeWidth: sw, roughness: 1.5, seed: 13};
  const P2 = (d: string, fill = 'none') => pathPaths(d, o).map((p) => ({...p, fill}));
  const L = (x1: number, y1: number, x2: number, y2: number) => linePaths(x1, y1, x2, y2, o);
  const C = (cx: number, cy: number, d: number) => circlePaths(cx, cy, d, o);

  switch (type) {
    case 'star':
      return P2(starD(s), 'rgba(226,190,92,0.15)');
    case 'sparkle':
      return [
        ...P2(`M ${s / 2} ${s * 0.12} L ${s * 0.58} ${s * 0.42} L ${s * 0.88} ${s / 2} L ${s * 0.58} ${s * 0.58} L ${s / 2} ${s * 0.88} L ${s * 0.42} ${s * 0.58} L ${s * 0.12} ${s / 2} L ${s * 0.42} ${s * 0.42} Z`),
      ];
    case 'robot':
      return [
        ...rectPaths(s * 0.18, s * 0.26, s * 0.64, s * 0.52, {stroke: col, strokeWidth: sw, seed: 21}),
        ...C(s * 0.38, s * 0.46, s * 0.12),
        ...C(s * 0.62, s * 0.46, s * 0.12),
        ...L(s * 0.5, s * 0.26, s * 0.5, s * 0.14),
        ...C(s * 0.5, s * 0.1, s * 0.07),
        ...L(s * 0.36, s * 0.66, s * 0.64, s * 0.66),
      ];
    case 'magnifier':
      return [...C(s * 0.44, s * 0.42, s * 0.5), ...L(s * 0.62, s * 0.62, s * 0.86, s * 0.86)];
    case 'arrow':
      return [
        ...P2(`M ${s * 0.1} ${s * 0.62} Q ${s * 0.45} ${s * 0.3} ${s * 0.86} ${s * 0.5}`),
        ...L(s * 0.86, s * 0.5, s * 0.68, s * 0.42),
        ...L(s * 0.86, s * 0.5, s * 0.74, s * 0.66),
      ];
    case 'check':
      return P2(`M ${s * 0.18} ${s * 0.55} L ${s * 0.42} ${s * 0.78} L ${s * 0.84} ${s * 0.22}`, 'none');
    case 'cross':
      return [...L(s * 0.22, s * 0.22, s * 0.78, s * 0.78), ...L(s * 0.78, s * 0.22, s * 0.22, s * 0.78)];
    case 'question':
      return [
        ...P2(
          `M ${s * 0.28} ${s * 0.32} Q ${s * 0.28} ${s * 0.12} ${s * 0.5} ${s * 0.12} Q ${s * 0.74} ${s * 0.12} ${s * 0.74} ${s * 0.32} Q ${s * 0.74} ${s * 0.48} ${s * 0.5} ${s * 0.55} L ${s * 0.5} ${s * 0.66}`,
        ),
        ...C(s * 0.5, s * 0.86, s * 0.1),
      ];
    case 'hatchedCircle': {
      const out: P[] = [...C(s / 2, s / 2, s * 0.84)];
      for (let i = 0; i < 7; i++) {
        const y = s * 0.22 + i * s * 0.09;
        const half = Math.sqrt(Math.max(0, (s * 0.42) ** 2 - (y - s / 2) ** 2));
        out.push(...L(s / 2 - half, y, s / 2 + half, y));
      }
      return out;
    }
    case 'hatchedDot': {
      const out: P[] = [...C(s / 2, s / 2, s * 0.8)];
      for (let i = 0; i < 4; i++) {
        const y = s * 0.32 + i * s * 0.12;
        const half = Math.sqrt(Math.max(0, (s * 0.38) ** 2 - (y - s / 2) ** 2));
        if (half > 1) out.push(...L(s / 2 - half, y, s / 2 + half, y));
      }
      return out;
    }
    case 'wave':
      return P2(`M 0 ${s * 0.6} Q ${s * 0.15} ${s * 0.15} ${s * 0.3} ${s * 0.6} T ${s * 0.6} ${s * 0.6} T ${s * 0.9} ${s * 0.6}`);
    case 'circleMark':
      return P2(
        `M ${s * 0.5} ${s * 0.08} C ${s * 0.9} ${s * 0.02} ${s * 0.98} ${s * 0.6} ${s * 0.72} ${s * 0.9} C ${s * 0.42} ${s * 1.05} ${s * 0.04} ${s * 0.8} ${s * 0.08} ${s * 0.46} C ${s * 0.12} ${s * 0.16} ${s * 0.32} ${s * 0.1} ${s * 0.5} ${s * 0.12}`,
      );
    case 'bulb':
      return [
        ...C(s * 0.5, s * 0.42, s * 0.56),
        ...rectPaths(s * 0.4, s * 0.68, s * 0.2, s * 0.14, {stroke: col, strokeWidth: sw, seed: 31}),
        ...L(s * 0.32, s * 0.86, s * 0.68, s * 0.86),
        ...L(s * 0.5, s * 0.12, s * 0.5, s * 0.02),
        ...L(s * 0.2, s * 0.2, s * 0.12, s * 0.12),
        ...L(s * 0.8, s * 0.2, s * 0.88, s * 0.12),
      ];
    case 'chatBubble':
      return [
        ...rectPaths(s * 0.12, s * 0.16, s * 0.76, s * 0.5, {stroke: col, strokeWidth: sw, seed: 41}),
        ...P2(`M ${s * 0.34} ${s * 0.66} L ${s * 0.3} ${s * 0.9} L ${s * 0.52} ${s * 0.66}`),
      ];
    case 'bolt':
      return P2(`M ${s * 0.56} ${s * 0.08} L ${s * 0.3} ${s * 0.54} L ${s * 0.48} ${s * 0.54} L ${s * 0.42} ${s * 0.94} L ${s * 0.72} ${s * 0.44} L ${s * 0.54} ${s * 0.44} Z`);
    case 'underline':
      return P2(`M ${s * 0.04} ${s * 0.6} Q ${s * 0.3} ${s * 0.76} ${s * 0.96} ${s * 0.52}`);
    default:
      return [];
  }
};

const animStyle = (anim: DoodleAnim | undefined, frame: number, phase: number): React.CSSProperties => {  const t = frame + phase * 13;
  switch (anim) {
    case 'twinkle':
      return {transform: `scale(${0.88 + 0.16 * (0.5 + 0.5 * Math.sin(t / 9))})`, opacity: 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t / 9))};
    case 'bob':
      return {transform: `translateY(${Math.sin(t / 16) * 6}px)`};
    case 'spin':
      return {transform: `rotate(${(t * 1.1) % 360}deg)`};
    case 'wiggle':
      return {transform: `rotate(${Math.sin(t / 12) * 7}deg)`};
    case 'pulse':
      return {transform: `scale(${0.96 + 0.08 * (0.5 + 0.5 * Math.sin(t / 20))})`};
    default:
      return {};
  }
};

export const Doodle: React.FC<{item: DoodleItem; index: number; scale: number}> = ({item, index, scale}) => {
  const frame = useCurrentFrame();
  const size = (item.size ?? 80) * scale;
  const paths = build(item.type, size, item.tone);
  const delay = item.delay ?? 0;
  const appear = Math.max(0, Math.min(1, (frame - delay) / 10));

  return (
    <div
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) scale(${appear})`,
        opacity: appear,
        pointerEvents: 'none',
        ...animStyle(item.anim, frame, index),
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow: 'visible'}}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
};

// 外部图片配件（PNG / WebP / SVG，最好带透明通道）
export const ImageSprite: React.FC<{item: DoodleItem; index: number; scale: number}> = ({item, index, scale}) => {
  const frame = useCurrentFrame();
  const size = (item.size ?? 160) * scale;
  const delay = item.delay ?? 0;
  const appear = Math.max(0, Math.min(1, (frame - delay) / 14));
  const anim = item.anim ?? 'bob';

  let inner: React.CSSProperties = {};
  if (anim === 'reveal') {
    inner = {clipPath: `inset(${(1 - appear) * 100}% 0 0 0)`};
  } else if (anim === 'slideIn') {
    inner = {transform: `translateX(${(1 - appear) * (item.x < 0.5 ? -520 : 520)}px)`};
  } else if (anim === 'pop') {
    inner = {transform: `scale(${0.6 + 0.4 * appear})`};
  } else {
    inner = animStyle(anim, frame, index);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        width: size,
        transform: 'translate(-50%, -50%)',
        opacity: item.opacity ?? 1,
        pointerEvents: 'none',
      }}
    >
      <div style={{opacity: appear, ...inner}}>
        <Img
          src={staticFile(item.src ?? '')}
          style={{width: '100%', height: 'auto', display: 'block', filter: item.filter}}
        />
      </div>
    </div>
  );
};

// 一层配件：由场景 props.decor 驱动
export const DoodleLayer: React.FC<{items: DoodleItem[]; scale: number}> = ({items, scale}) => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
    {items.map((it, i) =>
      it.type === 'lottie' && it.src ? (
        <LottieSprite key={i} item={it} index={i} scale={scale} />
      ) : it.type === 'image' && it.src ? (
        <ImageSprite key={i} item={it} index={i} scale={scale} />
      ) : (
        <Doodle key={i} item={it} index={i} scale={scale} />
      ),
    )}
  </div>
);

