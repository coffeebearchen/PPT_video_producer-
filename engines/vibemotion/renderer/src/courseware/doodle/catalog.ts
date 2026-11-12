/** Each entry is the authored template's data contract. Array lengths are fixed drawing slots. */
export const DEFINITIONS = {
 A01:{data:{root:'总任务',action:'拆解',children:['子任务 A','子任务 B'],leaves:['步骤1','步骤2','步骤3','步骤4']},bind:['root','action','children.0','children.1','leaves.0','leaves.1','leaves.2','leaves.3']},
 A02:{data:{decision:'先猜一条路',success:{label:'猜对 ✓',detail:'直接用'},failure:{label:'猜错 ✗',detail:'扔掉'}},bind:['decision','success.label','success.detail','failure.label','failure.detail']},
 A03:{data:{center:'Router',satellites:['接消息','记录日志','分派任务','检查结果','总结']},bind:['center','satellites.0','satellites.1','satellites.2','satellites.3','satellites.4']},
 A04:{data:{layers:[{label:'交互入口',items:['用户消息','状态面板','结果输出']},{label:'任务编排',items:['Router','任务队列','结果汇总']},{label:'执行能力',items:['代码修复','测试验证','资料检索']},{label:'运行保障',items:['权限','日志','资源限制']}]},bind:Array.from({length:4},(_,i)=>[`layers.${i}.label`,...Array.from({length:3},(_,j)=>`layers.${i}.items.${j}`)]).flat()},
 A05:{data:{containers:['工作空间','项目','任务','执行']},bind:['containers.0','containers.1','containers.2','containers.3']},
 A06:{data:{first:{items:['输入','动作','结果'],label:'前置'},second:{items:['验证','修复','验证'],label:'循环'}},bind:['first.items.0','first.items.1','first.items.2','first.label','second.items.0','second.items.1','second.items.2','second.label']},
 A07:{data:{levels:['交付','验证','执行','基础']},bind:['levels.0','levels.1','levels.2','levels.3']},
 A08:{data:{stages:[{label:'全部消息',count:'300 条'},{label:'需要处理',count:'80 条'},{label:'真正有价值',count:'20 条'}]},bind:['stages.0.label','stages.0.count','stages.1.label','stages.1.count','stages.2.label','stages.2.count']},
 A09:{data:{rings:['外围','影响范围','核心']},bind:['rings.0','rings.1','rings.2']},
 B01:{data:{steps:['接收消息','判断意图','分派任务','汇总结果']},bind:['steps.0','steps.1','steps.2','steps.3']},
 B02:{data:{steps:['输入','处理','输出'],branches:['分支','分支']},bind:['steps.0','steps.1','steps.2','branches.0','branches.1']},
 B03:{data:{nodes:['计划','执行','检查','调整']},bind:['nodes.0','nodes.1','nodes.2','nodes.3']},
 B04:{data:{events:['原因','影响','结果'],links:['导致','最终']},bind:['events.0','links.0','events.1','links.1','events.2']},
 B05:{data:{lanes:[{label:'用户',steps:['提需求','补信息','收结果']},{label:'Router',steps:['接消息','判断意图','派活']},{label:'Worker',steps:['复现','修复','汇报']}]},bind:Array.from({length:3},(_,i)=>[`lanes.${i}.label`,...Array.from({length:3},(_,j)=>`lanes.${i}.steps.${j}`)]).flat()},
 B06:{data:{columns:['能修','能测'],rows:['方案甲','方案乙','方案丙'],states:[[true,false],[true,true],[false,true]]},bind:['','','columns.0','columns.1','rows.0','rows.1','rows.2']},
 B07:{data:{before:{label:'改造前',nodes:['消息','Router','Worker']},after:{label:'改造后',nodes:['后续消息','Worker','交付']},change:'改'},bind:['before.label','before.nodes.0','before.nodes.1','before.nodes.2','after.label','after.nodes.0','after.nodes.1','after.nodes.2','change']},
 B08:{data:{columns:['方案','耗时','通过'],rows:[{label:'甲',duration:'2 天',passed:true},{label:'乙',duration:'1 天',passed:true},{label:'丙',duration:'3 天',passed:false}]},bind:['columns.0','columns.1','columns.2','rows.0.label','rows.0.duration','rows.1.label','rows.1.duration','rows.2.label','rows.2.duration']},
 B09:{data:{events:[{at:'2023',label:'起步'},{at:'2024',label:'爆发'},{at:'2025',label:'成熟'}]},bind:['events.0.at','events.0.label','events.1.at','events.1.label','events.2.at','events.2.label']},
 C01:{data:{labels:['甲','乙','丙','丁'],values:[.55,.78,.4,.92]},bind:['','labels.0','','labels.1','','labels.2','','labels.3']},
 C02:{data:{xLabel:'次数 →',yLabel:'分数 ↑',values:[.15,.3,.25,.5,.6,.74,.82]},bind:['xLabel','yLabel']},
 C03:{data:{groups:[{points:[[300,1000],[360,900],[420,950],[330,1040],[390,860]]},{points:[[680,600],[740,560],[700,660],[780,620]]},{points:[[520,760],[560,800],[530,730]]}]},bind:[]},
 C04:{data:{legend:'低 → 高',values:Array.from({length:6},(_,r)=>Array.from({length:10},(_,c)=>(Math.sin((r+1)*1.7+(c+1)*.9)+1)/2))},bind:['legend']},
 C05:{data:{value:72,target:80},bind:[]},
 C06:{data:{axes:['速度','质量','成本','稳定','易用'],series:[[.45,.55,.45,.55,.45],[.8,.7,.8,.7,.8]]},bind:['axes.0','axes.1','axes.2','axes.3','axes.4']},
 C07:{data:{segments:[{label:'正常',value:.5},{label:'重点',value:.3},{label:'对照',value:.2}],center:'占比'},bind:['segments.0.label','segments.1.label','segments.2.label','center']},
 C08:{data:{total:300,activeIndices:Array.from({length:20},(_,i)=>i*13)},bind:[]},
 C09:{data:{labels:['甲','乙','丙'],values:[[.3,.45,.4,.6,.55,.8,.75],[.3,.45,.4,.6,.55,.8,.75],[.3,.45,.4,.6,.55,.8,.75]]},bind:['labels.0','labels.1','labels.2']},
 C10:{data:{values:[.2,.4,.35,.6,.78]},bind:[]},
 D01:{data:{label:'idea basin',translation:'想法盆地',counts:[8,8,8,8,8]},bind:['label','translation']},
 D02:{data:{user:'用户',request:'帮我修个 bug',reply:'Router：收到',router:'Router',responsibility:'接消息、派活',worker:'Worker',note:'后台的 Worker 是异步的'},bind:['user','request','reply','router','responsibility','worker','note']},
 D03:{data:{before:'修复前',after:'修复后',passed:[false,true]},bind:['before','after']},
 D04:{data:{benefitTitle:'收益',benefits:['✓ 更快','✓ 更稳','✓ 省人'],costTitle:'代价',costs:['✗ 要学','✗ 有风险','✗ 成本'],conclusion:'权衡之后：先小步试'},bind:['benefitTitle','benefits.0','benefits.1','benefits.2','costTitle','costs.0','costs.1','costs.2','conclusion']},
 D05:{data:{items:['接口通了','数据对了','样式稳了','性能达标'],passed:[true,true,true,false]},bind:['items.0','items.1','items.2','items.3']},
 D06:{data:{steps:['准备环境','执行任务','验收结果']},bind:['steps.0','steps.1','steps.2']},
 D07:{data:{roles:['用户','Router','Worker'],messages:['请求','执行','派活','返回'],note:'请求、回复、异步通知'},bind:['roles.0','roles.1','roles.2','messages.0','messages.1','messages.2','messages.3','note']},
 D08:{data:{roles:[{label:'用户',duty:'提需求'},{label:'Router',duty:'派活'},{label:'Worker',duty:'干活'}],handoffs:['交接','交接'],note:'谁是负责人，一眼清'},bind:['roles.0.label','roles.0.duty','roles.1.label','roles.1.duty','roles.2.label','roles.2.duty','handoffs.0','handoffs.1','note']},
 E01:{data:{target:'目标对象',note:'这里要注意'},bind:['target','note']},
 E02:{data:{target:'目标',note:'看这里'},bind:['target','note']},
 E03:{data:{note:'框中框 + 圈中圈'},bind:['note']},
 E04:{data:{badges:['当前','完成','失败','补充'],note:'短状态用徽标'},bind:['badges.0','badges.1','badges.2','badges.3','note']},
 E05:{data:{lines:['第一行','第二行','第三行'],note:'三行一起'},bind:['lines.0','lines.1','lines.2','note']},
 E06:{data:{source:'原画面',inset:'放大'},bind:['source','inset']},
 P01:{data:{left:'A',right:'B',intersection:'交集'},bind:['left','right','intersection']},
 P02:{data:{quadrants:['重要 + 急','重要 + 不急','急 + 不重要','都不']},bind:['quadrants.0','quadrants.1','quadrants.2','quadrants.3']},
 P03:{data:{lines:['$ npm run start','→ server ready','$ git commit','✓ done']},bind:['lines.0','lines.1','lines.2','lines.3']},
};
export type LayoutId=keyof typeof DEFINITIONS;
export type DataByLayout={[K in LayoutId]:typeof DEFINITIONS[K]['data']};
export type DiagramSpec={[K in LayoutId]:{layout:K;data:DataByLayout[K]}}[LayoutId];

function checkShape(value:unknown,reference:unknown,path:string):void {
 if(Array.isArray(reference)){if(!Array.isArray(value)||value.length!==reference.length)throw Error(`${path}: expected ${reference.length} entries`);value.forEach((v,i)=>checkShape(v,reference[i],`${path}.${i}`));}
 else if(reference&&typeof reference==='object') {if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`${path}: expected object`);const r=reference as Record<string,unknown>,v=value as Record<string,unknown>;if(Object.keys(v).some(k=>!(k in r)))throw Error(`${path}: unknown field`);Object.keys(r).forEach(k=>checkShape(v[k],r[k],`${path}.${k}`));}
 else if(typeof value!==typeof reference||typeof value==='number'&&!Number.isFinite(value)||typeof value==='string'&&(!value.trim()||value.length>48))throw Error(`${path}: invalid value`);
}
export function parseDiagram(layout:unknown,data:unknown):DiagramSpec {
 if(typeof layout!=='string'||!Object.prototype.hasOwnProperty.call(DEFINITIONS,layout))throw Error('Unknown diagram layout');
 const key=layout as LayoutId;
 // The quantity grid intentionally has variable cardinality.
 if(key==='C08'){
  const d=data as DataByLayout['C08'];if(!d||Object.keys(d).some(k=>!['total','activeIndices'].includes(k))||!Number.isInteger(d.total)||d.total<1||d.total>600||!Array.isArray(d.activeIndices)||new Set(d.activeIndices).size!==d.activeIndices.length||d.activeIndices.some(i=>!Number.isInteger(i)||i<0||i>=d.total))throw Error('C08: invalid total/activeIndices');
 } else checkShape(data,DEFINITIONS[key].data,key);
 const numbers=(v:unknown):number[]=>Array.isArray(v)?v.flatMap(numbers):typeof v==='number'?[v]:[];
 const d=data as Record<string,unknown>;
 if(['C01','C02','C04','C06','C09','C10'].includes(key)&&numbers(d.values??d.series).some(v=>v<0||v>1))throw Error(`${key}: normalized values must be 0–1`);
 if(key==='C05'&&[d.value,d.target].some(v=>typeof v!=='number'||v<0||v>100))throw Error('C05: range 0–100');
 if(key==='C07'){const vs=(data as DataByLayout['C07']).segments.map(x=>x.value);if(vs.some(v=>v<=0)||Math.abs(vs.reduce((a,b)=>a+b,0)-1)>.0001)throw Error('C07: shares must sum to 1');}
 if(key==='D01'&&(data as DataByLayout['D01']).counts.some(v=>!Number.isInteger(v)||v<1||v>30))throw Error('D01: counts 1–30');
 return {layout:key,data} as DiagramSpec;
}
