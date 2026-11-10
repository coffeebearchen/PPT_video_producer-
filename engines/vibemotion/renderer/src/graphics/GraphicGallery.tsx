import React from 'react';
import {AbsoluteFill} from 'remotion';
import {GRAPHIC_CATALOG} from './catalog';
import {AdvancedChart,Icon,Ornament,ProcessDiagram,Shape} from './GraphicLibrary';

export const GraphicGallery:React.FC=()=> <AbsoluteFill style={{background:'#202B29',fontFamily:'LXGW WenKai'}}>
 {GRAPHIC_CATALOG.map((item,i)=><div key={item.id} style={{position:'absolute',left:i%4*800,top:Math.floor(i/4)*650,width:800,height:650,boxSizing:'border-box',border:'1px solid #647466'}}>
  <div style={{height:64,display:'flex',alignItems:'center',justifyContent:'center',gap:24,color:'#ECF0E4',fontSize:34}}>{item.label}<span style={{fontSize:24,color:'#ACB9AC'}}>{item.id}</span></div>
  <div style={{position:'absolute',left:20,right:20,top:75,bottom:20,display:'flex',alignItems:'center',justifyContent:'center'}}>
   {item.family==='process'?<ProcessDiagram kind={item.kind} labels={item.kind==='hub'||item.kind==='tree'?['原有方案','尝试甲','尝试乙','观察甲','观察乙']:['提出方案','运行尝试','观察结果','改进方案']} active={1}/>:
    item.family==='chart'?<AdvancedChart kind={item.kind} values={item.kind==='funnel'?[100,78,52,30]:undefined} active={2}/>:
    item.family==='shape'?<Shape kind={item.kind} size={310} fill="#AEC56B18"/>:
    item.family==='icon'?<Icon kind={item.kind} size={280}/>:<Ornament kind={item.kind}/>}
  </div>
 </div>)}
 </AbsoluteFill>;
