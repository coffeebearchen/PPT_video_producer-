import React from 'react';
import {Composition, Still, cancelRender, continueRender, delayRender, getInputProps, registerRoot, staticFile} from 'remotion';
import fontManifest from '../../fonts.json';
import {ExplainerCover, ExplainerVideo} from './ExplainerBoard';
import type {ExplainerTimeline} from './compile';

const handle = delayRender('Loading local explainer fonts');
void Promise.all(Object.entries(fontManifest).map(async ([family, file]) => {
  const face = await new FontFace(family, `url("${staticFile(file)}")`).load();
  (document.fonts as unknown as {add: (font: FontFace) => void}).add(face);
})).then(() => continueRender(handle), cancelRender);

const Root = () => {
  const {timeline} = getInputProps() as {timeline?: ExplainerTimeline};
  if (!timeline?.scenes.length) throw new Error('请用 --props 传入由编排器生成的项目 JSON。');
  const {durationMs, fps, width, height} = timeline.projectMeta;
  const props = {timeline};
  return <>
    <Composition id="Explainer2B" component={ExplainerVideo} width={width} height={height} fps={fps} durationInFrames={Math.round(durationMs * fps / 1000)} defaultProps={props} />
    <Still id="Explainer2BCover" component={ExplainerCover} width={1080} height={1920} defaultProps={props} />
    <Still id="Explainer2BCover3x4" component={ExplainerCover} width={1080} height={1440} defaultProps={props} />
  </>;
};

registerRoot(Root);
