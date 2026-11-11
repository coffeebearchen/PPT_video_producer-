// Independent fixture verification. Does not import the server, lib or database.
// From studio: node engines/vibemotion/renderer/src/courseware/verify.mjs --render
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn, spawnSync} from 'node:child_process';
import {activeSubtitle, containTarget, flowBoxes, subtitleCues, validateResolved} from './model.ts';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const renderer = path.resolve(sourceDir, '../..');
const root = path.resolve(renderer, '../../..');
const publicDir = path.join(renderer, 'public');
const out = path.join(root, 'out', 'courseware-renderer-v2');
const inputFile = path.join(root, 'out/courseware-fixture/resolved-props.json');
const raw = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const project = validateResolved(raw);
const require = createRequire(path.join(renderer, 'package.json'));
const browserExecutable = path.join(renderer, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceHashes = () => Object.fromEntries(['index.tsx','Courseware.tsx','layers.tsx','model.ts','audit.tsx'].map(name => [name, hash(path.join(sourceDir,name))]));
const writeJSON = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
const runSync = (command, args, binary = false) => {
  const r = spawnSync(command, args, {cwd: renderer, windowsHide: true, encoding: binary ? undefined : 'utf8', maxBuffer: 24 * 1024 * 1024});
  if (r.error || r.status !== 0) throw new Error(`${command} failed: ${r.error?.message ?? r.stderr?.toString().slice(-3000)}`);
  return r;
};
const probe = file => JSON.parse(runSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]).stdout);
const assetFile = src => {
  const file = fs.realpathSync(path.join(publicDir, src));
  const relative = path.relative(fs.realpathSync(publicDir), file);
  assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), 'asset escaped public root'); return file;
};
fs.mkdirSync(out, {recursive: true});

function inputChecks() {
  if (fs.existsSync(path.join(out,'video.mp4')) && fs.existsSync(path.join(out,'input-validation.json'))) {
    const frozen=JSON.parse(fs.readFileSync(path.join(out,'input-validation.json'),'utf8'));
    assert.equal(hash(inputFile),frozen.fixtureHash,'input changed since render');
    for(const a of frozen.assets) assert.equal(hash(assetFile(a.src)),a.sha256,'staging changed since render');
  }
  assert.equal(project.totalFrames, 835);
  assert.equal(project.slides.map(s => s.fromFrame).join(','), '0,158,308,518,678');
  const assets = [];
  for (const s of project.slides) {
    if (s.asset) {
      const file = assetFile(s.asset.src); const actual = probe(file).streams[0];
      assert.equal(actual.width, s.asset.width); assert.equal(actual.height, s.asset.height);
      assets.push({src: s.asset.src, sha256: hash(file), width: actual.width, height: actual.height});
    }
    if (s.narration) {
      const file = assetFile(s.narration.src); const actual = probe(file);
      assert.ok(actual.streams.some(s => s.codec_type === 'audio'));
      assert.ok(Math.abs(Number(actual.format.duration) - s.narration.durationSeconds) < 0.001);
      assets.push({src: s.narration.src, sha256: hash(file), durationSeconds: Number(actual.format.duration)});
    }
  }
  const captions = subtitleCues(project);
  for (let frame = 0; frame < project.totalFrames; frame++) {
    const slide = raw.slides.find(s => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames);
    const localTime = (frame - slide.fromFrame) / 30;
    const expected = slide.cues.findIndex(c => localTime >= c.startSeconds - 1e-10 && localTime < c.endSeconds - 1e-10);
    const actual = activeSubtitle(captions, frame, 30);
    assert.equal(actual?.id ?? '', expected < 0 ? '' : `${slide.id}-${expected}`, `cue mismatch on frame ${frame}`);
  }
  for (const count of [2, 3, 4]) for (const b of flowBoxes(count)) {assert.ok(b.w >= 560); assert.ok(b.x >= 108 && b.y >= 192 && b.x + b.w <= 972 && b.y + b.h <= 1728);}
  for (const [width, height] of [[238,440],[1920,1080],[1000,1000]]) {
    const r = {x: .1, y: .2, w: .3, h: .4}; const mapped = containTarget(r,width,height);
    const scale = Math.min(984/width,980/height);
    assert.ok(Math.abs((mapped.x-(984-width*scale)/2)/(width*scale)-r.x)<1e-10);
    assert.ok(Math.abs((mapped.y-(980-height*scale)/2)/(height*scale)-r.y)<1e-10);
  }
  const change = fn => {const b = structuredClone(raw); fn(b); return b;};
  assert.throws(() => validateResolved(change(b => b.slides[1].asset.src='../secret.png')));
  assert.throws(() => validateResolved(change(b => b.slides[1].highlight.w=1)));
  assert.throws(() => validateResolved(change(b => b.slides[2].edges[0].to='missing')));
  assert.throws(() => validateResolved(change(b => b.slides[2].nodes=b.slides[2].nodes.slice(0,1))));
  assert.throws(() => validateResolved(change(b => b.slides[3].bullets=[])));
  assert.throws(() => validateResolved(change(b => b.slides[1].fromFrame++)));
  assert.throws(() => validateResolved(change(b => b.slides[0].narration.durationSeconds=100)));
  assert.throws(() => validateResolved(change(b => b.slides[2].cues[1].startSeconds=0)));
  assert.throws(() => validateResolved(change(b => b.totalDurationSeconds+=.03)));
  const noCues = validateResolved(change(b => delete b.slides[0].cues));
  assert.ok(subtitleCues(noCues).some(c => c.id.startsWith('opening-')));
  const captionsOff = validateResolved(change(b => b.slides[0].cues=[]));
  assert.ok(!subtitleCues(captionsOff).some(c => c.id.startsWith('opening-')));
  const silent = validateResolved(change(b => delete b.slides[0].narration)); assert.equal(silent.slides[0].narration, undefined);
  writeJSON('input-validation.json', {fixtureHash: hash(inputFile), totalFrames: project.totalFrames, exactSeconds: project.totalFrames/30, declaredSeconds: raw.totalDurationSeconds, millisecondRoundingDelta: raw.totalDurationSeconds-project.totalFrames/30, allFrameCueChecks: project.totalFrames, assets, checks: 'passed'});
  return assets;
}
function typeCheck() {
  const ts = require('typescript');
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true, lib: ['lib.es2022.d.ts','lib.dom.d.ts','lib.dom.iterable.d.ts']};
  const program = ts.createProgram([path.join(sourceDir,'index.tsx')], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: n=>n,getCurrentDirectory:()=>renderer,getNewLine:()=> '\n'}));
}

async function preflight() {
  const {bundle} = require('@remotion/bundler');
  const {selectComposition, renderStill, openBrowser} = require('@remotion/renderer');
  console.log('Preflight: bundle once, keyframes only.');
  const serveUrl = await bundle({entryPoint: path.join(sourceDir,'index.tsx'), publicDir, outDir: path.join(out,'bundle')});
  assert.ok(fs.existsSync(browserExecutable), 'An installed local Headless Chrome is required; no download is allowed.');
  const browser = await openBrowser('chrome', {browserExecutable,logLevel:'error'});
  const coverOnly=process.argv.includes('--cover-only');
  const reports=coverOnly?JSON.parse(fs.readFileSync(path.join(out,'layout-audit.json'),'utf8')).reports.filter(r=>r.case!=='cover'):[];
  const single = slide => ({...raw,totalFrames:slide.durationInFrames,totalDurationSeconds:slide.durationInFrames/30,slides:[{...slide,fromFrame:0}]});
  const cases = raw.slides.map(s => ({name:s.id,props:raw,frame:s.fromFrame+25,slideId:s.id}));
  const shot=raw.slides.find(s=>s.kind==='screenshot'); const flow=raw.slides.find(s=>s.kind==='flow');
  for(const count of [2,3]) cases.push({name:`flow-${count}`,props:single({...flow,nodes:flow.nodes.slice(0,count),edges:flow.edges.slice(0,count-1)}),frame:25,slideId:flow.id});
  for(const [style,annotation] of [['clean','circle'],['dynamic','highlight'],['industrial','underline'],['industrial','bubble']]) cases.push({name:`${style}-${annotation}`,props:{...single({...shot,annotation}),style},frame:25,slideId:shot.id});
  cases.push({name:'flow-second-cue',props:raw,frame:391,slideId:flow.id});
  cases.push({name:'cover',props:raw,frame:0,slideId:'cover',cover:true});
  fs.mkdirSync(path.join(out,'preflight'),{recursive:true});
  try {
    for(const c of coverOnly?cases.filter(c=>c.cover):cases) {
      const inputProps={...c.props,audit:true}; const id=c.cover?'CoursewareCover':'Courseware'; const logs=[];
      const composition=await selectComposition({serveUrl,id,inputProps,puppeteerInstance:browser,browserExecutable,logLevel:'error'});
      await renderStill({serveUrl,composition,inputProps,frame:c.frame,output:path.join(out,c.cover?'cover.png':`preflight/${c.name}.png`),imageFormat:'png',puppeteerInstance:browser,browserExecutable,logLevel:'error',onBrowserLog:log=>{const at=log.text.indexOf('COURSEWARE_AUDIT=');if(at>=0) logs.push(JSON.parse(log.text.slice(at+'COURSEWARE_AUDIT='.length)));}});
      const report=logs.find(r=>r.frame===c.frame&&r.slideId===c.slideId);
      assert.ok(report,`no DOM audit for ${c.name}`); reports.push({case:c.name,...report});
      console.log(`Preflight PASS: ${c.name}`);
    }
  } finally {await browser.close({silent:true});}
  writeJSON('layout-audit.json',{cases:reports.length,issues:0,fixtureHash:hash(inputFile),sourceHashes:sourceHashes(),reports});
}
async function renderVideo() {
  assert.ok(!fs.existsSync(path.join(out,'video.mp4')),'Refusing a second full render. Use --verify-output for existing media.');
  const npxJS=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npx-cli.js');
  const cmd=process.platform==='win32'?process.execPath:'npx';
  const prefix=process.platform==='win32'?[npxJS]:[];
  const log=fs.createWriteStream(path.join(out,'render.log'));
  try {
    await new Promise((resolve,reject)=>{
      const child=spawn(cmd,[...prefix,'--offline','--no-install','remotion','render','src/courseware/index.tsx','Courseware',path.join(out,'video.mp4'),'--codec=h264','--overwrite','--concurrency=2',`--browser-executable=${browserExecutable}`,`--props=${inputFile}`],{cwd:renderer,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
      let tail='',last=0;
      const append=chunk=>{const s=chunk.toString();log.write(s);tail=(tail+s).slice(-6000);if(Date.now()-last>5000){last=Date.now();process.stdout.write(s.slice(-200));}};
      child.stdout.on('data',append);child.stderr.on('data',append);child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(tail)));
    });
  } finally {log.end();}
}

const pcm = file => {
  const b=runSync('ffmpeg',['-v','error','-i',file,'-ac','1','-ar','48000','-f','s16le','pipe:1'],true).stdout;
  return new Int16Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
};
function mediaChecks(assets) {
  const file=path.join(out,'video.mp4'); const metadata=probe(file); const v=metadata.streams.find(s=>s.codec_type==='video'); const a=metadata.streams.find(s=>s.codec_type==='audio');
  assert.equal(v.width,1080);assert.equal(v.height,1920);assert.equal(v.codec_name,'h264');assert.equal(v.r_frame_rate,'30/1');assert.equal(Number(v.nb_frames),project.totalFrames);assert.ok(a);
  assert.ok(Math.abs(Number(v.duration)-project.totalFrames/30)<.001);
  const cover=probe(path.join(out,'cover.png')).streams[0];assert.equal(cover.codec_name,'png');assert.equal(cover.width,1080);assert.equal(cover.height,1920);
  const volume=runSync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-vn','-f','null','-']).stderr;
  fs.writeFileSync(path.join(out,'audio-volume.log'),volume);
  const mean=Number(volume.match(/mean_volume: ([-\d.]+)/)?.[1]);assert.ok(Number.isFinite(mean)&&mean>-65,'silent audio');
  const decoded=pcm(file);const alignment=[];
  for(const s of project.slides.filter(s=>s.narration)) {
    const reference=pcm(assetFile(s.narration.src));const start=s.fromFrame*1600;
    const correlation=lag=>{let xy=0,xx=0,yy=0;for(let i=7200;i<reference.length-7200;i+=96){const y=decoded[start+i+lag]??0;const x=reference[i];xy+=x*y;xx+=x*x;yy+=y*y;}return xy/Math.sqrt(xx*yy);};
    let best={lag:0,score:correlation(0)};for(let lag=-3200;lag<=3200;lag+=48){const score=correlation(lag);if(score>best.score)best={lag,score};}
    const coarse=best.lag;for(let lag=coarse-48;lag<=coarse+48;lag++){const score=correlation(lag);if(score>best.score)best={lag,score};}
    console.log(`Audio ${s.id}: zero=${correlation(0).toFixed(5)} best=${best.score.toFixed(5)} offset=${best.lag} samples`);
    assert.ok(best.score>.9,`voice does not match fixture ${s.id}: ${best.score}`);assert.ok(Math.abs(best.lag)<=1600,`audio offset >1 frame ${s.id}`);
    alignment.push({slideId:s.id,fromFrame:s.fromFrame,offsetSamples:best.lag,offsetFrames:best.lag/1600,correlation:best.score});
  }
  const frames=project.slides.map(s=>s.fromFrame+Math.floor(s.durationInFrames/2));
  for(let i=0;i<frames.length;i++)runSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-vf',`select=eq(n\\,${frames[i]})`,'-frames:v','1','-update','1',path.join(out,`frame-${i+1}.png`)]);
  const contactFrames=project.slides.flatMap(s=>[s.fromFrame+25,s.fromFrame+Math.floor(s.durationInFrames*.65)]);
  const filter=`select=${contactFrames.map(n=>`eq(n\\,${n})`).join('+')},scale=216:384,tile=5x2:padding=8:margin=8:color=0x202420`;
  runSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-vf',filter,'-frames:v','1','-update','1',path.join(out,'contact-sheet.png')]);
  for(const asset of assets) assert.equal(hash(assetFile(asset.src)),asset.sha256,'staging changed');
  const original=JSON.parse(fs.readFileSync(path.join(out,'input-validation.json'),'utf8'));assert.equal(hash(inputFile),original.fixtureHash,'fixture changed');
  writeJSON('validation.json',{result:'passed',fixtureUnchanged:true,stagingUnchanged:true,totalFrames:Number(v.nb_frames),durationSeconds:Number(v.duration),declaredDurationSeconds:raw.totalDurationSeconds,width:v.width,height:v.height,fps:v.r_frame_rate,codec:v.codec_name,audioCodec:a.codec_name,meanVolumeDb:mean,audioAlignment:alignment,captionFrameChecks:project.totalFrames,frameNumbers:frames,contactFrameNumbers:contactFrames});
  console.log(`\nVerified one full video: ${file}`);
}

const assets=inputChecks();
if(process.argv.includes('--verify-output')) mediaChecks(assets);
else if(process.argv.includes('--render-only')) {
  const preflight=JSON.parse(fs.readFileSync(path.join(out,'layout-audit.json'),'utf8'));
  assert.equal(preflight.issues,0);assert.equal(preflight.fixtureHash,hash(inputFile));assert.deepEqual(preflight.sourceHashes,sourceHashes(),'source changed since preflight');
  await renderVideo();mediaChecks(assets);
}
else {
  typeCheck();console.log('Input/media/TypeScript checks PASS.');
  await preflight();
  if(process.argv.includes('--render')) {await renderVideo();mediaChecks(assets);}
}
