import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {EXPLANATION_STYLES} from '../engines/vibemotion/renderer/src/graphics/styles.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),r=path.join(root,'engines/vibemotion/renderer'),out=path.join(r,'out/round4');
const source=fs.readFileSync(path.join(r,'src/graphics/GraphicLibrary.tsx'),'utf8');
const cat=fs.readFileSync(path.join(r,'src/graphics/catalog.ts'),'utf8');
const names=Object.fromEntries([...cat.matchAll(/(\w+):'([^']*)'/g)].map(m=>[m[1],m[2]]));
const families={process:'PROCESS',shape:'SHAPE',chart:'CHART',decor:'DECOR',icon:'ICON'};
const items=Object.entries(families).flatMap(([family,prefix])=>{
 const match=source.match(new RegExp(`export const ${prefix}_KINDS=\\[([^\\]]+)\\]`));
 return [...match[1].matchAll(/'([^']+)'/g)].map(m=>({id:`${family}-${m[1]}`,family,kind:m[1],label:names[m[1]],preview:`gallery/round4/${family}-${m[1]}.png`,component:{process:'ProcessDiagram',shape:'Shape',chart:'AdvancedChart',decor:'Ornament',icon:'Icon'}[family]}));
});
const manifest={version:'1.0',styles:['industrial','clean','dynamic'],stylePresets:Object.fromEntries(Object.entries(EXPLANATION_STYLES).map(([id,tokens])=>[id,{...tokens,density:id==='clean'?'simple':'standard',motion:id==='dynamic'?'directed-flow':'precise-reveal',decor:id==='industrial'?'grid+hatch':id==='clean'?'illustration+geometry':'flow+trail',fonts:{heading:tokens.heading,body:'LXGW WenKai'}}])),items,props:{shared:{kind:'catalog kind',style:'industrial | clean | dynamic',progress:'0..1',active:'current index'},chart:{values:'0..100 number[]',labels:'string[]',points:'scatter: {x,y}[] in 0..100'},process:{labels:'short labels: cycle up to 6; tree/hub up to 5; branch 3; other layouts up to 4'},shape:{color:'CSS color',fill:'CSS fill',size:'pixels'},decor:{enabled:'boolean'},note:'所有默认数据为示意；来源字段由调用方传入。图库可显示组件名称，成片不显示。'},integration:{componentName:'GraphicScene',projectStyle:'projectMeta.style',sceneStyle:'initialProps.style overrides projectMeta.style'}};
fs.writeFileSync(path.join(out,'graphics-catalog.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(r,'public/graphics-catalog.json'),JSON.stringify(manifest,null,2));
const previews=path.join(r,'public/gallery/round4');fs.mkdirSync(previews,{recursive:true});
const py=`from PIL import Image\nfrom pathlib import Path\nimport json\np=Path(r'''${out}''')\nim=Image.open(p/'graphics-gallery.png')\nitems=json.loads((p/'graphics-catalog.json').read_text(encoding='utf8'))['items']\nfor i,item in enumerate(items):\n x=(i%4)*800;y=(i//4)*650\n im.crop((x,y,x+800,y+650)).save(Path(r'''${previews}''')/(item['id']+'.png'))\n`;
execFileSync('python',['-c',py]);
const project=JSON.parse(fs.readFileSync(path.join(out,'project.json'),'utf8'));
const frames=[30,...project.scenes.map(s=>Math.round((s.startMs+s.endMs)/2000*30)),Math.floor(project.durationMs/1000*30)-15];
const validation={catalogItems:items.length,styles:{},referenceSource:'reference-style/industrial, 7 supplied images copied read-only from W drive; plus 28 project reference images'};
for(const style of manifest.styles){
 const file=path.join(out,`${style}.mp4`);
 const media=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
 const v=media.streams.find(s=>s.codec_type==='video'),a=media.streams.find(s=>s.codec_type==='audio');
 if(v.width!==1080||v.height!==1920||v.r_frame_rate!=='30/1'||v.codec_name!=='h264'||a?.codec_name!=='aac')throw new Error(`Unexpected format: ${style}`);
 execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',file,'-vf',`select='${frames.map(n=>`eq(n,${n})`).join('+')}',scale=270:480,tile=5x2`,'-frames:v','1',path.join(out,`${style}-contact-sheet.png`)]);
 execFileSync('ffmpeg',['-hide_banner','-v','error','-i',file,'-f','null','-']);
 validation.styles[style]={duration:media.format.duration,video:v.codec_name,audio:a.codec_name,frames,decode:'passed'};
}
fs.copyFileSync(path.join(out,'industrial-contact-sheet.png'),path.join(out,'contact-sheet.png'));
execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',path.join(out,'industrial.mp4'),'-i',path.join(out,'clean.mp4'),'-i',path.join(out,'dynamic.mp4'),'-filter_complex','[0:v]select=eq(n\\,74),scale=360:640[a];[1:v]select=eq(n\\,74),scale=360:640[b];[2:v]select=eq(n\\,74),scale=360:640[c];[a][b][c]hstack=inputs=3','-frames:v','1',path.join(out,'three-styles.png')]);
fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(validation,null,2));
console.log(JSON.stringify(validation,null,2));
