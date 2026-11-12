import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Courseware} from '../Courseware';
import {validateResolved} from '../model';
import {DEFINITIONS} from './catalog';
export const demoProject=validateResolved({
 schemaVersion:'courseware/1',taskId:'super-agent',renderId:'doodle-demo',draftRevision:1,title:'Super-Agent 是怎么工作的',style:'dynamicflow',canvas:{width:1080,height:1920,fps:30},publicRoot:'renderer/public',stagingDir:'courseware/super-agent/doodle-demo',totalFrames:1440,totalDurationSeconds:48,brand:{show:false},aiLabel:{show:false},
 slides:[
 {kind:'title',text:'Super-Agent\n是怎么工作的',body:'Router 接住消息\nWorker 在后台执行'},
 {kind:'diagram',layout:'A02',title:'先试一条路，验证后再保留',caption:'猜对直接用；猜错丢弃，回到已知条件。',data:{decision:'先猜一条路',success:{label:'猜对 ✓',detail:'直接用'},failure:{label:'猜错 ✗',detail:'丢弃结果'}}},
 {kind:'diagram',layout:'B03',title:'每一轮都带回新的检查结果',caption:'计划、执行、检查、调整：下一轮从反馈开始。',data:{nodes:['计划','执行','检查','调整']}},
 {kind:'diagram',layout:'B05',title:'对话和执行，分开承担职责',caption:'用户提需求，Router 派活，Worker 完成后汇报。',data:DEFINITIONS.B05.data},
 {kind:'diagram',layout:'D02',title:'你继续对话，Worker 继续做事',caption:'Router 持续接住消息，后台执行不堵住对话。',data:DEFINITIONS.D02.data},
 {kind:'diagram',layout:'C08',title:'300 条消息，20 条需要行动',caption:'每个点代表一条消息；20 个黄点是要干的活。',data:DEFINITIONS.C08.data},
 {kind:'diagram',layout:'B07',title:'后续直接跟进，减少一次转发',caption:'首次由 Router 判断；\n明确负责者后，后续直接交给 Worker。',data:DEFINITIONS.B07.data},
 {kind:'quote',text:'让对话保持流动\n让任务有始有终',body:'清楚地派活，持续地验证\n完成后，再把结果带回来'},
 ].map((s,i)=>({...s,id:'scene-'+i,fromFrame:i*180,durationInFrames:180}))
});
registerRoot(()=> <Composition id="SuperAgentDoodle" component={Courseware} defaultProps={demoProject} durationInFrames={1440} fps={30} width={1080} height={1920}/>);
