/** V14: offline still-frame, cover, layout and exact legacy-pixel verification. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateResolved} from './model.ts';

const renderer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.resolve(renderer, '../../..'); const out = path.join(root, 'out/courseware-brand-v14');
const require = createRequire(path.join(renderer, 'package.json')); const baseline = process.argv.includes('--baseline');
fs.mkdirSync(out, {recursive: true});
fs.mkdirSync(path.join(out, 'props'), {recursive: true});
if (baseline && fs.existsSync(path.join(out, 'before/cover.png'))) throw new Error('V13 before frames already exist. Do not overwrite the historical baseline.');
const raw = JSON.parse(fs.readFileSync(path.join(out, 'original-props.json'), 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const run = args => {const p = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {cwd: renderer, windowsHide: true, maxBuffer: 30 * 1024 * 1024}); if (p.status !== 0 || p.error) throw new Error(p.error?.message ?? p.stderr.toString()); return p.stdout;};
const pixels = (file, crop) => run(['-i', file, ...(crop ? ['-vf', crop] : []), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
const report = {mode: baseline ? 'baseline' : 'brand-v14', checks: [], audits: [], evidence: [], compatibility: []};
if (!baseline) {
  const defaults = validateResolved(raw); assert.deepEqual(defaults.brand, {text: '\u56fa\u5b9a\u5730\u5740', show: true}); assert.deepEqual(defaults.aiLabel, {text: 'AI \u751f\u6210', show: true}); report.checks.push('Absent settings normalize to V14 brand + AI defaults');
  for (const key of ['brand', 'aiLabel']) {
    for (const text of ['', '   ']) assert.equal(validateResolved({...raw, [key]: {text}})[key].text, defaults[key].text);
    assert.equal(validateResolved({...raw, [key]: {show: false}})[key].show, false);
    assert.equal(validateResolved({...raw, [key]: {text: 'Client'}})[key].show, true);
    for (const value of [null, false, {show: 'false'}, {text: 42}, {visible: false}, {text: 'First\nSecond'}, {text: 'W'.repeat(60)}]) assert.throws(() => validateResolved({...raw, [key]: value}));
  }
  report.checks.push('Partial settings, empty fallback, real boolean false, invalid type/unknown key/newline/overlong text');
  const ts = require('typescript'); const p = ts.createProgram([path.join(renderer, 'src/courseware/index.tsx')], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, resolveJsonModule: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts']});
  const diagnostics = ts.getPreEmitDiagnostics(p); assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: x => x, getCurrentDirectory: () => renderer, getNewLine: () => '\n'})); report.checks.push('Courseware dependency tree TypeScript: 0 diagnostics');
}
process.chdir(renderer);
const {bundle} = require('@remotion/bundler'); const {openBrowser, selectComposition, renderStill} = require('@remotion/renderer');
const browserExecutable = path.join(renderer, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const serveUrl = await bundle({entryPoint: path.join(renderer, 'src/courseware/index.tsx'), publicDir: path.join(renderer, 'public'), outDir: path.join(out, baseline ? 'before-bundle' : 'brand-bundle')});
const browser = await openBrowser('chrome', {browserExecutable, logLevel: 'error'});
async function still(props, frame, name, cover = false) {
  const file = path.join(out, name + '.png'); fs.mkdirSync(path.dirname(file), {recursive: true});
  const composition = await selectComposition({serveUrl, id: cover ? 'CoursewareCover' : 'Courseware', inputProps: props, puppeteerInstance: browser, browserExecutable, logLevel: 'error'});
  await renderStill({serveUrl, composition, inputProps: props, frame, output: file, imageFormat: 'png', puppeteerInstance: browser, browserExecutable, logLevel: 'error', onBrowserLog: log => {if (log.text.startsWith('COURSEWARE_AUDIT=')) report.audits.push(JSON.parse(log.text.slice('COURSEWARE_AUDIT='.length)));}});
  return file;
}
const last = raw.slides.at(-1); const finalFrame = last.fromFrame + last.durationInFrames - 1;
try {
  if (baseline) {
    for (const s of raw.slides) await still(raw, s.fromFrame + 25, `before/${s.id}`);
    await still(raw, finalFrame, 'before/last'); await still(raw, 0, 'before/cover', true);
    write(path.join(out, 'before-audits.json'), report); console.log('BASELINE: 5 kinds + final CTA + cover captured');
  } else {
    const customer = {text: '\u5ba2\u6237\u5b66\u5802', show: true};
    const variations = {
      defaults: {}, customer: {brand: customer}, 'brand-off': {brand: {show: false}},
      'ai-on': {aiLabel: {show: true}}, 'ai-off': {aiLabel: {show: false}},
      'custom-ai': {brand: customer, aiLabel: {text: 'AI \u8f85\u52a9\u521b\u4f5c', show: true}},
      'both-off': {brand: {show: false}, aiLabel: {show: false}},
      'empty-fallback': {brand: {text: '  '}, aiLabel: {text: ''}},
      longest: {brand: {text: '\u54c1'.repeat(30)}, aiLabel: {text: '\u6807'.repeat(16)}},
    };
    for (const [name, settings] of Object.entries(variations)) {
      const props = {...raw, ...settings, audit: true}; write(path.join(out, `props/${name}.json`), props);
      const video = await still(props, finalFrame, name); const cover = await still(props, 0, `covers/${name}`, true);
      report.evidence.push({case: name, frame: finalFrame, video: path.relative(out, video), cover: path.relative(out, cover)}); console.log('BRAND', name);
    }
    // Baseline did not have an AI mark. show:false must recreate it exactly.
    for (const s of raw.slides) {
      const file = await still({...raw, aiLabel: {show: false}}, s.fromFrame + 25, `legacy/${s.id}`);
      const same = pixels(file).equals(pixels(path.join(out, `before/${s.id}.png`))); assert(same, `Legacy pixels changed: ${s.id}`); report.compatibility.push({kind: s.kind, identicalFullPixelsWithAiOff: same});
    }
    const oldCover = path.join(out, 'before/cover.png'); assert(pixels(oldCover).equals(pixels(path.join(out, 'covers/ai-off.png')))); report.checks.push('AI off restores exact V13 pixels for five page types and cover');
    assert(pixels(path.join(out, 'defaults.png'), 'crop=1080:1660:0:0').equals(pixels(path.join(out, 'before/last.png'), 'crop=1080:1660:0:0'))); report.checks.push('V14 defaults leave all pixels above AI/footer row unchanged');
    const a = pixels(path.join(out, 'defaults.png')), b = pixels(path.join(out, 'before/last.png')); let changes = 0;
    for (let i = 0; i < a.length; i += 3) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {const pixel = i / 3, x = pixel % 1080, y = Math.floor(pixel / 1080); assert(x >= 108 && x < 544 && y >= 1678 && y <= 1718, `Unexpected default pixel change ${x},${y}`); changes++;}
    assert(changes > 0); report.checks.push(`All ${changes} default pixel changes are inside the new AI label; CTA and all other pixels unchanged`);
    assert(pixels(path.join(out, 'defaults.png')).equals(pixels(path.join(out, 'ai-on.png')))); assert(pixels(path.join(out, 'defaults.png')).equals(pixels(path.join(out, 'empty-fallback.png')))); report.checks.push('Absent equals explicit AI on; empty brand/AI text equals defaults');
    for (const style of ['industrial', 'clean', 'dynamic']) {
      await still({...raw, style, brand: customer, aiLabel: {text: 'AI \u8f85\u52a9\u521b\u4f5c', show: true}}, finalFrame, `styles/${style}`);
      await still({...raw, style, brand: customer}, 0, `styles/${style}-cover`, true);
    }
    // AI disclosure lives outside page effects, including hook and transitions.
    const hook = structuredClone(raw); hook.hook = {text: '\u4ece\u60f3\u6cd5\u5230\u53ef\u9760\u7ed3\u679c', durationMs: 1400}; await still(hook, 15, 'effects/hook');
    const transition = structuredClone(raw); transition.slides[1].effects = {transition: {type: 'push', durationMs: 600}}; await still(transition, transition.slides[1].fromFrame + 9, 'effects/transition');
    report.checks.push('AI remains visible during root hook and in-page push transition');
    write(path.join(out, 'verification.json'), report);
  }
} finally {await browser.close({silent: true});}
if (!baseline) {
  function tile(files, target, columns = 3, width = 324) {const height = Math.round(width * 1920 / 1080), args = []; for (const file of files) args.push('-i', path.join(out, file)); const filters = files.map((_, i) => `[${i}:v]scale=${width}:${height}[v${i}]`).join(';'); run([...args, '-filter_complex_threads', '2', '-filter_complex', `${filters};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${i % columns * width}_${Math.floor(i / columns) * height}`).join('|')}:fill=black`, '-frames:v', '1', path.join(out, target)]);}
  tile(['defaults.png', 'customer.png', 'brand-off.png', 'ai-on.png', 'ai-off.png', 'custom-ai.png'], 'brand-comparison.png');
  tile(['styles/industrial.png', 'styles/clean.png', 'styles/dynamic.png'], 'three-styles.png');
  tile(['covers/defaults.png', 'covers/customer.png', 'covers/both-off.png'], 'cover-comparison.png');
  const before = JSON.parse(fs.readFileSync(path.join(out, 'protected-before.json'), 'utf8')); report.protectedFiles = before.map(f => ({file: f.file, unchanged: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f.file))).digest('hex') === f.sha256})); assert(report.protectedFiles.every(f => f.unchanged));
  write(path.join(out, 'verification.json'), report); console.log(`VERIFIED ${report.audits.length} DOM audits, ${report.evidence.length} variations; protected ${before.length} files unchanged. ${out}`);
}
