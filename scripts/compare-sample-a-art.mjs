import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=path.join(root,'engines/vibemotion/renderer');
const out=path.join(renderer,'out');
const baseline=JSON.parse(fs.readFileSync(path.join(out,'accepted-v1/timeline_dsl.json'),'utf8'));
const styled=JSON.parse(fs.readFileSync(path.join(out,'sampleA-project/timeline_dsl.json'),'utf8'));
assert.deepEqual(styled.projectMeta,baseline.projectMeta);
assert.deepEqual(styled.audioTracks,baseline.audioTracks);
assert.deepEqual(styled.subtitles,baseline.subtitles);
const timing=dsl=>dsl.scenes.map(({initialProps,...rest})=>rest);
assert.deepEqual(timing(styled),timing(baseline));
for(const scene of styled.scenes){
 assert.ok(scene.initialProps.art.length>=1&&scene.initialProps.art.length+(scene.initialProps.lottieAccent?1:0)<=2);
 for(const art of scene.initialProps.art){
  assert.ok(art.x>=108&&art.x+art.width<=972&&art.y>=192&&art.y+art.height<=1728,scene.sceneId);
  assert.ok(fs.existsSync(path.join(renderer,'public',art.src)));
 }
}
const frames=baseline.scenes.map(s=>Math.round((s.startMs+s.endMs)/2000*30));
const filter=`select='${frames.map(n=>`eq(n,${n})`).join('+')}',scale=270:480,tile=5x2`;
const ff=args=>execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args]);
ff(['-i',path.join(out,'sampleA-art.mp4'),'-vf',filter,'-frames:v','1',path.join(out,'contact-sheet.png')]);
ff(['-i',path.join(out,'accepted-v1/sampleA.mp4'),'-vf',filter,'-frames:v','1',path.join(out,'accepted-v1/contact-sheet.png')]);
ff(['-i',path.join(out,'accepted-v1/contact-sheet.png'),'-i',path.join(out,'contact-sheet.png'),'-filter_complex','hstack=inputs=2','-frames:v','1',path.join(out,'comparison-sheet.png')]);
// Also provide a readable first-scene pair at native half resolution.
ff(['-i',path.join(out,'accepted-v1/sampleA.mp4'),'-i',path.join(out,'sampleA-art.mp4'),'-filter_complex',`[0:v]select=eq(n\\,${frames[0]}),scale=540:960[a];[1:v]select=eq(n\\,${frames[0]}),scale=540:960[b];[a][b]hstack=inputs=2`,'-frames:v','1',path.join(out,'comparison-cover-scene.png')]);
const media=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(out,'sampleA-art.mp4')],{encoding:'utf8'}));
assert.equal(media.streams.find(s=>s.codec_type==='video').codec_name,'h264');
assert.equal(media.streams.find(s=>s.codec_type==='audio').codec_name,'aac');
ff(['-i',path.join(out,'sampleA-art.mp4'),'-f','null','-']);
const result={timelineTiming:'identical to accepted-v1',audioTracks:'identical',subtitles:'identical',artworkBounds:'inside middle 80%',illustrationsPerScene:styled.scenes.map(s=>s.initialProps.art.length+(s.initialProps.lottieAccent?1:0)),durationSeconds:media.format.duration,resolution:[media.streams[0].width,media.streams[0].height],frames,comparison:'left accepted-v1; right illustrated art version',decode:'passed'};
fs.writeFileSync(path.join(out,'sampleA-project/art-validation.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
