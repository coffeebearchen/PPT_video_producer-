import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {FONT, glassCard, GOLD, SAGE, CORAL, INK, MUTED, AMBER} from '../engine/tokens';
import {Kicker, useU} from '../engine/ui';

interface OrbState {
  mode: string;
  label: string;
  subBadge?: string | null;
  colorHex: string;
}
interface Task {
  title: string;
  progress: number;
  status: string;
}
export interface ConcurrentDashboardProps {
  caption?: string;
  orbState: OrbState;
  tasks: Task[];
  contextBanner?: {icon: string; text: string; active: boolean};
}

const statusColor = (s: string) =>
  s === 'completed' ? SAGE : s === 'running' ? AMBER : 'rgba(16,17,18,0.35)';
const statusLabel = (s: string) => (s === 'completed' ? '完成' : s === 'running' ? '进行中' : '待开始');

// 组件 9：实时并发仪表盘（左球状态 + 右多任务进度）
export const ConcurrentDashboard: React.FC<ConcurrentDashboardProps> = ({caption, orbState, tasks, contextBanner}) => {
  const u = useU();
  const {width} = useVideoConfig();
  const orbColor = orbState.colorHex ?? SAGE;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>实 时 并 发 演 示</Kicker>
      {caption ? (
        <div style={{marginTop: 14, fontFamily: FONT, fontSize: 39 * u, color: 'rgba(16,17,18,0.72)', lineHeight: 1.45}}>
          {caption}
        </div>
      ) : null}

      {contextBanner ? (
        <div
          style={{
            marginTop: 24,
            alignSelf: 'flex-start',
            fontFamily: FONT,
            fontSize: 32 * u,
            color: contextBanner.active ? GOLD : MUTED,
            border: `2px solid ${contextBanner.active ? GOLD : 'rgba(138,145,139,0.4)'}`,
            borderRadius: 999,
            padding: '8px 24px',
          }}
        >
          {contextBanner.icon} {contextBanner.text}
        </div>
      ) : null}

      <div style={{display: 'flex', gap: 34 * u, marginTop: 70, alignItems: 'stretch'}}>
        {/* 状态球 */}
        <div
          style={{
            ...glassCard(20 * u, orbColor, 'rgba(255,252,245,0.6)'),
            width: 330 * u,
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 200 * u,
              height: 200 * u,
              borderRadius: '50%',
              background: `radial-gradient(circle at 38% 34%, ${orbColor}, ${orbColor}22 62%, transparent 72%)`,
              boxShadow: `0 0 46px ${orbColor}66`,
            }}
          />
          <div style={{fontFamily: FONT, fontSize: 39 * u, fontWeight: 400, color: INK, marginTop: 20}}>{orbState.label}</div>
          {orbState.subBadge ? (
            <div style={{fontFamily: FONT, fontSize: 28 * u, color: MUTED, marginTop: 6}}>{orbState.subBadge}</div>
          ) : null}
        </div>

        {/* 任务列表 */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 22 * u}}>
          {tasks.map((t) => (
            <div key={t.title} style={{...glassCard(16 * u, statusColor(t.status), 'rgba(255,252,245,0.6)'), padding: '30px 30px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                <span style={{fontFamily: FONT, fontSize: 39 * u, fontWeight: 400, color: INK}}>{t.title}</span>
                <span style={{fontFamily: FONT, fontSize: 30 * u, color: statusColor(t.status), fontWeight: 400}}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <div style={{height: 14 * u, borderRadius: 999, background: 'rgba(16,17,18,0.12)', marginTop: 16, overflow: 'hidden'}}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(1, t.progress)) * 100}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: statusColor(t.status),
                    boxShadow: `0 0 16px ${statusColor(t.status)}88`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

