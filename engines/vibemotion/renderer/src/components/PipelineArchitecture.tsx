import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, CORAL, AMBER, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {useStagger} from '../engine/motion';

export interface Stage {
  code: string;
  title: string;
  sampleTextOrWave?: string;
  themeColor: string;
}
export interface PipelineArchitectureProps {
  sectionHeader: string;
  kicker?: string;
  stages: Stage[];
  focusedStageIndex: number | null;
}

// 组件 1：麦克风四段流水线（手绘纵向管道，逐段点亮）
export const PipelineArchitecture: React.FC<PipelineArchitectureProps> = ({
  sectionHeader,
  kicker = '系 统 图 解',
  stages,
  focusedStageIndex,
}) => {
  const u = useU();
  const {width} = useVideoConfig();
  const active = Math.round(focusedStageIndex ?? -1);
  const st = useStagger(stages.length, 9, 12);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      <div style={{marginTop: 14}}>
        <SectionHeader>{sectionHeader}</SectionHeader>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 24 * u, marginTop: 90, width: width - 96 * u}}>
        {stages.map((s, i) => {
          const focused = active === i;
          const dim = focusedStageIndex !== null && !focused;
          return (
            <div
              key={s.code}
              style={{
                ...glassCard(14 * u, focused ? s.themeColor : 'rgba(138,145,139,0.4)', focused ? 'rgba(226,190,92,0.06)' : 'rgba(255,252,245,0.55)'),
                padding: '26px 30px',
                display: 'flex',
                alignItems: 'center',
                gap: 24 * u,
                opacity: (dim ? 0.42 : 1) * st[i], transform: `translateY(${(1 - st[i]) * 22}px)`,
                boxShadow: focused ? `0 0 34px ${s.themeColor}55` : 'none',
              }}
            >
              <div
                style={{
                  width: 140 * u,
                  height: 88 * u,
                  borderRadius: 10 * u,
                  border: `2px solid ${s.themeColor}`,
                  background: `${s.themeColor}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT,
                  fontSize: 35 * u,
                  fontWeight: 400,
                  color: s.themeColor,
                  letterSpacing: 1,
                  flexShrink: 0,
                }}
              >
                {s.code}
              </div>
              <div style={{flex: 1}}>
                <div style={{fontFamily: FONT, fontSize: 41 * u, fontWeight: 400, color: INK}}>{s.title}</div>
                {s.sampleTextOrWave ? (
                  <div style={{fontFamily: FONT, fontSize: 30 * u, color: MUTED, marginTop: 4}}>{s.sampleTextOrWave}</div>
                ) : null}
              </div>
              {i < stages.length - 1 ? (
                <span style={{fontFamily: FONT, fontSize: 35 * u, color: 'rgba(16,17,18,0.35)'}}>↓</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

