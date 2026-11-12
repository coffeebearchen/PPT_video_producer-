import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {HanddrawnDiagram} from './HanddrawnDiagram';
import {examples} from './examples';
registerRoot(()=> <>{examples.map(spec=><Composition key={spec.id} id={spec.id} component={HanddrawnDiagram} defaultProps={{spec}} durationInFrames={600} fps={30} width={1080} height={1920}/>)}</>);
