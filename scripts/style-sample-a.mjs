import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const renderer=path.join(root,'engines/vibemotion/renderer');
const assetDir=path.join(renderer,'public/assets');
const variants=path.join(assetDir,'sampleA-chalk');fs.mkdirSync(variants,{recursive:true});
// Original Open Doodles assets stay intact; only ink and accent colors change.
const artwork=[
 [['meditating',195,690,280,'gold'],['running',605,690,280,'green']],
 [['running',735,535,200,'green']],
 [['reading-side',420,465,240,'green']],
 [['clumsy',195,690,280,'red'],['strolling',605,690,280,'green']],
 [['meditating',745,550,200,'green']],
 [['reading',680,595,230,'green']],
 [['sitting',740,550,200,'green']],
 [['reading-side',200,665,250,'green']],
 [['sitting-reading',420,465,240,'green']],
 [['plant',420,465,240,'light']],
];
const tones={gold:'#F3C545',green:'#8BB8AD',light:'#A3C584',red:'#E85B45'};
const dsl=JSON.parse(fs.readFileSync(path.join(renderer,'out/accepted-v1/timeline_dsl.json'),'utf8'));
dsl.scenes.forEach((s,i)=>{
 s.initialProps.art=artwork[i].map(([name,x,y,width,tone])=>{
  const src=`assets/sampleA-chalk/${name}-${tone}.svg`;
  let svg=fs.readFileSync(path.join(assetDir,`od_${name}.svg`),'utf8');
  svg=svg.replace(/#000000/gi,'#F1E5B1').replace(/#FF5678/gi,tones[tone]);
  fs.writeFileSync(path.join(renderer,'public',src),svg);
  return {src,x,y,width,height:width*0.75};
 });
 s.initialProps.artistic=true;
 s.initialProps.accent=i===3?'#E85B45':i===9?'#A3C584':'#F3C545';
 s.initialProps.lottieAccent=i===7;
});
const json=JSON.stringify(dsl,null,2);
fs.writeFileSync(path.join(renderer,'src/data/timeline_dsl.json'),json);
fs.writeFileSync(path.join(renderer,'out/sampleA-project/timeline_dsl.json'),json);
fs.writeFileSync(path.join(renderer,'out/sampleA-project/art-direction.json'),JSON.stringify({source:'existing Open Doodles SVG and lottie_ripple.json; originals preserved',timing:'unchanged from accepted-v1',artwork},null,2));
console.log('Styled 10 scenes; preserved all narration, scene boundaries, subtitles, SFX and camera events.');
