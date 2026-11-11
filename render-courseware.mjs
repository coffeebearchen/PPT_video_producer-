// Independent Courseware demo. No server, queue, settings or database imports.
// node render-courseware.mjs [--storyboard file.json] [--style industrial|clean|dynamic] [--check]
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const renderer = path.join(root, 'engines', 'vibemotion', 'renderer');
const publicDir = path.join(renderer, 'public');
const out = path.join(root, 'out', 'courseware');
const entry = 'src/courseware/index.tsx';
const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${name} 缺少参数`);
  return args[i + 1];
}
for (let i = 0; i < args.length; i++) {
  if (['--storyboard', '--style'].includes(args[i])) {i++; continue;}
  if (args[i] !== '--check') throw new Error(`未知参数：${args[i]}`);
}

const sample = {
  title: '用固定地址\n制作一条视频', style: 'industrial',
  slides: [
    {kind: 'title', text: '用固定地址\n制作一条视频', body: '从新建到检查成片\n把一次制作过程走清楚', caption: '从工作台开始，把文案变成可以检查的成片。', durationSeconds: 6},
    {kind: 'screenshot', text: '先从工作台\n新建视频', asset: 'screenshots/courseware-workbench.png', highlight: {x: 18 / 238, y: 171 / 440, w: 190 / 238, h: 48 / 440}, annotation: 'arrow', body: '点击左侧「新建视频」\n进入内容与风格设置', caption: '找到左侧的新建视频入口，点击进入制作。', durationSeconds: 8},
    {kind: 'flow', text: '把制作拆成\n四个可检查的动作', nodes: [{id: 'copy', label: '填入文案'}, {id: 'style', label: '选择风格'}, {id: 'render', label: '生成成片'}, {id: 'review', label: '检查导出'}], edges: [{from: 'copy', to: 'style'}, {from: 'style', to: 'render'}, {from: 'render', to: 'review'}], body: '先确认内容，再生成视频\n检查通过后再进入审批', caption: '填入文案，选择风格。生成成片后，检查画面与字幕。', durationSeconds: 8},
    {kind: 'quote', text: '先把成片看一遍\n再进入审批', body: '画面清楚 · 字幕准确 · 节奏合适', caption: '确认画面和字幕没有问题，再进入审批流程。', durationSeconds: 6},
  ],
};

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8', windowsHide: true});
  if (r.error || r.status !== 0) throw new Error(`ffprobe 失败：${r.error?.message || r.stderr}`);
  return JSON.parse(r.stdout);
}
function assetFile(src) {
  if (typeof src !== 'string' || !src || src.includes('\\') || src.includes(':') || src.startsWith('/') || src.split('/').some(v => !v || v === '.' || v === '..')) throw new Error('素材须为 renderer/public 内相对路径');
  const file = fs.realpathSync(path.join(publicDir, src));
  const relative = path.relative(fs.realpathSync(publicDir), file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('素材越过 public 边界');
  return file;
}
const inputFile = option('--storyboard');
const board = inputFile ? JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf8').replace(/^\uFEFF/, '')) : structuredClone(sample);
board.style = option('--style') ?? board.style ?? 'industrial';
if (!['industrial', 'clean', 'dynamic'].includes(board.style)) throw new Error('style 须为 industrial / clean / dynamic');
if (!Array.isArray(board.slides) || !board.slides.length) throw new Error('storyboard.slides 不能为空');
for (const slide of board.slides) {
  if (slide.kind === 'screenshot') {
    const src = typeof slide.asset === 'string' ? slide.asset : slide.asset?.src;
    const info = probe(assetFile(src)).streams.find(s => s.codec_type === 'video');
    if (!info?.width || !info?.height) throw new Error('不能读取截图尺寸');
    if (typeof slide.asset === 'object' && ((slide.asset.width && slide.asset.width !== info.width) || (slide.asset.height && slide.asset.height !== info.height))) throw new Error('声明的截图尺寸与真实尺寸不符');
    slide.asset = {src, width: info.width, height: info.height};
  }
  if (slide.narration) {
    const actual = Number(probe(assetFile(slide.narration.src)).format.duration);
    if (!(actual > 0)) throw new Error('不能读取配音时长');
    if (slide.narration.durationSeconds && Math.abs(slide.narration.durationSeconds - actual) > 0.15) throw new Error('配音声明时长与真实时长不符');
    slide.narration.durationSeconds = actual;
    if (slide.durationSeconds && slide.durationSeconds < actual) throw new Error('页时长不能短于配音');
  }
}
const fonts = JSON.parse(fs.readFileSync(path.join(renderer, 'fonts.json'), 'utf8'));
for (const file of Object.values(fonts)) assetFile(file);
fs.mkdirSync(out, {recursive: true});
const propsFile = path.join(out, 'props.json');
fs.writeFileSync(path.join(out, 'storyboard.json'), JSON.stringify(board, null, 2));
fs.writeFileSync(propsFile, JSON.stringify({storyboard: board, audit: true}, null, 2));
const npxJS = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
const npx = process.platform === 'win32' ? process.execPath : 'npx';
const npxPrefix = process.platform === 'win32' ? [npxJS] : [];
if (process.platform === 'win32' && !fs.existsSync(npxJS)) throw new Error(`找不到 npm 自带 npx：${npxJS}`);
const log = fs.createWriteStream(path.join(out, args.includes('--check') ? 'preflight.log' : 'render.log'));
async function run(command, argv, cwd = root) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, argv, {cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe']});
    let tail = ''; let last = 0;
    const data = chunk => {
      const s = chunk.toString(); log.write(s); tail = (tail + s).slice(-6000);
      if (Date.now() - last > 5000) {last = Date.now(); process.stdout.write(s.slice(-240));}
    };
    child.stdout.on('data', data); child.stderr.on('data', data);
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} 退出码 ${code}\n${tail}`)));
  });
}
const remotion = argv => run(npx, [...npxPrefix, '--offline', '--no-install', 'remotion', ...argv], renderer);
try {
  if (args.includes('--check')) {
    await remotion(['compositions', entry, `--props=${propsFile}`]);
    console.log('\n预检通过；未渲染视频。');
  } else {
    console.log(`独立样片：${board.style}；输出 ${out}`);
    await remotion(['render', entry, 'Courseware', path.join(out, 'video.mp4'), '--codec=h264', '--overwrite', '--concurrency=2', `--props=${propsFile}`]);
    await remotion(['still', entry, 'CoursewareCover', path.join(out, 'cover.png'), '--image-format=png', '--overwrite', `--props=${propsFile}`]);
    const info = probe(path.join(out, 'video.mp4'));
    const video = info.streams.find(s => s.codec_type === 'video');
    if (video.width !== 1080 || video.height !== 1920 || video.r_frame_rate !== '30/1' || video.codec_name !== 'h264') throw new Error('成片格式验收失败');
    const duration = Number(info.format.duration);
    const total = board.slides.reduce((n, s) => n + (s.durationSeconds ?? (s.narration ? s.narration.durationSeconds + 0.6 : board.defaultSlideSeconds ?? 6)), 0);
    if (Math.abs(duration - total) > board.slides.length / 30 + 0.05) throw new Error('成片时长与 storyboard 不符');
    const screenshotAt = board.slides[0]?.durationSeconds ?? board.defaultSlideSeconds ?? 6;
    const times = board.slides.length === 4 ? [screenshotAt + 3, duration * 0.65, duration - 2] : [duration * 0.2, duration * 0.5, duration * 0.85];
    for (let i = 0; i < 3; i++) await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.min(duration - 0.1, times[i])), '-i', path.join(out, 'video.mp4'), '-frames:v', '1', '-update', '1', path.join(out, `frame-${i + 1}.png`)]);
    const cover = probe(path.join(out, 'cover.png')).streams[0];
    if (cover.codec_name !== 'png' || cover.width !== 1080 || cover.height !== 1920) throw new Error('封面验收失败');
    fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify({resolution: [video.width, video.height], fps: video.r_frame_rate, codec: video.codec_name, durationSeconds: duration, style: board.style, slides: board.slides.length, frameTimes: times, audio: info.streams.some(s => s.codec_type === 'audio'), layoutAudit: true, serverImported: false}, null, 2));
    console.log(`\n输出：\n${path.join(out, 'video.mp4')}\n${path.join(out, 'cover.png')}\nframe-1.png / frame-2.png / frame-3.png`);
  }
} finally {log.end();}
