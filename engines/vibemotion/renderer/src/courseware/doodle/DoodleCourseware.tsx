import React from 'react';
import {AbsoluteFill,Audio,Sequence,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import type {ResolvedProps,Slide} from '../model';
import {Courseware} from '../Courseware';
import {Soundtrack} from '../Effects';
import {DiagramPage,FONT,clamp,wrap} from './DiagramPage';
import {icon} from './source';
const Hero:React.FC<{slide:Slide;last:boolean}>=({slide,last})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig(),p=clamp(f/fps/.55);const lines=wrap(slide.text,13),notes=wrap(slide.body??'',20);
 return <svg width={1080} height={1920} style={{fontFamily:FONT,background:'#262725'}}>
 <defs><filter id="heroChalk"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={3} seed={7} result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale={3.2}/></filter></defs><rect width={1080} height={1920} fill="#262725"/>
 <text data-doodle-text x={540} y={570} fill="#E7C85B" textAnchor="middle" fontSize={64} opacity={p}>{lines.map((s,i)=><tspan key={i} x={540} dy={i?90:0}>{s}</tspan>)}</text>
 <g filter="url(#heroChalk)">{icon(last?'check':'gear',540,970,160,'#A8C9B4').map((a,i)=><path key={i} d={a.d} stroke={a.stroke} strokeWidth={a.sw} fill={a.fill} pathLength={1} strokeDasharray={1} strokeDashoffset={1-clamp((f/fps-.4)/.8)}/>)}</g>
 <text data-doodle-text x={540} y={1210} textAnchor="middle" fontSize={34} fill="#F0EBD4" opacity={clamp((f/fps-.7)/.5)}>{notes.map((s,i)=><tspan key={i} x={540} dy={i?50:0}>{s}</tspan>)}</text>
 {last&&<text data-doodle-text x={966} y={1705} textAnchor="end" fontSize={26} fill="#858C80">有问题，评论区问</text>}
 </svg>;
};
export const DoodleCourseware:React.FC<ResolvedProps>=project=>{
 const {fps}=useVideoConfig();
 return <AbsoluteFill style={{background:'#262725'}}>{project.slides.map((slide,i)=>{
  const own=slide.kind==='diagram'||slide.kind==='title'||slide.kind==='quote';
  return <Sequence key={slide.id} from={slide.fromFrame} durationInFrames={slide.durationInFrames} premountFor={fps}>
   {slide.kind==='diagram'?<DiagramPage spec={slide as Slide & import('./catalog').DiagramSpec} title={slide.text} caption={slide.caption}/>:own?<Hero slide={slide} last={i===project.slides.length-1}/>:<Courseware {...project} slides={[{...slide,fromFrame:0}]} totalFrames={slide.durationInFrames} totalDurationSeconds={slide.durationInFrames/fps} bgm={undefined} sfx={undefined}/>}
   {own&&slide.narration&&<Audio src={staticFile(slide.narration.src)}/>}
  </Sequence>;
 })}<Soundtrack project={project}/></AbsoluteFill>;
};
