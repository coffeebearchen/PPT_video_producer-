import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, FONT_HEADING} from '../engine/tokens';
import {SketchRect} from '../engine/SketchRect';
import {useSceneStart} from '../engine/sceneContext';

export type ChalkBoardProps = {title: string; subtitle: string; mode: string; labels: string[]; notes: string[]; takeaway: string; active?: number; values?: number[]};
const C = {ink: '#F1E5B1', gold: '#F3C545', green: '#8BB8AD', red: '#E85B45', muted: '#B3B09C'};
const clamp = (n: number) => Math.max(0, Math.min(1,n));

// Data-driven chalk diagram: reserved title, diagram, takeaway and caption bands.
// Stable seeds keep drawn lines identical when seeking or rendering again.
export const ChalkBoard: React.FC<ChalkBoardProps> = ({title, subtitle, mode, labels, notes, takeaway, active=0, values=[2,3,5,7]}) => {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const local=(frame-useSceneStart())/fps;
  const draw=(delay:number, duration=0.65)=>clamp((local-delay)/duration);
  const card=(x:number,y:number,w:number,h:number,i:number,highlight=false) => (
    <div key={`card${i}`} style={{position:'absolute',left:x,top:y,width:w,height:h,opacity:0.45+0.55*draw(i*0.13),display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',boxSizing:'border-box',padding:20,color:highlight?C.gold:C.ink}}>
      <SketchRect w={w} h={h} seed={91+i*7} stroke={highlight?C.gold:C.green} strokeWidth={highlight?3.5:2} fill={highlight?'rgba(243,197,69,0.06)':'rgba(139,184,173,0.025)'} roughness={1.15}/>
      <div style={{fontSize:43,lineHeight:1.35}}>{labels[i]}</div>
      <div style={{fontSize:29,lineHeight:1.5,marginTop:17,color:C.muted}}>{notes[i]}</div>
    </div>
  );
  const line=(d:string,delay:number,color=C.gold)=> <path d={d} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-draw(delay)} markerEnd={draw(delay)>0.95?'url(#chalk-arrow)':undefined}/>;
  const cycle=mode==='cycle'; const tree=mode==='branch'; const chart=mode==='bars'||mode==='step';
  return <AbsoluteFill style={{fontFamily:FONT,color:C.ink}}>
    <div style={{position:'absolute',left:140,right:140,top:220,textAlign:'center'}}>
      <div style={{fontFamily:FONT_HEADING,fontSize:72,lineHeight:1.25,whiteSpace:'pre-line'}}>{title}</div>
      <div style={{fontSize:32,color:C.muted,marginTop:26}}>{subtitle}</div>
    </div>
    <svg width={1080} height={1920} style={{position:'absolute',inset:0}}>
      <defs><marker id="chalk-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L7 4 L0 8" fill="none" stroke={C.gold} strokeWidth="1.5"/></marker><pattern id="chalk-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12 L12 0" stroke={C.gold} strokeWidth="1" opacity="0.3"/></pattern></defs>
      {cycle && <>{line('M540 695 Q810 690 809 870',0.5)}{line('M810 990 Q810 1190 650 1190',1.2)}{line('M430 1190 Q270 1190 270 990',2)}{line('M270 870 Q270 690 425 690',2.8)}<circle cx="540" cy="941" r="106" fill="none" stroke={C.green} strokeWidth="2" strokeDasharray="8 8"/><text x="540" y="957" textAnchor="middle" fill={C.gold} fontSize="43">留下记录</text></>}
      {tree && <>{line('M540 730 L540 850 L320 850 L320 940',0.4)}{line('M540 850 L760 850 L760 940',2.2)}{line('M320 1160 L320 1240 L760 1240 L760 1160',3.3,C.green)}</>}
      {chart && <>
        <path d="M180 650 L180 1200 L910 1200" stroke={C.muted} strokeWidth="2.5" fill="none"/>
        {[760,960].map(y=><path key={y} d={`M180 ${y} L910 ${y}`} stroke={C.muted} opacity="0.16" strokeDasharray="8 10"/>)}
        {mode==='bars'?values.map((v,i)=>{const h=v*55*draw(i*0.5+0.25,0.55);return <g key={i}><rect x={230+i*175} y={1200-h} width="88" height={h} fill="url(#chalk-hatch)" stroke={i===3?C.gold:C.green} strokeWidth="3"/><text x={274+i*175} y={1168-h} textAnchor="middle" fontSize="34" fill={C.ink} opacity={draw(i*0.5+0.25,0.55)}>{v}</text></g>}):line('M200 1110 L390 1110 L390 1000 L570 1000 L570 850 L740 850 L740 710 L890 710',0.3)}
        {labels.map((lb,i)=><text key={lb} x={274+i*175} y="1260" textAnchor="middle" fill={C.muted} fontSize="30">{lb}</text>)}
      </>}
      {!chart&&!cycle&&!tree&&labels.slice(0,-1).map((_,i)=>line(`M${350+i*230} 1020 L${390+i*230} 1020`,0.7+i*0.5))}
      {mode==='summary'&&<ellipse cx="540" cy="1450" rx="340" ry="70" fill="none" stroke={C.gold} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1-draw(2.3)}/>}
      {!chart&&<path d="M300 1325 Q540 1340 780 1325" stroke={C.green} strokeWidth="2" fill="none" opacity="0.45"/>}
    </svg>
    {cycle ? <>{card(405,590,270,170,0,active<1.5)}{card(680,860,250,170,1,active>=1.5&&active<2.5)}{card(405,1120,270,170,2,active>=2.5&&active<3.5)}{card(150,860,250,170,3,active>=3.5)}</>:
    tree ? <>{card(365,570,350,160,0,true)}{card(150,940,340,220,1,active<2)}{card(590,940,340,220,2,active>=2)}</>:
    chart ? <div style={{position:'absolute',left:150,right:150,top:550,fontSize:30,color:C.muted,textAlign:'center'}}>示意数据 · 用于说明比较方法</div>:
    <>{labels.map((_,i)=>card(labels.length===2?155+i*410:150+i*270,650,labels.length===2?360:240,530,i,Math.round(active)%labels.length===i))}</>}
    <div style={{position:'absolute',left:150,right:150,top:1405,textAlign:'center',fontSize:43,lineHeight:1.5,color:C.gold,opacity:draw(0.6)}}>{takeaway}</div>
  </AbsoluteFill>;
};
