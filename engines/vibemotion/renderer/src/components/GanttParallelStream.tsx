import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';

export interface GanttParallelStreamProps {
  sectionHeader: string;
  mode: 'serial_loop' | 'parallel_matrix';
  serialConfig?: {nodes: string[]; activeNodeIndex: number; orbitBallProgress: number; bottomCaption: string};
  parallelTracks?: Array<{label: string; colorHex: string; activeCellsPattern: boolean[]; isTrackActive: boolean}>;
}

// 组件 5：串行阻塞 vs 多线程并发矩阵（手绘圆环 + 小球轨道）
export const GanttParallelStream: React.FC<GanttParallelStreamProps> = ({
  sectionHeader,
  mode,
  serialConfig,
  parallelTracks,
}) => {
  const u = useU();
  const frame = useCurrentFrame();

  if (mode === 'serial_loop' && serialConfig) {
    const {nodes, activeNodeIndex, orbitBallProgress, bottomCaption} = serialConfig;
    const cx = 540 * u;
    const rx = 380 * u;
    const ry = 130 * u;
    const centerY = 300 * u;
    const ballX = cx + rx * Math.cos(orbitBallProgress * Math.PI * 2);
    const ballY = centerY + ry * Math.sin(orbitBallProgress * Math.PI * 2);

    return (
      <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
        <Kicker color={MUTED}>过 去 · 串 行 阻 塞</Kicker>
        <div style={{marginTop: 14}}>
          <SectionHeader>{sectionHeader}</SectionHeader>
        </div>

        <div style={{position: 'relative', height: 720 * u, marginTop: 30}}>
          <div
            style={{
              position: 'absolute',
              left: cx - rx,
              top: centerY - ry,
              width: rx * 2,
              height: ry * 2,
              borderRadius: '50%',
              border: '2px dashed rgba(16,17,18,0.28)',
            }}
          />
          {nodes.map((n, i) => {
            const nodeX = cx - rx + ((rx * 2) / Math.max(nodes.length - 1, 1)) * i;
            const active = i === Math.round(activeNodeIndex);
            return (
              <div
                key={n}
                style={{
                  position: 'absolute',
                  left: nodeX - 78 * u,
                  top: centerY - 78 * u,
                  width: 156 * u,
                  height: 156 * u,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${active ? GOLD : SAGE}`,
                  background: active ? 'rgba(226,190,92,0.12)' : 'rgba(255,252,245,0.6)',
                  boxShadow: active ? '0 0 34px rgba(226,190,92,0.55)' : 'none',
                }}
              >
                <span style={{fontFamily: FONT, fontSize: 33 * u, color: active ? GOLD : 'rgba(16,17,18,0.8)', fontWeight: 400}}>
                  {n}
                </span>
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute',
              left: ballX - 17 * u,
              top: ballY - 17 * u,
              width: 34 * u,
              height: 34 * u,
              borderRadius: '50%',
              background: GOLD,
              boxShadow: '0 0 26px rgba(226,190,92,0.9)',
            }}
          />
        </div>
        <div style={{marginTop: 30, fontFamily: FONT, fontSize: 37 * u, color: MUTED}}>{bottomCaption}</div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>现 在 · 并 行 流</Kicker>
      <div style={{marginTop: 14}}>
        <SectionHeader>{sectionHeader}</SectionHeader>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 26 * u, marginTop: 60}}>
        {(parallelTracks ?? []).map((t) => (
          <div key={t.label} style={{opacity: t.isTrackActive ? 1 : 0.4}}>
            <div style={{fontFamily: FONT, fontSize: 35 * u, color: t.colorHex, fontWeight: 400, marginBottom: 10}}>{t.label}</div>
            <div style={{display: 'flex', gap: 6 * u}}>
              {t.activeCellsPattern.map((on, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 36 * u,
                    borderRadius: 4 * u,
                    background: on ? t.colorHex : 'rgba(16,17,18,0.08)',
                    opacity: on ? 0.6 + 0.4 * Math.abs(Math.sin(frame / 14 + i)) : 1,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

