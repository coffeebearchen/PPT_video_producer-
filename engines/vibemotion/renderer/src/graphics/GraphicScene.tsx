import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AdvancedChart, Icon, Ornament, ProcessDiagram, Shape} from './GraphicLibrary';
import {styleTokens, type ExplanationStyle} from './styles';
import project from '../data/round4-project.json';
import {AvatarOverlay,avatarEnabled,type AvatarOption} from '../avatar/AvatarOverlay';

export type GraphicSceneProps={style?:ExplanationStyle;title:string;claim:string;family:'process'|'chart';kind:string;labels:string[];values?:number[];source?:string;progress?:number;active?:number;decor?:boolean;illustration?:string;final?:boolean;avatarReserved?:'bottom-right'|'center'};
export const GraphicScene:React.FC<GraphicSceneProps>=({style='industrial',title,claim,family,kind,labels,values,source='来源：自制流程演示；数值均为示意数据',progress=1,active=0,decor=true,illustration,final=false,avatarReserved})=>{
 const t=styleTokens(style);
 return <AbsoluteFill style={{background:t.bg,fontFamily:'LXGW WenKai',color:t.ink}}>
  {style==='industrial'?<svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:0.05}}><defs><pattern id="engineering-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0 H0 V48" stroke={t.primary} fill="none"/></pattern></defs><rect width="1080" height="1920" fill="url(#engineering-grid)"/></svg>:null}
  <div style={{position:'absolute',left:140,right:140,top:216,textAlign:'center'}}>
   <div style={{display:'flex',justifyContent:'center',gap:18,alignItems:'center',color:t.muted,fontSize:28}}><Icon kind="gear" color={t.primary} size={34}/><span>让想法变成可靠结果</span></div>
   <h1 style={{fontFamily:t.heading,fontSize:66,lineHeight:1.3,fontWeight:style==='industrial'?700:400,margin:'32px 0 24px',color:t.ink}}>{title}</h1>
   <div style={{height:2,background:t.line,opacity:0.7}}/>
   <div style={{fontSize:32,color:t.muted,marginTop:26}}>{claim}</div>
  </div>
  <div style={{position:'absolute',left:140,top:530,width:800,height:780,border:`1px solid ${t.line}`,borderRadius:t.radius,background:t.surface,boxSizing:'border-box',overflow:'hidden'}}>
   <div style={{position:'absolute',left:20,top:20,width:60,height:60,opacity:0.6}}><Shape kind={family==='chart'?'hexagon':'diamond'} color={t.accent} size={55}/></div>
   {decor?<div style={{position:'absolute',right:14,top:14,width:180,height:110,opacity:0.15}}><Ornament kind={style==='dynamic'?'flow':style==='clean'?'geometry':'hatch'} style={style} progress={progress}/></div>:null}
   <div style={{position:'absolute',left:24,right:24,top:115,height:590}}>
   {family==='chart'?<AdvancedChart kind={kind} style={style} labels={labels} values={values} active={active} progress={progress}/>:<ProcessDiagram kind={kind} style={style} labels={labels} values={values} active={active} progress={progress}/>}</div>
  </div>
  {style==='dynamic'&&decor&&!avatarReserved?<div style={{position:'absolute',left:150,top:1295,width:780,height:155,opacity:0.45}}><Ornament kind="trail" style={style} progress={progress}/></div>:null}
  {style==='clean'&&illustration&&!avatarReserved?<Img src={staticFile(illustration)} style={{position:'absolute',left:760,top:1240,width:150,height:113,opacity:0.8}}/>:null}
  {avatarReserved!=='center'?<div style={{position:'absolute',left:150,right:avatarReserved?340:150,top:1360,textAlign:'center',fontSize:40,lineHeight:1.4,color:t.primary}}>{avatarReserved?'保留改变，检查结果':family==='chart'?'让数字帮助比较，让记录支撑判断':'保留每次改变，才能检查每次结果'}</div>:null}
  <div style={{position:'absolute',left:140,right:140,top:1470,textAlign:'center',borderTop:`1px solid ${t.line}`,paddingTop:18,fontSize:28,color:style==='industrial'?t.accent:t.muted}}>{source}</div>
  {final?<div style={{position:'absolute',right:140,bottom:205,fontSize:26,color:t.muted}}>有问题，评论区问</div>:null}
 </AbsoluteFill>;
};

export const GraphicVideo:React.FC<{style?:ExplanationStyle;avatar?:AvatarOption}>=({style='industrial',avatar=false})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig();const ms=frame/fps*1000;
 const index=Math.max(0,project.scenes.findIndex(s=>ms>=s.startMs&&ms<s.endMs));
 const scene=project.scenes[index];const local=ms-scene.startMs;
 // One directed reveal, followed by a stable reading pause. No ambient loops.
 const progress=Math.max(0,Math.min(1,local/1800));
 const caption=project.subtitles.find(s=>ms>=s.startMs&&ms<s.endMs);
 const t=styleTokens(style);
 return <AbsoluteFill>
  <GraphicScene {...scene} family={scene.family as 'process'|'chart'} style={style} progress={progress} active={Math.floor(local/1400)} final={index===project.scenes.length-1} avatarReserved={avatarEnabled(avatar)?(typeof avatar==='object'?avatar.position??'bottom-right':'bottom-right'):undefined}/>
  <AvatarOverlay avatar={avatar} audioSrc="audio/sampleA/narration.wav" style={style}/>
  {caption?<div style={{position:'absolute',left:140,right:140,bottom:270,textAlign:'center',fontFamily:'LXGW WenKai',fontSize:34,lineHeight:1.4,color:t.ink,background:style==='clean'?'#E8ECE4':'#121D1BDD',padding:'14px 22px',borderRadius:8}}>{caption.text}</div>:null}
  <Audio src={staticFile('audio/sampleA/narration.wav')} volume={0.9}/>
  {project.scenes.map((s,i)=><Sequence key={i} from={Math.round(s.startMs/1000*fps)} durationInFrames={fps}><Audio src={staticFile(i===7?'sfx/chime.wav':'sfx/tick.wav')} volume={0.12}/></Sequence>)}
 </AbsoluteFill>;
};
