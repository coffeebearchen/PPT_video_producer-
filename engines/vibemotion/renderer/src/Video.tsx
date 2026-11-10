import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import timeline from './data/timeline_dsl.json';
import type {TimelineDSL} from './types';
import {AmbientBg} from './engine/AmbientBg';
import {CameraRig} from './engine/CameraRig';
import {SubtitleTrack} from './engine/SubtitleTrack';
import {useInterpolatedSceneState} from './engine/SceneController';
import {resolveComponent} from './engine/registry';
import {SceneStartContext} from './engine/sceneContext';
import {DEFAULT_PALETTE} from './engine/tokens';
import {DoodleLayer, type DoodleItem} from './components/Doodle';

const DSL = timeline as TimelineDSL;

const SFX_FILES: Record<string, string> = {
  pop: 'sfx/pop.wav',
  whoosh: 'sfx/whoosh.wav',
  strike_red: 'sfx/strike.wav',
  chime_success: 'sfx/chime.wav',
  tick: 'sfx/tick.wav',
  camera_zoom: 'sfx/whoosh.wav',
};

const cleanSrc = (src: string) => src.replace(/^\//, '').replace(/^01_inbox\//, 'audio/').replace(/^public\//, '');

// 手绘底纹：虚线基准线 + 斜纹小圆点（全部带漂浮动画）
const SceneDecor: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = [
    {l: 118, t: 1320, c: '#8A918B'},
    {l: 928, t: 1288, c: '#E2BE5C'},
    {l: 168, t: 1502, c: '#EA3E4A'},
    {l: 872, t: 1518, c: '#8A918B'},
    {l: 520, t: 1600, c: '#E2BE5C'},
    {l: 660, t: 1410, c: '#8A918B'},
    {l: 300, t: 1690, c: '#D9A24E'},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          top: 1250,
          height: 3,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(16,17,18,0.16) 0 14px, transparent 14px 28px)',
          backgroundPosition: `${(frame * 0.9) % 28}px 0`,
        }}
      />
      {dots.map((d, i) => {
        const ph = i * 1.25;
        const dx = Math.cos(frame / 26 + ph) * 7;
        const dy = Math.sin(frame / 18 + ph) * 11;
        const op = 0.3 + 0.22 * (0.5 + 0.5 * Math.sin(frame / 22 + ph));
        const rot = frame * 0.8 + i * 40;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: d.l,
              top: d.t,
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: `2px solid ${d.c}`,
              backgroundImage: `repeating-linear-gradient(45deg, ${d.c} 0 2px, transparent 2px 6px)`,
              backgroundPosition: `${rot}px 0`,
              opacity: op,
              transform: `translate(${dx}px, ${dy}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

// 粉笔屑：大量微粒缓慢上浮 + 左右摆 + 明灭
const ChalkParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const specks = Array.from({length: 30}, (_, i) => {
    const h = (k: number) => Math.abs((Math.sin(i * k) * 43758.5453) % 1);
    const x0 = h(12.9898) * 1080;
    const y0 = h(78.233) * 1920;
    const speed = 0.2 + h(37.719) * 0.55;
    const y = (y0 - frame * speed + 1920 * 3) % 1920;
    const x = x0 + Math.sin(frame / (26 + i) + i) * 16;
    const size = 2 + h(43.1) * 3;
    const op = 0.07 + 0.13 * (0.5 + 0.5 * Math.sin(frame / (18 + (i % 9)) + i));
    return {x, y, size, op};
  });
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {specks.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#FDFDFB',
            opacity: s.op,
            filter: 'blur(0.4px)',
          }}
        />
      ))}
    </div>
  );
};

// 缓慢扫过的柔和光束
const LightSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const p = (frame % 330) / 330;
  const x = -520 + p * 2200;
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: -220,
          left: x,
          width: 340,
          height: 2400,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.045), transparent)',
          transform: 'rotate(14deg)',
          filter: 'blur(26px)',
        }}
      />
    </div>
  );
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const palette = DEFAULT_PALETTE;

  let sceneIndex = DSL.scenes.findIndex((s) => ms < s.endMs);
  if (sceneIndex < 0) sceneIndex = DSL.scenes.length - 1;
  const scene = DSL.scenes[sceneIndex];

  const {props, camera} = useInterpolatedSceneState(scene?.initialProps ?? {}, scene?.stateSteps ?? []);

  const startFrame = Math.round((scene.startMs / 1000) * fps);
  const endFrame = Math.round((scene.endMs / 1000) * fps);
  const local = Math.max(0, frame - startFrame);

  // 入场：弹簧回弹；退场：轻推 + 淡出；全片镜头缓慢推进
  const enter = spring({frame: local, fps, config: {damping: 14, stiffness: 130, mass: 0.6}});
  const exit = Math.max(0, Math.min(1, (frame - (endFrame - 8)) / 8));
  const sceneProgress = Math.max(0, Math.min(1, local / Math.max(1, endFrame - startFrame)));
  const cam = {...camera, scale: camera.scale * (1 + 0.02 * sceneProgress)};

  const Comp = scene ? resolveComponent(scene.componentName) : null;

  const sceneStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    opacity: Math.max(0, Math.min(1, enter)) * (1 - exit),
    transform: `translateY(${(1 - enter) * 24 - exit * 16}px) scale(${0.97 + 0.03 * enter + 0.02 * exit})`,
    textShadow: '0 0 1px rgba(16,17,18,0.12)',
  };

  return (
    <AbsoluteFill style={{background: palette.bgCanvas, overflow: 'hidden'}}>
      <AmbientBg palette={palette} camera={cam} />
      {/* Keep emphasis motion inside the scene; avoid ambient decorative movement. */}

      {/* 粉笔粉尘滤镜（线条改由 Rough.js 绘制，不再用位移滤镜硬造） */}
      <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden>
        <defs>
          <filter id="vm-chalk-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0"
            />
          </filter>
        </defs>
      </svg>

      <div style={sceneStyle}>
        <SceneStartContext.Provider value={startFrame}>
          <CameraRig camera={cam}>{Comp ? <Comp {...(props as any)} /> : null}</CameraRig>
        </SceneStartContext.Provider>
      </div>

      {(props as any)?.hideDecor || (props as any)?.density === 'simple' ? null : <SceneDecor />}

      {/* 手绘小配件层（由场景 props.decor 驱动） */}
      {Array.isArray((props as any)?.decor) ? (
        <DoodleLayer items={(props as any).decor as DoodleItem[]} scale={width / 1080} />
      ) : null}

      {/* 粉笔粉尘覆盖层 */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.09,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      >
        <rect width="100%" height="100%" filter="url(#vm-chalk-grain)" />
      </svg>

      <SubtitleTrack subtitles={DSL.subtitles} palette={palette} />
      {sceneIndex === DSL.scenes.length - 1 ? (
        <div style={{position: 'absolute', right: 112, bottom: 206, color: '#F1E5B1', fontSize: 26, fontFamily: 'LXGW WenKai', opacity: 0.72}}>有问题，评论区问</div>
      ) : null}

      {DSL.audioTracks.masterVoiceover ? (
        <Audio src={staticFile(cleanSrc(DSL.audioTracks.masterVoiceover.src))} volume={DSL.audioTracks.masterVoiceover.volume} />
      ) : null}
      {DSL.audioTracks.backgroundMusic ? (
        <Audio src={staticFile(cleanSrc(DSL.audioTracks.backgroundMusic.src))} volume={DSL.audioTracks.backgroundMusic.baseVolume} />
      ) : null}
      {DSL.audioTracks.sfxEvents.map((e, i) => (
        <Sequence key={i} from={Math.round((e.atMs / 1000) * fps)} durationInFrames={Math.round(fps * 2)}>
          <Audio src={staticFile(SFX_FILES[e.sfxType] ?? 'sfx/pop.wav')} volume={e.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

