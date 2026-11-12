import {CoursewareImage} from '../ImagePage';
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {activeSubtitle, subtitleCues, type ResolvedProps, type Slide} from '../model';
import {BrandName, AiLabel} from '../BrandChrome';
import {ProgressBar, Soundtrack} from '../Effects';
import {Screenshot} from '../layers';
import {CoursewareVideo} from '../VideoPage';
import {LayoutAudit} from '../audit';
import {DYNAMICFLOW_TOKENS as t} from '../styles';
import {Bullets, Flow} from './Diagram';
import {easeOut, MOTION, screenshotSlide, smooth, staticContent, unit} from './timing';

const CSS = `
.df-root, .df-root * {box-sizing:border-box;}
.df-root {font-family:"LXGW WenKai"; color:${t.ink};}
.df-root .cw-shot > div {padding:0 !important;}
.df-root .cw-shot > div > div:first-child {display:none !important;}
.df-root .cw-shot > div > div:last-child {margin-top:0 !important; border:0 !important;}
.df-root .cw-shot img {object-fit:contain !important;}
.df-root .cw-shot > div > div:last-child > div:last-child {border-color:var(--cw-accent) !important; box-shadow:none !important;}
.df-root .cw-shot[data-no-highlight="true"] > div > div:last-child > div:last-child {display:none !important;}
`;

const Page: React.FC<{slide: Slide; project: ResolvedProps; last?: boolean; cover?: boolean; ghost?: boolean}> = ({slide, project, last, cover, ghost}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const ms = frame / fps * 1000;
  const hero = slide.kind === 'title' || slide.kind === 'quote';
  const done = cover || staticContent(slide, fps, MOTION.title + MOTION.annotation);
  const p = done ? 1 : easeOut(unit(ms, 0, MOTION.title));
  const draw = done ? 1 : smooth(unit(ms, MOTION.title, MOTION.annotation));
  const shot = useMemo(() => screenshotSlide(slide, fps), [slide, fps]);
  return <AbsoluteFill data-cw-page={ghost ? undefined : true} data-slide-id={ghost ? undefined : slide.id} data-kind={slide.kind} style={{width: 1080, height: 1920, background: t.bg}}>
    <BrandName project={project}/>
    {slide.text && <div data-cw-content data-cw-text="heading" style={{position: 'absolute', left: 128, top: hero ? 530 : 320, width: 824, fontSize: hero ? 72 : 64, lineHeight: 1.25, textAlign: 'center', whiteSpace: 'pre-line', overflowWrap: 'anywhere', textWrap: 'balance', color: hero ? t.accent : t.ink, opacity: p, transform: `translateY(${8 * (1 - p)}px)`}}>{slide.text}</div>}
    {hero && <svg data-cw-content width={340} height={24} style={{position: 'absolute', left: 370, top: 888}}><path d="M5 15 Q115 6 330 12" stroke={t.accent} strokeWidth={4} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={draw === 0 ? 0 : 1}/></svg>}
    {slide.body && <div data-cw-content data-cw-text="note" style={{position: 'absolute', left: 148, top: hero ? 1000 : 1370, width: 784, fontSize: hero ? 38 : 30, lineHeight: 1.35, color: t.muted, textAlign: 'center', whiteSpace: 'pre-line', overflowWrap: 'anywhere', opacity: p}}>{slide.body}</div>}
    {slide.kind === 'image' && <CoursewareImage slide={slide} project={project}/>}
    {slide.kind === 'flow' && <Flow slide={slide}/>}
    {slide.kind === 'bullet' && <Bullets slide={slide}/>}
    {slide.kind === 'screenshot' && <Screenshot slide={shot} project={project}/>}
    {slide.kind === 'video' && <CoursewareVideo slide={slide} project={project} forceMuted={ghost}/>}
    {last && !cover && <div data-cw-content data-cw-text="cta" style={{position: 'absolute', right: 108, bottom: 204, fontSize: 26, color: t.muted}}>有问题，评论区问</div>}
  </AbsoluteFill>;
};

// Dedicated transition tree: the old SlideVisual implementation is never modified.
const SlideVisual: React.FC<{slide: Slide; previous?: Slide; project: ResolvedProps; last: boolean}> = props => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const transition = props.slide.effects?.transition;
  const duration = Math.min(transition?.durationMs ?? 200, Math.max(1, (props.slide.durationInFrames - 1) / fps * 1000));
  const p = smooth(unit(frame / fps * 1000, 0, duration));
  if (!transition || p >= 1 || props.slide.durationInFrames < fps) return <Page {...props}/>;
  const horizontal = transition.direction === 'left' || transition.direction === 'right';
  const sign = transition.direction === 'left' || transition.direction === 'up' ? 1 : -1;
  const vector = (v: number) => horizontal ? `translateX(${v * 864 * sign}px)` : `translateY(${v * 1536 * sign}px)`;
  const inset = `${(1 - p) * 100}%`;
  const wipe = transition.direction === 'left' ? `inset(0 0 0 ${inset})` : transition.direction === 'right' ? `inset(0 ${inset} 0 0)` : transition.direction === 'up' ? `inset(${inset} 0 0 0)` : `inset(0 0 ${inset} 0)`;
  return <AbsoluteFill data-cw-transition data-transition-progress={p} style={{clipPath: 'inset(192px 108px)', overflow: 'hidden'}}>
    {props.previous && <AbsoluteFill style={{opacity: transition.type === 'fade' ? 1 - p : 1, transform: transition.type === 'push' ? vector(-p) : undefined}}><Freeze frame={props.previous.durationInFrames - 1}><Page slide={props.previous} project={props.project} ghost/></Freeze></AbsoluteFill>}
    <AbsoluteFill style={{opacity: transition.type === 'fade' ? p : 1, transform: transition.type === 'slide' || transition.type === 'push' ? vector(1 - p) : undefined, clipPath: transition.type === 'wipe' ? wipe : undefined}}><Page {...props}/></AbsoluteFill>
  </AbsoluteFill>;
};

export const DynamicFlowCourseware: React.FC<ResolvedProps> = project => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const cues = useMemo(() => subtitleCues(project), [project]); const cue = activeSubtitle(cues, frame, fps);
  return <AbsoluteFill className="cw-root df-root" data-cw-root style={{width: 1080, height: 1920, background: t.bg}}>
    <style>{CSS}</style>
    {project.slides.map((slide, i) => <Sequence key={slide.id} from={slide.fromFrame} durationInFrames={slide.durationInFrames} premountFor={fps}>
      <SlideVisual slide={slide} previous={project.slides[i - 1]} project={project} last={i === project.slides.length - 1}/>
      {slide.narration && <Audio src={staticFile(slide.narration.src)}/>}
    </Sequence>)}
    <Soundtrack project={project}/>
    <div className="cw-subtitles" data-cue-id={cue?.id ?? ''}>{cue && <div style={{position: 'absolute', left: 148, top: 1490, width: 784, display: 'flex', justifyContent: 'center'}}><div style={{fontSize: 32, lineHeight: 1.35, textAlign: 'center', background: t.surface, padding: '10px 22px', borderRadius: t.labelRadius, color: t.ink}}>{cue.text}</div></div>}</div>
    <ProgressBar project={project}/><AiLabel project={project}/>
    {project.audit && <LayoutAudit project={project}/>}
  </AbsoluteFill>;
};

export const DynamicFlowCover: React.FC<ResolvedProps> = project => {
  const slide: Slide = {id: 'cover', kind: 'title', text: project.title, fromFrame: 0, durationInFrames: 1};
  return <AbsoluteFill className="cw-root df-root" data-cw-root style={{width: 1080, height: 1920, background: t.bg}}><style>{CSS}</style><Page slide={slide} project={project} cover/><AiLabel project={project}/>{project.audit && <LayoutAudit project={project} cover/>}</AbsoluteFill>;
};
