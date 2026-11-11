import React, {useLayoutEffect, useRef} from 'react';
import {cancelRender, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {activeSubtitle, subtitleCues, videoTiming} from './model';
import type {ResolvedProps, Rect} from './model';

function check(condition: unknown, message: string): asserts condition {if (!condition) throw new Error(`Courseware audit: ${message}`);}
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;

/** Optional read-only DOM audit: no effect on the rendered frame. */
export const LayoutAudit: React.FC<{project: ResolvedProps; cover?: boolean}> = ({project, cover = false}) => {
  const ref = useRef<HTMLDivElement>(null); const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const handle = delayRender('Courseware safe-area / geometry audit'); let disposed = false;
    void (async () => {
      await document.fonts.ready;
      check(document.fonts.check('36px "LXGW WenKai"') && document.fonts.check('36px "ZCOOL KuaiLe"'), 'local fonts not loaded');
      const root = ref.current?.closest<HTMLElement>('[data-cw-root]'); check(root, 'root missing');
      const active = cover ? undefined : project.slides.find(s => frame >= s.fromFrame && frame < s.fromFrame + s.durationInFrames);
      const slideId = cover ? 'cover' : active?.id; check(slideId, 'active frozen slide missing');
      const page = Array.from(root.querySelectorAll<HTMLElement>('[data-cw-page]')).find(p => p.dataset.slideId === slideId); check(page, 'page missing');
      await Promise.all(Array.from(page.querySelectorAll('img')).map(async img => {await img.decode();}));
      if (disposed) return;
      const r0 = root.getBoundingClientRect(); const scale = r0.width / 1080;
      const rect = (el: Element): Rect => {const r = el.getBoundingClientRect(); return {x: (r.left - r0.left) / scale, y: (r.top - r0.top) / scale, w: r.width / scale, h: r.height / scale};};
      const inside = (r: Rect) => r.x >= 107.5 && r.y >= 191.5 && r.x + r.w <= 972.5 && r.y + r.h <= 1728.5;
      // Sliding geometry can extend outside the canvas, but its painted output is
      // clipped to the safe area. Normal/final frames still use the strict checks.
      const transition = page.closest<HTMLElement>('[data-cw-transition]');
      const transient = Boolean(transition && Number(transition.dataset.transitionProgress) < 1);
      if (transient) check(getComputedStyle(transition!).clipPath === 'inset(192px 108px)', 'transition safe-area clip missing');
      const visible = (el: HTMLElement) => {for (let p: HTMLElement | null = el; p && p !== page; p = p.parentElement) if (getComputedStyle(p).visibility === 'hidden') return false; return true;};
      for (const el of Array.from(page.querySelectorAll<HTMLElement>('[data-cw-content]')).filter(visible)) if (!transient) check(inside(rect(el)), `outside middle 80%: ${el.textContent} ${JSON.stringify(rect(el))}`);
      const text = Array.from(page.querySelectorAll<HTMLElement>('[data-cw-text]')).filter(visible);
      const brand = page.querySelector<HTMLElement>('[data-cw-text="brand"]');
      check(Boolean(brand) === (project.brand?.show ?? true), 'brand.show differs from rendered chrome');
      if (brand) check(brand.textContent === (project.brand?.text ?? '固定地址'), 'brand.text differs from rendered chrome');
      const aiLabel = root.querySelector<HTMLElement>('[data-cw-ai-label]');
      check(Boolean(aiLabel) === (project.aiLabel?.show ?? true), 'aiLabel.show differs from rendered disclosure');
      if (aiLabel) {
        check(aiLabel.textContent === (project.aiLabel?.text ?? 'AI 生成'), 'aiLabel.text differs from rendered disclosure');
        check(visible(aiLabel) && Number(getComputedStyle(aiLabel).opacity) >= .8, 'AI disclosure hidden by effects');
        text.push(aiLabel);
      }
      const caption = root.querySelector<HTMLElement>('.cw-subtitles > div > div'); if (caption) text.push(caption);
      const measured = text.map(el => {
        const style = getComputedStyle(el); const fontSize = Number.parseFloat(style.fontSize); const role = el.dataset.cwText ?? 'caption';
        const minimum = role === 'node' ? 36 : role === 'brand' || role === 'note' ? 28 : 24;
        check(fontSize >= minimum, `${role} font ${fontSize} < ${minimum}`);
        if (!transient || role === 'caption') check(inside(rect(el)), `text outside safe area: ${el.textContent}`);
        check(el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1, `clipped text: ${el.textContent}`);
        const range = document.createRange(); range.selectNodeContents(el);
        const lines: number[] = [];
        for (const r of Array.from(range.getClientRects())) if (r.width > 0 && !lines.some(y => Math.abs(y - r.top) < 1)) lines.push(r.top);
        const maxLines = role === 'heading' || role === 'caption' ? 3 : role === 'brand' || role === 'cta' || role === 'aiLabel' ? 1 : 2;
        check(lines.length <= maxLines, `${role} exceeds ${maxLines} lines: ${el.textContent}`);
        check(!/^(背景|证据|反例|金句|结构对照|CONTEXT|第[一二三四五六\d]+页|0[1-6])$/i.test(el.textContent?.trim() ?? ''), 'internal label visible');
        return {text: el.textContent, role, fontSize, lines: lines.length, ...rect(el)};
      });
      for (let i = 0; i < measured.length; i++) for (let j = i + 1; j < measured.length; j++) check(!overlaps(measured[i], measured[j]), `text overlaps: ${measured[i].text} / ${measured[j].text}`);
      const nodeElements = Array.from(page.querySelectorAll<HTMLElement>('[data-cw-node]'));
      const nodes = nodeElements.map(el => {const box = rect(el); check(box.w >= 560, 'flow node width < 560'); return {id: el.dataset.cwNode, ...box};});
      for (const path of Array.from(page.querySelectorAll<SVGPathElement>('[data-cw-edge]'))) {
        const matrix = path.getScreenCTM(); check(matrix, 'edge transform missing'); const length = path.getTotalLength();
        for (let i = 0; i <= 80; i++) {
          const p = path.getPointAtLength(length * i / 80); const screen = new DOMPoint(p.x, p.y).matrixTransform(matrix);
          const x = (screen.x - r0.left) / scale; const y = (screen.y - r0.top) / scale;
          if (!transient) check(x >= 108 && x <= 972 && y >= 192 && y <= 1728, 'edge outside safe area');
          check(!nodes.some(n => x > n.x + 1 && x < n.x + n.w - 1 && y > n.y + 1 && y < n.y + n.h - 1), 'edge crosses node/text');
        }
      }
      let highlightErrorPx: number | undefined;
      const shot = page.querySelector<HTMLElement>('[data-cw-shot]');
      if (shot) {
        const img = shot.querySelector('img'); check(img, 'screenshot img missing');
        check(img.naturalWidth === Number(shot.dataset.sourceWidth) && img.naturalHeight === Number(shot.dataset.sourceHeight), 'asset dimensions differ from real image');
        check(getComputedStyle(img).objectFit === 'contain', 'screenshot is not contain');
        const gold = img.parentElement?.querySelector<HTMLElement>(':scope > div:last-child'); check(gold, 'spotlight frame missing');
        const imageBox = rect(img); const sourceRect = JSON.parse(shot.dataset.highlight!) as Rect;
        // Independently derive expected bounds from the actual DOM image and intrinsic dimensions.
        const fit = Math.min(imageBox.w / img.naturalWidth, imageBox.h / img.naturalHeight);
        const width = img.naturalWidth * fit; const height = img.naturalHeight * fit;
        const anchor = shot.querySelector('[data-cw-target-anchor]');
        const expected = anchor ? rect(anchor) : {x: imageBox.x + (imageBox.w - width) / 2 + sourceRect.x * width, y: imageBox.y + (imageBox.h - height) / 2 + sourceRect.y * height, w: sourceRect.w * width, h: sourceRect.h * height};
        const actual = rect(gold);
        highlightErrorPx = Math.max(Math.abs(expected.x - actual.x), Math.abs(expected.y - actual.y), Math.abs(expected.x + expected.w - actual.x - actual.w), Math.abs(expected.y + expected.h - actual.y - actual.h));
        check(highlightErrorPx <= 2, `highlight error ${highlightErrorPx}px`);
      }
      let videoState: {fit: string; muted: boolean; currentTime: number; expectedTime: number; duration: number; width: number; height: number} | undefined;
      if (active?.kind === 'video') {
        const viewport = page.querySelector<HTMLElement>('[data-cw-video-viewport]');
        check(viewport, 'video viewport missing');
        check(getComputedStyle(viewport).overflow === 'hidden', 'video camera is not clipped to safe viewport');
        // Untrimmed <Video loop> replaces its initial tag once metadata supplies
        // the loop length. Re-query until the current, connected tag is stable.
        let video: HTMLVideoElement | null = null, previous: HTMLVideoElement | null = null, stable = 0, expectedTime = 0;
        for (let i = 0; i < 200; i++) {
          if (disposed) return;
          video = viewport.querySelector('video');
          if (video && video.isConnected && video.readyState >= 2 && Number.isFinite(video.duration)) {
            const timing = videoTiming(active, project.canvas.fps, video.duration);
            expectedTime = (timing.startFrame + (frame - active.fromFrame) % timing.loopFrames!) / project.canvas.fps;
            const settled = !video.seeking && Math.abs(video.currentTime - expectedTime) <= 1 / project.canvas.fps + .001 && getComputedStyle(video).objectFit === (active.fit ?? 'contain');
            stable = settled && video === previous ? stable + 1 : 0;
            if (stable >= 1) break;
          }
          previous = video; await new Promise(resolve => setTimeout(resolve, 25));
        }
        check(video && video.isConnected && video.readyState >= 2 && stable >= 1, 'video frame/player not settled');
        check(video.videoWidth === active.asset!.width && video.videoHeight === active.asset!.height, 'video asset dimensions differ from metadata');
        check(!video.seeking && Math.abs(video.currentTime - expectedTime) <= 1 / project.canvas.fps + .001, `video seek differs: ${video.currentTime} / ${expectedTime}`);
        check(video.muted === (active.muted ?? true), 'video muted differs from resolved props');
        const fit = getComputedStyle(video).objectFit; check(fit === (active.fit ?? 'contain'), 'video objectFit differs from resolved props');
        videoState = {fit, muted: video.muted, currentTime: video.currentTime, expectedTime, duration: video.duration, width: video.videoWidth, height: video.videoHeight};
      }
      const cta = page.querySelector<HTMLElement>('[data-cw-text="cta"]');
      if (!cover && active?.id === project.slides[project.slides.length - 1].id) check(cta?.textContent === '有问题，评论区问', 'last-page CTA missing');
      const cue = cover ? undefined : activeSubtitle(subtitleCues(project), frame, project.canvas.fps);
      if (!cover) check(root.querySelector('.cw-subtitles')?.getAttribute('data-cue-id') === (cue?.id ?? ''), 'active caption differs from frozen cues');
      console.log(`COURSEWARE_AUDIT=${JSON.stringify({frame, slideId, kind: cover ? 'cover' : active?.kind, style: project.style, issueCount: 0, transient, highlightErrorPx, video: videoState, nodes, text: measured, cueId: cue?.id ?? '', edgeCount: page.querySelectorAll('[data-cw-edge]').length, cameraScale: page.querySelector('[data-cw-camera]')?.getAttribute('data-cw-zoom-scale') ?? page.querySelector('[data-cw-video-camera]')?.getAttribute('data-cw-video-scale'), effects: Array.from(page.querySelectorAll<HTMLElement>('[data-effect]')).map(el => ({type: el.dataset.effect, opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform}))})}`);
    })().then(() => continueRender(handle), e => {if (!disposed) cancelRender(e);}).catch(cancelRender);
    return () => {disposed = true; continueRender(handle);};
  }, [frame, project, cover]);
  return <div ref={ref} style={{position: 'absolute', pointerEvents: 'none'}}/>;
};
