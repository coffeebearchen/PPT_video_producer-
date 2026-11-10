import React,{useEffect,useState} from 'react';
import {cancelRender,continueRender,delayRender,Img,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {computeEnergy,energyAt,type EnergyTrack} from './energy';
import {styleTokens,type ExplanationStyle} from '../graphics/styles';

export type AvatarConfig={enabled?:boolean;src?:string;energySrc?:string;position?:'bottom-right'|'center';offsetMs?:number;mouth?:{x:number;y:number;width:number;maskColor?:string}};
export type AvatarOption=boolean|AvatarConfig;
const DEFAULT_CONFIG:AvatarConfig={enabled:true,position:'bottom-right'};
export const avatarEnabled=(option?:AvatarOption)=>option===true||(!!option&&typeof option==='object'&&option.enabled!==false);
const resource=(src:string)=>/^(https?:|data:|blob:)/.test(src)?src:staticFile(src.replace(/^\//,''));
const CACHE=new Map<string,Promise<EnergyTrack>>();

async function loadEnergy(audioSrc:string,energySrc?:string):Promise<EnergyTrack>{
 const key=energySrc??audioSrc;
 const cached=CACHE.get(key);if(cached)return cached;
 const pending=(async()=>{
  const response=await fetch(resource(energySrc??audioSrc));if(!response.ok)throw new Error(`头像音频/能量文件读取失败：${response.status}`);
  if(energySrc){
   const track=await response.json() as EnergyTrack;
   if(track.version!==1||!Number.isFinite(track.fps)||track.fps<=0||!Number.isFinite(track.durationMs)||track.durationMs<=0||!Array.isArray(track.values)||track.values.length<Math.ceil(track.durationMs/1000*track.fps)-1||track.values.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('头像音频能量文件格式无效');
   if(track.source&&track.source!==audioSrc)throw new Error('能量文件与配音路径不一致，请重新计算');
   return track;
  }
  const context=new OfflineAudioContext(1,1,16000);
  const decoded=await context.decodeAudioData(await response.arrayBuffer());
  const mono=new Float32Array(decoded.length);
  for(let c=0;c<decoded.numberOfChannels;c++){const data=decoded.getChannelData(c);for(let i=0;i<data.length;i++)mono[i]+=data[i]/decoded.numberOfChannels;}
  return computeEnergy(mono,decoded.sampleRate,30);
 })();
 CACHE.set(key,pending);pending.catch(()=>CACHE.delete(key));return pending;
}

const Mouth:React.FC<{energy:number;x:number;y:number;width:number;maskColor?:string}>=({energy,x,y,width,maskColor})=>{
 const h=1+width*.29*energy;
 return <g>
  {maskColor?<ellipse cx={x} cy={y} rx={width*.85} ry={width*.5} fill={maskColor}/>:null}
  {energy<.04?<path d={`M${x-width*.5} ${y} Q${x} ${y+3} ${x+width*.5} ${y}`} stroke="#3A2C2B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>:
   <><ellipse cx={x} cy={y} rx={width*.5} ry={h} fill="#362C30"/><path d={`M${x-width*.29} ${y-h*.45} Q${x} ${y-h*.17} ${x+width*.29} ${y-h*.45}`} fill="none" stroke="#F5EEDD" strokeWidth="2"/><ellipse cx={x} cy={y+h*.6} rx={width*.23} ry={h*.2} fill="#C77F71"/></>}
 </g>;
};

const LoadedAvatar:React.FC<{config:AvatarConfig;audioSrc:string;style:ExplanationStyle}>=({config,audioSrc,style})=>{
 const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();const t=styleTokens(style);
 const [track,setTrack]=useState<EnergyTrack|null>(null);
 const [handle]=useState(()=>delayRender('计算头像模拟口型所需的真实音频能量'));
 useEffect(()=>{
  let alive=true;
  loadEnergy(audioSrc,config.energySrc).then(data=>{if(alive)setTrack(data);continueRender(handle);}).catch(err=>{if(alive)cancelRender(err);});
  return()=>{alive=false;};
 },[audioSrc,config.energySrc,handle]);
 if(config.src&&!config.mouth)throw new Error('用户头像需要提供 mouth 的 x/y/width（0–1），请先校准嘴部位置');
 if(config.mouth&&([config.mouth.x,config.mouth.y,config.mouth.width].some(v=>!Number.isFinite(v)||v<0||v>1)||config.mouth.width===0))throw new Error('头像嘴部坐标必须在0–1之间，嘴宽必须大于0');
 const energy=track?energyAt(track,frame/fps*1000-(config.offsetMs??0)):0;
 const x=config.position==='center'?(width-160)/2:width-310,y=height-600;
 // This footer slot is reserved by GraphicScene; it is separate from diagrams, source and captions.
 if(x<width*.1||x+160>width*.9||y<height*.1||y+144>height*.9)throw new Error('当前画幅需要重新预留头像位置；默认头像小窗为9:16竖屏布局');
 return <div style={{position:'absolute',left:x,top:y,width:160,height:144,background:t.surface,border:`1px solid ${t.line}`,borderRadius:18,overflow:'hidden',pointerEvents:'none',boxSizing:'border-box'}}>
  <div style={{height:130,transform:`rotate(${energy*.45}deg)`,transformOrigin:'50% 90%'}}>
   {config.src?<><Img src={resource(config.src)} style={{width:160,height:130,objectFit:'cover'}}/><svg width="160" height="130" style={{position:'absolute',inset:0}}><Mouth energy={energy} x={config.mouth!.x*160} y={config.mouth!.y*130} width={config.mouth!.width*160} maskColor={config.mouth!.maskColor}/></svg></>:
    <svg width="160" height="130" viewBox="0 0 160 130" aria-label="代码绘制的内置卡通头像">
     <path d="M28 135 Q28 103 80 101 Q132 103 132 135" fill={t.primary}/>
     <path d="M68 95 V112 Q80 121 92 112 V95" fill="#D6AD83"/>
     <ellipse cx="80" cy="62" rx="43" ry="46" fill="#E8C39B"/>
     <path d="M37 59 Q29 13 73 11 Q117 4 125 56 L111 43 Q81 44 60 30 Q57 49 37 59" fill="#324640"/>
     <path d="M47 42 Q48 27 64 22" fill="none" stroke={t.primary} strokeWidth="3"/>
     <path d="M50 54 Q58 49 65 54 M96 54 Q104 49 111 54" fill="none" stroke="#51423A" strokeWidth="2"/>
     <ellipse cx="58" cy="62" rx="3" ry="4" fill="#34352F"/><ellipse cx="103" cy="62" rx="3" ry="4" fill="#34352F"/>
     <path d="M80 66 L76 76 H83" fill="none" stroke="#B88968" strokeWidth="2" strokeLinecap="round"/>
     <Mouth energy={energy} x={80} y={87} width={25}/>
    </svg>}
  </div>
  <div style={{position:'absolute',left:0,right:0,bottom:4,textAlign:'center',fontFamily:'LXGW WenKai',fontSize:24,lineHeight:1.1,color:t.muted,background:t.surface}}>模拟口型</div>
 </div>;
};

export const AvatarOverlay:React.FC<{avatar?:AvatarOption;audioSrc?:string;style?:ExplanationStyle}>=({avatar=false,audioSrc,style='industrial'})=>{
 if(!avatarEnabled(avatar))return null;
 if(!audioSrc)throw new Error('开启头像模拟口型需要真实配音音频');
 return <LoadedAvatar config={typeof avatar==='object'?avatar:DEFAULT_CONFIG} audioSrc={audioSrc} style={style}/>;
};
