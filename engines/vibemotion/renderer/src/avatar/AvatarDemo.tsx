import React from 'react';
import {AbsoluteFill,Audio,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import project from '../data/round5-avatar.json';
import {GraphicScene} from '../graphics/GraphicScene';
import {styleTokens,type ExplanationStyle} from '../graphics/styles';
import {AvatarOverlay,avatarEnabled,type AvatarOption} from './AvatarOverlay';

export const AvatarDemo:React.FC<{avatar?:AvatarOption;style?:ExplanationStyle}>=({avatar=project.avatar as AvatarOption,style='industrial'})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),ms=frame/fps*1000;
 const i=Math.max(0,project.scenes.findIndex(s=>ms>=s.startMs&&ms<s.endMs)),scene=project.scenes[i];
 const t=styleTokens(style),local=ms-scene.startMs;
 const caption=project.subtitles.find(s=>ms>=s.startMs&&ms<s.endMs);
 return <AbsoluteFill>
  <GraphicScene {...scene} family="process" style={style} source="来源：自制流程演示" progress={Math.min(1,local/1800)} active={Math.floor(local/1600)} final={i===project.scenes.length-1} avatarReserved={avatarEnabled(avatar)?(typeof avatar==='object'?avatar.position??'bottom-right':'bottom-right'):undefined}/>
  {caption?<div style={{position:'absolute',left:140,right:140,bottom:270,padding:'14px 22px',background:style==='clean'?'#E8ECE4':'#121D1BDD',color:t.ink,borderRadius:8,fontFamily:'LXGW WenKai',fontSize:34,lineHeight:1.4,textAlign:'center'}}>{caption.text}</div>:null}
  <AvatarOverlay avatar={avatar} audioSrc={project.audioSrc} style={style}/>
  <Audio src={staticFile(project.audioSrc)}/>
 </AbsoluteFill>;
};
