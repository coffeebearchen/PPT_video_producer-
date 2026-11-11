import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {styleTokens} from '../graphics/styles';
import {effectPlan, effectUnit} from './model';
import type {Rect, ResolvedProps, Slide} from './model';

export function revealValue(slide: Slide, frame: number, fps: number, index: number, role: 'title' | 'body' | 'element', rootHook?: ResolvedProps['hook']) {
  const e = slide.effects?.reveal; if (!e || e.type !== 'stagger') return 1;
  if ((e.from === 'title' && role !== 'title') || (e.from === 'body' && role !== 'body')) return 1;
  const plan = effectPlan(slide, fps, rootHook); const count = e.from === 'all' ? plan.elementCount : 1;
  const total = 400 + (count - 1) * e.staggerMs!;
  const time = effectUnit(frame / fps * 1000, plan.reveal) * total;
  return Math.max(0, Math.min(1, (time - (e.from === 'all' ? index : 0) * e.staggerMs!) / 400));
}
export const AnimatedCopy: React.FC<{text: string; slide: Slide; offset?: number; rootHook?: ResolvedProps['hook']}> = ({text, slide, offset = 0, rootHook}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const e = slide.effects?.reveal;
  if (e?.type !== 'typewriter') return <>{text}</>;
  const plan = effectPlan(slide, fps, rootHook);
  const total = e.by === 'char' ? Array.from(slide.text + (slide.bullets ?? []).join('')).length : slide.text.split('\n').length + (slide.bullets?.length ?? 0);
  const visible = effectUnit(frame / fps * 1000, plan.reveal) * Math.max(1, total);
  if (e.by === 'char') return <>{Array.from(text).map((c, i) => <span key={i} style={{opacity: visible >= i + offset + 1 ? 1 : 0}}>{c}</span>)}</>;
  return <>{text.split('\n').map((line, i) => <React.Fragment key={i}>{i > 0 && <br/>}<span style={{opacity: visible >= i + offset + 1 ? 1 : 0}}>{line}</span></React.Fragment>)}</>;
};

export const Texture: React.FC<{slide: Slide; project: ResolvedProps; rootHook?: ResolvedProps['hook']}> = ({slide, project, rootHook}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const e = slide.effects?.texture; const t = styleTokens(project.style);
  if (!e) return null;
  if (e.type === 'gradient') return <AbsoluteFill data-effect="gradient" style={{pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 35%,${t.primary}12,transparent 65%,${t.bg}88)`}}/>;
  if (e.type === 'grain') return <svg data-effect="grain" width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: e.opacity, pointerEvents: 'none'}}><defs><pattern id={`grain-${slide.id}`} width={43} height={47} patternUnits="userSpaceOnUse">{Array.from({length: 17}, (_, i) => <circle key={i} cx={(i * 17 + 3) % 43} cy={(i * 23 + 7) % 47} r={i % 3 === 0 ? .9 : .55} fill={t.ink}/>)}</pattern></defs><rect width={1080} height={1920} fill={`url(#grain-${slide.id})`}/></svg>;
  const p = effectUnit(frame / fps * 1000, effectPlan(slide, fps, rootHook).sweep);
  return <AbsoluteFill data-effect="lightSweep" style={{pointerEvents: 'none', clipPath: 'inset(192px 108px)'}}><div style={{position: 'absolute', top: 192, height: 1536, width: 240, background: `linear-gradient(90deg,transparent,${t.primary}30,transparent)`, opacity: Math.sin(Math.PI * p), transform: `translateX(${-350 + 1800 * p}px) skewX(-12deg)`}}/></AbsoluteFill>;
};

export const ScreenshotEmphasis: React.FC<{slide: Slide; project: ResolvedProps; target: Rect; camera: {scale: number; originX: number; originY: number; translateX: number; translateY: number}}> = ({slide, project, target, camera}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const e = slide.effects?.emphasis; const t = styleTokens(project.style);
  if (!e || e.type !== 'magnifier') return null;
  const plan = effectPlan(slide, fps, slide.fromFrame === 0 ? project.hook : undefined); const ms = frame / fps * 1000; const p = effectUnit(ms, plan.emphasis);
  const r = e.radius! * 980; const zoom = e.zoom!;
  const focusX = target.x + target.w / 2, focusY = target.y + target.h / 2;
  const x = camera.originX + camera.translateX + (focusX - camera.originX) * camera.scale;
  const y = camera.originY + camera.translateY + (focusY - camera.originY) * camera.scale;
  const cx = Math.max(r + 12, Math.min(984 - r - 12, x));
  const cy = Math.max(r + 12, Math.min(980 - r - 12, y - target.h * camera.scale / 2 - r - 24));
  const opacity = p === 0 ? 0 : Math.min(1, p * 5);
  return <div data-effect="magnifier" style={{position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, overflow: 'hidden', borderRadius: '50%', border: `4px solid ${t.accent}`, background: t.surface, opacity, boxShadow: '0 8px 25px #0006', pointerEvents: 'none'}}><div style={{position: 'absolute', width: 984, height: 980, transformOrigin: '0 0', transform: `translate(${r - focusX * zoom}px,${r - focusY * zoom}px) scale(${zoom})`}}><Img src={staticFile(slide.asset!.src)} style={{width: '100%', height: '100%', objectFit: 'contain'}}/></div></div>;
};

export const ProgressBar: React.FC<{project: ResolvedProps}> = ({project}) => {
  const frame = useCurrentFrame(); const t = styleTokens(project.style); const index = project.slides.findIndex(s => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames);
  const slide = project.slides[index]; const setting = slide?.effects?.progress ?? project.progress;
  if (!setting || !slide) return null;
  const amount = (index + Math.max(0, Math.min(1, (frame - slide.fromFrame) / Math.max(1, slide.durationInFrames - 1)))) / project.slides.length;
  return <div data-effect="progress" style={{position: 'absolute', left: 148, top: 1664, width: 784, height: 3, background: t.line, pointerEvents: 'none'}}><div style={{width: `${amount * 100}%`, height: 3, background: t.accent}}/></div>;
};

export const Soundtrack: React.FC<{project: ResolvedProps}> = ({project}) => {
  const {fps} = useVideoConfig(); const bgm = project.bgm;
  return <>
    {bgm && <Audio src={staticFile(bgm.src)} loop loopVolumeCurveBehavior="extend" volume={frame => {
      const ms = frame / fps * 1000; const total = Math.max(1, (project.totalFrames - 1) / fps * 1000);
      const fadeIn = bgm.fadeInMs === 0 ? 1 : Math.min(1, ms / Math.min(bgm.fadeInMs, total / 2));
      const fadeOut = bgm.fadeOutMs === 0 ? 1 : Math.min(1, (total - ms) / Math.min(bgm.fadeOutMs, total / 2));
      return Math.max(0, bgm.volume * fadeIn * fadeOut);
    }}/>}
    {project.sfx?.map((event, i) => <Sequence key={i} from={Math.round(event.at * fps)} durationInFrames={project.totalFrames - Math.round(event.at * fps)}><Audio src={staticFile(event.src)} volume={event.volume}/></Sequence>)}
  </>;
};
