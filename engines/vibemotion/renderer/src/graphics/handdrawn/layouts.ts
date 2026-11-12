import {invariant, count, type Item, type Primitive, type Role, type Scene, type Point, type Icon} from './model';

export type Common = {id:string; title:string; takeaway:string};
type Node = Item & {id:string; parentId?:string};
type Edge = {from:string; to:string; label?:string; role?:Role};
export type Graph = {nodes:(Item & {id:string})[]; edges:Edge[]};
export type LayoutSpec = Common & (
 | {kind:'tree'; nodes:Node[]}
 | {kind:'branch'; root:Item; branches:(Item & {condition:string})[]}
 | {kind:'radial'; center:Item; satellites:Item[]}
 | {kind:'layers'; layers:(Item & {items:Item[]})[]}
 | {kind:'nested'; containers:(Item & {id:string; parentId?:string})[]}
 | {kind:'brackets'; groups:(Item & {items:Item[]})[]}
 | {kind:'pyramid'; levels:Item[]}
 | {kind:'funnel'; stages:(Item & {value:number})[]; unit:string}
 | {kind:'rings'; rings:Item[]; center:Item}
 | {kind:'vertical'|'horizontal'|'causal'; steps:Item[]; links?:string[]}
 | {kind:'cycle'; steps:Item[]; center:string}
 | {kind:'swimlane'; lanes:Item[]; tasks:(Item & {id:string; lane:number; order:number})[]; links:Edge[]}
 | {kind:'matrix'; rows:string[]; columns:string[]; cells:{row:number; column:number; label:string; role:Role}[]}
 | {kind:'beforeAfter'; before:Graph; after:Graph}
 | {kind:'table'; columns:string[]; rows:{cells:string[]; role?:Role}[]}
 | {kind:'timeline'; events:(Item & {at:string})[]; tasks?:never}
 | {kind:'timeline'; tasks:(Item & {start:number; end:number; lane:number})[]; lanes:string[]; min:number; max:number; unit:string; events?:never}
);
export const LAYOUTS = ['tree','branch','radial','layers','nested','brackets','pyramid','funnel','rings','vertical','horizontal','cycle','causal','swimlane','matrix','beforeAfter','table','timeline'] as const;

/** Public primitive factory. Coordinates are in the 1080×1920 design space. */
export class Pen {
  elements:Primitive[]=[];
  private cursor=0;
  constructor(private prefix:string){}
  add(e:Omit<Primitive,'id'>) {this.elements.push({...e,id:`${this.prefix}-${this.elements.length}`,startMs:this.cursor,durationMs:400});this.cursor+=150;}
  text(x:number,y:number,text:string,role:Role='text',size=32,align:'middle'|'start'|'end'='middle') {
    invariant(text.trim().length>0,'empty text');
    this.add({kind:'text',x,y,text,role,size,align});
  }
  rect(x:number,y:number,w:number,h:number,role:Role='outline',hatch=false) {this.add({kind:'rect',x,y,w,h,role,fill:hatch?role:undefined,hatch});}
  ellipse(x:number,y:number,w:number,h:number,role:Role='outline') {this.add({kind:'ellipse',x,y,w,h,role});}
  icon(x:number,y:number,icon:Icon,role:Role='normal',size=32) {this.add({kind:'icon',x,y,icon,role,size});}
  polygon(points:Point[],role:Role='outline',hatch=false) {invariant(points.length>=3,'polygon needs 3 points');this.add({kind:'path',d:points.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+' Z',role,fill:hatch?role:undefined,hatch});}
  dot(x:number,y:number,role:Role='normal',size=12) {this.add({kind:'ellipse',x,y,w:size,h:size,role,fill:role});}
  path(d:string,role:Role='outline') {this.add({kind:'path',d,role});}
  line(x:number,y:number,x2:number,y2:number,role:Role='outline') {this.path(`M${x} ${y} L${x2} ${y2}`,role);}
  arrow(a:Point,b:Point,role:Role='outline') {
    const angle=Math.atan2(b.y-a.y,b.x-a.x),d=17;
    this.path(`M${a.x} ${a.y} L${b.x} ${b.y} M${b.x-d*Math.cos(angle-.5)} ${b.y-d*Math.sin(angle-.5)} L${b.x} ${b.y} L${b.x-d*Math.cos(angle+.5)} ${b.y-d*Math.sin(angle+.5)}`,role);
  }
  bracket(x:number,y:number,h:number,label:string,role:Role='outline') {this.path(`M${x+18} ${y} H${x} V${y+h} H${x+18}`,role);this.text(x-20,y+h/2,label,role,28,'end');}
  box(x:number,y:number,w:number,h:number,item:Item) {
    this.rect(x,y,w,h,item.role??'normal');
    const lines=wrap(item.label,w-24,32);
    invariant(lines.length<=2,'box label too long; shorten copy');
    const details=item.detail?wrap(item.detail,w-24,28):[];
    invariant(details.length<=1,'box detail too long; shorten copy');
    invariant(h >= (item.detail?100:lines.length*43),'box too short for text');
    const yy=y+(item.detail?42:h/2-((lines.length-1)*43)/2+11);
    this.text(x+w/2,yy,lines.join('\n'),item.role??'text');
    if(item.detail)this.text(x+w/2,y+h-22,wrap(item.detail,w-24,28).join('\n'),'text',28);
    if(item.icon)this.add({kind:'icon',icon:item.icon,x:x+w-42,y:y+10,size:28,role:item.role??'normal'});
  }
}
export function wrap(text:string,width:number,size:number) {
  const out:string[]=[];let line='',used=0;
  for(const ch of text){const w=ch.charCodeAt(0)>255?size:size*.58;if(ch==='\n'||used+w>width){out.push(line);line='';used=0;}if(ch!=='\n'){line+=ch;used+=w;}}
  if(line)out.push(line);return out;
}
const role=(i:Item):Role=>i.role??'normal';
const pos=(i:number,n:number,left=135,right=945)=>n===1?(left+right)/2:left+(right-left)*i/(n-1);
function graph(p:Pen,g:Graph,y:number) {
  count(g.nodes,2,4,'graph nodes');const ids=new Map(g.nodes.map((n,i)=>[n.id,i]));invariant(ids.size===g.nodes.length,'duplicate graph node');
  const width=160,spacing=230;
  g.edges.forEach(e=>{invariant(ids.has(e.from)&&ids.has(e.to),'dangling edge');const a=ids.get(e.from)!,b=ids.get(e.to)!;p.arrow({x:195+a*spacing+width/2,y:y+55},{x:195+b*spacing-width/2,y:y+55},e.role);if(e.label)p.text(195+(a+b)*spacing/2,y+145,e.label,e.role,28);});
  g.nodes.forEach((n,i)=>p.box(115+i*spacing,y,width,110,n));
}
export function buildLayout(s:LayoutSpec):Scene {
  const p=new Pen(s.id);p.text(540,250,s.title,'text',42);
  const note=wrap(s.takeaway,800,34);invariant(note.length<=2,'takeaway too long');
  const steps=('steps' in s)?s.steps:[];
  switch(s.kind){
    case 'tree': {
      count(s.nodes,2,12,'tree');const map=new Map(s.nodes.map(n=>[n.id,n]));invariant(map.size===s.nodes.length,'duplicate tree node');
      const depth=(n:Node,seen=new Set<string>()):number=>{invariant(!seen.has(n.id),'tree cycle');seen.add(n.id);if(!n.parentId)return 0;invariant(map.has(n.parentId),'missing parent');return 1+depth(map.get(n.parentId)!,seen);};
      const levels=s.nodes.map(n=>depth(n));
      const groups=[...new Set(levels)].sort();invariant(groups.length<=4,'tree max depth 4');
      const positions=new Map<string,Point>();groups.forEach(d=>{const ns=s.nodes.filter((_,i)=>levels[i]===d);count(ns,1,4,'nodes per level');ns.forEach((n,i)=>positions.set(n.id,{x:pos(i,ns.length,230,850),y:390+d*300}));});
      s.nodes.forEach(n=>{const b=positions.get(n.id)!;if(n.parentId){const a=positions.get(n.parentId)!;p.arrow({x:a.x,y:a.y+110},{x:b.x,y:b.y-12},role(n));}});
      s.nodes.forEach(n=>{const a=positions.get(n.id)!;p.box(a.x-95,a.y,190,110,n);});break;
    }
    case 'branch': {
      count(s.branches,2,3,'branches');p.box(330,400,420,150,s.root);p.line(540,550,540,740);
      s.branches.forEach((b,i)=>{const x=pos(i,s.branches.length,250,830);p.arrow({x:540,y:740},{x,y:1000},role(b));p.text(x,910,b.condition,role(b),28);p.box(x-115,1030,230,150,b);});break;
    }
    case 'radial': {
      count(s.satellites,3,6,'satellites');const points=s.satellites.map((_,i)=>{const a=-Math.PI/2+2*Math.PI*i/s.satellites.length;return {x:540+285*Math.cos(a),y:880+420*Math.sin(a)};});
      points.forEach(a=>{const dx=a.x-540,dy=a.y-880;const start=1/Math.max(Math.abs(dx)/123,Math.abs(dy)/68),end=1/Math.max(Math.abs(dx)/113,Math.abs(dy)/63);p.arrow({x:540+dx*start,y:880+dy*start},{x:a.x-dx*end,y:a.y-dy*end});});p.box(425,820,230,120,s.center);
      points.forEach((a,i)=>p.box(a.x-105,a.y-55,210,110,s.satellites[i]));break;
    }
    case 'layers': {
      count(s.layers,2,4,'layers');s.layers.forEach((l,i)=>{count(l.items,1,3,'layer items');const y=370+i*270;p.rect(130,y,820,220,role(l));p.text(160,y+45,l.label,role(l),32,'start');l.items.forEach((n,j)=>p.box(155+j*260,y+82,245,105,n));if(i<s.layers.length-1)p.arrow({x:540,y:y+225},{x:540,y:y+260});});break;
    }
    case 'nested': {
      count(s.containers,2,9,'containers');const byId=new Map(s.containers.map(n=>[n.id,n]));invariant(byId.size===s.containers.length,'duplicate container');
      const roots=s.containers.filter(n=>!n.parentId);count(roots,1,1,'container roots');s.containers.forEach(n=>invariant(!n.parentId||byId.has(n.parentId),'missing container parent'));
      const visited=new Set<string>();
      const draw=(n:typeof s.containers[number],x:number,y:number,w:number,h:number,depth:number)=>{
        invariant(!visited.has(n.id),'container cycle');visited.add(n.id);invariant(depth<=3&&h>=125&&w>=220,'nested content needs more room');
        p.rect(x,y,w,h,role(n));p.text(x+24,y+48,n.label,role(n),32,'start');if(n.detail)p.text(x+24,y+95,n.detail,'text',28,'start');
        const children=s.containers.filter(c=>c.parentId===n.id);const gap=20,header=n.detail?135:85,ch=(h-header-25-gap*(children.length-1))/children.length;
        children.forEach((c,i)=>draw(c,x+35,y+header+i*(ch+gap),w-70,ch,depth+1));
      };draw(roots[0],135,370,810,1120,0);invariant(visited.size===s.containers.length,'disconnected or cyclic containers');break;
    }
    case 'brackets': {
      count(s.groups,2,3,'groups');s.groups.forEach((g,i)=>{count(g.items,1,3,'group items');const y=390+i*360;p.bracket(360,y,280,g.label,role(g));g.items.forEach((n,j)=>p.box(405,y+j*90,490,75,n));});break;
    }
    case 'pyramid': {
      count(s.levels,3,5,'levels');const n=s.levels.length;s.levels.forEach((l,i)=>{const top=40+i*150,bottom=top+150,y=400+i*200;p.path(`M${540-top/2} ${y} H${540+top/2} L${540+bottom/2} ${y+190} H${540-bottom/2} Z`,role(l));p.text(540,y+145,l.label,role(l),32);if(l.detail)p.text(940,y+105,l.detail,'text',28,'end');});invariant(n>0,'levels');break;
    }
    case 'funnel': {
      count(s.stages,3,5,'stages');s.stages.forEach((l,i)=>{invariant(l.value>=0&&Number.isFinite(l.value),'invalid funnel value');invariant(i===0||l.value<=s.stages[i-1].value,'funnel must decrease');const w=780-i*125,y=380+i*220;p.path(`M${540-w/2} ${y} H${540+w/2} L${540+(w-95)/2} ${y+170} H${540-(w-95)/2} Z`,role(l));p.text(540,y+65,l.label,role(l),32);p.text(540,y+125,`${l.value} ${s.unit}`,'text',32);if(i<s.stages.length-1)p.arrow({x:540,y:y+175},{x:540,y:y+210});});break;
    }
    case 'rings': {
      count(s.rings,2,4,'rings');s.rings.forEach((r,i)=>{const w=800-i*170,h=1050-i*230;p.ellipse(540,920,w,h,role(r));p.text(540,920-h/2+70,r.label,role(r),32);});p.box(440,950,200,110,s.center);break;
    }
    case 'vertical': case 'causal': {
      count(steps,3,5,'steps');steps.forEach((n,i)=>{const y=370+i*225;p.box(290,y,500,135,n);if(i<steps.length-1){p.arrow({x:540,y:y+140},{x:540,y:y+210},role(steps[i+1]));if(s.links?.[i])p.text(810,y+180,s.links[i],'supplement',28);}});break;
    }
    case 'horizontal': {
      count(steps,3,4,'steps');const w=175;steps.forEach((n,i)=>{const x=145+i*205;p.box(x,690,w,180,n);if(i<steps.length-1)p.arrow({x:x+w+2,y:780},{x:x+203,y:780},role(steps[i+1]));if(s.links?.[i])p.text(x+w/2,1000,s.links[i],'supplement',28);});break;
    }
    case 'cycle': {
      count(steps,3,6,'cycle');const points=steps.map((_,i)=>{const a=-Math.PI/2+2*Math.PI*i/steps.length;return {x:540+285*Math.cos(a),y:900+400*Math.sin(a)};});
      points.forEach((a,i)=>{const b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);p.arrow({x:a.x+dx/len*125,y:a.y+dy/len*100},{x:b.x-dx/len*125,y:b.y-dy/len*100},role(steps[(i+1)%steps.length]));});points.forEach((a,i)=>p.box(a.x-110,a.y-65,220,130,steps[i]));p.text(540,910,s.center,'current',34);break;
    }
    case 'swimlane': {
      count(s.lanes,2,3,'lanes');count(s.tasks,2,9,'tasks');const ps=new Map<string,Point>();s.lanes.forEach((l,i)=>{p.rect(135+i*270,365,260,1050);p.text(265+i*270,425,l.label,role(l),32);});s.tasks.forEach(t=>{invariant(t.lane>=0&&t.lane<s.lanes.length&&Number.isInteger(t.lane),'invalid lane');invariant(Number.isInteger(t.order)&&t.order>=0&&t.order<=3,'task order 0–3');invariant(!ps.has(t.id),'duplicate task');ps.set(t.id,{x:265+t.lane*270,y:560+t.order*230});});
      s.links.forEach(l=>{const a=ps.get(l.from),b=ps.get(l.to);invariant(a&&b,'missing swimlane task');p.arrow({x:a.x,y:a.y+65},{x:b.x,y:b.y-65},l.role);});s.tasks.forEach(t=>{const a=ps.get(t.id)!;p.box(a.x-105,a.y-60,210,120,t);});break;
    }
    case 'matrix': {
      count(s.rows,2,5,'rows');count(s.columns,2,4,'columns');const cw=600/s.columns.length,rh=800/s.rows.length;
      s.columns.forEach((c,i)=>p.text(340+(i+.5)*cw,410,c,'text',28));s.rows.forEach((r,i)=>p.text(310,470+(i+.5)*rh,r,'text',28,'end'));
      const occupied=new Set<string>();s.cells.forEach(c=>{invariant(Number.isInteger(c.row)&&c.row>=0&&c.row<s.rows.length&&Number.isInteger(c.column)&&c.column>=0&&c.column<s.columns.length,'invalid matrix cell');const key=`${c.row}-${c.column}`;invariant(!occupied.has(key),'duplicate matrix cell');occupied.add(key);p.rect(340+c.column*cw,470+c.row*rh,cw,rh,c.role);p.text(340+(c.column+.5)*cw,480+(c.row+.5)*rh,c.label,c.role,28);});break;
    }
    case 'beforeAfter': {p.text(540,380,'原有路径','compare',34);graph(p,s.before,450);p.arrow({x:540,y:750},{x:540,y:940},'current');p.text(540,1030,'调整后','normal',34);graph(p,s.after,1100);break;}
    case 'table': {
      count(s.columns,2,4,'columns');count(s.rows,2,6,'rows');const cw=810/s.columns.length,rh=125;const row=(cells:string[],i:number,r:Role)=>cells.forEach((c,j)=>{p.rect(135+j*cw,400+i*rh,cw,rh);p.text(135+(j+.5)*cw,475+i*rh,wrap(c,cw-22,28).join('\n'),r,28);});row(s.columns,0,'current');s.rows.forEach((r,i)=>{invariant(r.cells.length===s.columns.length,'ragged table');row(r.cells,i+1,r.role??'text');});break;
    }
    case 'timeline': {
      if(s.events){count(s.events,3,5,'events');p.line(355,390,355,1430);s.events.forEach((e,i)=>{const y=420+i*230;p.dot(355,y,role(e),16);p.text(320,y+10,e.at,role(e),28,'end');p.line(370,y,430,y);p.box(440,y-30,485,145,e);});}
      else {count(s.lanes,1,4,'lanes');invariant(s.max>s.min,'invalid time domain');const x=(v:number)=>335+(v-s.min)/(s.max-s.min)*580;p.line(335,500,920,500);p.text(335,460,`${s.min}${s.unit}`,'text',28);p.text(920,460,`${s.max}${s.unit}`,'text',28);s.lanes.forEach((l,i)=>p.text(300,650+i*210,l,'text',28,'end'));s.tasks.forEach(t=>{invariant(t.start>=s.min&&t.end<=s.max&&t.end>t.start,'invalid task range');invariant(Number.isInteger(t.lane)&&t.lane>=0&&t.lane<s.lanes.length,'invalid task lane');p.box(x(t.start),590+t.lane*210,x(t.end)-x(t.start),110,t);});}break;
    }
  }
  p.text(540,1610,note.join('\n'),'current',34);return {id:s.id,title:s.title,takeaway:s.takeaway,elements:p.elements};
}
