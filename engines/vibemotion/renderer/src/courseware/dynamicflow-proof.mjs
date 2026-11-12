/** Reproducible, local-only six-page demo and relaxed legacy render smoke. No API/TTS needed. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {validateResolved} from './model.ts';
import {flowSchedule, screenshotSlide, staticContent} from './dynamicflow/timing.ts';
const renderer = path.resolve(import.meta.dirname, '../..');
const root = path.resolve(renderer, '../../..');
const out = path.join(root, 'out/dynamicflow');
const assets = path.join(renderer, 'public/courseware/dynamicflow/demo');
fs.mkdirSync(out, {recursive: true}); fs.mkdirSync(assets, {recursive: true});
const require = createRequire(path.join(renderer, 'package.json'));
const {bundle} = require('@remotion/bundler');
const {openBrowser, selectComposition, renderStill, renderMedia} = require('@remotion/renderer');
const ts = require('typescript');
const config = ts.readConfigFile(path.join(renderer, 'tsconfig.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, renderer);
const program = ts.createProgram([path.join(renderer, 'src/courseware/index.tsx')], parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: x => x, getCurrentDirectory: () => renderer, getNewLine: () => '\n'}));
console.log('PASS courseware dependency tree: zero TypeScript diagnostics');
const base = {schemaVersion: 'courseware/1', taskId: 'dynamicflow', renderId: 'demo', draftRevision: 0, title: '让思路\n一步步看得见', style: 'dynamicflow', canvas: {width: 1080, height: 1920, fps: 30}, publicRoot: 'renderer/public', stagingDir: 'courseware/dynamicflow/demo', brand: {text: '固定地址', show: true}, aiLabel: {text: 'AI 生成', show: true}};
const flow = {id: 'flow', kind: 'flow', text: '把复杂问题\n拆成清楚的动作', fromFrame: 0, durationInFrames: 180, nodes: [{id: 'a', label: '提出一个问题'}, {id: 'b', label: '找到关键证据'}, {id: 'c', label: '给出可执行的结论'}], edges: [{from: 'a', to: 'b'}, {from: 'b', to: 'c'}]};
assert.equal(flowSchedule(flow).nodes[1].start, 1500);
assert.equal(staticContent(flow, 30, flowSchedule(flow).end), false);
assert.equal(staticContent({...flow, durationInFrames: 15}, 30, flowSchedule(flow).end), true);
const shotTest = screenshotSlide({id: 's', kind: 'screenshot', text: 'x', fromFrame: 0, durationInFrames: 150, highlight: {x: .1, y: .1, w: .2, h: .2}, annotation: 'circle'}, 30);
assert.equal(shotTest.effects.motion.steps[2].scale, 1.35);
assert.equal(shotTest.effects.annotationAnim.durationMs, 600);
console.log('PASS flow relay, short-page fallback, screenshot timing');
process.chdir(renderer);
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || '/usr/bin/chromium';
const browser = await openBrowser('chrome', {browserExecutable, logLevel: 'error'});
let serveUrl;
const report = {checks: ['Scoped TypeScript', 'Flow schedule', 'Short-page fallback', 'Screenshot defaults'], audits: [], legacy: []};
async function composition(props, id = 'Courseware') {return selectComposition({serveUrl, id, inputProps: props, puppeteerInstance: browser, browserExecutable, logLevel: 'error'});}
async function still(props, frame, file, cover = false, audit = true) {
  const inputProps = {...props, audit};
  await renderStill({serveUrl, composition: await composition(inputProps, cover ? 'CoursewareCover' : 'Courseware'), inputProps, frame, output: file, imageFormat: 'png', puppeteerInstance: browser, browserExecutable, logLevel: 'error', onBrowserLog: log => {if(log.text.startsWith('COURSEWARE_AUDIT='))report.audits.push(JSON.parse(log.text.slice(17)));}});
}
async function video(props, file, options = {}) {
  await renderMedia({serveUrl, composition: await composition(props), inputProps: props, codec: 'h264', outputLocation: file, browserExecutable, concurrency: 2, logLevel: 'error', ...options});
}
try {
  serveUrl = await bundle({entryPoint: path.join(renderer, 'src/courseware/index.tsx')});
  const seed = validateResolved({...base, totalFrames: 180, totalDurationSeconds: 6, slides: [flow]});
  await still(seed, 130, path.join(assets, 'diagram.png'));
  await video(seed, path.join(assets, 'motion.mp4'), {frameRange: [12, 71]});
  // Bundle again so newly generated local assets are included.
  serveUrl = await bundle({entryPoint: path.join(renderer, 'src/courseware/index.tsx')});
  const slides = [
    {id: 'opening', kind: 'title', text: '让思路\n一步步看得见', body: '先讲清楚，再往前走', durationInFrames: 120},
    {...flow, caption: '先有问题，再有证据，最后给出结论。'},
    {id: 'points', kind: 'bullet', text: '把注意力\n留给真正的重点', bullets: ['每页只讲一个观点', '让信息依次出现', '讲完以后，停下来'], durationInFrames: 150, caption: '少一点同时出现，多一点理解的时间。'},
    {id: 'shot', kind: 'screenshot', text: '看清楚\n关键的那一步', asset: {src: `${base.stagingDir}/diagram.png`, width: 1080, height: 1920}, highlight: {x: .17, y: .44, w: .66, h: .08}, annotation: 'underline', dim: .25, durationInFrames: 150, caption: '镜头停稳，再圈出需要关注的内容。'},
    {id: 'clip', kind: 'video', text: '让真实片段\n接着把话说完', asset: {src: `${base.stagingDir}/motion.mp4`, width: 1080, height: 1920}, trim: {startSeconds: .2, endSeconds: 1.8}, muted: true, fit: 'contain', durationInFrames: 120, caption: '保留原片段，按选定区间循环播放。'},
    {id: 'closing', kind: 'quote', text: '流动的是思路\n留下的是理解', body: '一条清楚的线，胜过满屏热闹', durationInFrames: 120},
  ];
  let cursor = 0; for(const s of slides) {s.fromFrame = cursor; cursor += s.durationInFrames;}
  const props = validateResolved({...base, slides, totalFrames: cursor, totalDurationSeconds: cursor / 30});
  fs.writeFileSync(path.join(out, 'resolved-props.json'), JSON.stringify(props, null, 2));
  await still(props, 0, path.join(out, 'cover.png'), true);
  for(const s of props.slides) {await still(props, s.fromFrame + s.durationInFrames - 2, path.join(out, `${s.kind}.png`)); console.log('PASS dynamicflow', s.kind);}
  for(const f of [132, 145, 159, 165, 180, 210]) await still(props, f, path.join(out, `relay-${f}.png`), false, false);
  for(const style of ['industrial', 'clean', 'dynamic']) {
    const legacy = {...props, style};
    for(const s of legacy.slides) await still(legacy, s.fromFrame + s.durationInFrames - 2, path.join(out, `${style}-${s.kind}.png`), false, false);
    await video(legacy, path.join(out, `${style}-smoke.mp4`), {frameRange: [120,149], scale: .5});
    report.legacy.push(style);console.log('PASS legacy six kinds + video render:', style);
  }
  await video(props, path.join(out, 'dynamicflow-demo.mp4'));
  report.checks.push('Six-page sample rendered');
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2));
  console.log('DONE', path.join(out, 'dynamicflow-demo.mp4'));
} finally {await browser.close({silent: true});}
