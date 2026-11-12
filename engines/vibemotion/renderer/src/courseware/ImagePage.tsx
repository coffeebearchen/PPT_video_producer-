import React from 'react';
import {Img, cancelRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {revealValue} from './Effects';
import type {ResolvedProps, Slide} from './model';

/** Matches the screenshot page's painted media area; no browser chrome or overlays. */
export const IMAGE_VIEWPORT = {x: 146.4, y: 550, w: 787.2, h: 784} as const;
export function imageGeometry(slide: Slide, localFrame: number) {
  const asset = slide.asset!;
  const progress = Math.max(0, Math.min(1, localFrame / Math.max(1, slide.durationInFrames - 1)));
  const scale = slide.kenBurns && slide.durationInFrames > 1 ? 1 + .06 * progress : 1;
  // Reserve the final zoom extent so even the last frame shows every source pixel.
  const fit = Math.min(IMAGE_VIEWPORT.w / asset.width, IMAGE_VIEWPORT.h / asset.height) / (slide.kenBurns ? 1.06 : 1);
  return {width: asset.width * fit, height: asset.height * fit, scale};
}
export const CoursewareImage: React.FC<{slide: Slide; project: ResolvedProps}> = ({slide, project}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const geometry = imageGeometry(slide, frame);
  const hook = slide.fromFrame === 0 ? project.hook : undefined;
  const reveal = revealValue(slide, frame, fps, Number(Boolean(slide.text)) + Number(Boolean(slide.body)), 'element', hook);
  return <div data-cw-content data-cw-image-viewport style={{position: 'absolute', left: IMAGE_VIEWPORT.x, top: IMAGE_VIEWPORT.y, width: IMAGE_VIEWPORT.w, height: IMAGE_VIEWPORT.h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: reveal}}>
    <Img data-cw-image data-cw-image-scale={geometry.scale} src={staticFile(slide.asset!.src)}
      style={{width: geometry.width, height: geometry.height, objectFit: 'contain', objectPosition: 'center', display: 'block', flexShrink: 0, transform: `scale(${geometry.scale})`, transformOrigin: 'center'}}
      onLoad={event => {
        const image = event.currentTarget;
        if (image.naturalWidth !== slide.asset!.width || image.naturalHeight !== slide.asset!.height) cancelRender(new Error(`Courseware: image.asset 尺寸与实际照片不符 (${image.naturalWidth}×${image.naturalHeight})`));
      }}
      onError={() => cancelRender(new Error(`Courseware: 图片读取失败 ${slide.asset!.src}`))}/>
  </div>;
};
