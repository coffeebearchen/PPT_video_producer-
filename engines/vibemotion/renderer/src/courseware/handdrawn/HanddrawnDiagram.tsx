import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {buildLayout, type LayoutSpec} from '../../graphics/handdrawn/layouts';
import {PrimitiveCanvas} from '../../graphics/handdrawn/primitives';
/** Use inside a Remotion Sequence to get a page-local clock. No CSS animation or wall time. */
export const HanddrawnDiagram:React.FC<{spec:LayoutSpec}> = ({spec})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig();
 const scene=useMemo(()=>buildLayout(spec),[spec]);
 return <PrimitiveCanvas scene={scene} timeMs={frame/fps*1000}/>;
};
export {PrimitiveCanvas} from '../../graphics/handdrawn/primitives';
export {Pen, buildLayout} from '../../graphics/handdrawn/layouts';
export type {LayoutSpec} from '../../graphics/handdrawn/layouts';
