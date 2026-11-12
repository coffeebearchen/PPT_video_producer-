import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Courseware} from '../Courseware';
import {validateResolved} from '../model';
import {DEFINITIONS} from './catalog';

export const demoProject = validateResolved({
  schemaVersion: 'courseware/1', taskId: 'demo', renderId: 'image-mix', draftRevision: 1,
  title: '图片与图解混排', style: 'dynamicflow',
  canvas: {width: 1080, height: 1920, fps: 30},
  publicRoot: 'renderer/public', stagingDir: 'courseware/demo/image-mix',
  totalFrames: 720, totalDurationSeconds: 24,
  brand: {show: false}, aiLabel: {show: false},
  slides: [
    {kind: 'title', text: '图片 + 图解\n混排演示', body: '真实照片 + 手绘点群'},
    {kind: 'image', text: '这是一张真实照片', asset: {src: 'courseware/demo/image-mix/photo.png', width: 1600, height: 1400}, kenBurns: true},
    {kind: 'diagram', layout: 'D01', title: '不同方案挤在不同区域', caption: '点群把相似的结果放在一起。', data: DEFINITIONS.D01.data},
    {kind: 'quote', text: '照片和图解\n可以放一起', body: '一个视频里，两种表达'},
  ].map((s, i) => ({...s, id: 'scene-' + i, fromFrame: i * 180, durationInFrames: 180}))
});

registerRoot(() => <Composition id="ImageMixDemo" component={Courseware} defaultProps={demoProject} durationInFrames={720} fps={30} width={1080} height={1920} />);
