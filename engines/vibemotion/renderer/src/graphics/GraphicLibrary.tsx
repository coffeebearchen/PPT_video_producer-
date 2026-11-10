import React from 'react';
import {styleTokens, type ExplanationStyle} from './styles';

export const PROCESS_KINDS=['flow','swimlane','causal','cycle','branch','tree','matrix','pyramid','hub','layers','funnel'] as const;
export const SHAPE_KINDS=['triangle','circle','square','diamond','hexagon','polygon','arrow','bracket','gear','star','flag','tag'] as const;
export const CHART_KINDS=['radar','scatter','gauge','funnel','heatmap','ring'] as const;
export const DECOR_KINDS=['flow','trail','particle','beam','ripple','dots','hatch','geometry','corner'] as const;
export const ICON_KINDS=['person','money','time','warning','check','clock','gear'] as const;
export type GraphicProps={kind:string;progress?:number;active?:number;style?:ExplanationStyle;labels?:string[];values?:number[];points?:{x:number;y:number}[];enabled?:boolean};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const point=(x:number,y:number,r:number,a:number)=>`${x+r*Math.cos(a)},${y+r*Math.sin(a)}`;
const poly=(n:number,r:number,x=50,y=50)=>Array.from({length:n},(_,i)=>point(x,y,r,-Math.PI/2+i*Math.PI*2/n)).join(' ');
export const Shape:React.FC<{kind:string;color?:string;fill?:string;size?:number}>=({kind,color='#AEC56B',fill='none',size=100})=>{
 let node:React.ReactNode;
 switch(kind){
  case 'circle':node=<circle cx="50" cy="50" r="36"/>;break;
  case 'square':node=<rect x="17" y="17" width="66" height="66" rx="6"/>;break;
  case 'diamond':node=<polygon points="50,8 92,50 50,92 8,50"/>;break;
  case 'arrow':node=<path d="M10 40 H60 V20 L92 50 L60 80 V60 H10 Z"/>;break;
  case 'bracket':node=<path d="M32 15 H18 V85 H32 M68 15 H82 V85 H68"/>;break;
  case 'gear':node=<><polygon points={Array.from({length:32},(_,i)=>point(50,50,i%4<2?41:32,i*Math.PI/16)).join(' ')}/><circle cx="50" cy="50" r="15"/></>;break;
  case 'star':node=<polygon points={Array.from({length:10},(_,i)=>point(50,50,i%2?19:42,-Math.PI/2+i*Math.PI/5)).join(' ')}/>;break;
  case 'flag':node=<path d="M20 90 V12 H83 L68 32 L83 51 H20"/>;break;
  case 'tag':node=<><path d="M12 29 H65 L92 50 L65 71 H12 Z"/><circle cx="70" cy="50" r="4"/></>;break;
  default:node=<polygon points={poly(kind==='triangle'?3:kind==='hexagon'?6:8,40)}/>;
 }
 return <svg width={size} height={size} viewBox="0 0 100 100" fill={fill} stroke={color} strokeWidth="3" strokeLinejoin="round">{node}</svg>;
};
export const Icon:React.FC<{kind:string;color?:string;size?:number}>=({kind,color='#AEC56B',size=80})=>{
 if(kind==='gear')return <Shape kind="gear" color={color} size={size}/>;
 return <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
 {kind==='person'?<><circle cx="50" cy="27" r="15"/><path d="M20 85 V72 Q20 48 50 48 Q80 48 80 72 V85 Z"/></>:kind==='warning'?<><path d="M50 10 L94 87 H6 Z"/><path d="M50 37 V59 M50 72 V74"/></>:kind==='check'?<path d="M15 53 L39 77 L87 22"/>:kind==='money'?<><rect x="9" y="22" width="82" height="57" rx="9"/><circle cx="50" cy="50" r="17"/><path d="M50 31 V69 M43 42 H56 M43 57 H56"/></>:<><circle cx="50" cy="53" r="35"/><path d="M50 53 V30 M50 53 L68 64"/>{kind==='time'?<path d="M38 9 H62 M50 9 V18"/>:null}</>}
 </svg>;
};
export const Ornament:React.FC<GraphicProps>=({kind,progress=1,style='industrial',enabled=true})=>{
 const t=styleTokens(style),p=clamp(progress);if(!enabled)return null;
 return <svg width="100%" height="100%" viewBox="0 0 800 500" fill="none" stroke={t.primary} strokeWidth="2" aria-hidden>
 {['flow','trail','particle','beam'].includes(kind)?<><path d="M60 350 C230 350 180 140 400 190 S570 350 740 110" opacity="0.22"/><path d="M60 350 C230 350 180 140 400 190 S570 350 740 110" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p} strokeWidth={kind==='beam'?7:3}/>{kind==='particle'?[0,1,2].map(i=><circle key={i} cx={100+i*160+p*90} cy={300-i*55} r="4" opacity={p}/>):null}</>:
 kind==='ripple'?[80,125,170].map((r,i)=><circle key={r} cx="400" cy="250" r={r} opacity={p*(0.55-i*0.13)}/>):
 kind==='dots'?Array.from({length:72},(_,i)=><circle key={i} cx={100+(i%12)*54} cy={105+Math.floor(i/12)*55} r="2.5" opacity="0.4"/>):
 kind==='hatch'?Array.from({length:16},(_,i)=><path key={i} d={`M${80+i*40} 350 l100 -200`} opacity="0.3"/>):
 kind==='corner'?<path d="M70 170 V70 H200 M600 70 H730 V170 M730 330 V430 H600 M200 430 H70 V330"/>:
 <><polygon points="400,60 575,160 575,340 400,440 225,340 225,160" opacity="0.5"/><circle cx="400" cy="250" r="115" opacity="0.4"/></>}
 </svg>;
};
export const ProcessDiagram:React.FC<GraphicProps>=({kind,progress=1,active=0,style='industrial',labels=['提出方案','执行尝试','观察结果','调整方案']})=>{
 const t=styleTokens(style),p=clamp(progress);const n=Math.min(labels.length,kind==='branch'?3:6);
 let positions:number[][];
 if(kind==='cycle')positions=Array.from({length:n},(_,i)=>[400+240*Math.cos(-Math.PI/2+i*2*Math.PI/n),300+205*Math.sin(-Math.PI/2+i*2*Math.PI/n)]);
 else if(['branch','tree','hub'].includes(kind))positions=kind==='hub'?[[400,290],[170,100],[630,100],[170,480],[630,480]]:[[400,100],[190,310],[610,310],[190,500],[610,500]];
 else if(['pyramid','funnel','layers'].includes(kind))positions=Array.from({length:n},(_,i)=>[400,90+i*135]);
 else if(kind==='matrix')positions=[[200,175],[600,175],[200,430],[600,430]];
 else if(kind==='swimlane')positions=[[160,155],[390,155],[390,400],[640,400]];
 else positions=[[160,160],[600,160],[600,430],[160,430]];
 positions=positions.slice(0,n);
 const edges=kind==='matrix'?[]:positions.slice(1).map((_,i)=>kind==='hub'?[0,i+1]:kind==='branch'||kind==='tree'?[i<2?0:i-1,i+1]:[i,i+1]);
 if(kind==='cycle')edges.push([n-1,0]);
 return <svg width="100%" height="100%" viewBox="0 0 800 600" style={{fontFamily:'LXGW WenKai'}}>
 <defs><marker id={`g-arrow-${kind}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1 L6 4 L1 7" fill="none" stroke={t.primary} strokeWidth="1.5"/></marker></defs>
 {kind==='matrix'?<path d="M400 65 V540 M60 300 H740" stroke={t.line} fill="none"/>:null}
 {kind==='swimlane'?<><rect x="50" y="50" width="700" height="220" fill={`${t.primary}08`} stroke={t.line}/><rect x="50" y="300" width="700" height="250" fill={`${t.accent}08`} stroke={t.line}/><text x="400" y="85" textAnchor="middle" fill={t.muted} fontSize="28">方案与执行</text><text x="400" y="345" textAnchor="middle" fill={t.muted} fontSize="28">观察与改进</text></>:null}
 {edges.map(([a,b],i)=>{const [x,y]=positions[a],[xx,yy]=positions[b],dx=xx-x,dy=yy-y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;const half=(index:number)=>kind==='pyramid'?(150+index*95)/2:kind==='funnel'?(430-index*75)/2:110;const start=Math.min(half(a)/(Math.abs(ux)||1e-6),46/(Math.abs(uy)||1e-6)),end=Math.min(half(b)/(Math.abs(ux)||1e-6),46/(Math.abs(uy)||1e-6));return <path key={i} d={`M${x+ux*start} ${y+uy*start} L${xx-ux*end} ${yy-uy*end}`} fill="none" stroke={t.primary} strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1-clamp(p*(edges.length+1)-i*0.65)} markerEnd={`url(#g-arrow-${kind})`}/>;})}
 {positions.map(([x,y],i)=>{const lit=i===Math.round(active)%positions.length;const w=kind==='pyramid'?150+i*95:kind==='funnel'?430-i*75:220;return <g key={i} opacity={0.35+0.65*clamp(p*5-i*.55)}><rect x={x-w/2} y={y-46} width={w} height="92" rx={t.radius} fill={lit?t.primary:t.surface} stroke={lit?t.primary:t.line} strokeWidth="2"/><text x={x} y={y+10} fill={lit?t.bg:t.ink} fontSize="30" textAnchor="middle">{labels[i]}</text>{kind==='causal'?<text x={x} y={y+80} textAnchor="middle" fill={t.muted} fontSize="28">{i===0?'改变条件':'观察影响'}</text>:null}</g>;})}
 </svg>;
};
export const AdvancedChart:React.FC<GraphicProps>=({kind,progress=1,active=0,style='industrial',values=[65,82,54,91,72],labels=['方案甲','方案乙','方案丙','方案丁','方案戊'],points=Array.from({length:18},(_,i)=>({x:8+(i%6)*17,y:10+((i*37)%75)}))})=>{
 const t=styleTokens(style),p=clamp(progress);const val=values.map(v=>Math.max(0,Math.min(100,v)));
 const label=(text:string,x:number,y:number,color=t.muted,size=28)=><text x={x} y={y} textAnchor="middle" fill={color} fontSize={size}>{text}</text>;
 const ring=kind==='ring'||kind==='gauge';const angle=kind==='gauge'?Math.PI:Math.PI*2;
 return <svg width="100%" height="100%" viewBox="0 0 800 600" style={{fontFamily:'LXGW WenKai'}}>
 {kind==='radar'?<>{[100,175,235].map(r=><polygon key={r} points={poly(5,r,400,290)} fill="none" stroke={t.line} strokeWidth="1"/>)}{val.map((_,i)=><path key={i} d={`M400 290 L${point(400,290,235,-Math.PI/2+i*2*Math.PI/5)}`} stroke={t.line}/>)}<polygon points={val.map((v,i)=>point(400,290,235*v/100*p,-Math.PI/2+i*2*Math.PI/5)).join(' ')} fill={`${t.primary}44`} stroke={t.primary} strokeWidth="4"/>{labels.map((l,i)=>{const [x,y]=point(400,290,278,-Math.PI/2+i*2*Math.PI/5).split(',').map(Number);return <g key={i}>{label(l,x,y)}</g>;})}</>:
 kind==='scatter'?<><path d="M110 75 V500 H730" stroke={t.line} fill="none"/>{[0,1,2].map(i=><path key={i} d={`M110 ${180+i*100} H730`} stroke={t.line} opacity="0.3"/>)}{points.map((v,i)=>{const x=110+clamp(v.x/100)*620,y=500-clamp(v.y/100)*425;return <circle key={i} cx={x} cy={y} r={i===Math.round(active)%points.length?11:7} fill={i%4===0?t.accent:t.primary} opacity={clamp(p*3-i/8)}/>;})}{label('投入 →',680,550)}{label('结果',110,55)}</>:
 kind==='heatmap'?<>{Array.from({length:24},(_,i)=>{const v=val[i%val.length],lit=i===Math.round(active)%24;return <g key={i} opacity={clamp(p*4-i/12)}><rect x={110+i%6*100} y={90+Math.floor(i/6)*112} width="84" height="88" rx="4" fill={lit?t.accent:t.primary} fillOpacity={lit?0.95:0.12+v/130} stroke={lit?t.ink:t.line}/>{label(String(v),152+i%6*100,143+Math.floor(i/6)*112,lit?t.bg:t.ink)}</g>;})}{label('条件组合 × 观察结果',400,575)}</>:
 kind==='funnel'?<>{val.slice(0,4).map((v,i)=>{const w=600*v/100,bottom=600*(val[i+1]??v*.7)/100;return <g key={i} opacity={clamp(p*5-i*.7)}><path d={`M${400-w/2} ${70+i*120} h${w} L${400+bottom/2} ${164+i*120} H${400-bottom/2} Z`} fill={`${t.primary}${i===Math.round(active)%4?'AA':'33'}`} stroke={t.primary}/>{label(`${labels[i]}  ${Math.round(v*p)}`,400,130+i*120,t.ink,32)}</g>;})}</>:
 ring?<><path d={kind==='gauge'?'M150 370 A250 250 0 0 1 650 370':'M400 65 A235 235 0 1 1 399.9 65'} fill="none" stroke={t.line} strokeWidth="22"/><path d={kind==='gauge'?'M150 370 A250 250 0 0 1 650 370':'M400 65 A235 235 0 1 1 399.9 65'} fill="none" stroke={t.primary} strokeWidth="22" pathLength="1" strokeDasharray="1" strokeDashoffset={1-(val[0]/100)*p} strokeLinecap="round"/>{label(`${Math.round(val[0]*p)}%`,400,kind==='gauge'?350:315,t.ink,96)}{label(labels[0],400,kind==='gauge'?430:385,t.muted,32)}{kind==='gauge'?<>{label('0',150,425)}{label('100',650,425)}</>:null}</>:null}
 </svg>;
};
