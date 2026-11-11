import React from 'react';
import {Composition, Still, cancelRender, continueRender, delayRender, registerRoot, staticFile} from 'remotion';
import fontManifest from '../../fonts.json';
import sample from '../../../../../TARGET-SAMPLES/fixed-pages-2a/sample.json';
import {FixedPages, FixedPagesCover} from './FixedPages';
import {FPS, HEIGHT, WIDTH, checkProject, type FixedPageProps} from './project';

const handle = delayRender('Loading the local fixed-page fonts');
void Promise.all(Object.entries(fontManifest).map(async ([family, file]) => {
  const face = await new FontFace(family, `url("${staticFile(file)}")`).load();
  (document.fonts as unknown as {add: (font: FontFace) => void}).add(face);
})).then(() => continueRender(handle), cancelRender);

const defaultProps: FixedPageProps = {spec: sample.spec};

const Root = () => <>
  <Composition
    id="FixedPages2A" component={FixedPages} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={20 * FPS}
    defaultProps={defaultProps} calculateMetadata={({props}) => {
      checkProject(props);
      return {durationInFrames: (props.durationSeconds ?? 20) * FPS};
    }}
  />
  <Still id="FixedPages2ACover" component={FixedPagesCover} width={WIDTH} height={HEIGHT} defaultProps={defaultProps}
    calculateMetadata={({props}) => { checkProject(props); return {}; }}
  />
</>;

registerRoot(Root);
