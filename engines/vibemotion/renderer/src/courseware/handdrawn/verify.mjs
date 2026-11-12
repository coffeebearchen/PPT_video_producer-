import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),build=path.resolve('node_modules/.cache/handdrawn-build');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {buildLayout,LAYOUTS}=require(build+'/graphics/handdrawn/layouts.js');
const {PrimitiveCanvas,icons,progressAt,seedFor}=require(build+'/graphics/handdrawn/primitives.js');
const {examples}=require(build+'/courseware/handdrawn/examples.js');
assert.equal(new Set(examples.map(s=>s.kind)).size,18);assert.equal(LAYOUTS.length,18);assert.equal(Object.keys(icons).length,12);
for(const spec of examples){
 const scene=buildLayout(spec),render=timeMs=>renderToStaticMarkup(React.createElement(PrimitiveCanvas,{scene,timeMs}));
 assert.equal(render(20000),render(20000),'same seed/frame must produce identical SVG');
 assert(!render(0).includes('data-hd-text'),'initial frame must not reveal text');
 assert(render(700)!==render(20000),'intermediate frame must differ');
 for(let t=0;t<20000;t+=50)assert(scene.elements.filter(e=>progressAt(e,t)>0&&progressAt(e,t)<1).length<=3,'max 3 concurrent marks');
 assert(scene.elements.every(e=>(e.startMs??0)+(e.durationMs??500)<20000),'gallery must reach static hold');
}
const tree=examples[0];assert.throws(()=>buildLayout({...tree,nodes:[{id:'a',parentId:'b',label:'A'},{id:'b',parentId:'a',label:'B'}]}),/cycle/);
assert.throws(()=>buildLayout({...tree,nodes:[{id:'a',label:'A'},{id:'b',parentId:'missing',label:'B'}]}),/missing parent/);
assert.throws(()=>buildLayout({...examples.find(x=>x.kind==='funnel'),stages:[{label:'A',value:10},{label:'B',value:20},{label:'C',value:1}]}),/decrease/);
assert.throws(()=>buildLayout({...examples.find(x=>x.kind==='table'),rows:[{cells:['A']},{cells:['B']}]}),/ragged/);
assert.throws(()=>buildLayout({...examples.find(x=>x.id==='B09-gantt'),tasks:[{label:'bad',start:30,end:20,lane:0}]}),/range/);
assert.equal(seedFor('same'),seedFor('same'));assert.notEqual(seedFor('same'),seedFor('other'));
console.log('PASS: 18 layouts, 12 icons, deterministic SVG, animation stages/concurrency, malformed data rejection');
