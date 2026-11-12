/** Optional photo-preview entrypoint. Use out/image-page/public as the test publicDir. */
import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Courseware} from './Courseware';
import {validateResolved} from './model';
export const imageExample=validateResolved({
 schemaVersion:'courseware/1',taskId:'image-photo',renderId:'still',draftRevision:0,title:'照片完整展示',style:'dynamicflow',canvas:{width:1080,height:1920,fps:30},publicRoot:'renderer/public',stagingDir:'courseware/image-photo/still',totalFrames:180,totalDurationSeconds:6,
 brand:{show:false},aiLabel:{show:false},slides:[{id:'photo',kind:'image',text:'照片完整展示',body:'保留照片的全部内容',caption:'照片与插图，直接展示就好。',asset:{src:'courseware/image-photo/still/photo.jpg',width:512,height:600},fit:'contain',fromFrame:0,durationInFrames:180}]
});
registerRoot(()=> <Composition id="ImagePhoto" component={Courseware} defaultProps={imageExample} durationInFrames={180} fps={30} width={1080} height={1920}/>);
