import React from 'react';
import {Composition, Still} from 'remotion';
import {ChalkCover} from './components/ChalkCover';
import {Video} from './Video';
import timeline from './data/timeline_dsl.json';

const durationInFrames = Math.round((timeline.projectMeta.durationMs / 1000) * timeline.projectMeta.fps);

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Still id="SampleACover" component={ChalkCover} width={1080} height={1920}/>
    <Still id="SampleACover3x4" component={ChalkCover} width={1080} height={1440}/>
    <Composition
      id="VibeMotion"
      component={Video}
      durationInFrames={durationInFrames}
      fps={timeline.projectMeta.fps}
      width={timeline.projectMeta.width}
      height={timeline.projectMeta.height}
    />
    </>
  );
};
