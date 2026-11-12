import React,{useId,useMemo} from 'react';
import {useCurrentFrame,useVideoConfig} from 'remotion';
import {drawLayout,type InkPath} from './source';
import {DEFINITIONS,parseDiagram,type DiagramSpec} from './catalog';
export const FONT='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const wrap=(s:string,width=23)=>s.split('\n').flatMap(line=>{const rows:string[]=[];let row='',n=0;for(const c of line){const w=c.charCodeAt(0)>255?1:.55;if(n+w>width){rows.push(row);row='';n=0;}row+=c;n+=w;}if(row)rows.push(row);return rows;});
export function drawingFor(spec:DiagramSpec){
 parseDiagram(spec.layout,spec.data);const d=drawLayout(spec.layout,spec.data);
 const bindings=DEFINITIONS[spec.layout].bind;
 d.texts=d.texts.map((t,i)=>{const key=bindings[i];if(!key)return t;let value:unknown=spec.data;for(const part of key.split('.'))value=(value as Record<string,unknown>)[part];return {...t,s:String(value)};});
 return d;
}
const Stroke:React.FC<{paths:InkPath[];progress:number;highlight?:number}>=({paths,progress:p,highlight})=><g opacity={p===0?0:1}>
 {paths.map((a,i)=><path key={i} d={a.d} stroke={highlight!==undefined?'#6E6E68':a.stroke} strokeWidth={a.sw} fill={highlight!==undefined?(a.fill==='none'?'none':'#2E2E2E'):a.fill} fillOpacity={p} pathLength={1} strokeDasharray={1} strokeDashoffset={1-p} strokeLinecap="round" strokeLinejoin="round"/>)}
 {highlight!==undefined&&highlight>0&&paths.map((a,i)=><path key={'lit'+i} d={a.d} stroke={a.stroke} strokeWidth={a.sw} fill={a.fill} opacity={highlight} strokeLinecap="round"/>)}
</g>;
export const DiagramPage:React.FC<{spec:DiagramSpec;title:string;caption?:string;still?:boolean}>=({spec,title,caption,still})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),ms=still?99999:frame/fps*1000;
 const id='chalk'+useId().replace(/\W/g,'');const drawing=useMemo(()=>drawingFor(spec),[spec]);
 const groups=useMemo(()=>{const map=new Map<number,InkPath[]>();drawing.paths.forEach(p=>{if(!map.has(p.group))map.set(p.group,[]);map.get(p.group)!.push(p);});return [...map.values()];},[drawing]);
 const lines=wrap(title,22),notes=wrap(caption??drawing.foot,25);
 if(lines.length>2||notes.length>3)throw Error('Diagram copy too long; shorten title/caption');
 return <svg data-diagram={spec.layout} xmlns="http://www.w3.org/2000/svg" width={1080} height={1920} viewBox="0 0 1080 1920" style={{fontFamily:FONT,background:'#282828'}}>
  <defs><filter id={id} x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={3} seed={7} result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale={3.2} xChannelSelector="R" yChannelSelector="G"/></filter><filter id={id+'text'} x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={11} result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale={1.1} xChannelSelector="R" yChannelSelector="G"/></filter><filter id={id+'grain'}><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={4} seed={3}/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".10"/></feComponentTransfer></filter><radialGradient id={id+'vig'} cx="50%" cy="45%" r="75%"><stop offset="0%" stopColor="#000" stopOpacity={0}/><stop offset="100%" stopColor="#000" stopOpacity={.28}/></radialGradient><clipPath id={id+'clip'}><rect x={110} y={305} width={860} height={1195}/></clipPath></defs>
  <rect width={1080} height={1920} fill="#282828"/>
  <text filter={`url(#${id}text)`} data-doodle-text x={540} y={225} textAnchor="middle" fontSize={44} fill="#EDE6D6" opacity={clamp(ms/350)}>{lines.map((l,i)=><tspan key={i} x={540} dy={i?55:0}>{l}</tspan>)}</text>
  <g clipPath={`url(#${id}clip)`}><g transform="translate(97.2 90) scale(.82 .8)" filter={`url(#${id})`}>
   {groups.map((paths,i)=>{const cell=paths[0].cell,start=cell!==undefined?400+cell/(spec.layout==='C08'?spec.data.total:300)*1100:350+i/Math.max(1,groups.length-1)*2450,p=clamp((ms-start)/300);const hi=cell!==undefined&&paths[0].lit?clamp((ms-1700-cell/(spec.layout==='C08'?spec.data.total:300)*1300)/180):0;return <Stroke key={i} paths={paths} progress={p} highlight={cell!==undefined?(paths[0].lit?hi:0):undefined}/>;})}
  </g></g>
  {drawing.texts.filter(t=>t.s).map((t,i)=>{const p=clamp((ms-650-i/Math.max(1,drawing.texts.length-1)*2300)/300),scale=.91+.09*(1-(1-p)**3),x=t.x*.82+97.2,y=t.y*.8+90;return <g key={i} opacity={p} transform={`translate(${x} ${y}) scale(${scale})`}><text filter={`url(#${id}text)`} data-doodle-text x={0} y={0} textAnchor={t.anchor} fill={t.c} fontSize={Math.max(28,t.size*.85)} fontWeight={t.weight}>{t.s}</text></g>;})}
  <rect width={1080} height={1920} filter={`url(#${id}grain)`} opacity={.55}/>
  <rect width={1080} height={1920} fill={`url(#${id}vig)`}/>
  <text filter={`url(#${id}text)`} data-doodle-text x={540} y={1570} textAnchor="middle" fill="#DCBC62" fontSize={32} opacity={clamp((ms-3150)/400)}>{notes.slice(0,3).map((l,i)=><tspan key={i} x={540} dy={i?44:0}>{l}</tspan>)}</text>
 </svg>;
};

