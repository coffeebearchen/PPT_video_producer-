import React from 'react';
import {Composition, Still, cancelRender, continueRender, delayRender, getInputProps, registerRoot, staticFile} from 'remotion';
import fonts from '../../fonts.json';
import {Courseware, CoursewareCover} from './Courseware';
import {validateResolved} from './model';

const fontHandle = delayRender('Loading Courseware local fonts');
void Promise.all(Object.entries(fonts).map(async ([family, file]) => {
  const face = await new FontFace(family, `url("${staticFile(file)}")`).load();
  (document.fonts as unknown as {add: (font: FontFace) => void}).add(face);
})).then(() => continueRender(fontHandle), cancelRender);

const Root = () => {
  const props = validateResolved(getInputProps());
  return <>
    <Composition id="Courseware" component={Courseware} width={1080} height={1920} fps={30} durationInFrames={props.totalFrames} defaultProps={props}/>
    <Still id="CoursewareCover" component={CoursewareCover} width={1080} height={1920} defaultProps={props}/>
  </>;
};
registerRoot(Root);
