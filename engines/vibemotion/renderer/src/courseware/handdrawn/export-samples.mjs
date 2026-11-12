// Run from renderer: node src/courseware/handdrawn/export-samples.mjs
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const root=path.resolve('src'),out=path.resolve('node_modules/.cache/handdrawn-build');
const program=ts.createProgram(['src/courseware/handdrawn/gallery.tsx'],{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,strict:true,esModuleInterop:true,skipLibCheck:true,moduleResolution:ts.ModuleResolutionKind.Node10,rootDir:root,outDir:out});
const errors=ts.getPreEmitDiagnostics(program);
if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));process.exit(1);}
program.emit();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {PrimitiveCanvas,icons}=require(`${out}/graphics/handdrawn/primitives.js`);
const {Pen,buildLayout}=require(`${out}/graphics/handdrawn/layouts.js`);
const {examples,purposes}=require(`${out}/courseware/handdrawn/examples.js`);
const samples=path.resolve('src/graphics/handdrawn/samples');fs.mkdirSync(samples,{recursive:true});
const scenes=examples.map(spec=>({scene:buildLayout(spec),purpose:purposes[spec.kind]}));
const p=new Pen('icons');p.text(540,250,'状态、角色与操作，一眼识别','text',42);
const labels=['完成','失败','丢弃','权限','耗时','用户','成本','配置','重点','迭代','双向','提醒'];
const roles=['normal','failure','outline','outline','current','normal','supplement','normal','current','normal','normal','current'];
Object.keys(icons).forEach((icon,i)=>{const x=250+(i%3)*285,y=420+Math.floor(i/3)*275;p.add({kind:'icon',icon,x:x-32,y,size:64,role:roles[i]});p.text(x,y+120,labels[i],roles[i],32);});
scenes.push({scene:{id:'F-icons',title:'手绘图标',takeaway:'',elements:p.elements},purpose:'用统一图标表示状态、角色和操作。'});
for(const {scene} of scenes){fs.writeFileSync(`${samples}/${scene.id}.svg`,renderToStaticMarkup(React.createElement(PrimitiveCanvas,{scene})));}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
fs.writeFileSync(`${samples}/index.html`,`<!doctype html><meta charset="utf-8"><title>第一批手绘样图</title><style>body{background:#262725;color:#F0EBD4;font-family:sans-serif;margin:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}img{width:100%;display:block}a{color:#A8C9B4}p{line-height:1.6}</style><h1>第一批：结构、关系与图标</h1><p>18 种布局，甘特变体另附一张，12 图标一张总览。Linux 使用 Noto Sans CJK SC 黑体回退。</p><main>${scenes.map(({scene,purpose})=>`<article><a href="${scene.id}.svg">${escape(scene.id)}</a><img src="${scene.id}.svg" alt="${escape(scene.title)}"><p>${escape(purpose)}</p></article>`).join('')}</main>`);
console.log(`TypeScript clean; exported ${scenes.length} SVGs to ${samples}`);
