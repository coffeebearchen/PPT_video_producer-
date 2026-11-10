import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT, glassCard, GOLD, MUTED} from '../engine/tokens';

// 未接入组件占位
export const Placeholder: React.FC<{name: string}> = ({name}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 48px'}}>
    <div style={{...glassCard(24, GOLD), padding: '40px 48px', textAlign: 'center'}}>
      <div style={{fontFamily: FONT, fontSize: 46, fontWeight: 400, color: GOLD}}>{name}</div>
      <div style={{fontFamily: FONT, fontSize: 28, color: MUTED, marginTop: 14}}>组件已注册，待接入完整动效</div>
    </div>
  </AbsoluteFill>
);

