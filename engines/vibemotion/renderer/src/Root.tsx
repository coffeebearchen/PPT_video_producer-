import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import timeline from './data/timeline_dsl.json';

const durationInFrames = Math.round((timeline.projectMeta.durationMs / 1000) * timeline.projectMeta.fps);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VibeMotion"
      component={Video}
      durationInFrames={durationInFrames}
      fps={timeline.projectMeta.fps}
      width={timeline.projectMeta.width}
      height={timeline.projectMeta.height}
    />
  );
};
