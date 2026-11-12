import {DoodleVignette} from './DoodleVignette';
import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import type {ResolvedProps,Slide} from '../model';
import {Courseware} from '../Courseware';
import {Soundtrack} from '../Effects';
import {DiagramPage,FONT,clamp,wrap} from './DiagramPage';
import {AiLabel} from '../BrandChrome';
import {C,icon} from './source';
const Hero:React.FC<{slide:Slide;last:boolean;still?:boolean}>=({slide,last,still})=>{
 const raw=useCurrentFrame(),{fps}=useVideoConfig(),f=still?99999:raw,p=clamp(f/fps/.55);const lines=wrap(slide.text,13),notes=wrap(slide.body??'',20);
 return <svg width={1080} height={1920} style={{fontFamily:FONT,background:C.bg}}>
 <defs><filter id="heroChalk"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={3} seed={7} result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale={3.2}/></filter></defs><rect width={1080} height={1920} fill={C.bg}/>
 <text data-doodle-text x={540} y={570} fill={C.yellow} textAnchor="middle" fontSize={64} opacity={p}>{lines.map((s,i)=><tspan key={i} x={540} dy={i?90:0}>{s}</tspan>)}</text>
 <g filter="url(#heroChalk)">{icon(last?'check':'gear',540,970,160,C.green).map((a,i)=><path key={i} d={a.d} stroke={a.stroke} strokeWidth={a.sw} fill={a.fill} pathLength={1} strokeDasharray={1} strokeDashoffset={1-clamp((f/fps-.4)/.8)}/>)}</g>
 <text data-doodle-text x={540} y={1210} textAnchor="middle" fontSize={34} fill={C.ink} opacity={clamp((f/fps-.7)/.5)}>{notes.map((s,i)=><tspan key={i} x={540} dy={i?50:0}>{s}</tspan>)}</text>
 {last&&<text data-doodle-text x={966} y={1705} textAnchor="end" fontSize={26} fill={C.muted}>有问题，评论区问</text>}
 <DoodleVignette/>
 </svg>;
};
export const DoodleCover:React.FC<ResolvedProps>=project=>{
 const slide:Slide={id:'cover',kind:'title',text:project.title,fromFrame:0,durationInFrames:1};
 return <AbsoluteFill style={{background:C.bg}}><Hero slide={slide} last={false} still/><AiLabel project={project}/></AbsoluteFill>;
};
export const DoodleCourseware:React.FC<ResolvedProps>=project=>{
 const {fps}=useVideoConfig();
 return <AbsoluteFill style={{background:C.bg}}>{project.slides.map((slide,i)=>{
  const own=slide.kind==='diagram'||slide.kind==='title'||slide.kind==='quote';
  return <Sequence key={slide.id} from={slide.fromFrame} durationInFrames={slide.durationInFrames} premountFor={fps}>
   {slide.kind==='diagram'?<DiagramPage spec={slide as Slide & import('./catalog').DiagramSpec} title={slide.text} caption={slide.caption}/>:own?<Hero slide={slide} last={i===project.slides.length-1}/>:<Courseware {...project} slides={[{...slide,fromFrame:0}]} totalFrames={slide.durationInFrames} totalDurationSeconds={slide.durationInFrames/fps} bgm={undefined} sfx={undefined}/>}
   {own&&slide.narration&&<Audio src={staticFile(slide.narration.src)}/>}
  </Sequence>;
 })}<Soundtrack project={project}/></AbsoluteFill>;
};
