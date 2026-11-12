import type {Slide} from '../model';

export const MOTION = {title: 400, outline: 500, label: 200, edge: 400, bullet: 400,
  stagger: 200, annotation: 600, dim: 200, camera: 800, hold: 1000} as const;
export const unit = (ms: number, start: number, duration: number) => Math.max(0, Math.min(1, (ms - start) / duration));
export const smooth = (p: number) => p * p * (3 - 2 * p);
export const easeOut = (p: number) => 1 - (1 - p) ** 3;

/** A single deterministic schedule. Short pages show finished content instead of speeding up. */
export function flowSchedule(slide: Slide) {
  let cursor = MOTION.title as number;
  const nodes = slide.nodes!.map(node => {
    const start = cursor;
    const edges = slide.edges!.filter(e => e.from === node.id);
    cursor += MOTION.outline + MOTION.label;
    const outgoing = edges.map(edge => {const at = cursor; cursor += MOTION.edge; return {edge, at};});
    return {id: node.id, start, outgoing};
  });
  return {nodes, end: cursor};
}
export function staticContent(slide: Slide, fps: number, finish: number) {
  return (slide.durationInFrames - 1) / fps * 1000 < finish + MOTION.hold;
}

/** Default screenshot camera settles in 800ms, before the 600ms annotation. */
export function screenshotSlide(slide: Slide, fps: number): Slide {
  const duration = Math.max(1, (slide.durationInFrames - 1) / fps * 1000);
  const instant = staticContent(slide, fps, MOTION.title + MOTION.camera + MOTION.annotation);
  const effects = {...slide.effects};
  if (effects.motion === undefined && !slide.motion) {
    effects.motion = instant || !slide.highlight ? false : {type: 'zoom', steps: [
      {at: 0, scale: 1}, {at: MOTION.title / duration, scale: 1},
      {at: (MOTION.title + MOTION.camera) / duration, scale: 1.35}, {at: 1, scale: 1.35},
    ]};
  }
  if (!effects.annotationAnim && slide.highlight && slide.annotation && !instant) {
    effects.annotationAnim = {type: slide.annotation === 'arrow' ? 'arrow' : slide.annotation === 'bubble' ? 'bubblePop' : 'draw', durationMs: MOTION.annotation};
  }
  if (instant) {effects.motion = false; delete effects.annotationAnim; delete effects.reveal; delete effects.emphasis; delete effects.tilt;}
  return {...slide, effects};
}
