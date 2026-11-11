/** Offline V13 verification. One bundle, keyframes for effects, one short rendered sample. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync, spawn} from 'node:child_process';
import {buildExample, cases, defaultFixture, renderer, root} from './examples.mjs';
import {validateResolved, effectPlan, screenshotCamera, effectTilt} from './model.ts';

const out = path.join(root, 'out/courseware-effects-v13'); fs.mkdirSync(out, {recursive: true});
const require = createRequire(path.join(renderer, 'package.json'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const run = (exe, args, binary = false) => {
  const p = spawnSync(exe, args, {encoding: binary ? undefined : 'utf8', windowsHide: true, maxBuffer: 40 * 1024 * 1024});
  if (p.status !== 0 || p.error) throw new Error(`${exe}: ${p.error?.message ?? p.stderr?.toString().slice(-3500)}`);
  return p.stdout;
};
const pixels = file => run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], true);
// V12/V13 baseline images predate the V14 default AI disclosure. Explicitly
// disable just that new chrome for the historical exact-pixel comparison.
const raw = {...JSON.parse(fs.readFileSync(defaultFixture, 'utf8')), aiLabel: {show: false}}; const base = validateResolved(raw);
const finishOnly = process.argv.includes('--resume-finish');
const refine = process.argv.includes('--refine');
const report = finishOnly || refine ? JSON.parse(fs.readFileSync(path.join(out, 'verification.json'), 'utf8')) : {modelChecks: [], compatibility: [], evidence: [], styles: [], audits: [], video: null};
if (refine) {report.modelChecks = []; report.compatibility = []; report.styles = []; report.evidence = report.evidence.filter(e => e.effect !== 'pan-flow');}
function verifyModel() {
  const ts = require('typescript');
  const p = ts.createProgram([path.join(renderer, 'src/courseware/index.tsx')], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts']});
  const ds = ts.getPreEmitDiagnostics(p); assert.equal(ds.length, 0, ts.formatDiagnosticsWithColorAndContext(ds, {getCanonicalFileName: x => x, getCurrentDirectory: () => renderer, getNewLine: () => '\n'}));
  report.modelChecks.push('Courseware dependency tree TypeScript: 0 diagnostics');
  for (const name of Object.keys(cases)) {
    const project = buildExample(name);
    for (const s of project.slides) {
      const plan = effectPlan(s, 30, s.fromFrame === 0 ? project.hook : undefined);
      let end = 0;
      for (const key of ['transition', 'hook', 'reveal', 'annotation', 'emphasis', 'tilt', 'sweep']) {assert(plan[key].start >= end - 1e-7); assert(plan[key].end <= plan.durationMs + 1e-7); end = plan[key].end;}
      assert(Math.abs(effectTilt(s, s.durationInFrames - 1, 30)) < 1e-7);
    }
  }
  const check = (name, edit) => {const p = structuredClone(raw); edit(p); assert.throws(() => validateResolved(p)); report.modelChecks.push(`Reject ${name}`);};
  check('unknown effect', p => p.slides[0].effects = {typo: true});
  check('misplaced bgm', p => p.slides[0].effects = {bgm: {src: 'audio/music-pulse.wav'}});
  check('bad annotation combination', p => p.slides[1].effects = {annotationAnim: {type: 'draw'}});
  check('non-screenshot follow', p => p.slides[0].effects = {motion: {type: 'follow', points: []}});
  check('audio traversal', p => p.bgm = {src: '../private.wav'});
  check('sfx beyond end', p => p.sfx = [{at: 9999, src: 'audio/whoosh.wav'}]);
  check('non-first hook', p => p.slides[1].effects = {hook: {text: 'bad'}});
  check('stagger targets absent field', p => p.slides[1].effects = {reveal: {type: 'stagger', from: 'body'}});
  check('internal chapter label', p => p.slides[0].effects = {chapter: {label: '\u7b2c1\u9875'}});
  const short = buildExample('click'); short.slides[0].durationInFrames = 2; delete short.slides[0].narration; short.slides[0].cues = []; short.totalFrames = 2; short.totalDurationSeconds = 2 / 30;
  const plan = effectPlan(validateResolved(short).slides[0], 30); assert(plan.emphasis.end <= 1000 / 30 + 1e-8);
  report.modelChecks.push('All case schedules bounded and sequential; 2-frame page compresses effects');
  const oneTitle = buildExample('process'); oneTitle.slides[0].effects = {reveal: {type: 'stagger', from: 'title'}}; assert.equal(effectPlan(validateResolved(oneTitle).slides[0], 30).reveal.end, 400);
  report.modelChecks.push('Title-only stagger lasts 400ms regardless of flow-node count');
  const screenshot = buildExample('click').slides[0]; const legacy = structuredClone(base.slides[1]);
  for (let f = 0; f < 150; f++) assert.deepEqual(screenshotCamera({...screenshot, effects: {motion: {type: 'zoom', steps: legacy.motion?.steps ?? [{at: 0, scale: 1}, {at: .25, scale: 1}, {at: .45, scale: 2.6}, {at: .8, scale: 2.6}, {at: 1, scale: 2.6}]} }}, f), screenshotCamera(legacy, f));
  report.modelChecks.push('Legacy zoom and effects.zoom identical at all 150 frames');
}
if (!finishOnly) verifyModel();
if (process.argv.includes('--model-only')) {write(path.join(out, 'model-checks.json'), report.modelChecks); console.log(JSON.stringify(report.modelChecks, null, 2)); process.exit(0);}
write(path.join(out, 'verification.json'), report);
const {bundle} = require('@remotion/bundler'); const {openBrowser, selectComposition, renderStill} = require('@remotion/renderer');
process.chdir(renderer);
const browserExecutable = path.join(renderer, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
if (!finishOnly) {
const serveUrl = await bundle({entryPoint: path.join(renderer, 'src/courseware/index.tsx'), publicDir: path.join(renderer, 'public'), outDir: path.join(out, 'effects-bundle')});
const browser = await openBrowser('chrome', {browserExecutable, logLevel: 'error'});
const onBrowserLog = log => {if (log.text.startsWith('COURSEWARE_AUDIT=')) report.audits.push(JSON.parse(log.text.slice('COURSEWARE_AUDIT='.length)));};
async function still(project, frame, file, id = 'Courseware') {
  const composition = await selectComposition({serveUrl, id, inputProps: project, puppeteerInstance: browser, browserExecutable, logLevel: 'error'});
  await renderStill({serveUrl, composition, inputProps: project, frame, output: file, imageFormat: 'png', puppeteerInstance: browser, browserExecutable, logLevel: 'error', onBrowserLog});
}
function montage(files, target, width = 324, columns = 3) {
  const args = ['-v', 'error', '-y']; for (const file of files) args.push('-i', file);
  const labels = files.map((_, i) => `[${i}:v]scale=${width}:-1[v${i}]`).join(';');
  const layout = files.map((_, i) => `${i % columns * width}_${Math.floor(i / columns) * Math.round(width * 1920 / 1080)}`).join('|');
  run('ffmpeg', [...args, '-filter_complex', `${labels};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black[out]`, '-map', '[out]', '-frames:v', '1', target]);
}
try {
  for (const s of base.slides) {
    const target = path.join(out, `compat-${s.id}.png`); await still({...raw, audit: true}, s.fromFrame + 25, target);
    const old = path.join(out, 'baseline', `${s.id}.png`); assert(fs.existsSync(old), `Missing BEFORE image ${old}`);
    const equal = pixels(old).equals(pixels(target)); assert(equal, `Backward compatibility failed: ${s.id}`);
    report.compatibility.push({slide: s.id, frame: s.fromFrame + 25, identicalPixels: equal, beforeSHA256: hash(old), afterSHA256: hash(target)});
  }
  const empty = structuredClone(raw); empty.audit = true; empty.slides.forEach(s => s.effects = {});
  await still(empty, 183, path.join(out, 'compat-empty-effects.png')); assert(pixels(path.join(out, 'compat-empty-effects.png')).equals(pixels(path.join(out, 'baseline/create.png'))));
  console.log('COMPATIBILITY: all five page types pixel-identical; empty effects identical');
  const skip = new Set(['scan', 'process', 'checklist', 'closing', 'opening', 'bgm', 'sfx']);
  for (const name of Object.keys(cases).filter(n => !skip.has(n) && (!refine || n === 'pan-flow'))) {
    const project = buildExample(name); const s = project.slides.at(-1); const plan = effectPlan(s, 30, s.fromFrame === 0 ? project.hook : undefined);
    let window = name.startsWith('transition-') || name === 'wipe' ? plan.transition : ['draw', 'draw-underline', 'draw-highlight', 'arrow', 'bubblePop'].includes(name) ? plan.annotation : ['pulse', 'magnifier', 'click'].includes(name) ? plan.emphasis : name === 'tilt' ? plan.tilt : name === 'lightSweep' ? plan.sweep : name === 'hook' ? plan.hook : ['stagger', 'typewriter', 'typewriter-line', 'fade'].includes(name) ? plan.reveal : {start: 0, end: (s.durationInFrames - 1) / 30 * 1000};
    const middle = name === 'pulse' || name === 'click' ? .25 : .5;
    const local = [Math.max(0, Math.floor(window.start * .03) - 1), Math.min(s.durationInFrames - 1, Math.round((window.start + (window.end - window.start) * middle) * .03)), s.durationInFrames - 1];
    if (name === 'zoom') local[1] = Math.round(s.durationInFrames * .35);
    const dir = path.join(out, 'evidence', name); fs.mkdirSync(dir, {recursive: true}); write(path.join(dir, 'resolved-props.json'), project);
    const files = [];
    for (let i = 0; i < 3; i++) {const file = path.join(dir, `${i + 1}-${['before', 'active', 'settled'][i]}.png`); await still(project, s.fromFrame + local[i], file); files.push(file);}
    montage(files, path.join(dir, 'comparison.png'));
    report.evidence.push({effect: name, frames: local.map(f => s.fromFrame + f), plan, comparison: path.relative(root, path.join(dir, 'comparison.png')), differentStartMiddlePixels: !pixels(files[0]).equals(pixels(files[1]))});
    write(path.join(out, 'verification.json'), report); console.log(`EVIDENCE ${name}: ${local.join('/')}`);
  }
  // Static effects need a same-frame on/off comparison: a changing legacy
  // underline between different frames is not evidence for grain or gradient.
  report.staticControls = [];
  for (const name of ['grain', 'gradient', 'chapter']) {
    const project = buildExample(name), entry = report.evidence.find(e => e.effect === name), frame = entry.frames[1];
    const control = structuredClone(project); delete control.slides[0].effects;
    const file = path.join(out, 'evidence', name, 'same-frame-effect-off.png'); await still(control, frame, file);
    const active = path.join(out, 'evidence', name, '2-active.png'); assert(!pixels(active).equals(pixels(file)), `${name} has no visible effect`);
    montage([file, active], path.join(out, 'evidence', name, 'on-off.png'), 432, 2); report.staticControls.push({effect: name, frame, differentPixels: true, file: path.relative(root, file)});
  }
  report.hookRegressions = [];
  for (const name of ['draw', 'process', 'tilt']) {
    const project = buildExample(name); project.hook = {...buildExample('hook').hook, durationMs: 2400};
    const dir = path.join(out, 'hook-regressions', name); fs.mkdirSync(dir, {recursive: true}); write(path.join(dir, 'resolved-props.json'), project);
    const slide = project.slides[0], plan = effectPlan(slide, 30, project.hook);
    const frames = [30, Math.min(slide.durationInFrames - 1, Math.round((name === 'draw' ? (plan.annotation.start + plan.annotation.end) / 2 : name === 'tilt' ? (plan.tilt.start + plan.tilt.end) / 2 : (plan.reveal.start + plan.reveal.end) / 2) * .03)), slide.durationInFrames - 1];
    const files = [];
    for (let i = 0; i < frames.length; i++) {const file = path.join(dir, `${i}.png`); await still(project, frames[i], file); files.push(file);}
    montage(files, path.join(dir, 'comparison.png')); report.hookRegressions.push({case: name, frames, plan});
  }
  for (const style of ['industrial', 'clean', 'dynamic']) {
    const project = buildExample('click', {style}); const plan = effectPlan(project.slides[0], 30); const frame = Math.round((plan.emphasis.start + (plan.emphasis.end - plan.emphasis.start) * .25) * .03);
    const file = path.join(out, `style-${style}.png`); await still(project, frame, file); report.styles.push({style, frame, file: path.relative(root, file)});
  }
  montage(report.styles.map(s => path.join(root, s.file)), path.join(out, 'three-styles.png'));
  const combined = buildExample('click', {audit: false}); combined.progress = true;
  combined.bgm = {src: 'audio/music-pulse.wav', volume: .08, fadeInMs: 800, fadeOutMs: 800}; combined.sfx = [{at: 1, src: 'audio/whoosh.wav', volume: .3}];
  const file = path.join(out, 'sample-props.json'); write(file, combined);
  const cover = path.join(out, 'cover.png'); await still({...combined, audit: true}, 0, cover, 'CoursewareCover');
  write(path.join(out, 'verification.json'), report);
} finally {await browser.close({silent: true});}
}
if (!process.argv.includes('--stills-only')) {
  const npx = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js'); const video = path.join(out, 'video.mp4');
  if (!finishOnly) {
  const log = fs.openSync(path.join(out, 'render.log'), 'w');
  await new Promise((resolve, reject) => {const p = spawn(process.execPath, [npx, '--offline', '--no-install', 'remotion', 'render', 'src/courseware/index.tsx', 'Courseware', video, '--codec=h264', '--overwrite', '--concurrency=2', `--browser-executable=${browserExecutable}`, `--props=${path.join(out, 'sample-props.json')}`], {cwd: renderer, windowsHide: true, stdio: ['ignore', log, log]}); p.on('error', reject); p.on('close', c => c === 0 ? resolve() : reject(new Error(`render exit ${c}; read render.log`)));}); fs.closeSync(log);
  }
  report.video = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video]));
  const stream = report.video.streams.find(s => s.codec_type === 'video'); assert.equal(stream.codec_name, 'h264'); assert.equal(stream.width, 1080); assert.equal(stream.height, 1920); assert.equal(stream.r_frame_rate, '30/1'); assert(report.video.streams.some(s => s.codec_type === 'audio'));
  const framesDir = path.join(out, 'sample-frames'); fs.mkdirSync(framesDir, {recursive: true});
  run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', 'fps=2', '-frames:v', '10', path.join(framesDir, '%02d.png')]);
  run('ffmpeg', ['-v', 'error', '-y', '-i', path.join(framesDir, '%02d.png'), '-vf', 'scale=216:384,tile=5x2', '-frames:v', '1', path.join(out, 'contact-sheet.png')]);
  report.evidence = report.evidence.filter(e => !['bgm', 'sfx'].includes(e.effect));
  for (const name of ['bgm', 'sfx']) {const dir = path.join(out, 'evidence', name); fs.mkdirSync(dir, {recursive: true}); report.evidence.push({effect: name, audio: path.relative(root, video), at: name === 'sfx' ? 1 : 0, waveform: path.relative(root, path.join(dir, 'waveform.png'))});}
  const pcm = run('ffmpeg', ['-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '24000', '-f', 'f32le', '-'], true); const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4); let energy = 0, peak = 0; for (const x of samples) {energy += x * x; peak = Math.max(peak, Math.abs(x));} report.audio = {rms: Math.sqrt(energy / samples.length), peak, samples: samples.length}; assert(report.audio.rms > .001);
  // Independent audio verification: remove known other tracks from the actual
  // decoded MP4, then compare each residue with the requested local effect.
  const project = JSON.parse(fs.readFileSync(path.join(out, 'sample-props.json'), 'utf8'));
  const readPCM = src => {const b = run('ffmpeg', ['-v', 'error', '-i', path.join(renderer, 'public', src), '-ac', '1', '-ar', '24000', '-f', 'f32le', '-'], true); return new Float32Array(b.buffer, b.byteOffset, b.length / 4);};
  const voice = readPCM(project.slides[0].narration.src), music = readPCM(project.bgm.src), sound = readPCM(project.sfx[0].src);
  const length = project.totalFrames / 30 * 24000, bgmResidue = new Float32Array(length), sfxResidue = new Float32Array(length);
  let expectedEnergy = 0, actualEnergy = 0, mixedDot = 0, b2 = 0, s2 = 0, br2 = 0, sr2 = 0, bDot = 0, sDot = 0;
  for (let i = 0; i < length; i++) {
    const ms = Math.floor(i / 800) / 30 * 1000, total = (project.totalFrames - 1) / 30 * 1000;
    const b = music[i % music.length] * project.bgm.volume * Math.min(1, ms / project.bgm.fadeInMs) * Math.max(0, Math.min(1, (total - ms) / project.bgm.fadeOutMs));
    const offset = i - Math.round(project.sfx[0].at * 24000); const s = offset >= 0 ? (sound[offset] ?? 0) * project.sfx[0].volume : 0; const v = voice[i] ?? 0;
    const expected = v + b + s; expectedEnergy += expected * expected; actualEnergy += samples[i] * samples[i]; mixedDot += expected * samples[i];
    const br = samples[i] - v - s, sr = samples[i] - v - b; bgmResidue[i] = br; sfxResidue[i] = sr; b2 += b * b; s2 += s * s; br2 += br * br; sr2 += sr * sr; bDot += br * b; sDot += sr * s;
  }
  report.audio.mixCorrelation = mixedDot / Math.sqrt(expectedEnergy * actualEnergy); report.audio.bgmCorrelation = bDot / Math.sqrt(b2 * br2); report.audio.sfxCorrelation = sDot / Math.sqrt(s2 * sr2);
  assert(report.audio.mixCorrelation > .99); assert(report.audio.bgmCorrelation > .95); assert(report.audio.sfxCorrelation > .8);
  for (const [name, data] of [['bgm', bgmResidue], ['sfx', sfxResidue]]) {
    const dir = path.join(out, 'evidence', name), file = path.join(dir, 'actual-residue.f32'); fs.writeFileSync(file, Buffer.from(data.buffer));
    run('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', '24000', '-ac', '1', '-i', file, '-filter_complex', 'showwavespic=s=1200x300:colors=0x75d5be:split_channels=0:scale=sqrt', '-frames:v', '1', path.join(dir, 'waveform.png')]);
  }
  report.audio.waveformScale = 'sqrt (display only; video volume unchanged)';
}
const hashesFile = path.join(out, 'before-hashes.json'); if (fs.existsSync(hashesFile)) {report.protectedFiles = JSON.parse(fs.readFileSync(hashesFile, 'utf8').replace(/^\uFEFF/, '')).map(item => ({path: item.Path, unchanged: hash(item.Path).toUpperCase() === item.Hash})); assert(report.protectedFiles.every(f => f.unchanged));}
report.sourceHashes = Object.fromEntries(['model.ts', 'Courseware.tsx', 'layers.tsx', 'Effects.tsx', 'audit.tsx', 'examples.mjs', 'effects-proof.mjs', 'CALLING.md'].map(f => [f, hash(path.join(renderer, 'src/courseware', f))]));
const cards = report.evidence.map(e => {const href = path.relative(out, path.resolve(root, e.comparison ?? e.waveform)).replaceAll('\\', '/'); return `<section><h2>${e.effect}</h2><a href="${href}"><img src="${href}"/></a><p>${e.frames ? '帧：' + e.frames.join(' / ') + '；左：出现前，中：进行中，右：停稳后' : '实际成片减去其它已知声轨后的残差波形；数值相关性见验证记录'}</p></section>`;}).join('\n');
fs.writeFileSync(path.join(out, 'evidence-index.html'), `<!doctype html><meta charset="utf-8"><title>课件效果 V13 验证证据</title><style>body{background:#101713;color:#f2eee0;font-family:Arial;max-width:1500px;margin:32px auto}main{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}section{background:#1d2922;padding:16px;border-radius:10px}h2{font-size:20px}img{width:100%}a{color:#d6b56c}p{font-size:14px}</style><h1>课件效果 V13 · 逐项证据</h1><p><a href="video.mp4">5秒真实样片</a> · <a href="contact-sheet.png">10帧抽帧</a> · <a href="three-styles.png">三风格</a> · <a href="verification.json">验证记录</a> · <a href="../../engines/vibemotion/renderer/src/courseware/CALLING.md">调用说明</a></p><main>${cards}</main>`);
write(path.join(out, 'verification.json'), report); console.log(`VERIFIED ${report.evidence.length} cases; ${report.audits.length} DOM audits. ${out}`);
