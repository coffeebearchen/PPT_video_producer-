import {parseDiagram,type DiagramSpec} from './doodle/catalog';
import type {Subtitle} from '../types';
import type {CoursewareStyle} from './styles';

export type Rect = {x: number; y: number; w: number; h: number};
export type Cue = {startSeconds: number; endSeconds: number; text: string};
export type Asset = {src: string; width: number; height: number};
export type Node = {id: string; label: string};
export type Edge = {from: string; to: string};
export type AnnotationKind = 'arrow' | 'circle' | 'highlight' | 'underline' | 'bubble';
export type ZoomStep = {at: number; scale: number};
export type ZoomMotion = {type: 'zoom'; steps: ZoomStep[]};
export type CameraPoint = {at: number; x: number; y: number; scale: number};
export type PanMotion = {type: 'pan'; from: {x: number; y: number}; to: {x: number; y: number}; steps?: CameraPoint[]};
export type FollowMotion = {type: 'follow'; points: CameraPoint[]};
export type MotionEffect = ZoomMotion | PanMotion | FollowMotion;
export type Hook = {text: string; durationMs: number};
export type ProgressEffect = boolean | {style: 'bottom'};
export type DisplayLabel = {text: string; show: boolean};
export const DEFAULT_BRAND: Readonly<DisplayLabel> = {text: '固定地址', show: true};
export const DEFAULT_AI_LABEL: Readonly<DisplayLabel> = {text: 'AI 生成', show: true};
export type SlideEffects = {
  motion?: MotionEffect | false;
  reveal?: {type: 'stagger' | 'typewriter' | 'fade'; staggerMs?: number; from?: 'title' | 'body' | 'all'; by?: 'line' | 'char'; speedMs?: number; durationMs?: number};
  annotationAnim?: {type: 'draw' | 'arrow' | 'bubblePop'; durationMs: number};
  emphasis?: {type: 'pulse' | 'magnifier'; amount?: number; times?: number; radius?: number; zoom?: number};
  transition?: {type: 'fade' | 'slide' | 'push' | 'wipe'; durationMs: number; direction: 'left' | 'right' | 'up' | 'down'};
  progress?: ProgressEffect; texture?: {type: 'grain' | 'gradient' | 'lightSweep'; opacity?: number};
  hook?: Hook; chapter?: {label: string}; tilt?: {deg: number};
};
export type Slide = {
  id: string; kind: 'title' | 'screenshot' | 'video' | 'flow' | 'bullet' | 'quote' | 'diagram';
  layout?: DiagramSpec['layout']; data?: DiagramSpec['data'];
  text: string; body?: string; caption?: string; fromFrame: number; durationInFrames: number;
  narration?: {src: string; durationSeconds: number}; cues?: Cue[];
  asset?: Asset; highlight?: Rect; annotation?: AnnotationKind; dim?: number;
  motion?: ZoomMotion;
  effects?: SlideEffects;
  nodes?: Node[]; edges?: Edge[]; bullets?: string[];
  trim?: {startSeconds: number; endSeconds: number}; muted?: boolean; fit?: 'contain' | 'cover';
};
export type ResolvedProps = {
  schemaVersion: 'courseware/1'; taskId: string; renderId: string; draftRevision: number;
  title: string; style: CoursewareStyle; canvas: {width: number; height: number; fps: number};
  publicRoot: string; stagingDir: string; totalFrames: number; totalDurationSeconds: number;
  slides: Slide[]; audit?: boolean;
  bgm?: {src: string; volume: number; fadeInMs: number; fadeOutMs: number};
  sfx?: {at: number; src: string; volume: number}[]; hook?: Hook; progress?: ProgressEffect;
  brand?: Partial<DisplayLabel>; aiLabel?: Partial<DisplayLabel>;
};

const error = (message: string): never => {throw new Error(`Courseware: ${message}`);};
function ensure(condition: unknown, message: string): asserts condition {if (!condition) error(message);}
const record = (v: unknown): Record<string, unknown> => {ensure(v && typeof v === 'object' && !Array.isArray(v), '须为对象'); return v as Record<string, unknown>;};
const num = (v: unknown, name: string, min: number, max: number, integer = false): number => {ensure(typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v)), `${name} 不合法`); return v;};
const label = (v: unknown, name: string, max: number): string => {
  ensure(typeof v === 'string' && v.trim() && Array.from(v).length <= max, `${name} 必填且最多 ${max} 字`);
  ensure(!/^(背景|证据|反例|金句|结构对照|CONTEXT|第[一二三四五六\d]+页|0[1-6])$/i.test(v.trim()), `${name} 不得显示内部结构标签`);
  return v;
};
const id = (v: unknown): string => {ensure(typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v), 'id 不合法'); return v;};
function displayLabel(value: unknown, name: string, defaults: Readonly<DisplayLabel>, max: number): DisplayLabel {
  const raw = value === undefined ? {} : record(value);
  for (const key of Object.keys(raw)) ensure(key === 'text' || key === 'show', `未知 ${name}.${key}；仅支持 text/show`);
  ensure(raw.show === undefined || typeof raw.show === 'boolean', `${name}.show 须为布尔值`);
  ensure(raw.text === undefined || typeof raw.text === 'string', `${name}.text 须为字符串`);
  const text = (raw.text as string | undefined)?.trim() || defaults.text;
  ensure(!/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text), `${name}.text 须为单行文字`);
  return {text: label(text, `${name}.text`, max), show: raw.show === undefined ? defaults.show : raw.show as boolean};
}
export function publicPath(v: unknown, stagingDir: string): string {
  ensure(typeof v === 'string' && v.startsWith(`${stagingDir}/`) && /^[a-zA-Z0-9_\-/\u4e00-\u9fff. ]+$/.test(v) && v.split('/').every(p => p && p !== '.' && p !== '..'), '素材须为本次 staging 的 public 根相对路径');
  return v;
}
export function validateResolved(input: unknown): ResolvedProps {
  const b = record(input);
  ensure(b.schemaVersion === 'courseware/1', 'schemaVersion 须为 courseware/1');
  const taskId = id(b.taskId); const renderId = id(b.renderId);
  const stagingDir = `courseware/${taskId}/${renderId}`;
  ensure(b.stagingDir === stagingDir, 'stagingDir 与 taskId/renderId 不符');
  ensure(b.publicRoot === 'renderer/public', '本入口使用默认 renderer/public；不接受任意 publicRoot');
  ensure(['industrial', 'clean', 'dynamic', 'dynamicflow'].includes(String(b.style)), 'style 不支持');
  const canvas = record(b.canvas);
  ensure(canvas.width === 1080 && canvas.height === 1920 && canvas.fps === 30, '画布须为 1080×1920 / 30fps');
  const fps = 30;
  const totalFrames = num(b.totalFrames, 'totalFrames', 1, 108000, true);
  const totalDurationSeconds = num(b.totalDurationSeconds, 'totalDurationSeconds', 0, 3600);
  // The DSH fixture serializes duration to milliseconds; integer frame count is authoritative.
  ensure(Math.abs(totalDurationSeconds - totalFrames / fps) <= 0.000501, '总秒数与冻结总帧数不符（仅允许毫秒舍入）');
  ensure(Array.isArray(b.slides) && b.slides.length >= 1 && b.slides.length <= 30, 'slides 须含 1–30 页');
  const slideIds = new Set<string>(); let next = 0;
  const slides: Slide[] = b.slides.map(raw => {
    const s = record(raw); const slideId = id(s.id);
    ensure(!slideIds.has(slideId), 'slide.id 重复'); slideIds.add(slideId);
    ensure(['title', 'screenshot', 'video', 'flow', 'bullet', 'quote', 'diagram'].includes(String(s.kind)), 'kind 不支持');
    const fromFrame = num(s.fromFrame, 'fromFrame', 0, totalFrames - 1, true);
    const durationInFrames = num(s.durationInFrames, 'durationInFrames', 1, totalFrames, true);
    ensure(fromFrame === next, '页面必须按冻结帧无缝相接'); next += durationInFrames;
    const copy = s.text ?? (s.kind === 'diagram' ? s.title : undefined);
    const title = copy === undefined && s.kind !== 'title' && s.kind !== 'quote' && s.kind !== 'diagram' ? '' : label(copy, 'text', 40);
    ensure(title.split('\n').length <= 3, '标题最多三行');
    const slide: Slide = {id: slideId, kind: s.kind as Slide['kind'], text: title, fromFrame, durationInFrames};
    if (s.body !== undefined) {slide.body = label(s.body, 'body', s.kind === 'title' || s.kind === 'quote' ? 80 : 40); ensure(slide.body.split('\n').length <= 2, 'body 最多两行');}
    if (s.caption !== undefined && s.caption !== '') slide.caption = label(s.caption, 'caption', 180);
    if (s.narration !== undefined) {
      const n = record(s.narration);
      const durationSeconds = num(n.durationSeconds, 'narration.durationSeconds', 0.001, 3600);
      ensure(Math.ceil(durationSeconds * fps - 1e-8) <= durationInFrames, '页面会截断配音');
      ensure(slide.caption, '有旁白时须携带 caption');
      slide.narration = {src: publicPath(n.src, stagingDir), durationSeconds};
    }
    if (s.cues !== undefined) {
      ensure(Array.isArray(s.cues) && s.cues.length <= 100, 'cues 不合法'); let previousEnd = 0;
      slide.cues = s.cues.map(rawCue => {
        const c = record(rawCue);
        const startSeconds = num(c.startSeconds, 'cue.startSeconds', 0, durationInFrames / fps);
        const endSeconds = num(c.endSeconds, 'cue.endSeconds', 0, durationInFrames / fps);
        ensure(startSeconds >= previousEnd - 1e-8 && endSeconds > startSeconds, 'cues 重叠或顺序不合法');
        previousEnd = endSeconds;
        return {startSeconds, endSeconds, text: label(c.text, 'cue.text', 180)};
      });
    }
    if (s.kind === 'screenshot' || s.kind === 'video') {
      const a = record(s.asset);
      slide.asset = {src: publicPath(a.src, stagingDir), width: num(a.width, 'asset.width', 1, 20000, true), height: num(a.height, 'asset.height', 1, 20000, true)};
    }
    if (s.kind === 'video') {
      ensure(/\.(mp4|webm|m4v|mov)$/i.test(slide.asset!.src), 'video.asset.src 须为本地 mp4/webm/m4v/mov 文件');
      ensure(s.muted === undefined || typeof s.muted === 'boolean', 'video.muted 须为布尔值');
      ensure(s.fit === undefined || s.fit === 'contain' || s.fit === 'cover', 'video.fit 须为 contain/cover');
      slide.muted = s.muted === undefined ? true : s.muted; slide.fit = s.fit ?? 'contain';
      if (s.trim !== undefined) {
        const trim = record(s.trim);
        for (const key of Object.keys(trim)) ensure(key === 'startSeconds' || key === 'endSeconds', `未知 trim.${key}`);
        slide.trim = {startSeconds: num(trim.startSeconds, 'trim.startSeconds', 0, 3600), endSeconds: num(trim.endSeconds, 'trim.endSeconds', 0, 3600)};
        ensure(slide.trim.endSeconds > slide.trim.startSeconds, 'trim.endSeconds 须大于 startSeconds');
        videoTiming(slide, fps);
      }
      ensure(s.highlight === undefined && s.annotation === undefined, '视频页暂不支持截图标注；请用 effects.motion 取景');
    }
    if (s.kind === 'screenshot') {
      if (s.highlight !== undefined && s.highlight !== null) {
        const h = record(s.highlight);
        const r = {x: num(h.x, 'highlight.x', 0, 1), y: num(h.y, 'highlight.y', 0, 1), w: num(h.w, 'highlight.w', 0.000001, 1), h: num(h.h, 'highlight.h', 0.000001, 1)};
        ensure(r.x + r.w <= 1.0000001 && r.y + r.h <= 1.0000001, 'highlight 超出源图');
        ensure(h.space === undefined || h.space === 'asset-normalized', 'highlight.space 不支持');
        slide.highlight = r;
      }
      slide.dim = num(s.dim ?? 0.35, 'dim', 0, 1);
      if (s.annotation !== undefined) {ensure(['arrow', 'circle', 'highlight', 'underline', 'bubble'].includes(String(s.annotation)), 'annotation 不支持'); slide.annotation = s.annotation as AnnotationKind;}
    }
    if (s.motion !== undefined) {ensure(s.kind === 'screenshot', 'zoom 仅适用于截图页'); slide.motion = validateZoomMotion(s.motion);}
    if (s.kind === 'flow') {
      ensure(Array.isArray(s.nodes) && s.nodes.length >= 2 && s.nodes.length <= 4, 'flow 须为 2–4 节点');
      const nodeIds = new Set<string>();
      slide.nodes = s.nodes.map(rawNode => {const n = record(rawNode); const nid = id(n.id); ensure(!nodeIds.has(nid), 'node.id 重复'); nodeIds.add(nid); return {id: nid, label: label(n.label, 'node.label', 24)};});
      ensure(Array.isArray(s.edges) && s.edges.length <= 12, 'flow 须携带冻结 edges'); const seen = new Set<string>();
      slide.edges = s.edges.map(rawEdge => {const e = record(rawEdge); const from = id(e.from); const to = id(e.to); const key = `${from}/${to}`; ensure(from !== to && nodeIds.has(from) && nodeIds.has(to) && !seen.has(key), 'edges 自环、重复或悬空'); seen.add(key); return {from, to};});
    }
    if (s.kind === 'diagram') {const diagram = parseDiagram(s.layout,s.data);slide.layout=diagram.layout;slide.data=diagram.data;}
    if (s.kind === 'bullet') {ensure(Array.isArray(s.bullets) && s.bullets.length >= 1 && s.bullets.length <= 5, 'bullets 须为 1–5 条'); slide.bullets = s.bullets.map(v => label(v, 'bullet', 32));}
    if (s.effects !== undefined) slide.effects = validateEffects(s.effects, slide);
    return slide;
  });
  ensure(next === totalFrames, '最后一页末尾与 totalFrames 不符');
  const result: ResolvedProps = {schemaVersion: 'courseware/1', taskId, renderId, draftRevision: num(b.draftRevision, 'draftRevision', 0, 1e9, true), title: label(b.title, 'title', 40), style: b.style as CoursewareStyle, canvas: {width: 1080, height: 1920, fps}, publicRoot: 'renderer/public', stagingDir, totalFrames, totalDurationSeconds, slides, audit: b.audit === true};
  result.brand = displayLabel(b.brand, 'brand', DEFAULT_BRAND, 30);
  result.aiLabel = displayLabel(b.aiLabel, 'aiLabel', DEFAULT_AI_LABEL, 16);
  if (b.progress !== undefined) result.progress = validateProgress(b.progress);
  if (b.hook !== undefined) result.hook = validateHook(b.hook);
  if (b.bgm !== undefined) {const a = record(b.bgm); result.bgm = {src: effectAudioPath(a.src), volume: num(a.volume ?? .18, 'bgm.volume', 0, 1), fadeInMs: num(a.fadeInMs ?? 800, 'bgm.fadeInMs', 0, 60000), fadeOutMs: num(a.fadeOutMs ?? 800, 'bgm.fadeOutMs', 0, 60000)};}
  if (b.sfx !== undefined) {ensure(Array.isArray(b.sfx) && b.sfx.length <= 32, 'sfx 最多 32 个'); result.sfx = b.sfx.map(v => {const a = record(v); return {at: num(a.at, 'sfx.at 秒', 0, (totalFrames - 1) / fps), src: effectAudioPath(a.src), volume: num(a.volume ?? .5, 'sfx.volume', 0, 1)};});}
  return result;
}

export function containTarget(r: Rect, width: number, height: number, boxW = 984, boxH = 980): Rect {
  const scale = Math.min(boxW / width, boxH / height); const w = width * scale; const h = height * scale;
  return {x: (boxW - w) / 2 + r.x * w, y: (boxH - h) / 2 + r.y * h, w: r.w * w, h: r.h * h};
}
/** Video trim is quantized once at composition fps; end is exclusive. */
export function videoTiming(slide: Slide, fps: number, durationSeconds?: number) {
  const startFrame = Math.round((slide.trim?.startSeconds ?? 0) * fps);
  const durationFrames = slide.trim ? Math.round(slide.trim.endSeconds * fps) - startFrame : undefined;
  ensure(durationFrames === undefined || durationFrames > 0, 'trim 在当前帧率下须至少保留一帧');
  if (durationSeconds !== undefined) {
    ensure(Number.isFinite(durationSeconds) && durationSeconds > 0, '视频无法读取有效时长');
    if (slide.trim) ensure(slide.trim.startSeconds < durationSeconds && slide.trim.endSeconds <= durationSeconds + 0.000001, 'trim 超出真实视频时长');
  }
  return {startFrame, durationFrames, loopFrames: durationFrames ?? (durationSeconds === undefined ? undefined : durationSeconds * fps)};
}
/** Explicit video cameras only: unlike screenshots, video does not auto-zoom. */
export function videoCamera(slide: Slide, localFrame: number) {
  const identity = {scale: 1, originX: 492, originY: 490, translateX: 0, translateY: 0};
  const m = slide.effects?.motion; if (!m) return identity;
  const at = Math.max(0, Math.min(1, localFrame / Math.max(1, slide.durationInFrames - 1)));
  if (m.type === 'zoom') {
    const right = Math.max(1, m.steps.findIndex(p => p.at >= at)); const a = m.steps[right - 1], b = m.steps[right];
    const t = (at - a.at) / (b.at - a.at), p = t * t * (3 - 2 * t);
    return {...identity, scale: a.scale + (b.scale - a.scale) * p};
  }
  const p = cameraPoint(m, at), asset = slide.asset!;
  const factor = (slide.fit === 'cover' ? Math.max : Math.min)(984 / asset.width, 980 / asset.height);
  const w = asset.width * factor, h = asset.height * factor;
  const x = (984 - w) / 2 + p.x * w, y = (980 - h) / 2 + p.y * h;
  return {scale: p.scale, originX: 0, originY: 0, translateX: 492 - x * p.scale, translateY: 490 - y * p.scale};
}
export const DEFAULT_ZOOM_STEPS: readonly ZoomStep[] = [
  {at: 0, scale: 1}, {at: 0.25, scale: 1}, {at: 0.45, scale: 2.6},
  {at: 0.8, scale: 2.6}, {at: 1, scale: 2.6},
];
export function validateZoomMotion(input: unknown): ZoomMotion {
  const motion = record(input); ensure(motion.type === 'zoom', 'motion.type 须为 zoom');
  const raw = motion.steps ?? DEFAULT_ZOOM_STEPS;
  ensure(Array.isArray(raw) && raw.length >= 2 && raw.length <= 32, 'motion.steps 须含 2–32 个关键点');
  const steps = raw.map(value => {const step = record(value); return {at: num(step.at, 'motion.at', 0, 1), scale: num(step.scale, 'motion.scale', 1, 3)};});
  ensure(steps[0].at === 0 && steps[0].scale === 1 && steps[steps.length - 1].at === 1, '镜头须从 at=0/scale=1 开始，到 at=1 结束');
  let retreating = false;
  for (let i = 1; i < steps.length; i++) {
    ensure(steps[i].at > steps[i - 1].at, 'motion.at 须严格递增');
    const delta = steps[i].scale - steps[i - 1].scale;
    if (delta < 0) {ensure(steps[i - 1].at >= 0.8, '回退只能在页面后 20% 开始'); retreating = true;}
    if (delta > 0) ensure(!retreating, '一个截图页只允许一次推进，不能回退后再推进');
  }
  return {type: 'zoom', steps};
}
export function screenshotCamera(slide: Slide, localFrame: number) {
  const effectMotion = slide.effects?.motion;
  if (effectMotion === false) return {scale: 1, requestedScale: 1, maxScale: 1, originX: 492, originY: 490, translateX: 0, translateY: 0};
  if (effectMotion?.type === 'pan' || effectMotion?.type === 'follow') {
    const p = cameraPoint(effectMotion, localFrame / Math.max(1, slide.durationInFrames - 1));
    const a = slide.asset!; const fit = Math.min(984 / a.width, 980 / a.height); const w = a.width * fit; const h = a.height * fit;
    const x = (984 - w) / 2 + p.x * w; const y = (980 - h) / 2 + p.y * h;
    return {scale: p.scale, requestedScale: p.scale, maxScale: 3, originX: 0, originY: 0, translateX: 492 - x * p.scale, translateY: 490 - y * p.scale};
  }
  const target = slide.asset && slide.highlight ? containTarget(slide.highlight, slide.asset.width, slide.asset.height) : undefined;
  const originX = target ? target.x + target.w / 2 : 492;
  const originY = target ? target.y + target.h / 2 : 490;
  if (!target) return {scale: 1, requestedScale: 1, maxScale: 1, originX, originY, translateX: 0, translateY: 0};
  // Keep the complete highlighted region inside the fixed viewport, with 32px breathing room.
  const maxScale = Math.max(1, Math.min(3, (984 - 64) / target.w, (980 - 64) / target.h));
  const steps = (effectMotion?.type === 'zoom' ? effectMotion.steps : undefined) ?? slide.motion?.steps ?? DEFAULT_ZOOM_STEPS;
  const at = Math.max(0, Math.min(1, localFrame / Math.max(1, slide.durationInFrames - 1)));
  const next = steps.findIndex(step => step.at >= at);
  const right = Math.max(1, next < 0 ? steps.length - 1 : next); const left = right - 1;
  const t = Math.max(0, Math.min(1, (at - steps[left].at) / (steps[right].at - steps[left].at)));
  const eased = t * t * (3 - 2 * t);
  const requestedScale = steps[left].scale + (steps[right].scale - steps[left].scale) * eased;
  // Clamp keyframes before interpolation so the push still ends at the authored time.
  const a = Math.min(maxScale, steps[left].scale); const b = Math.min(maxScale, steps[right].scale);
  const scale = a + (b - a) * eased;
  const peak = Math.min(maxScale, Math.max(...steps.map(step => step.scale)));
  const pan = peak > 1 ? Math.max(0, Math.min(1, (scale - 1) / (peak - 1))) : 0;
  return {scale, requestedScale, maxScale, originX, originY, translateX: (492 - originX) * pan, translateY: (490 - originY) * pan};
}
export function flowBoxes(count: number): Rect[] {
  const h = 136; const gap = 44; const total = count * h + (count - 1) * gap;
  return Array.from({length: count}, (_, i) => ({x: 180, y: 560 + (760 - total) / 2 + i * (h + gap), w: 720, h}));
}
export function flowEdgePath(a: Rect, b: Rect, index: number): string {
  if (b.y - a.y >= a.h + 12 && b.y - a.y <= a.h + 80) return `M${a.x + a.w / 2} ${a.y + a.h + 4} L${b.x + b.w / 2} ${b.y - 8}`;
  const x = 924 + 12 * (index % 3);
  return `M${a.x + a.w + 4} ${a.y + a.h / 2} H${x} V${b.y + b.h / 2} H${b.x + b.w + 8}`;
}
export function subtitleCues(project: ResolvedProps): Subtitle[] {
  return project.slides.flatMap(slide => {
    // An explicit empty cues array means captions off; only a missing array falls back.
    let cues = slide.cues;
    if (cues === undefined && slide.caption) {
      const parts = slide.caption.match(/[^。！？；，,!?;]+[。！？；，,!?;]?/g) ?? [slide.caption];
      const duration = slide.narration?.durationSeconds ?? slide.durationInFrames / project.canvas.fps;
      const length = parts.reduce((n, p) => n + p.length, 0); let at = 0;
      cues = parts.map(text => {const endSeconds = at + duration * text.length / length; const c = {startSeconds: at, endSeconds, text}; at = endSeconds; return c;});
    }
    return (cues ?? []).map((c, i) => ({id: `${slide.id}-${i}`, startMs: slide.fromFrame / project.canvas.fps * 1000 + c.startSeconds * 1000, endMs: slide.fromFrame / project.canvas.fps * 1000 + c.endSeconds * 1000, text: c.text, highlightKeywords: []}));
  });
}
export function activeSubtitle(cues: Subtitle[], frame: number, fps: number): Subtitle | undefined {
  const ms = frame / fps * 1000;
  return cues.find(c => ms >= c.startMs && ms < c.endMs);
}

function effectAudioPath(value: unknown): string {
  ensure(typeof value === 'string' && /^[a-zA-Z0-9_\-/\u4e00-\u9fff. ]+\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i.test(value) && !value.startsWith('/') && value.split('/').every(p => p && p !== '.' && p !== '..'), '音效/音乐须为 public 根下的本地音频相对路径'); return value;
}
function validateProgress(value: unknown): ProgressEffect {
  if (typeof value === 'boolean') return value;
  const p = record(value); ensure((p.style ?? 'bottom') === 'bottom', 'progress.style 仅支持 bottom'); return {style: 'bottom'};
}
function validateHook(value: unknown): Hook {const h = record(value); return {text: label(h.text, 'hook.text', 32), durationMs: num(h.durationMs ?? 2000, 'hook.durationMs', 1, 60000)};}
function cameraPointList(value: unknown, zoom: boolean): CameraPoint[] {
  ensure(Array.isArray(value) && value.length >= 2 && value.length <= 12, '镜头 points/steps 须为 2–12 点');
  const points = value.map(v => {const p = record(v); return {at: num(p.at, 'camera.at', 0, 1), x: num(p.x, 'camera.x', 0, 1), y: num(p.y, 'camera.y', 0, 1), scale: zoom ? num(p.scale ?? 1, 'camera.scale', 1, 3) : 1};});
  ensure(points[0].at === 0 && points[points.length - 1].at === 1, '镜头点须包含 at=0 和 at=1');
  points.forEach((p, i) => ensure(i === 0 || p.at > points[i - 1].at, '镜头 at 须严格递增')); return points;
}
export function panPoints(motion: PanMotion): CameraPoint[] {return motion.steps ?? [{at: 0, ...motion.from, scale: 1}, {at: .2, ...motion.from, scale: 1}, {at: .55, ...motion.to, scale: 1}, {at: 1, ...motion.to, scale: 1}];}
export function cameraPoint(motion: PanMotion | FollowMotion, at: number): CameraPoint {
  const points = motion.type === 'pan' ? panPoints(motion) : motion.points;
  const right = Math.max(1, points.findIndex(p => p.at >= Math.min(1, at))); const i = right < 1 ? points.length - 1 : right;
  const a = points[i - 1], b = points[i]; const t = Math.max(0, Math.min(1, (at - a.at) / (b.at - a.at))); const p = t * t * (3 - 2 * t);
  return {at, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, scale: a.scale + (b.scale - a.scale) * p};
}
function validateEffects(input: unknown, slide: Slide): SlideEffects | undefined {
  const raw = record(input); const keys = ['motion', 'reveal', 'annotationAnim', 'emphasis', 'transition', 'progress', 'texture', 'hook', 'chapter', 'tilt'];
  for (const key of Object.keys(raw)) ensure(keys.includes(key), `未知 effects.${key}；bgm/sfx 应放根对象`);
  if (!Object.keys(raw).length) return undefined;
  const e: SlideEffects = {};
  if (raw.motion !== undefined) {
    if (raw.motion === false) e.motion = false;
    else {
      const m = record(raw.motion);
      if (m.type === 'zoom') {ensure(slide.kind === 'screenshot' || slide.kind === 'video', 'zoom 仅用于截图/视频'); e.motion = validateZoomMotion(m);}
      else if (m.type === 'pan') {ensure(['screenshot', 'video', 'flow'].includes(slide.kind), 'pan 用于截图/视频/流程'); const a = record(m.from), b = record(m.to); e.motion = {type: 'pan', from: {x: num(a.x, 'pan.from.x', 0, 1), y: num(a.y, 'pan.from.y', 0, 1)}, to: {x: num(b.x, 'pan.to.x', 0, 1), y: num(b.y, 'pan.to.y', 0, 1)}, ...(m.steps ? {steps: cameraPointList(m.steps, false)} : {})};}
      else {ensure(m.type === 'follow' && (slide.kind === 'screenshot' || slide.kind === 'video'), 'follow 仅用于截图/视频'); e.motion = {type: 'follow', points: cameraPointList(m.points, true)};}
    }
  }
  if (raw.reveal !== undefined) {
    const r = record(raw.reveal); ensure(['stagger', 'typewriter', 'fade'].includes(String(r.type)), 'reveal.type 不支持');
    if (r.type === 'stagger') {ensure(['title', 'body', 'all'].includes(String(r.from ?? 'all')), 'stagger.from 不支持'); if (r.from === 'title') ensure(slide.text, 'stagger.from=title 需要 text'); if (r.from === 'body') ensure(slide.body, 'stagger.from=body 需要 body'); e.reveal = {type: 'stagger', staggerMs: num(r.staggerMs ?? 120, 'staggerMs', 0, 5000), from: (r.from ?? 'all') as 'all'};}
    if (r.type === 'typewriter') {ensure(['title', 'quote', 'bullet', 'video'].includes(slide.kind), 'typewriter 只用于标题/金句/要点/视频标题'); ensure(['line', 'char'].includes(String(r.by ?? 'line')), 'typewriter.by 不支持'); e.reveal = {type: 'typewriter', by: (r.by ?? 'line') as 'line', speedMs: num(r.speedMs ?? 40, 'speedMs', 1, 5000)};}
    if (r.type === 'fade') e.reveal = {type: 'fade', durationMs: num(r.durationMs ?? 400, 'reveal.durationMs', 1, 60000)};
  }
  if (raw.annotationAnim !== undefined) {
    ensure(slide.kind === 'screenshot' && slide.highlight, 'annotationAnim 需要截图和 highlight'); const a = record(raw.annotationAnim);
    ensure(['draw', 'arrow', 'bubblePop'].includes(String(a.type)), 'annotationAnim.type 不支持');
    const expected = a.type === 'arrow' ? 'arrow' : a.type === 'bubblePop' ? 'bubble' : undefined;
    if (expected && !slide.annotation) slide.annotation = expected;
    ensure(expected ? slide.annotation === expected : ['circle', 'underline', 'highlight'].includes(slide.annotation ?? ''), 'annotation 与 annotationAnim 类型不匹配');
    e.annotationAnim = {type: a.type as 'draw', durationMs: num(a.durationMs ?? (a.type === 'draw' ? 600 : a.type === 'arrow' ? 500 : 300), 'annotationAnim.durationMs', 1, 60000)};
  }
  if (raw.emphasis !== undefined) {
    ensure(slide.kind === 'screenshot' && slide.highlight, 'emphasis 需要截图和 highlight'); const a = record(raw.emphasis);
    ensure(a.type === 'pulse' || a.type === 'magnifier', 'emphasis.type 不支持');
    e.emphasis = a.type === 'pulse' ? {type: 'pulse', amount: num(a.amount ?? .06, 'pulse.amount', 0, .12), times: num(a.times ?? 2, 'pulse.times', 1, 3, true)} : {type: 'magnifier', radius: num(a.radius ?? .18, 'magnifier.radius', .08, .25), zoom: num(a.zoom ?? 2, 'magnifier.zoom', 1.2, 3)};
  }
  if (raw.transition !== undefined) {const a = record(raw.transition); ensure(['fade', 'slide', 'push', 'wipe'].includes(String(a.type)), 'transition.type 不支持'); ensure(['left', 'right', 'up', 'down'].includes(String(a.direction ?? 'left')), 'transition.direction 不支持'); e.transition = {type: a.type as 'fade', direction: (a.direction ?? 'left') as 'left', durationMs: num(a.durationMs ?? (a.type === 'wipe' ? 500 : 400), 'transition.durationMs', 1, 60000)};}
  if (raw.texture !== undefined) {const a = record(raw.texture); ensure(['grain', 'gradient', 'lightSweep'].includes(String(a.type)), 'texture.type 不支持'); e.texture = {type: a.type as 'grain', ...(a.type === 'grain' ? {opacity: num(a.opacity ?? .035, 'grain.opacity', 0, .08)} : {})};}
  if (raw.progress !== undefined) e.progress = validateProgress(raw.progress);
  if (raw.hook !== undefined) {ensure(slide.fromFrame === 0, 'hook 只能放首页'); e.hook = validateHook(raw.hook);}
  if (raw.chapter !== undefined) {const a = record(raw.chapter); e.chapter = {label: label(a.label, 'chapter.label', 12)};}
  if (raw.tilt !== undefined) {ensure(['screenshot', 'video', 'flow', 'bullet'].includes(slide.kind), 'tilt 仅用于截图/视频/图解/卡片'); const a = record(raw.tilt); e.tilt = {deg: num(a.deg ?? 2, 'tilt.deg', -4, 4)};}
  return e;
}

export type EffectWindow = {start: number; end: number};
export type EffectPlan = {transition: EffectWindow; hook: EffectWindow; reveal: EffectWindow; annotation: EffectWindow; emphasis: EffectWindow; tilt: EffectWindow; sweep: EffectWindow; durationMs: number; elementCount: number};
export const effectUnit = (time: number, window: EffectWindow) => window.end <= window.start ? (time >= window.end ? 1 : 0) : Math.max(0, Math.min(1, (time - window.start) / (window.end - window.start)));
export function effectPlan(slide: Slide, fps: number, rootHook?: Hook): EffectPlan {
  const e = slide.effects; const durationMs = Math.max(0, (slide.durationInFrames - 1) / fps * 1000);
  const count = Math.max(1, Number(Boolean(slide.text)) + Number(Boolean(slide.body)) + (slide.nodes?.length ?? slide.bullets?.length ?? (slide.kind === 'screenshot' || slide.kind === 'video' ? 1 : 0)));
  const units = e?.reveal?.by === 'char' ? Array.from(slide.text + (slide.bullets ?? []).join('')).length : slide.text.split('\n').length + (slide.bullets?.length ?? 0);
  const reveal = e?.reveal ? e.reveal.type === 'stagger' ? 400 + (e.reveal.from === 'all' ? count - 1 : 0) * e.reveal.staggerMs! : e.reveal.type === 'typewriter' ? Math.max(1, units) * e.reveal.speedMs! : e.reveal.durationMs! : 0;
  const hook = e?.hook ?? rootHook;
  const requestedIntro = [e?.transition?.durationMs ?? 0, hook?.durationMs ?? 0, reveal];
  const requestedTail = [e?.annotationAnim?.durationMs ?? 0, e?.emphasis ? e.emphasis.type === 'pulse' ? e.emphasis.times! * 400 : 1200 : 0, e?.tilt ? 800 : 0, e?.texture?.type === 'lightSweep' ? 1200 : 0];
  const tailSum = requestedTail.reduce((a, b) => a + b, 0); const introSum = requestedIntro.reduce((a, b) => a + b, 0);
  const introScale = Math.min(1, (tailSum ? durationMs * .45 : durationMs) / Math.max(1, introSum)); let cursor = 0;
  const allocate = (length: number, factor: number) => {const w = {start: cursor, end: Math.min(durationMs, cursor + length * factor)}; cursor = w.end; return w;};
  const transition = allocate(requestedIntro[0], introScale), hookWindow = allocate(requestedIntro[1], introScale), revealWindow = allocate(requestedIntro[2], introScale);
  const m = e?.motion === false ? false : e?.motion ?? (slide.kind === 'screenshot' && slide.highlight ? slide.motion ?? {type: 'zoom' as const, steps: [...DEFAULT_ZOOM_STEPS]} : false);
  let settleAt = 0;
  if (m) {const points = m.type === 'zoom' ? m.steps : m.type === 'pan' ? panPoints(m) : m.points; for (let i = 1; i < points.length; i++) if (JSON.stringify({...points[i], at: 0}) !== JSON.stringify({...points[i - 1], at: 0})) settleAt = points[i].at;}
  if (settleAt <= .8) cursor = Math.max(cursor, settleAt * durationMs);
  const factor = Math.min(1, (durationMs - cursor) / Math.max(1, tailSum));
  const annotation = allocate(requestedTail[0], factor), emphasis = allocate(requestedTail[1], factor), tilt = allocate(requestedTail[2], factor), sweep = allocate(requestedTail[3], factor);
  return {transition, hook: hookWindow, reveal: revealWindow, annotation, emphasis, tilt, sweep, durationMs, elementCount: count};
}
export function effectTilt(slide: Slide, frame: number, fps: number, rootHook?: Hook): number {if (!slide.effects?.tilt) return 0; const p = effectUnit(frame / fps * 1000, effectPlan(slide, fps, rootHook).tilt); return slide.effects.tilt.deg * Math.sin(Math.PI * p);}
