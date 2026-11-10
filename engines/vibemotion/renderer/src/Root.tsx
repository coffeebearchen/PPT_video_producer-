import React from 'react';
import {Composition, Still} from 'remotion';
import {ChalkCover} from './components/ChalkCover';
import {Video} from './Video';
import timeline from './data/timeline_dsl.json';
import round4 from './data/round4-project.json';
import {GraphicVideo} from './graphics/GraphicScene';
import {GraphicGallery} from './graphics/GraphicGallery';
import {GRAPHIC_CATALOG} from './graphics/catalog';

const durationInFrames = Math.round((timeline.projectMeta.durationMs / 1000) * timeline.projectMeta.fps);

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition id="Round4Industrial" component={GraphicVideo} width={1080} height={1920} fps={30} durationInFrames={Math.round(round4.durationMs/1000*30)} defaultProps={{style:'industrial'}}/>
    <Composition id="Round4Clean" component={GraphicVideo} width={1080} height={1920} fps={30} durationInFrames={Math.round(round4.durationMs/1000*30)} defaultProps={{style:'clean'}}/>
    <Composition id="Round4Dynamic" component={GraphicVideo} width={1080} height={1920} fps={30} durationInFrames={Math.round(round4.durationMs/1000*30)} defaultProps={{style:'dynamic'}}/>
    <Still id="GraphicsGallery" component={GraphicGallery} width={3200} height={Math.ceil(GRAPHIC_CATALOG.length/4)*650}/>
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
