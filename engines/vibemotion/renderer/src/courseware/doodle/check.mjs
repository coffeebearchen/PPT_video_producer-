// From renderer: node src/courseware/doodle/check.mjs
import ts from 'typescript';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),out=path.resolve('node_modules/.cache/doodle-check');
const program=ts.createProgram(['src/courseware/doodle/demo.tsx'],{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,strict:true,esModuleInterop:true,skipLibCheck:true,moduleResolution:ts.ModuleResolutionKind.Node10,resolveJsonModule:true,rootDir:path.resolve('.'),outDir:out});
const errors=ts.getPreEmitDiagnostics(program),newErrors=errors.filter(d=>d.file?.fileName.includes('/courseware/'));
if(newErrors.length){console.error(ts.formatDiagnosticsWithColorAndContext(newErrors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));process.exit(1);}
program.emit();
// The port is plain JS with a typed declaration; copy it as CommonJS for this Node verification.
const js=fs.readFileSync('src/courseware/doodle/source.js','utf8');fs.writeFileSync(out+'/src/courseware/doodle/source.js',ts.transpile(js,{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}));
const {DEFINITIONS,parseDiagram}=require(out+'/src/courseware/doodle/catalog.js');
const {drawingFor}=require(out+'/src/courseware/doodle/DiagramPage.js');
const {validateResolved}=require(out+'/src/courseware/model.js');
for(const [layout,{data}] of Object.entries(DEFINITIONS)){
 const a=drawingFor(parseDiagram(layout,data)),b=drawingFor(parseDiagram(layout,data));assert.deepEqual(a,b,'deterministic '+layout);assert(a.paths.length>0);assert(a.paths.every(p=>!p.d.includes('NaN')));
}
const {C}=require(out+'/src/courseware/doodle/source.js');
assert.deepEqual(C,{bg:'#282828',ink:'#EDE6D6',muted:'#8A8A80',yellow:'#DCBC62',green:'#90C380',red:'#E06B6B',pink:'#D38796',orange:'#F08419',line:'#6E6E68',surface:'#2E2E2E'});
for(const layout of Object.keys(DEFINITIONS)){const d=drawingFor(parseDiagram(layout,DEFINITIONS[layout].data));for(const color of [...d.paths.flatMap(p=>[p.stroke,p.fill]),...d.texts.map(t=>t.c)])assert(color==='none'||Object.values(C).includes(color.slice(0,7)),layout+': obsolete palette '+color);}
for(const [layout,expected] of [['D01',5],['C04',60],['B06',6],['P01',2]]){const d=drawingFor(parseDiagram(layout,DEFINITIONS[layout].data));assert.equal(new Set(d.paths.filter(p=>p.hatch).map(p=>p.group)).size,expected,layout+' hatch regions');}
for(const layout of ['A02','B03','B05','D02','B07','P03'])assert(!drawingFor(parseDiagram(layout,DEFINITIONS[layout].data)).paths.some(p=>p.hatch),'text/outline must not hatch');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{DoodleVignette}=require(out+'/src/courseware/doodle/DoodleVignette.js');const vignette=renderToStaticMarkup(React.createElement('svg',null,React.createElement(DoodleVignette)));assert(vignette.includes('radialGradient')&&vignette.includes('stop-opacity="0"')&&vignette.includes('stop-opacity="0.28"'));
assert.equal(Object.keys(DEFINITIONS).length,45);
assert.throws(()=>parseDiagram('C08',{total:300,activeIndices:[300]}));assert.throws(()=>parseDiagram('B03',{nodes:['one']}));assert.throws(()=>parseDiagram('A02',{wrong:true}));
const grid=drawingFor(parseDiagram('C08',DEFINITIONS.C08.data));assert.equal(new Set(grid.paths.filter(p=>p.cell!==undefined).map(p=>p.cell)).size,300);assert.equal(new Set(grid.paths.filter(p=>p.lit).map(p=>p.cell)).size,20);
const base={schemaVersion:'courseware/1',taskId:'t',renderId:'r',draftRevision:0,title:'test',style:'dynamicflow',canvas:{width:1080,height:1920,fps:30},publicRoot:'renderer/public',stagingDir:'courseware/t/r',totalFrames:180,totalDurationSeconds:6,slides:[{id:'d',kind:'diagram',layout:'B03',title:'循环',data:DEFINITIONS.B03.data,fromFrame:0,durationInFrames:180}]};
assert.equal(validateResolved(base).slides[0].text,'循环');assert.throws(()=>validateResolved({...base,slides:[{...base.slides[0],layout:'unknown'}]}));
const doc=['# Diagram 页调用与 45 种 data 结构','','绘制源：scripts/gen-handdrawn-samples.mjs @ 2fe3858。原 L.XXX 几何函数保留在 source.js。','','```json',JSON.stringify(base.slides[0],null,2),'```','','支持 title 别名，冻结后的 text 为标题；caption 作为图下说明。fromFrame/durationInFrames 为 30fps 冻结时间。使用 Courseware 入口即可，出现 diagram 时启用独立涂鸦渲染路径。旧 dynamicflow 目录与两份 style 文件保持不变。','','## 数据约定','','以下 JSON 是每种布局完整 data 示例，字段均必填。数组是原脚本的固定绘制槽位，长度与示例一致；需要其他节点容量时另做布局适配，不能静默截断。C08 例外：total 1–600，activeIndices 可变且不得重复或越界。','','C01/C02/C04/C06/C09/C10 的 values/series 为 0–1 归一化值；C03 的 points 为原绘图坐标；C05 范围 0–100；C07 value 为占比且合计 1；D01 counts 为 1–30 的整数。数值改变会改变图形几何或状态，不只是文字。A08 漏斗宽度为示意，count 为显示数值。','','## 样片与运行','','样片入口 demo.tsx，8 页 × 6 秒 = 48 秒，1080×1920 / 30fps，无配音无 BGM（视觉演示）。','','```sh','node src/courseware/doodle/check.mjs','npx remotion render src/courseware/doodle/demo.tsx SuperAgentDoodle ../../../out/super-agent-doodle/demo.mp4 --concurrency=2','```','','## 适配说明','','仅做组件化、数据绑定、语义色归一和安全区适配。色板遵循 docs/DIRECTOR-MANUAL.md 2.1.1；区域使用 hatch（-41°，默认间距 8px，D01 为 9px），文字块和线条框不加斜线；全页暗角中心透明、外沿 28% 黑；保留脚本 grain、文字位移 1.1 与粉笔线条位移 3.2。roughjs 基准 roughness 2.2 / bowing 1.6 / 固定种子；保留原函数中对特殊数据图笔画的局部设定。C08 修正为实际 300 点/20 亮点；B05 扩成三泳道。标题换为内容标题，不显示 A02 等内部编号。黑体栈雅黑/苹方/Noto Sans CJK SC；Linux 实际使用 Noto Sans CJK SC。','','动画完全由 frame/fps 推导：strokeDashoffset 逐笔、节点文字从 0.91 缩放至 1（无往复弹跳）、网格先逐点出现再逐点点亮。约 3.5 秒完成，余下时间静止阅读。','',''];
for(const [id,{data}] of Object.entries(DEFINITIONS)){const drawing=drawingFor(parseDiagram(id,data));doc.push('## '+drawing.title,'',drawing.sub,'','```json',JSON.stringify(data,null,2),'```','');}
fs.writeFileSync('src/courseware/doodle/DIAGRAM-API.md',doc.join('\n'));
console.log(`PASS: exact palette, semantic hatch, 28% vignette, 45 deterministic layouts, real 300/20 grid, diagram validation. ${errors.length-newErrors.length} existing diagnostics outside courseware.`);
