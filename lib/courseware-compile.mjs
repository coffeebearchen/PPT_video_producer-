// 课件编译层：storyboard(courseware/1) + 素材 → resolved props（冻结渲染输入）
// 只做「解析 assetId、测真实音频、算时间轴、生成字幕 cues」，不渲染、不联网（TTS 除外）。
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { synthesizeSpeech } from './tts.mjs';

export const COURSEWARE_FPS = 30;
export const COURSEWARE_CANVAS = { width: 1080, height: 1920, fps: COURSEWARE_FPS };
export const COURSEWARE_STYLES = ['industrial', 'clean', 'dynamic', 'dynamicflow'];
export const COURSEWARE_KINDS = ['title', 'screenshot', 'video', 'image', 'flow', 'bullet', 'quote', 'diagram'];
const MAX_SLIDES = 30;
const ANNOTATIONS = ['arrow', 'circle', 'highlight', 'underline', 'bubble'];

export function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = Number(String(r.stdout || '').trim());
  if (!Number.isFinite(d) || d <= 0) throw new Error('无法读取音频时长：' + file);
  return d;
}

export function probeImage(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [w, h] = String(r.stdout || '').trim().split(',').map((v) => Number(v));
  if (!w || !h) throw new Error('无法读取图片尺寸：' + file);
  return { width: w, height: h };
}

const fail = (msg) => { throw new Error('课件生成校验失败：' + msg); };

// 句级字幕：按标点切句，按字数比例分配时长（相对页面起点，不重叠）。
export function buildCues(text, totalSeconds) {
  const parts = String(text || '').split(/(?<=[。！？；!?;])/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return [];
  const weights = parts.map((p) => p.length).filter((n) => n > 0);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  return parts.map((p, i) => {
    const dur = (weights[i] / sum) * totalSeconds;
    const cue = { startSeconds: Number(cursor.toFixed(3)), endSeconds: Number((cursor + dur).toFixed(3)), text: p };
    cursor += dur;
    return cue;
  });
}

export function validateStoryboard(storyboard) {
  if (!storyboard || typeof storyboard !== 'object') fail('storyboard 缺失');
  const title = String(storyboard.title || '').trim();
  if (!title) fail('缺少标题');
  const style = storyboard.style || 'industrial';
  if (!COURSEWARE_STYLES.includes(style)) fail(`style 须为 ${COURSEWARE_STYLES.join('/')}`);
  const slides = storyboard.slides;
  if (!Array.isArray(slides) || !slides.length) fail('slides 不能为空');
  if (slides.length > MAX_SLIDES) fail(`页数最多 ${MAX_SLIDES}`);
  const ids = new Set();
  slides.forEach((s, i) => {
    if (!s || typeof s !== 'object') fail(`第 ${i + 1} 页不是对象`);
    if (!COURSEWARE_KINDS.includes(s.kind)) fail(`第 ${i + 1} 页 kind 不合法`);
    if (!s.id) fail(`第 ${i + 1} 页缺 id`);
    if (ids.has(s.id)) fail(`id 重复：${s.id}`);
    ids.add(s.id);
    if (!String(s.text || '').trim()) fail(`第 ${i + 1} 页缺标题`);
    if (String(s.text || '').length > 40) fail(`第 ${i + 1} 页标题超过 40 字`);
    const nm = s.narration;
    if (nm && !['tts', 'import', 'none'].includes(nm.mode)) fail(`第 ${i + 1} 页 narration.mode 不合法`);
    if (nm && nm.mode === 'tts' && !String(nm.text || '').trim()) fail(`第 ${i + 1} 页 tts 缺 text`);
    if (nm && nm.mode === 'import' && !nm.audioId) fail(`第 ${i + 1} 页 import 缺 audioId`);
    if (s.kind === 'diagram') {
      if (!s.layout || typeof s.layout !== 'string') fail(`第 ${i + 1} 页图解缺 layout`);
      if (!s.data || typeof s.data !== 'object' || Array.isArray(s.data)) fail(`第 ${i + 1} 页图解缺 data`);
    }
    if (s.kind === 'screenshot' || s.kind === 'video' || s.kind === 'image') {
      if (!s.assetId) fail(`第 ${i + 1} 页${s.kind === 'video' ? '视频' : s.kind === 'image' ? '图片' : '截图'}缺 assetId`);
    }
    if (s.kind === 'screenshot') {
      if (!s.highlight || typeof s.highlight !== 'object') fail(`第 ${i + 1} 页截图缺 highlight`);
      const { x, y, w, h } = s.highlight;
      if (![x, y, w, h].every((n) => typeof n === 'number' && n >= 0 && n <= 1) || w <= 0 || h <= 0 || x + w > 1.000001 || y + h > 1.000001) {
        fail(`第 ${i + 1} 页 highlight 必须是 0–1 归一化矩形`);
      }
    }
    if (s.kind === 'flow') {
      const nodes = Array.isArray(s.nodes) ? s.nodes : [];
      if (nodes.length < 2 || nodes.length > 4) fail(`第 ${i + 1} 页流程节点须 2–4 个`);
      if (new Set(nodes.map((n) => n.id)).size !== nodes.length) fail(`第 ${i + 1} 页流程节点 id 重复`);
      for (const n of nodes) {
        if (!n.id || !String(n.label || '').trim()) fail(`第 ${i + 1} 页流程节点缺 id/label`);
        if (String(n.label).length > 24) fail(`第 ${i + 1} 页流程节点 label 超过 24 字`);
      }
    }
    if (s.kind === 'bullet') {
      const b = Array.isArray(s.bullets) ? s.bullets : [];
      if (b.length < 1 || b.length > 5) fail(`第 ${i + 1} 页要点须 1–5 条`);
      for (const line of b) if (String(line).length > 32) fail(`第 ${i + 1} 页要点超过 32 字：${String(line).slice(0, 10)}…`);
    }
  });
  return { title, style, slides };
}

function stageAsset(asset, assetsDir, stagingDir) {
  if (!asset) fail('素材不存在');
  const src = path.join(assetsDir, asset.fileName);
  if (!fs.existsSync(src)) fail('素材文件缺失：' + asset.fileName);
  const dstDir = path.join(stagingDir, 'assets');
  fs.mkdirSync(dstDir, { recursive: true });
  const dst = path.join(dstDir, asset.fileName);
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
  return path.posix.join('assets', asset.fileName);
}

// 生成 flow 的 edges（DSH 方冻结：sequential）
function sequentialEdges(nodes) {
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) edges.push({ from: nodes[i].id, to: nodes[i + 1].id });
  return edges;
}

export async function compileStoryboard({ project, assets, renderId, taskId, stagingDir, onProgress }) {
  const { title, style, slides } = validateStoryboard(project.storyboard);
  const assetById = new Map((assets || []).map((a) => [a.id, a]));
  const assetsDir = path.join(process.cwd(), 'data', 'media', 'courseware', taskId, 'assets');
  fs.mkdirSync(stagingDir, { recursive: true });
  const out = [];
  let cursorFrames = 0;
  let index = 0;
  for (const slide of slides) {
    index += 1;
    if (onProgress) onProgress(`编译第 ${index}/${slides.length} 页`);
    const minSeconds = Number(slide.timing?.minSeconds) > 0 ? Number(slide.timing.minSeconds) : 4;
    const tailSeconds = Number.isFinite(Number(slide.timing?.tailSeconds)) ? Math.max(0, Number(slide.timing.tailSeconds)) : 0.4;

    let asset = null;
    if (slide.kind === 'screenshot') {
      const a = assetById.get(slide.assetId);
      if (!a) fail(`截图素材不存在：${slide.assetId}`);
      const rel = stageAsset(a, assetsDir, stagingDir);
      const abs = path.join(stagingDir, rel);
      const { width, height } = a.width && a.height ? { width: a.width, height: a.height } : probeImage(abs);
      asset = { src: path.posix.join('courseware', taskId, renderId, rel), width, height };
    }
    if (slide.kind === 'video') {
      const a = assetById.get(slide.assetId);
      if (!a) fail(`视频素材不存在：${slide.assetId}`);
      const rel = stageAsset(a, assetsDir, stagingDir);
      const abs = path.join(stagingDir, rel);
      const { width, height } = a.width && a.height ? { width: a.width, height: a.height } : probeImage(abs);
      asset = { src: path.posix.join('courseware', taskId, renderId, rel), width, height };
    }
    if (slide.kind === 'image') {
      const a = assetById.get(slide.assetId);
      if (!a) fail(`图片素材不存在：${slide.assetId}`);
      const rel = stageAsset(a, assetsDir, stagingDir);
      const abs = path.join(stagingDir, rel);
      const { width, height } = a.width && a.height ? { width: a.width, height: a.height } : probeImage(abs);
      asset = { src: path.posix.join('courseware', taskId, renderId, rel), width, height };
    }

    let narration = null;
    if (slide.narration && slide.narration.mode === 'tts' && String(slide.narration.text || '').trim()) {
      const rel = path.posix.join('audio', slide.id + '.wav');
      const abs = path.join(stagingDir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      await synthesizeSpeech(slide.narration.text, abs, {});
      narration = { src: path.posix.join('courseware', taskId, renderId, rel), durationSeconds: probeDuration(abs) };
    } else if (slide.narration && slide.narration.mode === 'import' && slide.narration.audioId) {
      const a = assetById.get(slide.narration.audioId);
      if (!a) fail(`配音素材不存在：${slide.narration.audioId}`);
      const rel = stageAsset(a, assetsDir, stagingDir);
      narration = { src: path.posix.join('courseware', taskId, renderId, rel), durationSeconds: probeDuration(path.join(stagingDir, rel)) };
    }

    // 页长：ceil(max(minSeconds, narration + tail) × fps)
    const durationSeconds = Math.max(minSeconds, (narration ? narration.durationSeconds : 0) + tailSeconds);
    const durationInFrames = Math.max(1, Math.ceil(durationSeconds * COURSEWARE_FPS));

    // 字幕：caption 必带；有旁白则生成句级 cues（估算，按标点与字数）
    const caption = String(slide.caption || (slide.narration && slide.narration.text) || slide.text || '').trim();
    const cues = narration
      ? buildCues(String(slide.caption || slide.narration?.text || slide.text || ''), narration.durationSeconds).map((c) => ({
          startSeconds: c.startSeconds, endSeconds: c.endSeconds, text: c.text
        }))
      : [];

    const slideOut = {
      id: slide.id,
      kind: slide.kind,
      text: slide.text,
      body: slide.body,
      caption: caption || undefined,
      asset,
      highlight: slide.highlight ? { x: slide.highlight.x, y: slide.highlight.y, w: slide.highlight.w, h: slide.highlight.h } : undefined,
      annotation: ANNOTATIONS.includes(slide.annotation) ? slide.annotation : undefined,
      dim: typeof slide.dim === 'number' ? slide.dim : undefined,
      nodes: undefined,
      edges: undefined,
      bullets: undefined,
      fromFrame: cursorFrames,
      durationInFrames,
      narration: narration || undefined,
      cues: cues.length ? cues : undefined
    };
    // 效果：优先用 storyboard 里 AI/人选的 effects；没有才用默认（按决策表）
    if (slide.effects && typeof slide.effects === 'object') {
      slideOut.effects = slide.effects;
    } else if (slide.kind === 'screenshot') {
      slideOut.effects = {
        motion: { type: 'zoom' },
        annotationAnim: { type: slide.annotation === 'arrow' ? 'arrow' : (slide.annotation === 'bubble' ? 'bubblePop' : 'draw') },
        emphasis: { type: 'pulse', amount: 0.06, times: 2 }
      };
    } else if (slide.kind === 'flow' || slide.kind === 'bullet') {
      slideOut.effects = { reveal: { type: 'stagger', staggerMs: 150 } };
    } else if (slide.kind === 'title') {
      slideOut.effects = { reveal: { type: 'typewriter', by: 'line' } };
    } else if (slide.kind === 'quote') {
      slideOut.effects = { reveal: { type: 'fade' }, texture: { type: 'lightSweep' } };
    } else {
      slideOut.effects = { reveal: { type: 'fade' } };
    }
    if (slide.kind === 'video') {
      slideOut.trim = slide.trim && typeof slide.trim === 'object' ? slide.trim : undefined;
      slideOut.muted = slide.muted !== false;
      slideOut.fit = slide.fit === 'cover' ? 'cover' : 'contain';
    }
    if (slide.kind === 'image') {
      slideOut.fit = 'contain';
      slideOut.kenBurns = slide.kenBurns === true;
    }
    if (slide.kind === 'flow') {
      slideOut.nodes = slide.nodes;
      slideOut.edges = sequentialEdges(slide.nodes);
      if (narration && slide.nodes && slide.nodes.length) {
        const per = narration.durationSeconds / slide.nodes.length;
        slideOut.nodeTimings = slide.nodes.map((n, j) => ({
          id: n.id,
          startSeconds: Number((j * per).toFixed(3)),
          endSeconds: Number(((j + 1) * per).toFixed(3))
        }));
      }
    }
    if (slide.kind === 'bullet') {
      slideOut.bullets = slide.bullets;
      if (narration && slide.bullets && slide.bullets.length) {
        const per = narration.durationSeconds / slide.bullets.length;
        slideOut.bulletTimings = slide.bullets.map((_, j) => ({
          startSeconds: Number((j * per).toFixed(3)),
          endSeconds: Number(((j + 1) * per).toFixed(3))
        }));
      }
    }
    if (slide.kind === 'diagram') {
      slideOut.layout = slide.layout;
      slideOut.data = slide.data;
    }
    out.push(slideOut);
    cursorFrames += durationInFrames;
  }
  const bgmTrack = String((project.storyboard && project.storyboard.bgm) || '').trim();
  const bgmOk = /^ambient$|^pulse$/.test(bgmTrack);
  return {
    schemaVersion: 'courseware/1',
    renderId,
    taskId,
    draftRevision: project.draftRevision,
    title,
    style,
    canvas: COURSEWARE_CANVAS,
    publicRoot: 'renderer/public',
    stagingDir: path.posix.join('courseware', taskId, renderId),
    totalDurationSeconds: Number((cursorFrames / COURSEWARE_FPS).toFixed(3)),
    totalFrames: cursorFrames,
    progress: true,
    ...(bgmOk ? { bgm: { src: bgmTrack === 'pulse' ? 'audio/music-pulse.wav' : 'audio/bg_pad.wav', volume: 0.16, fadeInMs: 800, fadeOutMs: 1200 } } : {}),
    slides: out
  };
}
