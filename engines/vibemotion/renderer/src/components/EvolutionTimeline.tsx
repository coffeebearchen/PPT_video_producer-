import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';

export interface TimelineNode {
  title: string;
  metaTag: string;
  accentColor: string;
}
export interface EvolutionTimelineProps {
  sectionHeader: string;
  nodes: TimelineNode[];
  activeNodeIndex: number;
}

// 组件 3：纵深演进时间轴（手绘竖轴 + 左右交错节点）
export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({sectionHeader, nodes, activeNodeIndex}) => {
  const u = useU();
  const {height} = useVideoConfig();
  const top = 430 * u;
  const bottom = height - 520 * u;
  const span = bottom - top;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>技 术 演 进 路 线</Kicker>
      <div style={{marginTop: 14}}>
        <SectionHeader>{sectionHeader}</SectionHeader>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top,
          bottom: height - bottom,
          width: 3,
          background: 'rgba(16,17,18,0.2)',
          transform: 'translateX(-50%)',
        }}
      />

      {nodes.map((n, i) => {
        const y = top + (span / Math.max(nodes.length - 1, 1)) * i;
        const leftSide = i % 2 === 0;
        const past = i < Math.round(activeNodeIndex);
        const active = i === Math.round(activeNodeIndex);
        return (
          <div
            key={n.title}
            style={{
              position: 'absolute',
              top: y - 58 * u,
              left: leftSide ? 48 * u : '50%',
              right: leftSide ? '50%' : 48 * u,
            }}
          >
            <div
              style={{
                ...glassCard(18 * u, active ? n.accentColor : past ? n.accentColor : 'rgba(138,145,139,0.4)', 'rgba(255,252,245,0.6)'),
                padding: '28px 28px',
                marginLeft: leftSide ? 0 : 66 * u,
                marginRight: leftSide ? 66 * u : 0,
                opacity: past || active ? 1 : 0.45,
                boxShadow: active ? `0 0 36px ${n.accentColor}55` : 'none',
              }}
            >
              <div style={{fontFamily: FONT, fontSize: 39 * u, fontWeight: 400, color: n.accentColor}}>{n.title}</div>
              <div style={{fontFamily: FONT, fontSize: 28 * u, color: MUTED, marginTop: 6}}>{n.metaTag}</div>
            </div>
            <div
              style={{
                position: 'absolute',
                top: 40 * u,
                [leftSide ? 'right' : 'left']: -13 * u,
                width: 26 * u,
                height: 26 * u,
                borderRadius: '50%',
                background: active ? GOLD : past ? n.accentColor : 'rgba(16,17,18,0.3)',
                boxShadow: active ? `0 0 22px ${GOLD}` : 'none',
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

