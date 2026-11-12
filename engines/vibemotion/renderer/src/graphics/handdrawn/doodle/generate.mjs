// From renderer: node src/graphics/handdrawn/doodle/generate.mjs
// Isolated comparison samples: does not alter the production chalk style.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),rough=require('roughjs');
export const STYLE={roughness:2.2,bowing:1.6,strokeWidth:3,displacement:3.2};
const C={bg:'#262725',yellow:'#E7C85B',green:'#A8C9B4',red:'#EF8581',pink:'#E39BB0',orange:'#DBA36D',gray:'#858C80',ink:'#F0EBD4'};
const font='Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif';
const gen=rough.generator(),out=fileURLToPath(new URL('.',import.meta.url));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function sample(id,title,use,paint){
 let serial=0;const shapes=[],texts=[];
 const draw=(d,color='gray',fill)=>{
  const shape=gen.path(d,{seed:1000+id*100+serial++,roughness:STYLE.roughness,bowing:STYLE.bowing,strokeWidth:STYLE.strokeWidth,stroke:C[color],fill:fill?C[fill]:undefined,fillStyle:'hachure',hachureGap:13,fillWeight:1});
  shapes.push(...gen.toPaths(shape).map(p=>`<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill||'none'}" stroke-linecap="round" stroke-linejoin="round"/>`));
 };
 const text=(x,y,s,color='ink',size=34,anchor='middle')=>texts.push(`<text x="${x}" y="${y}" fill="${C[color]}" font-size="${size}" text-anchor="${anchor}">${esc(s)}</text>`);
 const box=(x,y,w,h,label,color='green',sub)=>{
  draw(`M${x+4} ${y+3} Q${x+w*.47} ${y-7} ${x+w-4} ${y+1} Q${x+w+7} ${y+h*.45} ${x+w-1} ${y+h-3} Q${x+w*.52} ${y+h+5} ${x-3} ${y+h} Q${x+6} ${y+h*.55} ${x+4} ${y+3} Z`,color);
  if(label)text(x+w/2,y+(sub?53:h/2+12),label,color,34);
  if(sub)text(x+w/2,y+h-28,sub,'ink',28);
 };
 // Cubic curve with a bent, open hook head; never a straight connector.
 const arrow=(x,y,xx,yy,color='gray',bend=28)=>{
  const dx=xx-x,dy=yy-y,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l,ux=dx/l,uy=dy/l;
  draw(`M${x} ${y} C${x+dx*.27+nx*bend} ${y+dy*.27+ny*bend} ${x+dx*.72-nx*bend*.5} ${y+dy*.72-ny*bend*.5} ${xx} ${yy} M${xx-ux*21+nx*12} ${yy-uy*21+ny*12} Q${xx-ux*5+nx*2} ${yy-uy*5+ny*2} ${xx} ${yy} Q${xx-ux*8-nx*10} ${yy-uy*8-ny*10} ${xx-ux*24-nx*9} ${yy-uy*24-ny*9}`,color);
 };
 const star=(x,y,r=23)=>{
  const pts=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.44:r;return [x+Math.cos(a)*rr,y+Math.sin(a)*rr];});
  draw(pts.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' ')+' Z','yellow');
 };
 const spiral=(x,y)=>{
  const pts=Array.from({length:67},(_,i)=>{const a=i*.19,r=2+i*.42;return `${x+Math.cos(a)*r} ${y+Math.sin(a)*r}`;});
  draw('M'+pts[0]+' '+pts.slice(1).map(p=>'L'+p).join(' '),'orange');
 };
 const wave=(x,y,w,color='yellow')=>draw(`M${x} ${y} C${x+w*.13} ${y-16} ${x+w*.19} ${y+18} ${x+w*.33} ${y+1} S${x+w*.52} ${y-14} ${x+w*.64} ${y+2} S${x+w*.84} ${y+16} ${x+w} ${y-2}`,color);
 text(540,245,title,'ink',44);wave(300,287,475);star(920,330);spiral(165,1460);wave(705,1465,210,'green');
 paint({draw,text,box,arrow,star,spiral,wave});
 text(540,1610,use,'yellow',30);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" role="img" aria-labelledby="title desc" style="font-family:${font}"><title id="title">${esc(title)}</title><desc id="desc">${esc(use)}</desc><defs><filter id="chalk" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter></defs><rect width="1080" height="1920" fill="${C.bg}"/><g filter="url(#chalk)">${shapes.join('')}</g>${texts.join('')}</svg>`;
 return {title,use,svg};
}
const samples=[
 ['01-tree',sample(1,'任务拆开，一起往前走','用于：把一项任务拆成两组、四项行动。',({box,arrow,text,draw})=>{
  box(355,390,370,150,'修复任务','yellow','先定位，再验证');
  arrow(505,555,320,755,'green',45);arrow(585,555,775,755,'green',-42);
  box(195,775,270,135,'定位问题');box(635,775,270,135,'验证结果');
  arrow(260,925,225,1130,'green',25);arrow(400,925,435,1130,'green',-28);arrow(700,925,655,1130,'green',32);arrow(840,925,865,1130,'green',-28);
  ['复现步骤','错误日志','单元验证','场景回放'].forEach((s,i)=>box(130+i*212,1150,185,130,s,i===1?'orange':'green'));
  // A trembling association line supplements the structural arrows.
  draw('M260 1010 C365 988 465 1040 540 1016 S700 992 800 1014','gray');text(540,1060,'四项行动，分别留痕','ink',28);
 })],
 ['02-cycle',sample(2,'观察、尝试，再回到验证','用于：解释五步反馈与持续迭代。',({box,arrow,text})=>{
  const pts=Array.from({length:5},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/5;return {x:540+300*Math.cos(a),y:900+400*Math.sin(a)};});
  const labels=['观察','定位','尝试','验证','反馈'];
  pts.forEach((a,i)=>{const b=pts[(i+1)%5],dx=b.x-a.x,dy=b.y-a.y;const t=1/Math.max(Math.abs(dx)/125,Math.abs(dy)/90);arrow(a.x+dx*t,a.y+dy*t,b.x-dx*t,b.y-dy*t,i===1?'yellow':'green',35);});
  pts.forEach((p,i)=>box(p.x-110,p.y-65,220,130,labels[i],i===2?'yellow':'green'));
  text(540,880,'做一轮','yellow',40);text(540,940,'带回新信息','ink',30);
 })],
 ['03-funnel',sample(3,'消息很多，有价值的要筛出来','用于：展示从全部消息到有效任务的筛选。',({draw,text,arrow})=>{
  const widths=[780,595,390],labels=['全部','要处理','有价值'],values=[300,80,20];
  widths.forEach((w,i)=>{const y=390+i*330,top=540-w/2,bottom=w-100,c=i===2?'yellow':i===0?'gray':'green';draw(`M${top} ${y+8} Q540 ${y-10} ${540+w/2} ${y} L${540+bottom/2+8} ${y+225} Q540 ${y+241} ${540-bottom/2} ${y+230} Z`,c);text(540,y+85,labels[i],c,36);text(540,y+158,String(values[i]),'ink',54);if(i<2)arrow(540,y+248,540,y+310,'green',25);});
 })],
 ['04-chat',sample(4,'对话不停，后台照常做事','用于：讲清用户、消息、路由与执行的交接。',({draw,box,arrow,text,wave})=>{
  draw('M220 407 C140 391 139 523 222 529 C310 533 314 405 220 407 Z','yellow');text(225,480,'用户','yellow',36);
  arrow(326,468,440,500,'yellow',-32);
  // Rounded, lopsided speech balloon with a tail.
  draw('M485 420 Q695 399 895 428 Q930 490 896 555 L603 565 L570 610 L565 565 L485 565 Q453 490 485 420 Z','ink');text(690,482,'帮我修个 bug','ink',36);text(690,530,'消息已送达','gray',28);
  arrow(720,596,615,745,'green',42);box(300,770,480,170,'Router','green','收到请求，判断再派活');
  arrow(560,957,620,1120,'green',-48);text(775,1060,'异步派活','green',30);
  box(335,1150,470,170,'Worker','green','执行任务，完成后汇报');
  wave(360,1380,400,'yellow');
 })],
 ['05-compare',sample(5,'同一条消息，四种处理路径','用于：把四套方案的机制放在一起比较。',({box,text,arrow,draw})=>{
  const rows=[['yellow','直接跟进','后续直达执行者'],['green','统一路由','每次都先做判断'],['red','单会话','执行期间易阻塞'],['pink','委派会话','主会话继续接消息']];
  rows.forEach(([c,label,sub],i)=>{const y=380+i*255;box(135,y,810,220,'',c);text(170,y+66,label,c,36,'start');text(170,y+120,sub,'ink',28,'start');
   box(595,y+45,115,78,'消息','ink');box(790,y+105,130,78,i<2?'执行':'会话',c);arrow(724,y+85,775,y+145,c,i%2?25:-25);
   if(i===2)draw(`M815 ${y+25} Q830 ${y+46} 845 ${y+59} M846 ${y+22} Q831 ${y+47} 816 ${y+60}`,'red');
   else draw(`M864 ${y+35} Q876 ${y+53} 883 ${y+59} L908 ${y+24}`,c);
  });
 })],
];
for(const [id,s] of samples)fs.writeFileSync(out+id+'.svg',s.svg);
fs.writeFileSync(out+'index.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>涂鸦图解 · 五张对比样图</title><style>body{margin:0;padding:28px;background:${C.bg};color:${C.ink};font-family:${font}}h1{font-size:28px}p{line-height:1.7}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}article{min-width:0}img{display:block;width:100%;height:auto}a{color:${C.green}}</style><h1>涂鸦图解 · 五张对比样图</h1><p>roughness 2.2 · bowing 1.6 · 描边 3px · 粉笔位移 3.2 · 固定种子。黑体优先雅黑 / 苹方，Linux 回退 Noto Sans CJK SC。星星、波浪、螺旋与弯曲钩头箭头均为手绘路径。</p><main>${samples.map(([id,s])=>`<article><h2><a href="${id}.svg">${esc(s.title)}</a></h2><img src="${id}.svg" alt="${esc(s.title)}"><p>${esc(s.use)}</p></article>`).join('')}</main></html>`);
console.log('Generated 5 deterministic doodle SVGs + index.html');
