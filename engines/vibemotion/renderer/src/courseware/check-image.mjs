// From renderer: node src/courseware/check-image.mjs
import ts from 'typescript';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),out=path.resolve('node_modules/.cache/image-page-check');
const program=ts.createProgram(['src/courseware/image-example.tsx'],{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,strict:true,esModuleInterop:true,skipLibCheck:true,moduleResolution:ts.ModuleResolutionKind.Node10,resolveJsonModule:true,rootDir:path.resolve('.'),outDir:out});
const errors=ts.getPreEmitDiagnostics(program);if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));process.exit(1);}program.emit();
const {validateResolved}=require(out+'/src/courseware/model.js'),{imageGeometry,IMAGE_VIEWPORT}=require(out+'/src/courseware/ImagePage.js');
const base={schemaVersion:'courseware/1',taskId:'image-photo',renderId:'still',draftRevision:0,title:'照片',style:'dynamicflow',canvas:{width:1080,height:1920,fps:30},publicRoot:'renderer/public',stagingDir:'courseware/image-photo/still',totalFrames:180,totalDurationSeconds:6,slides:[{id:'photo',kind:'image',text:'完整照片',asset:{src:'courseware/image-photo/still/photo.jpg',width:512,height:600},fromFrame:0,durationInFrames:180}]};
const parse=patch=>validateResolved({...base,slides:[{...base.slides[0],...patch}]}).slides[0];
const image=parse({});assert.equal(image.fit,'contain');assert.equal(image.kenBurns,false);assert.deepEqual(imageGeometry(image,0),imageGeometry(image,179));
for(const asset of [{width:2400,height:600},{width:500,height:2200},{width:800,height:800}])for(const frame of [0,90,179]){
 const g=imageGeometry({...image,asset:{...image.asset,...asset},kenBurns:true},frame);assert(g.width*g.scale<=IMAGE_VIEWPORT.w+.001);assert(g.height*g.scale<=IMAGE_VIEWPORT.h+.001);assert(Math.abs(g.width/g.height-asset.width/asset.height)<1e-8);
}
assert.equal(imageGeometry({...image,kenBurns:true},0).scale,1);assert.equal(imageGeometry({...image,kenBurns:true},179).scale,1.06);
for(const patch of [{fit:'cover'},{kenBurns:'yes'},{highlight:{x:0,y:0,w:1,h:1}},{dim:.2},{asset:{...image.asset,width:0}}])assert.throws(()=>parse(patch));
const shot=parse({kind:'screenshot',highlight:{x:.1,y:.1,w:.2,h:.2},annotation:'circle'});assert.equal(shot.dim,.35);assert.equal(shot.annotation,'circle');assert.equal(shot.kenBurns,undefined);
console.log('PASS: TypeScript, image defaults, contain geometry/zoom endpoints across aspect ratios, invalid inputs, screenshot defaults unchanged.');
