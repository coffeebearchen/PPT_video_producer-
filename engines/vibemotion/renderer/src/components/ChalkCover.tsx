import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {FONT, FONT_HEADING} from '../engine/tokens';
import {SketchRect} from '../engine/SketchRect';
import timeline from '../data/timeline_dsl.json';

export const ChalkCover: React.FC = () => {
 const {height}=useVideoConfig();
 const y=height===1440?610:830;
 const ink='#F1E5B1',gold='#F3C545',green='#8BB8AD';
 return <AbsoluteFill style={{background:'#252624',color:ink,fontFamily:FONT}}>
  <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.32))'}}/>
  <div style={{position:'absolute',left:140,right:140,top:height*0.17,textAlign:'center'}}>
   <div style={{fontSize:32,color:green,marginBottom:32}}>让每一次尝试，都有下一步</div>
   <div style={{fontFamily:FONT_HEADING,fontSize:94,lineHeight:1.45}}>{timeline.projectMeta.title.replace('变成','\n变成').split('\n').map((s,i)=><div key={s} style={{color:i?gold:ink}}>{s}</div>)}</div>
  </div>
  <svg width="1080" height={height} style={{position:'absolute',inset:0}}><path d={`M300 ${y+100} Q540 ${y-160} 780 ${y+100} M780 ${y+100} Q540 ${y+380} 300 ${y+100}`} fill="none" stroke={green} strokeWidth="3" strokeDasharray="12 10"/><ellipse cx="540" cy={height*0.83} rx="330" ry="57" fill="none" stroke={gold} strokeWidth="3"/></svg>
  {['提出方案','运行观察','留下记录'].map((text,i)=><div key={text} style={{position:'absolute',left:150+i*275,top:y,width:230,height:190,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,color:i===2?gold:ink}}><SketchRect w={230} h={190} stroke={i===2?gold:green} seed={21+i*7} strokeWidth={3} fill="#252624"/ ><span style={{position:'relative'}}>{text}</span></div>)}
  <div style={{position:'absolute',left:140,right:140,top:height*0.83-24,textAlign:'center',fontSize:40,color:gold}}>可以检查，也可以继续</div>
 </AbsoluteFill>;
};
