import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT, glassCard, INK, MUTED, SAGE} from '../engine/tokens';
import {Kicker, useU} from '../engine/ui';

export interface Speaker {
  label: string;
  active: boolean;
  colorHex: string;
}
export interface DualRoleVideoSyncProps {
  title: string;
  speakers: Speaker[];
  mediaSrc?: string;
}

// 组件 6：实拍原片 + 多角色发声同步器
export const DualRoleVideoSync: React.FC<DualRoleVideoSyncProps> = ({title, speakers, mediaSrc}) => {
  const u = useU();
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>原 片 实 录</Kicker>
      <div style={{marginTop: 14, fontFamily: FONT, fontSize: 52 * u, fontWeight: 400, color: INK}}>{title}</div>

      <div
        style={{
          marginTop: 40,
          width: width - 96 * u,
          aspectRatio: '16/9',
          borderRadius: 18 * u,
          overflow: 'hidden',
          background: '#1C1C1C',
          border: `2px solid ${SAGE}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mediaSrc ? (
          <Img src={staticFile(mediaSrc)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          <span style={{fontFamily: FONT, fontSize: 33 * u, color: MUTED}}>· 实拍画面（放 public/user_media） ·</span>
        )}
      </div>

      <div style={{display: 'flex', gap: 22 * u, marginTop: 34, justifyContent: 'center'}}>
        {speakers.map((s) => (
          <div
            key={s.label}
            style={{
              ...glassCard(999 * u, s.active ? s.colorHex : 'rgba(138,145,139,0.4)', 'rgba(255,252,245,0.6)'),
              padding: '16px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 14 * u,
              transform: s.active ? 'scale(1.06)' : 'scale(1)',
              opacity: s.active ? 1 : 0.55,
            }}
          >
            <div style={{width: 16 * u, height: 16 * u, borderRadius: '50%', background: s.colorHex}} />
            <span style={{fontFamily: FONT, fontSize: 35 * u, color: INK, fontWeight: 400}}>{s.label}</span>
            {s.active ? (
              <span style={{display: 'flex', gap: 3, alignItems: 'center'}}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{width: 4, height: 14 + 10 * Math.abs(Math.sin(frame / 4 + i)), background: s.colorHex, borderRadius: 2}} />
                ))}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

