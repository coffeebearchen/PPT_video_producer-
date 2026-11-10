import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT, GOLD, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';
import {useSceneStart} from '../engine/sceneContext';
import {SketchRect, SketchLine} from '../engine/SketchRect';

export interface FlowNode {
  id: string;
  label: string;
  sub?: string;
}
export interface FlowChartProps {
  title?: string;
  kicker?: string;
  nodes: FlowNode[];
  activeStep: number;
  stepCaption?: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// 动态流程图：Rough.js 手绘框 + 手绘连接线，随语音时间轴逐步点亮
export const FlowChart: React.FC<FlowChartProps> = ({title, kicker = '动 态 流 程', nodes, activeStep, stepCaption}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const start = useSceneStart();
  const pulse = 0.5 + 0.5 * Math.sin((frame - start) / 9);
  const step = Number.isFinite(activeStep) ? activeStep : 0;
  const n = Math.max(nodes.length, 1);
  const connW = 60 * u;
  const nodeW = (984 * u - connW * (n - 1)) / n;
  const nodeH = 250 * u;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '210px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      {title ? (
        <div style={{marginTop: 16}}>
          <SectionHeader>{title}</SectionHeader>
        </div>
      ) : null}

      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 150, height: 360 * u}}>
        {nodes.map((node, i) => {
          const act = clamp01(step - i);
          const lit = act > 0.15;
          return (
            <React.Fragment key={node.id}>
              <div
                style={{
                  position: 'relative',
                  width: nodeW,
                  height: nodeH,
                  transform: `translateY(${Math.sin((frame - start) / 21 + i) * 5}px) scale(${
                    0.97 + 0.05 * act + 0.015 * act * pulse
                  }) rotate(${i % 2 === 0 ? -0.6 : 0.6}deg)`,
                }}
              >
                <SketchRect
                  w={nodeW}
                  h={nodeH}
                  stroke={lit ? GOLD : 'rgba(138,145,139,0.75)'}
                  strokeWidth={lit ? 3 : 2}
                  fill={lit ? 'rgba(226,190,92,0.08)' : undefined}
                  seed={17 + i * 7}
                  roughness={1.1}
                />
                <div
                  style={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '0 10px',
                  }}
                >
                  <div style={{fontFamily: FONT, fontSize: 28 * u, color: lit ? GOLD : MUTED, marginBottom: 8 * u}}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{fontFamily: FONT, fontSize: 46 * u, color: INK, lineHeight: 1.15, letterSpacing: 1}}>{node.label}</div>
                  {node.sub ? (
                    <div style={{fontFamily: FONT, fontSize: 30 * u, color: lit ? GOLD : MUTED, marginTop: 10 * u}}>{node.sub}</div>
                  ) : null}
                </div>
              </div>

              {i < n - 1 ? (
                <div style={{width: connW, height: nodeH, position: 'relative'}}>
                  <SketchLine
                    w={connW}
                    h={nodeH}
                    x1={6}
                    x2={connW - 8}
                    stroke={clamp01(step - i - 0.35) > 0.5 ? GOLD : 'rgba(16,17,18,0.35)'}
                    strokeWidth={2}
                    seed={31 + i * 5}
                    roughness={1.6}
                  />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {stepCaption ? (
        <div
          style={{
            alignSelf: 'center',
            marginTop: 80,
            fontFamily: FONT,
            fontSize: 44 * u,
            color: INK,
            background: 'rgba(20,20,20,0.55)',
            border: '2px solid rgba(16,17,18,0.14)',
            borderRadius: 16 * u,
            padding: '16px 36px',
          }}
        >
          {stepCaption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

