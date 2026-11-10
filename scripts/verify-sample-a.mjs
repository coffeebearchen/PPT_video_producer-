import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=path.join(root,'engines/vibemotion/renderer');
const out=path.join(renderer,'out');
const dsl=JSON.parse(fs.readFileSync(path.join(out,'sampleA-project/timeline_dsl.json'),'utf8'));
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
let end=0;
for(const s of dsl.scenes){
 if(s.startMs!==end||s.endMs<=s.startMs||s.endMs>dsl.projectMeta.durationMs)throw new Error(`Invalid scene: ${s.sceneId}`);
 for(const step of s.stateSteps)if(step.triggerMs<s.startMs||step.triggerMs>=s.endMs)throw new Error(`Invalid event: ${step.stepId}`);
 end=s.endMs;
}
const video=probe(path.join(out,'sampleA.mp4'));
const v=video.streams.find(s=>s.codec_type==='video');const a=video.streams.find(s=>s.codec_type==='audio');
if(v.width!==1080||v.height!==1920||v.codec_name!=='h264'||v.r_frame_rate!=='30/1'||a?.codec_name!=='aac')throw new Error('Unexpected media format');
const checks={durationSeconds:Number(video.format.duration),resolution:`${v.width}×${v.height}`,fps:v.r_frame_rate,video:v.codec_name,audio:a.codec_name,sceneCount:dsl.scenes.length,sceneDurationsMs:dsl.scenes.map(s=>s.endMs-s.startMs),timelineBounds:'passed',voiceAlignment:'measured sentence audio lengths; within-sentence words not aligned',typecheck:'blocked by existing Diagram.tsx TS2367 and index.ts FontFaceSet.add TS2339'};
const frames=dsl.scenes.map(s=>Math.round(((s.startMs+s.endMs)/2)/1000*30));
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',path.join(out,'sampleA.mp4'),'-vf',`select='${frames.map(n=>`eq(n,${n})`).join('+')}',scale=270:480,tile=5x2`,'-frames:v','1',path.join(out,'contact-sheet.png')]);
checks.contactSheetFrames=frames;
for(const [file,w,h] of [['cover.png',1080,1920],['cover_3x4.png',1080,1440]]){
 const p=probe(path.join(out,file));if(p.streams[0].width!==w||p.streams[0].height!==h)throw new Error(`Invalid cover size: ${file}`);
}
execFileSync('ffmpeg',['-hide_banner','-v','error','-i',path.join(out,'sampleA.mp4'),'-f','null','-']);
fs.writeFileSync(path.join(out,'sampleA-project/validation.json'),JSON.stringify(checks,null,2));
console.log(JSON.stringify(checks,null,2));
