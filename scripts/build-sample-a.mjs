import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=path.join(root,'engines/vibemotion/renderer');
const audio=path.join(renderer,'public/audio/sampleA');
const out=path.join(renderer,'out/sampleA-project'); fs.mkdirSync(out,{recursive:true});
const sentences=JSON.parse(fs.readFileSync(path.join(audio,'sentences.json'),'utf8').replace(/^\uFEFF/,''));
const duration=i=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',path.join(audio,`sentence-${i}.wav`)],{encoding:'utf8'}).trim());
const lengths=sentences.map((_,i)=>duration(i));
const content=[
 ['想法不错，\n结果可靠吗？','从一次尝试，走向可检查的过程','hook',['一个想法','可靠结果'],['听起来可行','经得起检验'],'先运行，再判断'],
 ['让一次尝试，\n形成一个循环','每个动作，都指向下一步','cycle',['提出方案','运行一次','观察结果','调整方案'],['把想法写清楚','让方案接受检验','观察实际结果','带着发现再试'],'每一轮，都比上一轮更清楚'],
 ['每一轮，\n都留下记录','让改变和结果有据可查','records',['原方案','本次改变','观察结果'],['保留起点','只改一个关键点','记录发生了什么'],'记录，让尝试可以复盘'],
 ['没有改善，\n就换一种尝试','重复动作，不等于持续改进','compare',['重复同一做法','改变关键条件'],['问题也被重复','给新结果一个机会'],'把发现带进下一轮'],
 ['保留原方案，\n再分出两条路','从同一个起点出发','branch',['原来的方案','尝试甲','尝试乙'],['随时可以回来','优化已有步骤','探索新的方向'],'分开尝试，才能看清差别'],
 ['用相同标准，\n比较不同方案','相同任务 · 相同条件 · 相同判定','bars',['原方案','尝试甲','尝试乙','再验证'],['','','',''],'比较的标准，要先确定'],
 ['继续优化，\n还是换个方向？','根据观察到的结果选择','branch',['观察到的结果','优化已有方案','换一个方向'],['先确认发生了什么','保留有效的部分','改变问题的解法'],'选择有依据，尝试才有方向'],
 ['把每次改变，\n和结果对应起来','记录变化，让下一步有迹可循','step',['起点','改变','观察','继续'],['','','',''],'一条记录，连接一次改变'],
 ['留下更好的方案，\n也留下来时的路','过程可查，结果才可继续','records',['保留方案','记录改变','检查结果'],['保留有效经验','说明为什么改','便于别人复核'],'可靠，来自可以检查的过程'],
 ['让一个想法，\n变成可靠结果','每次改进，都有来处，也有去处','summary',['可以检查','可以继续','持续改进'],['记录完整','下一步有依据','不断接近目标'],'留下可检查、可继续的过程'],
];
let cursor=0; const scenes=[]; const subtitles=[]; const sfx=[]; const concat=[];
for(let i=0;i<10;i++){
 const startMs=cursor; const ms=Math.ceil((lengths[i]+0.24)*30)/30*1000; cursor=Math.round(cursor+ms);
 const [title,subtitle,mode,labels,notes,takeaway]=content[i];
 const initialProps={title,subtitle,mode,labels,notes,takeaway,active:0,hideDecor:true,density:'standard',values:[2,3,5,7]};
 const events=[];
 for(let t=1800,j=1;t<ms-400;t+=2100,j++)events.push({stepId:`s${i}-focus${j}`,triggerMs:startMs+t,propPatches:{active:j},cameraKeyframe:{scale:j%2?1.01:1,offsetX:0,offsetY:0,springPreset:'smooth_camera'}});
 scenes.push({sceneId:`sample-a-${i+1}`,startMs,endMs:cursor,transitionIn:i%2?'slide_up':'fade_blur',componentName:'ChalkBoard',initialProps,stateSteps:events});
 sfx.push({atMs:startMs+250,sfxType:i===9?'chime_success':'whoosh',volume:0.12},...events.map(e=>({atMs:e.triggerMs,sfxType:'tick',volume:0.1})));
 // Audio is synthesized sentence by sentence; use its measured duration, not character count.
 subtitles.push({id:`caption-${i}`,startMs:startMs+60,endMs:startMs+Math.round(lengths[i]*1000),text:sentences[i],highlightKeywords:[]});
 concat.push(`file 'sentence-${i}.wav'`);
 execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',path.join(audio,`sentence-${i}.wav`),'-af','apad', '-t',String(ms/1000),path.join(audio,`padded-${i}.wav`)]);
}
if(cursor<45000||cursor>60000)throw new Error(`Narration duration ${cursor}ms is outside 45–60s; adjust local voice rate.`);
fs.writeFileSync(path.join(audio,'concat.txt'),lengths.map((_,i)=>`file 'padded-${i}.wav'`).join('\n'));
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',path.join(audio,'concat.txt'),'-c:a','pcm_s16le',path.join(audio,'narration.wav')]);
const timeline={version:'1.0',projectMeta:{title:'让一个想法变成可靠结果',width:1080,height:1920,fps:30,durationMs:cursor,themePalette:{bgCanvas:'#252624',primaryHuman:'#F3C545',secondaryAi:'#8BB8AD',accentWarning:'#E8A33C',dangerStrike:'#E85B45',highlightGold:'#F3C545'}},audioTracks:{masterVoiceover:{src:'audio/sampleA/narration.wav',volume:1},sfxEvents:sfx},scenes,subtitles};
const json=JSON.stringify(timeline,null,2);
fs.writeFileSync(path.join(renderer,'src/data/timeline_dsl.json'),json);
fs.writeFileSync(path.join(out,'timeline_dsl.json'),json);
const timestamp=ms=>{const n=Math.round(ms);return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')},${String(n%1000).padStart(3,'0')}`;};
fs.writeFileSync(path.join(out,'sampleA.srt'),subtitles.map((s,i)=>`${i+1}\n${timestamp(s.startMs)} --> ${timestamp(s.endMs)}\n${s.text}\n`).join('\n'));
fs.writeFileSync(path.join(out,'narration.txt'),sentences.join('\n'));
fs.writeFileSync(path.join(out,'audio-alignment.json'),JSON.stringify({provider:'Windows SAPI Microsoft Huihui Desktop',mode:'measured sentence duration; no word alignment',sentences:sentences.map((text,i)=>({text,startMs:scenes[i].startMs,durationMs:Math.round(lengths[i]*1000)}))},null,2));
fs.writeFileSync(path.join(renderer,'style.settings.json'),JSON.stringify({colors:{bg:'#252624',ink:'#F1E5B1',gold:'#F3C545',sage:'#8BB8AD',coral:'#E85B45',amber:'#E8A33C',muted:'#B3B09C'},fonts:{heading:'ZCOOL KuaiLe',body:'LXGW WenKai'}},null,2));
console.log(JSON.stringify({durationMs:cursor,scenes:scenes.length,voiceSeconds:lengths.reduce((a,b)=>a+b,0)},null,2));
