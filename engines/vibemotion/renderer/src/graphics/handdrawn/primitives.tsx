import React, {useId, useMemo} from 'react';
import rough from 'roughjs';
import {COLORS, FONT, type Icon, type Primitive, type Scene, validateScene} from './model';

export const CHALK = {roughness: 1.05, bowing: .8, strokeWidth: 3, displacement: 2.5} as const;
const generator = rough.generator();
export const seedFor = (id: string) => {let n = 2166136261; for (let i=0;i<id.length;i++) n = Math.imul(n ^ id.charCodeAt(i),16777619); return (n >>> 0) % 2147483646 + 1;};
export const progressAt = (e: Primitive, timeMs: number) => Math.max(0,Math.min(1,(timeMs-(e.startMs??0))/(e.durationMs??500)));
export const icons: Record<Icon,string> = {
  check:'M4 17 L13 26 L29 5', cross:'M6 6 L27 27 M27 6 L6 27',
  trash:'M4 8 H29 M12 7 V3 H21 V7 M7 9 L9 30 H25 L27 9 M14 13 V25 M21 13 V25',
  lock:'M8 13 V8 C8 -2 25 -2 25 8 V13 M5 13 H28 V31 H5 Z M16 20 V25',
  timer:'M11 1 H21 M16 1 V6 M25 5 L29 9 M16 7 A12 12 0 1 1 15.9 7 M16 11 V19 L22 22',
  person:'M16 2 A7 7 0 1 1 15.9 2 M3 31 C3 14 29 14 29 31 Z',
  money:'M2 6 H30 V28 H2 Z M16 10 V25 M22 13 C10 6 8 19 17 18 C27 18 22 29 10 23',
  gear:'M12 1 H20 L21 6 L25 8 L30 7 L32 15 L28 18 L27 23 L29 27 L22 31 L18 27 H13 L9 31 L2 26 L5 21 L4 16 L0 13 L4 5 L9 7 Z M16 11 A6 6 0 1 1 15.9 11',
  star:'M16 1 L21 11 L32 13 L24 21 L26 32 L16 26 L6 32 L8 21 L0 13 L11 11 Z',
  retry:'M28 12 C24 -1 3 2 3 18 C3 32 23 35 29 23 M28 2 V13 H18',
  bidirectional:'M1 9 H31 M24 2 L31 9 L24 16 M31 24 H1 M8 17 L1 24 L8 31',
  warning:'M16 2 L32 30 H1 Z M16 11 V21 M16 25 V26',
};
const Mark: React.FC<{element: Primitive; timeMs: number; filter: string}> = ({element:e,timeMs,filter}) => {
  const paths = useMemo(() => {
    if(e.kind==='text')return [];
    const options={seed:seedFor(e.id),roughness:CHALK.roughness,bowing:CHALK.bowing,strokeWidth:CHALK.strokeWidth,stroke:COLORS[e.role??'outline'],fill:e.fill?COLORS[e.fill]:undefined,fillStyle:e.hatch?'hachure' as const:'solid' as const,hachureGap:10,fillWeight:1.4};
    const shape=e.kind==='rect'?generator.rectangle(e.x!,e.y!,e.w!,e.h!,options):e.kind==='ellipse'?generator.ellipse(e.x!,e.y!,e.w!,e.h!,options):generator.path(e.kind==='icon'?icons[e.icon!]:e.d!,options);
    return generator.toPaths(shape);
  },[e]);
  const p=progressAt(e,timeMs);if(p<=0)return null;
  if(e.kind==='text')return <text data-hd-text x={e.x} y={e.y} textAnchor={e.align??'middle'} fill={COLORS[e.role??'text']} fontSize={e.size??32} opacity={Math.min(1,p*2)*(e.opacity??1)}>{e.text!.split('\n').map((s,i)=><tspan key={i} x={e.x} dy={i===0?0:(e.size??32)*1.35}>{s}</tspan>)}</text>;
  return <g filter={`url(#${filter})`} opacity={e.opacity??1}><g transform={e.kind==='icon'?`translate(${e.x},${e.y}) scale(${(e.size??32)/32})`:undefined}>
    {paths.map((a,i)=><path key={i} d={a.d} stroke={a.stroke} strokeWidth={a.strokeWidth} fill={a.fill} fillOpacity={p} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1-p}/>)}</g></g>;
};

/** Arbitrary positioned primitives; explicit time allows static SVG and frame-based Remotion reuse. */
export const PrimitiveCanvas: React.FC<{scene: Scene; timeMs?: number; idPrefix?: string}> = ({scene,timeMs=Number.MAX_SAFE_INTEGER,idPrefix}) => {
  validateScene(scene);const rid=useId().replace(/[^a-zA-Z0-9_-]/g,'');const filter=`chalk-${idPrefix??scene.id}-${rid}`;
  return <svg xmlns="http://www.w3.org/2000/svg" width={1080} height={1920} viewBox="0 0 1080 1920" role="img" aria-label={scene.title} style={{fontFamily:FONT,background:COLORS.background}}>
    <title>{scene.title}</title><defs><filter id={filter} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves={2} seed={7} result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale={CHALK.displacement} xChannelSelector="R" yChannelSelector="G"/></filter></defs>
    <rect width={1080} height={1920} fill={COLORS.background}/>
    {scene.elements.map(e=><Mark key={e.id} element={e} timeMs={timeMs} filter={filter}/>)}
  </svg>;
};
