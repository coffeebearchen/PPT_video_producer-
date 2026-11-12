import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';
// Run from renderer; writes the video and eight page stills under repository out/.
const cwd=process.cwd();const require=createRequire(cwd+'/package.json');
const {bundle}=require('@remotion/bundler'),{openBrowser,selectComposition,renderMedia,renderStill}=require('@remotion/renderer');
const out=path.resolve('../../../out/super-agent-doodle');fs.mkdirSync(out,{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/courseware/doodle/demo.tsx')});
const browser=await openBrowser('chrome',{browserExecutable:process.env.CHROME_PATH ?? '/usr/bin/chromium'});
try{
 const composition=await selectComposition({serveUrl,id:'SuperAgentDoodle',puppeteerInstance:browser});
 for(const layout of ['D01','C04','B06']){const preview=await selectComposition({serveUrl,id:'Hatch-'+layout,puppeteerInstance:browser});await renderStill({serveUrl,composition:preview,frame:150,output:out+'/'+layout+'-hatch.png',puppeteerInstance:browser});console.log('Hatch preview',layout);}
 const frames=[150,330,510,690,870,1050,1230,1410];
 for(let i=0;i<frames.length;i++){await renderStill({serveUrl,composition,frame:frames[i],output:out+`/page-${i+1}.png`,imageFormat:'png',puppeteerInstance:browser});console.log('Still',i+1);}
 let last=-1;
 await renderMedia({serveUrl,composition,codec:'h264',crf:20,outputLocation:out+'/super-agent-48s.mp4',concurrency:2,puppeteerInstance:browser,onProgress:p=>{const percent=Math.floor(p.progress*100);if(percent>=last+5){console.log('Render',percent+'%',p.renderedFrames);last=percent;}}});
 fs.copyFileSync(out+'/super-agent-48s.mp4',out+'/super-agent-48s-palette.mp4');
 console.log('DONE',out+'/super-agent-48s-palette.mp4');
}finally{await browser.close({silent:true});}
