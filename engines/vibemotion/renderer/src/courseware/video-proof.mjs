/** V15: real MP4 keyframes, loop/trim/audio, effects, legacy pixels and scoped files. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {buildVideoExample, command, defaultOut, prepareVideoAssets, renderVideoExample, renderer, root} from './video-example.mjs';
import {effectPlan, validateResolved, videoCamera, videoTiming} from './model.ts';

const out = defaultOut; const args = process.argv.slice(2); const finish = args.includes('--finish');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const require = createRequire(path.join(renderer, 'package.json'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = finish ? JSON.parse(fs.readFileSync(path.join(out, 'verification.json'), 'utf8')) : {checks: [], evidence: [], audits: [], compatibility: [], rejected: []};
const context = finish ? null : prepareVideoAssets();
const pixels = (file, crop) => command('ffmpeg', ['-v', 'error', '-i', file, ...(crop ? ['-vf', crop] : []), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], true);
const probe = file => JSON.parse(command('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]));
if (!finish) {
  const ts = require('typescript'); const program = ts.createProgram([path.join(renderer, 'src/courseware/index.tsx')], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts']});
  const diagnostics = ts.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: x => x, getCurrentDirectory: () => renderer, getNewLine: () => '\n'})); report.checks.push('Courseware dependency tree TypeScript: 0 diagnostics');
  const normal = buildVideoExample(context, 'contain'); assert.equal(normal.slides[0].muted, true); assert.equal(normal.slides[0].fit, 'contain');
  const untrimmed = buildVideoExample(context, 'untrimmed'); assert.equal(untrimmed.slides[0].trim, undefined); assert.equal(videoTiming(untrimmed.slides[0], 30).startFrame, 0);
  for (const [field, value] of [['muted', 'false'], ['fit', 'stretch'], ['asset', {...context.asset, src: 'C:/secret.mp4'}], ['asset', {...context.asset, src: context.asset.src.replace('.mp4', '.png')}], ['trim', {startSeconds: 4, endSeconds: 2}], ['trim', {startSeconds: 2, endSeconds: 2.001}], ['trim', {startSeconds: -1, endSeconds: 2}], ['trim', {startSeconds: 2}]]) {const p = structuredClone(normal); p.slides[0][field] = value; assert.throws(() => validateResolved(p));}
  assert.throws(() => videoTiming(normal.slides[0], 30, 1));
  for (const frame of [0, 20, 119]) assert.equal(videoCamera(normal.slides[0], frame).scale, 1);
  const stagger = buildVideoExample(context, 'stagger'); assert.equal(effectPlan(stagger.slides[0], 30).elementCount, 3);
  report.checks.push('Defaults, untrimmed start, invalid types/path/extension/trim rejection, real-duration bound, no automatic camera and 3-element stagger');
  // A short real derivative exercises the metadata-based no-trim loop branch.
  const shortSrc = `${context.base.stagingDir}/assets/v15-short.mp4`, shortFile = path.join(context.staging, shortSrc);
  command('ffmpeg', ['-v', 'error', '-y', '-ss', '2', '-i', context.target, '-t', '1', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', shortFile]);
  const {bundle} = require('@remotion/bundler'); const {openBrowser, selectComposition, renderStill} = require('@remotion/renderer');
  process.chdir(renderer); const browserExecutable = path.join(renderer, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
  const serveUrl = await bundle({entryPoint: path.join(renderer, 'src/courseware/index.tsx'), publicDir: context.staging, outDir: path.join(out, 'video-bundle')});
  const browser = await openBrowser('chrome', {browserExecutable, logLevel: 'error'});
  async function still(input, frame, relative, cover = false) {
    const props = {...input, audit: true}; const output = path.join(out, relative); fs.mkdirSync(path.dirname(output), {recursive: true});
    const composition = await selectComposition({serveUrl, id: cover ? 'CoursewareCover' : 'Courseware', inputProps: props, puppeteerInstance: browser, browserExecutable, logLevel: 'error'});
    await renderStill({serveUrl, composition, inputProps: props, frame, output, imageFormat: 'png', puppeteerInstance: browser, browserExecutable, logLevel: 'error', onBrowserLog: log => {if (log.text.startsWith('COURSEWARE_AUDIT=')) report.audits.push(JSON.parse(log.text.slice('COURSEWARE_AUDIT='.length)));}}); return output;
  }
  const montage = (files, relative) => {const options = []; files.forEach(f => options.push('-i', f)); const filters = files.map((_, i) => `[${i}:v]scale=324:576[v${i}]`).join(';'); command('ffmpeg', ['-v', 'error', '-y', ...options, '-filter_complex_threads', '2', '-filter_complex', `${filters};${files.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${files.length}`, '-frames:v', '1', path.join(out, relative)]);};
  try {
    const smoke = buildVideoExample(context, 'contain');
    await still(smoke, 15, 'evidence/contain/1.png'); await still(smoke, 45, 'evidence/contain/2.png');
    console.log('MP4 SMOKE: decoded and audited source 2.5s / 3.5s');
    if (args.includes('--smoke')) {write(path.join(out, 'smoke.json'), report); process.exitCode = 0;}
    else {
      for (const name of ['contain', 'cover', 'untrimmed', 'original-audio', 'zoom', 'pan', 'follow', 'transition', 'stagger', 'typewriter', 'fade', 'short-untrimmed']) {
        const project = name === 'short-untrimmed' ? buildVideoExample(context, 'untrimmed') : buildVideoExample(context, name);
        if (name === 'short-untrimmed') project.slides[0].asset = {...context.asset, src: shortSrc};
        const s = project.slides.at(-1), frames = [15, 45, 75], files = [];
        if (name === 'stagger') frames[2] = s.durationInFrames - 1;
        for (let i = 0; i < 3; i++) files.push(await still(project, s.fromFrame + frames[i], `evidence/${name}/${i + 1}.png`));
        write(path.join(out, `evidence/${name}/resolved-props.json`), project); montage(files, `evidence/${name}/comparison.png`);
        report.evidence.push({case: name, frames: frames.map(f => f + s.fromFrame), file: `evidence/${name}/comparison.png`});
        if (name === 'contain') {const crop = 'crop=720:720:180:570'; assert(!pixels(files[0], crop).equals(pixels(files[1], crop)), 'Video is a static screenshot'); assert(pixels(files[0], crop).equals(pixels(files[2], crop)), 'Selected clip did not loop'); report.checks.push('Real video changes between 2.5s and 3.5s; exact pixels repeat at next trimmed loop');}
        console.log('VIDEO CASE', name); write(path.join(out, 'verification.json'), report);
      }
      for (const [name, edit] of [['end-beyond-media', p => p.slides[0].trim.endSeconds = context.duration + 1], ['wrong-dimensions', p => p.slides[0].asset.width = 100]]) {
        const p = buildVideoExample(context, 'contain'); edit(p);
        await assert.rejects(() => still(p, 15, `invalid/${name}.png`), /Courseware.*(trim|video.asset)/); report.rejected.push(name); console.log('REJECTED', name);
      }
      const old = {...context.base, aiLabel: {show: false}};
      for (const s of old.slides) {const file = await still(old, s.fromFrame + 25, `legacy/${s.id}.png`); assert(pixels(file).equals(pixels(path.join(root, `out/courseware-brand-v14/legacy/${s.id}.png`))), `Legacy ${s.kind} changed`); report.compatibility.push({kind: s.kind, identicalPixels: true});}
      const last = context.base.slides.at(-1); const lastFrame = last.fromFrame + last.durationInFrames - 1;
      const def = await still(context.base, lastFrame, 'legacy/defaults.png'); assert(pixels(def).equals(pixels(path.join(root, 'out/courseware-brand-v14/defaults.png'))));
      const cover = await still(context.base, 0, 'legacy/cover.png', true); assert(pixels(cover).equals(pixels(path.join(root, 'out/courseware-brand-v14/covers/defaults.png')))); report.checks.push('V14 default brand/AI final page and cover pixel-identical');
      const styleFiles = [];
      for (const style of ['industrial', 'clean', 'dynamic']) styleFiles.push(await still(buildVideoExample(context, 'zoom', {style}), 75, `styles/${style}.png`));
      montage(styleFiles, 'three-styles.png');
      const sample = buildVideoExample(context, 'lesson'); sample.audit = false; write(path.join(out, 'resolved-props.json'), sample);
      await still(sample, 0, 'cover.png', true); await still(sample, 248, 'evidence/exit-transition.png');
      write(path.join(out, 'verification.json'), report);
    }
  } finally {await browser.close({silent: true});}
}
if (!args.includes('--smoke') && !args.includes('--stills-only')) {
  const file = path.join(out, 'video.mp4'); if (!finish) await renderVideoExample(path.join(out, 'resolved-props.json'), file, path.join(out, 'staging'), path.join(out, 'render.log'));
  const metadata = probe(file), video = metadata.streams.find(s => s.codec_type === 'video'); assert.equal(video.codec_name, 'h264'); assert.equal(video.width, 1080); assert.equal(video.height, 1920); assert.equal(video.r_frame_rate, '30/1'); assert.equal(Number(video.nb_frames), 300);
  report.video = metadata; const frames = path.join(out, 'video-frames'); fs.mkdirSync(frames, {recursive: true});
  command('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', 'fps=1', '-frames:v', '10', path.join(frames, '%02d.png')]);
  command('ffmpeg', ['-v', 'error', '-y', '-i', path.join(frames, '%02d.png'), '-vf', 'scale=216:384,tile=5x2', '-frames:v', '1', path.join(out, 'contact-sheet.png')]);
  const pcm = command('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '24000', '-f', 'f32le', '-'], true), samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
  const rms = (a, b) => {let e = 0; for (let i = Math.round(a * 24000); i < Math.round(b * 24000); i++) e += (samples[i] ?? 0) ** 2; return Math.sqrt(e / Math.round((b - a) * 24000));};
  report.audio = {externalNarrationRms: rms(.2, 1.8), mutedSecondLoopRms: rms(2.2, 3.7), sourceAudioRms: rms(4.2, 5.8), repeatedSourceAudioRms: rms(6.2, 7.8), afterVideoExitRms: rms(8.2, 9.7)};
  assert(report.audio.externalNarrationRms > .001); assert(report.audio.sourceAudioRms > .001); assert(report.audio.repeatedSourceAudioRms > .001); assert(report.audio.mutedSecondLoopRms < .0001); assert(report.audio.afterVideoExitRms < .0001);
  const sourceProps = JSON.parse(fs.readFileSync(path.join(out, 'resolved-props.json'), 'utf8'));
  const referencePCM = command('ffmpeg', ['-v', 'error', '-i', path.join(out, 'staging', sourceProps.slides[0].narration.src), '-ac', '1', '-ar', '24000', '-f', 'f32le', '-'], true);
  const reference = new Float32Array(referencePCM.buffer, referencePCM.byteOffset, referencePCM.length / 4); let dot = 0, a2 = 0, b2 = 0;
  for (let i = 0; i < reference.length; i++) {dot += reference[i] * samples[i]; a2 += reference[i] ** 2; b2 += samples[i] ** 2;}
  report.audio.externalNarrationCorrelation = dot / Math.sqrt(a2 * b2); assert(report.audio.externalNarrationCorrelation > .98);
  report.checks.push('Actual MP4: default muted source silent after narration, unmuted source repeats, exit ghost adds no audio');
}
if (!args.includes('--smoke')) {
  const protectedFiles = JSON.parse(fs.readFileSync(path.join(out, 'protected-before.json'), 'utf8')); report.protectedFiles = protectedFiles.map(f => ({file: f.file, unchanged: hash(path.join(root, f.file)) === f.sha256})); assert(report.protectedFiles.every(f => f.unchanged));
  write(path.join(out, 'verification.json'), report); console.log(`VERIFIED ${report.evidence.length} video cases; ${report.audits.length} DOM audits; ${report.protectedFiles.length} protected files unchanged. ${out}`);
}
