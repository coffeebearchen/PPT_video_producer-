/** Complete, locally runnable resolved-props examples; never changes public or the source fixture. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateResolved} from './model.ts';

export const renderer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const root = path.resolve(renderer, '../../..');
export const defaultFixture = path.join(root, 'out/courseware-fixture/resolved-props.json');
const copy = value => structuredClone(value);
export const cases = {
  click: ['screenshot', {motion: {type: 'zoom'}, annotationAnim: {type: 'draw'}, emphasis: {type: 'pulse'}}],
  scan: ['screenshot', {motion: {type: 'pan', from: {x: .2, y: .5}, to: {x: .8, y: .5}}, annotationAnim: {type: 'draw'}}],
  process: ['flow', {reveal: {type: 'stagger', staggerMs: 150}}],
  checklist: ['bullet', {reveal: {type: 'stagger', staggerMs: 200}}],
  closing: ['quote', {reveal: {type: 'fade'}, texture: {type: 'lightSweep'}}],
  opening: ['title', {reveal: {type: 'typewriter', by: 'line', speedMs: 400}}],
  zoom: ['screenshot', {motion: {type: 'zoom'}}],
  pan: ['screenshot', {motion: {type: 'pan', from: {x: .2, y: .5}, to: {x: .8, y: .5}}}],
  'pan-flow': ['flow', {motion: {type: 'pan', from: {x: .3, y: .4}, to: {x: .7, y: .6}}}],
  follow: ['screenshot', {motion: {type: 'follow', points: [{at: 0, x: .35, y: .4, scale: 1}, {at: .3, x: .5, y: .44, scale: 1.8}, {at: .65, x: .6, y: .6, scale: 1.8}, {at: 1, x: .6, y: .6, scale: 1.8}]}}],
  stagger: ['flow', {reveal: {type: 'stagger', staggerMs: 150}}],
  typewriter: ['title', {reveal: {type: 'typewriter', by: 'char', speedMs: 100}}],
  'typewriter-line': ['bullet', {reveal: {type: 'typewriter', by: 'line', speedMs: 300}}],
  fade: ['quote', {reveal: {type: 'fade', durationMs: 600}}],
  draw: ['screenshot', {motion: false, annotationAnim: {type: 'draw', durationMs: 600}}],
  'draw-underline': ['screenshot', {motion: false, annotationAnim: {type: 'draw'}}],
  'draw-highlight': ['screenshot', {motion: false, annotationAnim: {type: 'draw'}}],
  arrow: ['screenshot', {motion: false, annotationAnim: {type: 'arrow'}}],
  bubblePop: ['screenshot', {motion: false, annotationAnim: {type: 'bubblePop'}}],
  pulse: ['screenshot', {motion: false, emphasis: {type: 'pulse', amount: .06, times: 2}}],
  magnifier: ['screenshot', {motion: false, emphasis: {type: 'magnifier', radius: .18, zoom: 2}}],
  hook: ['title', {}],
  progress: ['bullet', {}],
  chapter: ['flow', {chapter: {label: '确认发布边界'}}],
  grain: ['title', {texture: {type: 'grain', opacity: .06}}],
  gradient: ['title', {texture: {type: 'gradient'}}],
  lightSweep: ['title', {texture: {type: 'lightSweep'}}],
  tilt: ['screenshot', {motion: false, tilt: {deg: 3}}],
  bgm: ['title', {}],
  sfx: ['title', {}],
  'transition-fade': ['bullet', {transition: {type: 'fade', durationMs: 600}}],
  'transition-slide': ['bullet', {transition: {type: 'slide', durationMs: 600, direction: 'left'}}],
  'transition-push': ['bullet', {transition: {type: 'push', durationMs: 600, direction: 'left'}}],
  wipe: ['bullet', {transition: {type: 'wipe', durationMs: 600, direction: 'left'}}],
};
export function buildExample(name, {fixture = defaultFixture, style, audit = true} = {}) {
  if (!cases[name]) throw new Error(`Unknown case ${name}. Use --list.`);
  const p = JSON.parse(fs.readFileSync(fixture, 'utf8').replace(/^\uFEFF/, ''));
  const [kind, effects] = cases[name];
  const slide = copy(p.slides.find(s => s.kind === kind));
  if (!slide) throw new Error(`Fixture needs a ${kind} slide`);
  slide.fromFrame = 0; delete slide.motion; slide.effects = copy(effects);
  if (kind === 'screenshot') {
    slide.annotation = name === 'scan' || name === 'draw-highlight' ? 'highlight' : name === 'draw-underline' ? 'underline' : name === 'arrow' ? 'arrow' : name === 'bubblePop' ? 'bubble' : 'circle';
  }
  p.slides = [slide];
  if (name.startsWith('transition-') || name === 'wipe') {
    const previous = copy(JSON.parse(fs.readFileSync(fixture, 'utf8').replace(/^\uFEFF/, '')).slides[0]);
    previous.fromFrame = 0; slide.fromFrame = previous.durationInFrames; p.slides = [previous, slide];
  }
  p.totalFrames = p.slides.reduce((n, s) => n + s.durationInFrames, 0);
  p.totalDurationSeconds = p.totalFrames / 30; p.audit = audit;
  if (style) p.style = style;
  if (name === 'hook') p.hook = {text: '从一个想法，到可靠结果', durationMs: 1400};
  if (name === 'progress') p.progress = true;
  if (name === 'bgm') p.bgm = {src: 'audio/music-pulse.wav', volume: .1, fadeInMs: 800, fadeOutMs: 800};
  if (name === 'sfx') p.sfx = [{at: 1, src: 'audio/whoosh.wav', volume: .3}];
  return validateResolved(p);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const value = flag => args[args.indexOf(flag) + 1];
  if (args.includes('--list')) {console.log(Object.keys(cases).join('\n')); process.exit(0);}
  const name = args.includes('--case') ? value('--case') : 'click';
  const directory = path.resolve(args.includes('--out') ? value('--out') : path.join(root, 'out/courseware-effects-examples', name));
  let project = buildExample(name, {fixture: args.includes('--fixture') ? path.resolve(value('--fixture')) : defaultFixture, style: args.includes('--style') ? value('--style') : undefined});
  const textOption = flag => {const text = value(flag); if (text === undefined || text.startsWith('--')) throw new Error(`${flag} requires text`); return text;};
  if (args.includes('--brand-text')) project.brand = {...project.brand, text: textOption('--brand-text')};
  if (args.includes('--ai-label')) project.aiLabel = {...project.aiLabel, text: textOption('--ai-label')};
  if (args.includes('--no-brand')) project.brand = {...project.brand, show: false};
  if (args.includes('--no-ai-label')) project.aiLabel = {...project.aiLabel, show: false};
  project = validateResolved(project);
  fs.mkdirSync(directory, {recursive: true}); const props = path.join(directory, 'resolved-props.json');
  fs.writeFileSync(props, JSON.stringify(project, null, 2));
  console.log(`Props: ${props}\nFrames: ${project.totalFrames}, style: ${project.style}`);
  console.log(`cd "${renderer}"\nnpx --offline --no-install remotion render src/courseware/index.tsx Courseware "${path.join(directory, 'video.mp4')}" --codec=h264 --overwrite --concurrency=2 --props="${props}"`);
  if (args.includes('--render')) {
    const npx = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js');
    const browser = path.join(renderer, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
    const result = spawnSync(process.execPath, [npx, '--offline', '--no-install', 'remotion', 'render', 'src/courseware/index.tsx', 'Courseware', path.join(directory, 'video.mp4'), '--codec=h264', '--overwrite', '--concurrency=2', `--browser-executable=${browser}`, `--props=${props}`], {cwd: renderer, stdio: 'inherit'});
    process.exitCode = result.status ?? 1;
  }
}
