import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {pathPaths} from '../../engine/sketch';
import {flowBoxes, flowEdgePath, type Slide} from '../model';
import {DYNAMICFLOW_TOKENS as t} from '../styles';
import {easeOut, flowSchedule, MOTION, smooth, staticContent, unit} from './timing';

export const ChalkBox: React.FC<{x: number; y: number; w: number; h: number; seed: number; progress: number; color?: string; opacity?: number}> = ({x, y, w, h, seed, progress, color = t.line, opacity = 1}) => {
  const paths = useMemo(() => pathPaths(`M${x + 10} ${y} H${x + w - 10} Q${x + w} ${y} ${x + w} ${y + 10} V${y + h - 10} Q${x + w} ${y + h} ${x + w - 10} ${y + h} H${x + 10} Q${x} ${y + h} ${x} ${y + h - 10} V${y + 10} Q${x} ${y} ${x + 10} ${y}`, {seed, roughness: .55, bowing: .4, stroke: color, strokeWidth: 2}), [x, y, w, h, seed, color]);
  return <g opacity={opacity}><rect x={x} y={y} width={w} height={h} rx={t.radius} fill={t.surface} opacity={progress * .65}/>{paths.map((p, i) => <path key={i} d={p.d} fill="none" stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} opacity={progress === 0 ? 0 : 1}/>)}</g>;
};

export const Flow: React.FC<{slide: Slide}> = ({slide}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const ms = frame / fps * 1000;
  const plan = flowSchedule(slide); const done = staticContent(slide, fps, plan.end);
  const boxes = flowBoxes(slide.nodes!.length);
  const marker = `df-arrow-${slide.id}`;
  return <>
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs><marker id={marker} markerUnits="userSpaceOnUse" markerWidth={12} markerHeight={12} refX={10} refY={6} orient="auto"><path d="M1 1 L10 6 L1 11" fill="none" stroke={t.primary} strokeWidth={2.5}/></marker></defs>
      {plan.nodes.flatMap(n => n.outgoing.map(({edge, at}) => {
        const a = boxes[slide.nodes!.findIndex(v => v.id === edge.from)], b = boxes[slide.nodes!.findIndex(v => v.id === edge.to)];
        const p = done ? 1 : smooth(unit(ms, at, MOTION.edge));
        return <path key={`${edge.from}-${edge.to}`} data-cw-edge d={flowEdgePath(a, b, slide.edges!.indexOf(edge))} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={p === 0 ? 0 : 1} fill="none" stroke={t.primary} strokeWidth={3} strokeLinecap="round" markerEnd={p >= .8 ? `url(#${marker})` : undefined}/>;
      }))}
      {boxes.map((b, i) => {
        const p = done ? 1 : smooth(unit(ms, plan.nodes[i].start, MOTION.outline));
        const next = plan.nodes[i + 1]; const dim = !done && next ? 1 - .55 * unit(ms, next.start, MOTION.dim) : 1;
        return <ChalkBox key={slide.nodes![i].id} {...b} seed={41 + i * 7} progress={p} color={i === boxes.length - 1 ? t.accent : t.primary} opacity={dim}/>;
      })}
    </svg>
    {boxes.map((b, i) => <div key={slide.nodes![i].id} data-cw-content data-cw-node={slide.nodes![i].id} style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, padding: '12px 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: done ? 1 : unit(ms, plan.nodes[i].start + MOTION.outline, MOTION.label)}}><div data-cw-text="node" style={{fontSize: 40, lineHeight: 1.35, textAlign: 'center', overflowWrap: 'anywhere', color: i === boxes.length - 1 ? t.accent : t.ink}}>{slide.nodes![i].label}</div></div>)}
  </>;
};

export const Bullets: React.FC<{slide: Slide}> = ({slide}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const ms = frame / fps * 1000;
  const items = slide.bullets!; const height = items.length * 136 + (items.length - 1) * 20;
  const done = staticContent(slide, fps, MOTION.title + (items.length - 1) * MOTION.stagger + MOTION.bullet);
  return <>{items.map((text, i) => {
    const p = done ? 1 : easeOut(unit(ms, MOTION.title + i * MOTION.stagger, MOTION.bullet));
    const y = 560 + (760 - height) / 2 + i * 156;
    return <div key={i} data-cw-content style={{position: 'absolute', left: 148, top: y, width: 784, height: 136, opacity: p, transform: `translateY(${8 * (1 - p)}px)`}}>
      <svg width={784} height={136} style={{position: 'absolute', inset: 0}}><ChalkBox x={2} y={2} w={780} h={132} seed={61 + i * 7} progress={1} color={i === items.length - 1 ? t.accent : t.line}/></svg>
      <div data-cw-text="bullet" style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 28px', textAlign: 'center', fontSize: 40, lineHeight: 1.35, overflowWrap: 'anywhere'}}>{text}</div>
    </div>;
  })}</>;
};
