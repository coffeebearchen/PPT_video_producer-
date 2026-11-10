import React from 'react';
import {Composition, registerRoot, AbsoluteFill} from 'remotion';
import {FlowChart} from './components/FlowChart';
import {ComparisonSplitCard} from './components/ComparisonSplitCard';
import {MythBusterStrike} from './components/MythBusterStrike';
import {SpotlightPillars} from './components/SpotlightPillars';
import {EvolutionTimeline} from './components/EvolutionTimeline';
import {PipelineArchitecture} from './components/PipelineArchitecture';
import {KineticTypography} from './components/KineticTypography';
import {GanttParallelStream} from './components/GanttParallelStream';
import {ConcurrentDashboard} from './components/ConcurrentDashboard';
import {Chart} from './components/Chart';
import {Diagram} from './components/Diagram';
import {Counter} from './components/Counter';
import {CycleFlow} from './components/CycleFlow';
import {BranchFlow} from './components/BranchFlow';
import {DualRoleVideoSync} from './components/DualRoleVideoSync';
import {BrowserDOMSpotlight} from './components/BrowserDOMSpotlight';

const fps = 30, w = 1080, h = 1920, dur = 30;

const AnnotationDemo = ({kind}: {kind: 'circle'|'underline'|'highlight'|'arrow'|'bubble'}) => (
  <AbsoluteFill style={{justifyContent:'center',alignItems:'center',background:'#F3EDE1'}}>
    <div style={{position:'relative',fontSize:120,color:'#101112',padding:40}}>
      关键信息
      {kind==='circle' && <svg style={{position:'absolute',left:-20,top:-20,width:460,height:220}} viewBox="0 0 460 220" fill="none"><ellipse cx="230" cy="110" rx="210" ry="90" stroke="#C73520" strokeWidth="6" strokeDasharray="14 10"/></svg>}
      {kind==='underline' && <div style={{position:'absolute',left:0,bottom:10,width:'100%',height:16,background:'#C73520',borderRadius:6,transform:'rotate(-1deg)'}}/>}
      {kind==='highlight' && <div style={{position:'absolute',left:0,top:70,width:'100%',height:90,background:'#D9FF57',opacity:0.55,borderRadius:10}}/>}
      {kind==='arrow' && <svg style={{position:'absolute',right:-180,top:40}} width="200" height="120" viewBox="0 0 200 120" fill="none"><path d="M20 60 C 80 20, 140 20, 180 10" stroke="#101112" strokeWidth="6"/><path d="M150 6 L182 10 L152 36" stroke="#101112" strokeWidth="6" fill="none"/></svg>}
      {kind==='bubble' && <div style={{position:'absolute',right:-150,top:-10,background:'#101112',color:'#F3EDE1',borderRadius:999,padding:'12px 26px',fontSize:44}}>1</div>}
    </div>
  </AbsoluteFill>
);

const TextureDemo = ({kind}: {kind: 'grain'|'particles'|'sweep'|'vignette'|'hatch'}) => {
  const grain = <svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:0.5}}><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter><rect width="1080" height="1920" filter="url(#g)" opacity="0.08"/></svg>;
  const particles = Array.from({length:40}).map((_,i)=>({x:(i*53)%1080,y:(i*97)%1920,r:2+(i%4)}));
  return (
    <AbsoluteFill style={{background:'#F3EDE1'}}>
      {kind==='grain' && grain}
      {kind==='particles' && particles.map((p,i)=><div key={i} style={{position:'absolute',left:p.x,top:p.y,width:p.r*3,height:p.r*3,borderRadius:'50%',background:'rgba(199,53,32,0.35)'}}/>)}
      {kind==='sweep' && <div style={{position:'absolute',top:900,left:100,width:880,height:6,borderRadius:3,background:'linear-gradient(90deg,transparent,#C73520,transparent)'}}/>}
      {kind==='vignette' && <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 45%, transparent 45%, rgba(16,17,18,0.28) 100%)'}}/>}
      {kind==='hatch' && <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg, rgba(16,17,18,0.08) 0 3px, transparent 3px 9px)'}}/>}
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition id="flowchart" component={() => <FlowChart title="三步走" kicker="动 态 流 程" nodes={[{id:'a',label:'收集',sub:'找资料'},{id:'b',label:'处理',sub:'做整理'},{id:'c',label:'输出',sub:'发出来'}]} activeStep={2} stepCaption="第二步：处理" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="comparison" component={() => <ComparisonSplitCard headline="看起来 vs 其实" question="?" left={{title:'看起来',sub:'一次成功',tone:'waiting'}} right={{title:'其实',sub:'多跑两步就错',tone:'active'}} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="mythbuster" component={() => <MythBusterStrike badgeLabel="认知反转" beforeText="更聪明的模型" afterText="更会验证的工程" active={true} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="spotlight" component={() => <SpotlightPillars sectionHeader="三个障碍" pillars={[{indexLabel:'1',title:'编造接口',topFloatingBadge:{type:'waveform'},bottomTakeawayText:'不存在的也敢写'},{indexLabel:'2',title:'工具调错',topFloatingBadge:{type:'chat_wrench'},bottomTakeawayText:'一次错后面全错'},{indexLabel:'3',title:'长任务失忆',topFloatingBadge:{type:'text_badge',content:'10步'},bottomTakeawayText:'跑到一半忘了'}]} activePillarIndex={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="timeline" component={() => <EvolutionTimeline sectionHeader="技术演进" nodes={[{title:'第一步',metaTag:'阶段1',accentColor:'#C73520'},{title:'第二步',metaTag:'阶段2',accentColor:'#D9A24E'},{title:'第三步',metaTag:'阶段3',accentColor:'#6F8F6F'}]} activeNodeIndex={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="pipeline" component={() => <PipelineArchitecture sectionHeader="四段流水线" kicker="工 程 保 障" stages={[{code:'A',title:'输入',sampleTextOrWave:'接收',themeColor:'#C73520'},{code:'B',title:'处理',sampleTextOrWave:'加工',themeColor:'#D9A24E'},{code:'C',title:'输出',sampleTextOrWave:'发布',themeColor:'#6F8F6F'}]} focusedStageIndex={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="kinetic" component={() => <KineticTypography lines={['不是更聪明，','是更会验证。']} highlightKeywords={['更会验证']} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="gantt" component={() => <GanttParallelStream mode="serial_loop" sectionHeader="一步错步步错" serialConfig={{nodes:['计划','执行','报错'],activeNodeIndex:1,orbitBallProgress:0.5,bottomCaption:'整条链路重来'}} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="dashboard" component={() => <ConcurrentDashboard caption="边执行边校验" orbState={{mode:'speaking_wave',label:'通过',subBadge:'结果可用',colorHex:'#C73520'}} tasks={[{title:'生成方案',progress:1,status:'completed'},{title:'校验接口',progress:0.7,status:'running'}]} contextBanner={{icon:'▸',text:'执行与校验同时进行',active:true}} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-bar" component={() => <Chart title="四季度增长" kicker="数 据 图 表" kind="bar" series={[{name:'增长',values:[3,5,4,7],color:'gold'}]} xLabels={['Q1','Q2','Q3','Q4']} caption="柱状 · 逐帧生长" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-donut" component={() => <Chart title="占比" kind="donut" series={[{name:'A',values:[1],color:'gold'},{name:'B',values:[1],color:'sage'},{name:'C',values:[1],color:'coral'}]} centerLabel="3 类" caption="环形图" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-hub" component={() => <Diagram title="中心辐射" layout="hub" nodes={[{id:'c',label:'中心',tone:'gold'},{id:'a',label:'分支A',tone:'sage'},{id:'b',label:'分支B',tone:'sage'},{id:'d',label:'分支C',tone:'sage'}]} edges={[{from:'c',to:'a'},{from:'c',to:'b'},{from:'c',to:'d'}]} activeStep={2} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="counter" component={() => <Counter title="关键数字" items={[{label:'成功率',value:98,suffix:'%',color:'gold'},{label:'平均耗时',value:12,suffix:'s',color:'sage'}]} progress={1} caption="数字滚动" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="cycle" component={() => <CycleFlow title="持续循环" nodes={[{id:'1',label:'写',sub:'产出'},{id:'2',label:'验',sub:'校验'},{id:'3',label:'改',sub:'修正'}]} activeStep={1.4} centerText="迭代" centerSub="循环" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="branch" component={() => <BranchFlow title="分支决策" root={{label:'执行',sub:'一个任务'}} branches={[{label:'成功',sub:'继续',tone:'good'},{label:'失败',sub:'重试',tone:'bad'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="dualrole" component={() => <DualRoleVideoSync title="多角色发声" speakers={[{label:'人',active:true,colorHex:'#C73520'},{label:'AI',active:false,colorHex:'#6F8F6F'}]} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="domspot" component={() => <BrowserDOMSpotlight caption="页面截图聚光" highlight={{x:0.2,y:0.3,w:0.5,h:0.12}} dim={0.55} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-line" component={() => <Chart title="趋势" kind="line" series={[{name:'A',values:[2,4,3,6],color:'gold'}]} xLabels={['1','2','3','4']} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-step" component={() => <Chart title="阶梯" kind="step" series={[{name:'A',values:[2,2,5,5],color:'sage'}]} xLabels={['1','2','3','4']} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-hbar" component={() => <Chart title="横条对比" kind="hbar" series={[{name:'A',values:[4],color:'gold'},{name:'B',values:[3],color:'coral'},{name:'C',values:[5],color:'sage'}]} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-area" component={() => <Chart title="面积" kind="area" series={[{name:'A',values:[2,4,3,6],color:'gold'}]} xLabels={['1','2','3','4']} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="chart-pie" component={() => <Chart title="占比" kind="pie" series={[{name:'A',values:[3],color:'gold'},{name:'B',values:[2],color:'sage'},{name:'C',values:[1],color:'coral'}]} centerLabel="3 类" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-flow" component={() => <Diagram title="流程" layout="flow" nodes={[{id:'1',label:'A',tone:'gold'},{id:'2',label:'B',tone:'sage'},{id:'3',label:'C',tone:'coral'}]} edges={[{from:'1',to:'2'},{from:'2',to:'3'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-cycle" component={() => <Diagram title="循环" layout="cycle" nodes={[{id:'1',label:'A'},{id:'2',label:'B'},{id:'3',label:'C'}]} edges={[{from:'1',to:'2'},{from:'2',to:'3'},{from:'3',to:'1'}]} activeStep={2} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-tree" component={() => <Diagram title="树形" layout="tree" nodes={[{id:'r',label:'根'},{id:'a',label:'A'},{id:'b',label:'B'},{id:'c',label:'C'}]} edges={[{from:'r',to:'a'},{from:'r',to:'b'},{from:'r',to:'c'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-network" component={() => <Diagram title="网络" layout="network" nodes={[{id:'1',label:'A'},{id:'2',label:'B'},{id:'3',label:'C'},{id:'4',label:'D'}]} edges={[{from:'1',to:'2'},{from:'1',to:'3'},{from:'2',to:'4'},{from:'3',to:'4'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-layers" component={() => <Diagram title="层叠" layout="layers" nodes={[{id:'1',label:'界面'},{id:'2',label:'逻辑'},{id:'3',label:'数据'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-matrix" component={() => <Diagram title="矩阵" layout="matrix" nodes={[{id:'1',label:'A'},{id:'2',label:'B'},{id:'3',label:'C'},{id:'4',label:'D'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="diagram-pyramid" component={() => <Diagram title="金字塔" layout="pyramid" nodes={[{id:'1',label:'基础'},{id:'2',label:'中层'},{id:'3',label:'顶端'}]} activeStep={1} />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="ann-circle" component={() => <AnnotationDemo kind="circle" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="ann-underline" component={() => <AnnotationDemo kind="underline" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="ann-highlight" component={() => <AnnotationDemo kind="highlight" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="ann-arrow" component={() => <AnnotationDemo kind="arrow" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="ann-bubble" component={() => <AnnotationDemo kind="bubble" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="tex-grain" component={() => <TextureDemo kind="grain" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="tex-particles" component={() => <TextureDemo kind="particles" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="tex-sweep" component={() => <TextureDemo kind="sweep" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="tex-vignette" component={() => <TextureDemo kind="vignette" />} durationInFrames={dur} fps={fps} width={w} height={h} />
      <Composition id="tex-hatch" component={() => <TextureDemo kind="hatch" />} durationInFrames={dur} fps={fps} width={w} height={h} />
    </>
  );
};

registerRoot(RemotionRoot);
