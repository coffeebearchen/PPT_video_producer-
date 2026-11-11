/** Independent video-page fixtures; writes only the selected out directory. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync, spawn} from 'node:child_process';
import {validateResolved, videoTiming} from './model.ts';

export const renderer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const root = path.resolve(renderer, '../../..');
export const defaultOut = path.join(root, 'out/courseware-video-v15');
export function command(exe, args, binary = false) {
  const p = spawnSync(exe, args, {windowsHide: true, encoding: binary ? undefined : 'utf8', maxBuffer: 40 * 1024 * 1024});
  if (p.status !== 0 || p.error) throw new Error(`${exe}: ${p.error?.message ?? p.stderr?.toString().slice(-3000)}`); return p.stdout;
}
export function prepareVideoAssets({out = defaultOut, source = path.join(root, 'reference-video/videos/VibeMotion-charts-9x16.mp4')} = {}) {
  out = path.resolve(out); source = path.resolve(source);
  const base = JSON.parse(fs.readFileSync(path.join(root, 'out/courseware-fixture/resolved-props.json'), 'utf8'));
  const staging = path.join(out, 'staging'); fs.mkdirSync(staging, {recursive: true});
  for (const file of Object.values(JSON.parse(fs.readFileSync(path.join(renderer, 'fonts.json'), 'utf8')))) {const target = path.join(staging, file); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.copyFileSync(path.join(renderer, 'public', file), target);}
  fs.cpSync(path.join(renderer, 'public', base.stagingDir), path.join(staging, base.stagingDir), {recursive: true});
  const src = `${base.stagingDir}/assets/v15-demo${path.extname(source).toLowerCase()}`; const target = path.join(staging, src); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.copyFileSync(source, target);
  const metadata = JSON.parse(command('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', target]));
  const video = metadata.streams.find(s => s.codec_type === 'video'); if (!video) throw new Error('Source has no video stream');
  const rotation = video.side_data_list?.find(s => s.rotation !== undefined)?.rotation ?? 0; const swap = Math.abs(rotation) % 180 === 90;
  const asset = {src, width: swap ? video.height : video.width, height: swap ? video.width : video.height};
  const duration = Number(video.duration ?? metadata.format.duration);
  const context = {base, out, staging, source, target, asset, duration, hasAudio: metadata.streams.some(s => s.codec_type === 'audio')};
  fs.writeFileSync(path.join(out, 'source-metadata.json'), JSON.stringify({source, asset, duration, metadata}, null, 2)); return context;
}
export const videoCases = ['lesson', 'contain', 'cover', 'untrimmed', 'original-audio', 'zoom', 'pan', 'follow', 'transition', 'stagger', 'typewriter', 'fade'];
export function buildVideoExample(context, name = 'lesson', {style = 'industrial', start = 2, end = 4, duration = 4, muted, fit, whole = false} = {}) {
  if (!videoCases.includes(name)) throw new Error(`Unknown video case ${name}`);
  const p = structuredClone(context.base); p.style = style; p.audit = true; p.title = '视频片段融入课件讲解';
  const clip = {id: 'video-clip', kind: 'video', text: '观察曲线如何变化', body: '视频也能进入讲解流程', asset: context.asset, fromFrame: 0, durationInFrames: Math.round(duration * 30), caption: '观察片段中的变化。', effects: {motion: false}};
  if (!whole && name !== 'untrimmed') clip.trim = {startSeconds: start, endSeconds: end};
  if (fit !== undefined) clip.fit = fit;
  if (muted !== undefined) clip.muted = muted;
  if (name === 'cover' && fit === undefined) clip.fit = 'cover';
  if (name === 'original-audio' && muted === undefined) clip.muted = false;
  if (name === 'zoom') clip.effects.motion = {type: 'zoom', steps: [{at: 0, scale: 1}, {at: .25, scale: 1}, {at: .5, scale: 1.3}, {at: 1, scale: 1.3}]};
  if (name === 'pan') clip.effects.motion = {type: 'pan', from: {x: .35, y: .5}, to: {x: .65, y: .5}};
  if (name === 'follow') clip.effects.motion = {type: 'follow', points: [{at: 0, x: .5, y: .4, scale: 1}, {at: .6, x: .5, y: .6, scale: 1.3}, {at: 1, x: .5, y: .6, scale: 1.3}]};
  if (name === 'stagger') clip.effects.reveal = {type: 'stagger', staggerMs: 150};
  if (name === 'typewriter') clip.effects.reveal = {type: 'typewriter', by: 'char', speedMs: 100};
  if (name === 'fade') clip.effects.reveal = {type: 'fade', durationMs: 600};
  p.slides = [clip];
  if (name === 'transition') {clip.fromFrame = 30; clip.effects.transition = {type: 'push', durationMs: 400}; p.slides = [{id: 'opening', kind: 'title', text: '把片段放进讲解流程', fromFrame: 0, durationInFrames: 30}, clip];}
  if (name === 'lesson') {
    if (context.duration < 4) throw new Error('The lesson demonstration requires at least four source seconds. Use --case contain for shorter media.');
    clip.durationInFrames = 120; clip.trim = {startSeconds: 2, endSeconds: 4}; clip.fit = 'contain'; clip.muted = true; clip.effects = {reveal: {type: 'stagger', staggerMs: 150}}; clip.body = '完整画面保留在安全区内'; clip.caption = '折线图：分数一路往上。'; clip.cues = [{startSeconds: 0, endSeconds: 2, text: clip.caption}];
    // Reuse existing source audio as an external narration track; never synthesize TTS.
    if (context.hasAudio) {const src = `${p.stagingDir}/narration/video-demo.wav`; const file = path.join(context.staging, src); fs.mkdirSync(path.dirname(file), {recursive: true}); command('ffmpeg', ['-v', 'error', '-y', '-ss', '0', '-i', context.target, '-t', '2', '-vn', '-ac', '1', '-ar', '24000', file]); clip.narration = {src, durationSeconds: 2};}
    const second = {id: 'video-detail', kind: 'video', text: '再看局部变化', body: '原声仅在明确开启时播放', asset: context.asset, fromFrame: 120, durationInFrames: 120, trim: {startSeconds: 0, endSeconds: 2}, muted: false, fit: 'cover', caption: '曲线随时间逐步展开。', effects: {transition: {type: 'push', durationMs: 300}, motion: {type: 'zoom', steps: [{at: 0, scale: 1}, {at: .25, scale: 1}, {at: .5, scale: 1.25}, {at: 1, scale: 1.25}]}}};
    p.slides = [clip, second, {id: 'closing', kind: 'quote', text: '把片段放进讲解流程', body: '素材、字幕和旁白按页编排', fromFrame: 240, durationInFrames: 60, effects: {transition: {type: 'fade', durationMs: 300}}}];
  }
  p.totalFrames = p.slides.reduce((n, s) => n + s.durationInFrames, 0); p.totalDurationSeconds = p.totalFrames / 30;
  const validated = validateResolved(p);
  for (const slide of validated.slides) if (slide.kind === 'video') videoTiming(slide, 30, context.duration);
  return validated;
}
export async function renderVideoExample(propsFile, video, staging, logFile) {
  const npx = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js');
  const browser = path.join(renderer, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
  const log = fs.openSync(logFile, 'w');
  try {await new Promise((resolve, reject) => {const child = spawn(process.execPath, [npx, '--offline', '--no-install', 'remotion', 'render', 'src/courseware/index.tsx', 'Courseware', video, '--codec=h264', '--overwrite', '--concurrency=2', `--browser-executable=${browser}`, `--public-dir=${staging}`, `--props=${propsFile}`], {cwd: renderer, windowsHide: true, stdio: ['ignore', log, log]}); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`Remotion exit ${code}; read ${logFile}`)));});} finally {fs.closeSync(log);}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
  if (args.includes('--list')) {console.log(videoCases.join('\n')); process.exit(0);}
  const context = prepareVideoAssets({out: args.includes('--out') ? path.resolve(get('--out')) : defaultOut, source: args.includes('--source') ? path.resolve(get('--source')) : undefined});
  const name = args.includes('--case') ? get('--case') : 'lesson';
  const props = buildVideoExample(context, name, {style: args.includes('--style') ? get('--style') : undefined, start: args.includes('--start') ? Number(get('--start')) : undefined, end: args.includes('--end') ? Number(get('--end')) : undefined, duration: args.includes('--duration') ? Number(get('--duration')) : undefined, muted: args.includes('--unmuted') ? false : undefined, fit: args.includes('--fit') ? get('--fit') : undefined, whole: args.includes('--whole')});
  props.audit = false; const file = path.join(context.out, 'resolved-props.json'); fs.writeFileSync(file, JSON.stringify(props, null, 2));
  console.log(`Props: ${file}\nPublic: ${context.staging}\ncd "${renderer}"\nnpx --offline --no-install remotion render src/courseware/index.tsx Courseware "${path.join(context.out, 'video.mp4')}" --codec=h264 --overwrite --concurrency=2 --public-dir="${context.staging}" --props="${file}"`);
  if (args.includes('--render')) await renderVideoExample(file, path.join(context.out, 'video.mp4'), context.staging, path.join(context.out, 'render.log'));
}
