import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT, GOLD, SAGE, CORAL, INK, MUTED} from '../engine/tokens';
import {Kicker, SectionHeader, useU} from '../engine/ui';

export interface CounterItem {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color?: 'gold' | 'sage' | 'coral';
  decimals?: number;
}
export interface CounterProps {
  title?: string;
  kicker?: string;
  items: CounterItem[];
  /** 0~1，驱动数字滚动 */
  progress?: number;
  caption?: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const toneHex = (t?: string) => (t === 'sage' ? SAGE : t === 'coral' ? CORAL : GOLD);

// 数字滚动：大数字从 0 滚到目标值，逐项错峰
export const Counter: React.FC<CounterProps> = ({title, kicker = '关 键 数 字', items, progress = 1, caption}) => {
  const u = useU();
  const p = clamp01(progress);
  const rows = items.length > 3;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', padding: '200px 48px 300px'}}>
      <Kicker color={MUTED}>{kicker}</Kicker>
      {title ? (
        <div style={{marginTop: 14}}>
          <SectionHeader>{title}</SectionHeader>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 110,
          display: 'flex',
          flexDirection: rows ? 'column' : 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: rows ? 48 * u : 40 * u,
        }}
      >
        {items.map((it, i) => {
          const local = clamp01(p * items.length - i);
          const val = it.value * easeOut(local);
          const txt = it.decimals ? val.toFixed(it.decimals) : Math.round(val).toLocaleString('en-US');
          return (
            <div key={it.label} style={{textAlign: 'center', minWidth: rows ? 600 * u : 0}}>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 128 * u,
                  lineHeight: 1,
                  color: toneHex(it.color),
                  textShadow: '0 0 30px rgba(226,190,92,0.25)',
                }}
              >
                {it.prefix ?? ''}
                {txt}
                {it.suffix ?? ''}
              </div>
              <div style={{fontFamily: FONT, fontSize: 34 * u, color: INK, marginTop: 16 * u}}>{it.label}</div>
            </div>
          );
        })}
      </div>

      {caption ? (
        <div style={{marginTop: 90 * u, textAlign: 'center', fontFamily: FONT, fontSize: 38 * u, color: MUTED}}>{caption}</div>
      ) : null}
    </AbsoluteFill>
  );
};

