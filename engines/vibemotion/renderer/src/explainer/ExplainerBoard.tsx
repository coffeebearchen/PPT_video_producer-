import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {styleTokens, type ExplanationStyle} from '../graphics/styles';
import type {ExplainerTimeline, Relation} from './compile';

type Props = {timeline: ExplainerTimeline};
type Point = [number, number];
type Graph = {positions: Point[]; edges: [number, number][]; boxWidth: number; boxHeight: number};
const CENTER = 400;
const chain = (count: number): Graph['edges'] => Array.from({length: count - 1}, (_, index) => [index, index + 1]);

function graphFor({kind, labels}: Relation): Graph {
  const count = labels.length;
  switch (kind) {
    case 'choice': return {positions: [[400, 130], [200, 375], [600, 375]], edges: [[0, 1], [0, 2]], boxWidth: 345, boxHeight: 110};
    case 'contrast': return {positions: [[200, 270], [600, 270]], edges: [], boxWidth: 345, boxHeight: 128};
    case 'cause': return {positions: [[200, 270], [600, 270]], edges: [[0, 1]], boxWidth: 325, boxHeight: 128};
    case 'sequence': return {positions: count === 2 ? [[200, 270], [600, 270]] : [[140, 270], [400, 270], [660, 270]], edges: chain(count), boxWidth: count === 2 ? 325 : 230, boxHeight: 136};
    case 'cycle': return {
      positions: count === 3 ? [[400, 115], [600, 390], [200, 390]] : [[200, 120], [600, 120], [600, 400], [200, 400]],
      edges: [...chain(count), [count - 1, 0]], boxWidth: 295, boxHeight: 106,
    };
    default: return {
      positions: labels.map((_, index) => [CENTER, 270 + (index - (count - 1) / 2) * 118]),
      edges: [], boxWidth: 668, boxHeight: count === 1 ? 152 : 96,
    };
  }
}

function edgePath(start: Point, end: Point, graph: Graph) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const inset = Math.min((graph.boxWidth / 2 + 5) / (Math.abs(dx) || 0.001), (graph.boxHeight / 2 + 5) / (Math.abs(dy) || 0.001));
  return `M ${start[0] + dx * inset} ${start[1] + dy * inset} L ${end[0] - dx * inset} ${end[1] - dy * inset}`;
}

function Diagram({relation, style, reveal}: {relation: Relation; style: ExplanationStyle; reveal: number}) {
  const t = styleTokens(style);
  const graph = graphFor(relation);
  return <div aria-label={relation.labels.join('、')} style={{position: 'relative', width: 800, height: 540}}>
    <svg aria-hidden width="800" height="540" viewBox="0 0 800 540" style={{position: 'absolute', inset: 0}}>
      <defs><marker id="explainer-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M1 1L6 4 1 7" fill="none" stroke={t.primary} strokeWidth="1.2" />
      </marker></defs>
      {relation.kind === 'contrast' && <path d="M400 145V395" stroke={t.line} strokeWidth="2" />}
      {graph.edges.map(([from, to]) => <path key={`${from}-${to}`} d={edgePath(graph.positions[from], graph.positions[to], graph)}
        fill="none" stroke={t.primary} strokeWidth="3" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - reveal}
        markerEnd={reveal > 0.95 ? 'url(#explainer-arrow)' : undefined} />)}
    </svg>
    {relation.labels.map((label, index) => {
      const [x, y] = graph.positions[index];
      const focus = index === 0;
      return <div key={index} style={{
        position: 'absolute', left: x - graph.boxWidth / 2, top: y - graph.boxHeight / 2, width: graph.boxWidth, height: graph.boxHeight,
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 17,
        border: `1px solid ${focus ? t.primary : t.line}`, borderRadius: t.radius + 4, background: t.surface,
        padding: '10px 15px', color: focus ? t.primary : t.ink, textAlign: 'center', fontSize: relation.labels.length === 1 ? 43 : 33,
        lineHeight: 1.27, overflowWrap: 'anywhere',
      }}>
        {relation.kind === 'checklist' && <svg aria-hidden width={26} height={26} viewBox="0 0 26 26" style={{flex: 'none'}}>
          <path d="m4 14 6 6L22 6" stroke={t.primary} strokeWidth="3" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - reveal} />
        </svg>}
        <span>{label}</span>
      </div>;
    })}
    {graph.edges.length === 0 && relation.kind !== 'checklist' && <div aria-hidden style={{position: 'absolute', bottom: 38, left: 322, height: 2, width: reveal * 156, background: t.primary}} />}
  </div>;
}

function Surface({children, style}: {children: React.ReactNode; style: ExplanationStyle}) {
  const t = styleTokens(style);
  const {width, height} = useVideoConfig();
  return <AbsoluteFill style={{width, height, background: t.bg, color: t.ink, fontFamily: 'LXGW WenKai'}}>
    <AbsoluteFill aria-hidden style={{backgroundImage: `radial-gradient(ellipse at 72% 20%, ${t.primary}15, transparent 65%), linear-gradient(${t.line}22 1px, transparent 1px), linear-gradient(90deg, ${t.line}22 1px, transparent 1px)`, backgroundSize: 'auto, 48px 48px, 48px 48px'}} />
    {children}
  </AbsoluteFill>;
}

export function ExplainerVideo({timeline}: Props) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = frame * 1000 / fps;
  const style = timeline.projectMeta.style ?? 'industrial';
  const t = styleTokens(style);
  const scene = timeline.scenes.find((item) => ms >= item.startMs && ms < item.endMs) ?? timeline.scenes[timeline.scenes.length - 1];
  const subtitle = timeline.subtitles.find((cue) => ms >= cue.startMs && ms < cue.endMs);
  const voice = timeline.audioTracks.masterVoiceover;
  const reveal = interpolate(ms - scene.startMs, [360, 1830], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  return <Surface style={style}>
    <div style={{position: 'absolute', left: 140, right: 140, top: 302, textAlign: 'center'}}>
      <div style={{width: 70, height: 3, margin: '0 auto 40px', background: t.accent}} />
      <h1 style={{fontFamily: t.heading, fontSize: 67, fontWeight: 400, margin: 0, lineHeight: 1.2, textWrap: 'balance'}}>{timeline.projectMeta.title}</h1>
    </div>
    <div style={{position: 'absolute', left: 140, right: 140, top: 670, height: 620, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
      {scene.initialProps.heading && <div style={{fontSize: 35, color: t.muted, textAlign: 'center', marginBottom: 18}}>{scene.initialProps.heading}</div>}
      <Diagram relation={scene.initialProps} style={style} reveal={reveal} />
    </div>
    {timeline.source && <div style={{position: 'absolute', left: 140, right: 140, top: 1300, textAlign: 'center', color: t.muted, fontSize: 28}}>{timeline.source}</div>}
    {subtitle && <div style={{position: 'absolute', left: 140, right: 140, bottom: 286, padding: '19px 25px', borderTop: `1px solid ${t.line}`, textAlign: 'center', fontSize: 37, lineHeight: 1.4, textWrap: 'pretty'}}>{subtitle.text}</div>}
    {scene === timeline.scenes[timeline.scenes.length - 1] && <div style={{position: 'absolute', right: 140, bottom: 209, color: t.muted, fontSize: 28}}>有问题，评论区问</div>}
    {voice && <Audio src={staticFile(voice.src)} volume={voice.volume} />}
  </Surface>;
}

export function ExplainerCover({timeline}: Props) {
  const {height} = useVideoConfig();
  const style = timeline.projectMeta.style ?? 'industrial';
  const t = styleTokens(style);
  const labels = timeline.scenes[0].initialProps.labels;
  const portrait = height === 1920;
  return <Surface style={style}>
    <div style={{position: 'absolute', inset: `${height * 0.14}px 140px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: portrait ? 57 : 39}}>
      <div aria-hidden style={{width: 76, height: 3, background: t.accent}} />
      <h1 style={{fontFamily: t.heading, fontWeight: 400, fontSize: portrait ? 91 : 81, lineHeight: 1.17, margin: 0, textAlign: 'center', textWrap: 'balance'}}>{timeline.projectMeta.title}</h1>
      <div style={{display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 15, width: '100%'}}>
        {labels.map((label, index) => <div key={index} style={{fontSize: 33, color: index === 0 ? t.primary : t.ink, border: `1px solid ${t.line}`, borderRadius: t.radius, background: t.surface, padding: '14px 23px', textAlign: 'center', maxWidth: '100%', boxSizing: 'border-box'}}>{label}</div>)}
      </div>
    </div>
  </Surface>;
}
