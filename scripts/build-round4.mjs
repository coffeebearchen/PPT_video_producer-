import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const renderer=path.join(root,'engines/vibemotion/renderer');
const baseline=JSON.parse(fs.readFileSync(path.join(renderer,'out/accepted-v1/timeline_dsl.json'),'utf8'));
const captions=baseline.subtitles.slice(0,6);const total=baseline.scenes[5].endMs;
const boundaries=[0,3000,6300,9800,13400,17200,20700,24900,total];
const content=[
 ['一个想法，要经过检验','先提出方案，再运行、观察和改进','process','cycle',['提出方案','执行尝试','观察结果','调整方案']],
 ['把执行与观察分开记录','让不同动作承担清晰的责任','process','swimlane',['提出方案','执行尝试','记录结果','调整方案']],
 ['把改变与影响连接起来','观察变化，才知道下一步怎么改','process','causal',['原有方案','改变条件','观察结果','决定改法']],
 ['每轮结果，都能回看','保留条件、改动和观察记录','chart','heatmap',['条件甲','条件乙','条件丙','条件丁','条件戊']],
 ['停滞时，分出不同尝试','保留原方案，让两条路径可以比较','process','tree',['原有方案','尝试甲','尝试乙','观察甲','观察乙']],
 ['先确定比较的标准','使用同一组维度，观察不同方案','chart','radar',['清晰度','可检查','可重复','可回退','可继续']],
 ['保留方案，再筛选路径','逐步排除不适合的尝试','chart','funnel',['全部尝试','符合条件','可以复核','继续验证']],
 ['让判断，回到同一标准','数值仅作示意，不代表真实统计','chart','gauge',['示意完成度']],
];
const scenes=content.map(([title,claim,family,kind,labels],i)=>({sceneId:`round4-${i}`,startMs:boundaries[i],endMs:boundaries[i+1],title,claim,family,kind,labels,values:kind==='funnel'?[100,78,52,30]:[65,82,54,91,72],source:'来源：自制流程演示；数值均为示意数据',illustration:'assets/sampleA-chalk/reading-green.svg'}));
const project={version:'1.0',style:'industrial',width:1080,height:1920,fps:30,durationMs:total,scenes,subtitles:captions};
fs.writeFileSync(path.join(renderer,'src/data/round4-project.json'),JSON.stringify(project,null,2));
fs.mkdirSync(path.join(renderer,'out/round4'),{recursive:true});
fs.writeFileSync(path.join(renderer,'out/round4/project.json'),JSON.stringify(project,null,2));
console.log(JSON.stringify({durationMs:total,scenes:scenes.length}));
