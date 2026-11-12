import React, {useMemo} from 'react';
import {DynamicFlowCourseware, DynamicFlowCover} from './dynamicflow/DynamicFlowCourseware';
import {AbsoluteFill, Audio, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SubtitleTrack} from '../engine/SubtitleTrack';
import {coursewareStyleTokens as styleTokens} from './styles';
import {activeSubtitle, effectPlan, effectTilt, effectUnit, subtitleCues, validateResolved} from './model';
import type {ResolvedProps, Slide} from './model';
import {CoursewareFlow, Screenshot} from './layers';
import {LayoutAudit} from './audit';
import {AnimatedCopy, ProgressBar, revealValue, Soundtrack, Texture} from './Effects';
import {AiLabel, BrandName} from './BrandChrome';
import {CoursewareVideo} from './VideoPage';

const CSS = `
  .cw-root, .cw-root * {box-sizing:border-box;}
  .cw-root {font-family:"LXGW WenKai";}
  .cw-shot > div {padding:0 !important;}
  .cw-shot > div > div:first-child {display:none !important;}
  .cw-shot > div > div:last-child {margin-top:0 !important; border:0 !important;}
  .cw-shot img {object-fit:contain !important;}
  .cw-shot > div > div:last-child > div:last-child {border-color:var(--cw-accent) !important; box-shadow:none !important;}
  .cw-shot[data-no-highlight="true"] > div > div:last-child > div:last-child {display:none !important;}
  .cw-subtitles * {font-family:"LXGW WenKai" !important;}
`;
function headingSize(text: string, hero: boolean) {
  const sizes = hero ? [76, 68, 60, 56] : [64, 60, 56, 52];
  return sizes.find(size => text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(Array.from(line).length * size / 824)), 0) <= 3) ?? sizes[sizes.length - 1];
}
const Page: React.FC<{slide: Slide; project: ResolvedProps; last?: boolean; first?: boolean; cover?: boolean; ghost?: boolean}> = ({slide, project, last, first, cover, ghost}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = styleTokens(project.style);
  const progress = cover ? 1 : interpolate(frame, [0, 0.65 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hero = slide.kind === 'title' || slide.kind === 'quote'; const e = slide.effects;
  const hook = e?.hook ?? (first ? project.hook : undefined); const plan = effectPlan(slide, fps, hook); const ms = frame / fps * 1000;
  const hookActive = Boolean(hook && ms < plan.hook.end);
  const headingReveal = revealValue(slide, frame, fps, 0, 'title', hook), bodyReveal = revealValue(slide, frame, fps, Number(Boolean(slide.text)), 'body', hook);
  const bulletHeight = (slide.bullets?.length ?? 0) * 136 + Math.max(0, (slide.bullets?.length ?? 0) - 1) * 20;
  const content = <>
    <BrandName project={project}/>
    {e?.chapter && <div data-effect="chapter" data-cw-content data-cw-text="note" style={{position: 'absolute', left: 148, top: hero ? 370 : 274, width: 784, fontSize: 28, textAlign: 'center', color: t.muted}}>{e.chapter.label}</div>}
    {slide.text && <div data-cw-content data-cw-text="heading" style={{position: 'absolute', left: 128, top: hero ? 480 : e?.chapter ? 330 : 306, width: 824, fontFamily: `"${t.heading}"`, fontSize: cover ? Math.min(68, headingSize(slide.text, hero)) : headingSize(slide.text, hero), lineHeight: 1.3, whiteSpace: 'pre-line', textWrap: 'balance', textAlign: 'center', overflowWrap: 'anywhere', ...(e?.reveal?.type === 'stagger' ? {opacity: headingReveal, transform: `translateY(${8 * (1 - headingReveal)}px)`} : {})}}><AnimatedCopy text={slide.text} slide={slide} rootHook={hook}/></div>}
    {hero && <div data-cw-content style={{position: 'absolute', left: 440, top: 850, width: 200 * (e?.reveal ? 1 : progress), height: 6, background: t.accent, borderRadius: 6}}/>}
    {slide.body && <div data-cw-content data-cw-text="note" style={{position: 'absolute', left: 148, top: hero ? 950 : 1368, width: 784, fontSize: hero ? 36 : 30, lineHeight: 1.4, whiteSpace: 'pre-line', textAlign: 'center', color: t.muted, ...(e?.reveal?.type === 'stagger' ? {opacity: bodyReveal, transform: `translateY(${8 * (1 - bodyReveal)}px)`} : {})}}>{slide.body}</div>}
    {slide.kind === 'screenshot' && <Screenshot slide={slide} project={project}/>}
    {slide.kind === 'video' && <CoursewareVideo slide={slide} project={project} forceMuted={ghost}/>}
    {slide.kind === 'flow' && <CoursewareFlow slide={slide} project={project} progress={progress}/>}
    {slide.kind === 'bullet' && <div style={{position: 'absolute', left: 148, top: 560 + (760 - bulletHeight) / 2, width: 784, display: 'grid', gap: 20, opacity: e?.reveal ? 1 : progress, ...(e?.tilt ? {transform: `perspective(1200px) rotateY(${effectTilt(slide, frame, fps, hook)}deg)`, transformOrigin: 'center'} : {})}}>{slide.bullets!.map((item, i) => {
      const p = revealValue(slide, frame, fps, Number(Boolean(slide.text)) + Number(Boolean(slide.body)) + i, 'element', hook);
      const offset = e?.reveal?.by === 'char' ? Array.from(slide.text + slide.bullets!.slice(0, i).join('')).length : slide.text.split('\n').length + i;
      return <div data-cw-content key={i} style={{height: 136, padding: '12px 28px', border: `1px solid ${t.line}`, borderRadius: t.radius, background: t.surface, display: 'flex', justifyContent: 'center', alignItems: 'center', ...(e?.reveal?.type === 'stagger' ? {opacity: p, transform: `translateY(${8 * (1 - p)}px)`} : {})}}><div data-cw-text="bullet" style={{fontSize: 40, lineHeight: 1.3, textAlign: 'center', overflowWrap: 'anywhere'}}><AnimatedCopy text={item} slide={slide} offset={offset} rootHook={hook}/></div></div>;
    })}</div>}
    {last && !cover && <div data-cw-content data-cw-text="cta" style={{position: 'absolute', right: 108, bottom: 204, fontSize: 26, color: t.muted}}>有问题，评论区问</div>}
  </>;
  const wrapped = hook || e?.reveal?.type === 'fade';
  return <AbsoluteFill data-cw-page={ghost ? undefined : true} data-slide-id={ghost ? undefined : slide.id} data-kind={slide.kind} style={{width: 1080, height: 1920, background: t.bg, color: t.ink}}>
    <Texture slide={slide} project={project} rootHook={hook}/>
    {wrapped ? <div data-effect={e?.reveal?.type === 'fade' ? 'fade' : undefined} style={{position: 'absolute', inset: 0, visibility: hookActive ? 'hidden' : undefined, opacity: e?.reveal?.type === 'fade' ? effectUnit(ms, plan.reveal) : 1}}>{content}</div> : content}
    {hook && ms >= plan.hook.start && ms < plan.hook.end && <div data-effect="hook" data-cw-content data-cw-text="heading" style={{position: 'absolute', left: 128, top: 480, width: 824, textAlign: 'center', fontSize: 68, lineHeight: 1.3, whiteSpace: 'pre-line', opacity: Math.min(1, (plan.hook.end - ms) / Math.min(160, (plan.hook.end - plan.hook.start) / 4))}}>{hook.text}</div>}
  </AbsoluteFill>;
};

const SlideVisual: React.FC<{slide: Slide; previous?: Slide; project: ResolvedProps; first: boolean; last: boolean}> = props => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const transition = props.slide.effects?.transition;
  const plan = effectPlan(props.slide, fps, props.first ? props.project.hook : undefined);
  const unit = effectUnit(frame / fps * 1000, plan.transition); const p = unit * unit * (3 - 2 * unit);
  if (!transition || p >= 1) return <Page {...props}/>;
  const horizontal = transition.direction === 'left' || transition.direction === 'right'; const sign = transition.direction === 'left' || transition.direction === 'up' ? 1 : -1;
  const vector = (value: number) => horizontal ? `translateX(${value * 864 * sign}px)` : `translateY(${value * 1536 * sign}px)`;
  const inset = `${(1 - p) * 100}%`;
  const wipe = transition.direction === 'left' ? `inset(0 0 0 ${inset})` : transition.direction === 'right' ? `inset(0 ${inset} 0 0)` : transition.direction === 'up' ? `inset(${inset} 0 0 0)` : `inset(0 0 ${inset} 0)`;
  return <AbsoluteFill data-cw-transition data-transition-progress={p} style={{width: 1080, height: 1920, clipPath: 'inset(192px 108px)', overflow: 'hidden'}}>
    {props.previous && <AbsoluteFill style={{opacity: transition.type === 'fade' ? 1 - p : 1, transform: transition.type === 'push' ? vector(-p) : undefined}}><Freeze frame={props.previous.durationInFrames - 1}><Page slide={props.previous} project={props.project} first={props.previous.fromFrame === 0} ghost/></Freeze></AbsoluteFill>}
    <AbsoluteFill style={{opacity: transition.type === 'fade' ? p : 1, transform: transition.type === 'slide' || transition.type === 'push' ? vector(1 - p) : undefined, clipPath: transition.type === 'wipe' ? wipe : undefined}}><Page {...props}/></AbsoluteFill>
  </AbsoluteFill>;
};

const LegacyCourseware: React.FC<ResolvedProps> = input => {
  const project = useMemo(() => validateResolved(input), [input]);
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = styleTokens(project.style);
  const cues = useMemo(() => subtitleCues(project), [project]); const cue = activeSubtitle(cues, frame, fps);
  return <AbsoluteFill className="cw-root" data-cw-root style={{width: 1080, height: 1920, background: t.bg}}>
    <style>{CSS}</style>
    {project.slides.map((slide, i) => <Sequence key={slide.id} name={slide.id} from={slide.fromFrame} durationInFrames={slide.durationInFrames} premountFor={fps}>
      <SlideVisual slide={slide} previous={project.slides[i - 1]} project={project} first={i === 0} last={i === project.slides.length - 1}/>
      {slide.narration && <Audio src={staticFile(slide.narration.src)} volume={1}/>}
    </Sequence>)}
    <Soundtrack project={project}/>
    <div className="cw-subtitles" data-cue-id={cue?.id ?? ''}><SubtitleTrack subtitles={cue ? [cue] : []} palette={{bgCanvas: t.bg, primaryHuman: t.primary, secondaryAi: t.primary, accentWarning: t.accent, dangerStrike: t.accent, highlightGold: t.accent}}/></div>
    <ProgressBar project={project}/>
    <AiLabel project={project}/>
    {project.audit && <LayoutAudit project={project}/>}
  </AbsoluteFill>;
};
const LegacyCoursewareCover: React.FC<ResolvedProps> = input => {
  const project = useMemo(() => validateResolved(input), [input]);
  const slide: Slide = {id: 'cover', kind: 'title', text: project.title, fromFrame: 0, durationInFrames: 1};
  return <AbsoluteFill className="cw-root" data-cw-root style={{width: 1080, height: 1920}}><style>{CSS}</style><Page slide={slide} project={project} cover/><AiLabel project={project}/>{project.audit && <LayoutAudit project={project} cover/>}</AbsoluteFill>;
};

// Keep the legacy page/transition trees intact; only the new style takes this branch.
export const Courseware: React.FC<ResolvedProps> = input => {
  const project = useMemo(() => validateResolved(input), [input]);
  return project.style === 'dynamicflow' ? <DynamicFlowCourseware {...project}/> : <LegacyCourseware {...project}/>;
};
export const CoursewareCover: React.FC<ResolvedProps> = input => {
  const project = useMemo(() => validateResolved(input), [input]);
  return project.style === 'dynamicflow' ? <DynamicFlowCover {...project}/> : <LegacyCoursewareCover {...project}/>;
};
