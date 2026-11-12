import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {BrowserDOMSpotlight} from '../components/BrowserDOMSpotlight';
import {rectPaths} from '../engine/sketch';
import {coursewareStyleTokens as styleTokens} from './styles';
import {cameraPoint, containTarget, effectPlan, effectTilt, effectUnit, flowBoxes, flowEdgePath, screenshotCamera} from './model';
import type {AnnotationKind, Rect, ResolvedProps, Slide} from './model';
import {revealValue, ScreenshotEmphasis} from './Effects';

// Adapt gallery.tsx's private AnnotationDemo primitives without registering its root.
export const Annotation: React.FC<{kind: AnnotationKind; box: Rect; color: string; progress: number; placement?: 'top' | 'side'}> = ({kind, box: r, color, progress, placement = 'side'}) => {
  const draw = {pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - progress};
  if (kind === 'circle') return <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2} rx={r.w / 2 + 7} ry={r.h / 2 + 7} stroke={color} strokeWidth={5} fill="none" {...draw}/>;
  if (kind === 'underline') return <path d={`M${r.x} ${r.y + r.h + 7} Q${r.x + r.w / 2} ${r.y + r.h + 12} ${r.x + r.w} ${r.y + r.h + 5}`} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" {...draw}/>;
  if (kind === 'highlight') return <rect x={r.x} y={r.y} width={r.w * progress} height={r.h} rx={8} fill={color} opacity={0.24}/>;
  if (kind === 'bubble') {
    const x = Math.min(906, Math.max(8, r.x + r.w - 70)); const y = Math.max(8, r.y - 70);
    return <g opacity={progress} transform={progress < 1 ? `translate(${x + 35} ${y + 29}) scale(${progress * progress * (3 - 2 * progress)}) translate(${-x - 35} ${-y - 29})` : undefined}><rect x={x} y={y} width={70} height={58} rx={29} fill={color}/><path d={`M${x + 20} ${y + 55} l20 14 0 -14`} fill={color}/><text x={x + 35} y={y + 40} textAnchor="middle" fontFamily="LXGW WenKai" fontSize={36} fill="#101612">✓</text></g>;
  }
  if (placement === 'top') {
    const x = r.x + r.w / 2; const y = r.y - 10;
    return <g fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"><path d={`M${x + 65} ${y - 85} Q${x} ${y - 85} ${x} ${y}`} {...draw}/><path d={`M${x - 14} ${y - 22} L${x} ${y} L${x + 14} ${y - 22}`} opacity={progress}/></g>;
  }
  const right = 984 - r.x - r.w >= r.x;
  const endX = right ? r.x + r.w + 10 : r.x - 10;
  const startX = right ? Math.min(950, endX + 160) : Math.max(34, endX - 160);
  const endY = r.y + r.h / 2; const startY = Math.max(30, endY - 90);
  return <g fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"><path d={`M${startX} ${startY} Q${endX} ${startY} ${endX} ${endY}`} {...draw}/><path d={`M${endX - 14} ${endY - 22} L${endX} ${endY} L${endX + 14} ${endY - 22}`} opacity={progress}/></g>;
};

export const Screenshot: React.FC<{slide: Slide; project: ResolvedProps}> = ({slide, project}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const a = slide.asset!;
  const target = slide.highlight ? containTarget(slide.highlight, a.width, a.height) : undefined;
  const camera = screenshotCamera(slide, frame); const t = styleTokens(project.style); const maskId = `cw-dim-${slide.id}`;
  const hook = slide.fromFrame === 0 ? project.hook : undefined;
  const plan = effectPlan(slide, fps, hook); const time = frame / fps * 1000;
  const annotationProgress = slide.effects?.annotationAnim ? effectUnit(time, plan.annotation) : 1;
  const emphasisProgress = effectUnit(time, plan.emphasis); const pulse = slide.effects?.emphasis?.type === 'pulse' ? Math.sin(Math.PI * slide.effects.emphasis.times! * emphasisProgress) ** 2 : 0;
  const tilt = effectTilt(slide, frame, fps, hook);
  const reveal = revealValue(slide, frame, fps, Number(Boolean(slide.text)) + Number(Boolean(slide.body)), 'element', hook);
  return <div data-cw-content data-cw-viewport style={{position: 'absolute', left: 146.4, top: 550, width: 984, height: 980, transform: `translateY(${8 * (1 - reveal)}px) scale(.8)`, opacity: reveal, transformOrigin: 'top left', overflow: 'hidden', borderRadius: t.radius, background: t.surface}}>
    <div className="cw-shot" data-cw-shot={target ? true : undefined} data-no-highlight={!target} data-highlight={target ? JSON.stringify(slide.highlight) : undefined} data-source-width={a.width} data-source-height={a.height} data-cw-zoom-scale={camera.scale} data-cw-zoom-requested={camera.requestedScale} data-cw-camera style={{position: 'absolute', inset: 0, width: 984, height: 980, transform: `translate(${camera.translateX}px, ${camera.translateY}px) scale(${camera.scale})${Math.abs(tilt) > .000001 ? ` perspective(1200px) rotateY(${tilt}deg)` : ''}`, transformOrigin: `${camera.originX}px ${camera.originY}px`, '--cw-accent': t.accent} as React.CSSProperties}>
    <BrowserDOMSpotlight screenshotSrc={a.src} highlight={target ? {x: (target.x + target.w / 2) / 984, y: (target.y + target.h / 2) / 980, w: target.w / 984, h: target.h / 980} : {x: .5, y: .5, w: 1, h: 1}} dim={target ? slide.dim : 0}/>
    {target && <svg viewBox="0 0 984 980" data-cw-zoom-overlay style={{position: 'absolute', inset: 0, width: 984, height: 980, pointerEvents: 'none', overflow: 'visible'}}>
      <defs><mask id={maskId}><rect width={984} height={980} fill="white"/><rect x={target.x - 3} y={target.y - 3} width={target.w + 6} height={target.h + 6} rx={6} fill="black"/></mask></defs>
      <rect width={984} height={980} fill="#080E0B" opacity={slide.dim} mask={`url(#${maskId})`}/>
      {slide.annotation && <g data-effect={slide.effects?.annotationAnim?.type}><Annotation kind={slide.annotation} box={target} color={t.accent} progress={annotationProgress} placement="top"/></g>}
      {slide.effects?.emphasis?.type === 'pulse' && <g data-effect="pulse" opacity={pulse * .7} transform={`translate(${target.x + target.w / 2} ${target.y + target.h / 2}) scale(${1 + slide.effects.emphasis.amount! * pulse}) translate(${-target.x - target.w / 2} ${-target.y - target.h / 2})`}><rect x={target.x} y={target.y} width={target.w} height={target.h} rx={6} stroke={t.accent} strokeWidth={5} fill="none"/></g>}
    </svg>}
    {target && slide.effects?.tilt && <div data-cw-target-anchor style={{position: 'absolute', left: target.x, top: target.y, width: target.w, height: target.h, visibility: 'hidden'}}/>}
    </div>
    {target && <ScreenshotEmphasis slide={slide} project={project} target={target} camera={camera}/>}
  </div>;
};

export const CoursewareFlow: React.FC<{slide: Slide; project: ResolvedProps; progress: number}> = ({slide, project, progress}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const nodes = slide.nodes!;
  const hook = slide.fromFrame === 0 ? project.hook : undefined;
  const values = nodes.map((_, i) => revealValue(slide, frame, fps, Number(Boolean(slide.text)) + Number(Boolean(slide.body)) + i, 'element', hook));
  const boxes = flowBoxes(nodes.length).map((b, i) => ({...b, y: b.y + 8 * (1 - values[i])})); const t = styleTokens(project.style); const arrowId = `cw-flow-arrow-${slide.id}`;
  const motion = slide.effects?.motion; const pan = motion && motion.type === 'pan' ? cameraPoint(motion, frame / Math.max(1, slide.durationInFrames - 1)) : undefined;
  const tilt = effectTilt(slide, frame, fps, hook);
  // Leave room for routed non-adjacent edges at x=948, including stroke width.
  const transform = `${pan ? `translate(${(.5 - pan.x) * 32}px,${(.5 - pan.y) * 64}px)` : ''}${tilt ? ` perspective(1200px) rotateY(${tilt}deg)` : ''}`;
  return <div style={{position: 'absolute', inset: 0, opacity: slide.effects?.reveal ? 1 : progress, ...(transform ? {transform, transformOrigin: '540px 940px'} : {})}}>
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs><marker id={arrowId} markerUnits="userSpaceOnUse" markerWidth={12} markerHeight={12} refX={10} refY={6} orient="auto"><path d="M1 1 L10 6 L1 11" stroke={t.primary} strokeWidth={2.5} fill="none"/></marker></defs>
      {slide.edges!.map((edge, i) => {
        const a = boxes[nodes.findIndex(n => n.id === edge.from)]; const b = boxes[nodes.findIndex(n => n.id === edge.to)];
        return <path data-cw-edge key={`${edge.from}-${edge.to}`} d={flowEdgePath(a, b, i)} stroke={t.primary} strokeWidth={3} fill="none" opacity={Math.min(values[nodes.findIndex(n => n.id === edge.from)], values[nodes.findIndex(n => n.id === edge.to)])} markerEnd={`url(#${arrowId})`}/>;
      })}
      {boxes.map((box, i) => <g key={nodes[i].id} opacity={values[i]}>{rectPaths(box.x, box.y, box.w, box.h, {stroke: t.line, fill: t.surface, strokeWidth: 2, roughness: project.style === 'industrial' ? 0.45 : 0.8, seed: 41 + i * 7}).map((path, p) => <path key={p} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill={path.fill}/>)}</g>)}
    </svg>
    {nodes.map((node, i) => <div key={node.id} data-cw-content data-cw-node={node.id} style={{position: 'absolute', left: boxes[i].x, top: boxes[i].y, width: boxes[i].w, height: boxes[i].h, opacity: values[i], display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 32px'}}><div data-cw-text="node" style={{fontSize: 42, lineHeight: 1.25, textAlign: 'center', color: t.ink, overflowWrap: 'anywhere'}}>{node.label}</div></div>)}
  </div>;
};
