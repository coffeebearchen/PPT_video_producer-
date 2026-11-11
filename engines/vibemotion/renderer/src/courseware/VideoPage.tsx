import React from 'react';
import {Video, cancelRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {styleTokens} from '../graphics/styles';
import {effectTilt, videoCamera, videoTiming} from './model';
import type {ResolvedProps, Slide} from './model';
import {revealValue} from './Effects';

/** A fixed safe viewport; camera changes affect this one media container. */
export const CoursewareVideo: React.FC<{slide: Slide; project: ResolvedProps; forceMuted?: boolean}> = ({slide, project, forceMuted = false}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig(); const t = styleTokens(project.style);
  const hook = slide.fromFrame === 0 ? project.hook : undefined;
  const camera = videoCamera(slide, frame), tilt = effectTilt(slide, frame, fps, hook);
  const reveal = revealValue(slide, frame, fps, Number(Boolean(slide.text)) + Number(Boolean(slide.body)), 'element', hook);
  const timing = videoTiming(slide, fps); const muted = forceMuted || (slide.muted ?? true);
  return <div data-cw-content data-cw-video-viewport data-cw-video-fit={slide.fit ?? 'contain'} style={{position: 'absolute', left: 146.4, top: 550, width: 984, height: 980, transform: `translateY(${8 * (1 - reveal)}px) scale(.8)`, opacity: reveal, transformOrigin: 'top left', overflow: 'hidden', borderRadius: t.radius, background: t.surface}}>
    <div data-cw-video-camera data-cw-video-scale={camera.scale} style={{position: 'absolute', inset: 0, width: 984, height: 980, transform: `translate(${camera.translateX}px, ${camera.translateY}px) scale(${camera.scale})${Math.abs(tilt) > .000001 ? ` perspective(1200px) rotateY(${tilt}deg)` : ''}`, transformOrigin: `${camera.originX}px ${camera.originY}px`}}>
      <Video src={staticFile(slide.asset!.src)} trimBefore={timing.startFrame} durationInFrames={timing.durationFrames} muted={muted} loop style={{width: 984, height: 980, objectFit: slide.fit ?? 'contain', objectPosition: '50% 50%', display: 'block'}}
        onLoadedMetadata={event => {
          try {
            const video = event.currentTarget; videoTiming(slide, fps, video.duration);
            if (video.videoWidth !== slide.asset!.width || video.videoHeight !== slide.asset!.height) throw new Error(`Courseware: video.asset 尺寸与实际视频不符 (${video.videoWidth}×${video.videoHeight})`);
          } catch (error) {cancelRender(error instanceof Error ? error : new Error(String(error)));}
        }}
        onError={error => cancelRender(new Error(`Courseware: 视频读取失败 ${slide.asset!.src}: ${error.message}`))}/>
    </div>
  </div>;
};
