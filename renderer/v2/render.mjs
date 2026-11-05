import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';

const HERE = import.meta.dirname;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.V2_CHROME_PORT || 9455);
const FPS = 30;
const args = process.argv.slice(2);
const arg = (name, fallback = '') => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const specPath = path.resolve(arg('--spec'));
const outDir = path.resolve(arg('--out'));
const mode = arg('--mode', 'full');
if (!fs.existsSync(specPath)) throw new Error('spec not found');
fs.mkdirSync(outDir, { recursive: true });
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const duration = spec.page_count === 6 ? 28 : (spec.page_count === 5 ? 24 : 20);
const total = FPS * duration;
const framesDir = path.join(outDir, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
const profileDir = path.join(outDir, '.chrome-profile-v2');
fs.rmSync(profileDir, { recursive: true, force: true });
fs.mkdirSync(profileDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = o => console.log(JSON.stringify(o));

async function waitJson(url, timeout = 25000) {
  const t = Date.now();
  while (Date.now() - t < timeout) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch {}
    await sleep(120);
  }
  throw new Error('CDP unavailable');
}
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url); this.id = 0; this.pending = new Map(); this.events = new Map();
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = ev => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
      else if (m.method) for (const fn of this.events.get(m.method) || []) fn(m.params);
    };
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)); } }, 60000); }); }
  once(method, timeout = 20000) { return new Promise((res, rej) => { const fn = p => { clearTimeout(tm); const a = this.events.get(method) || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); res(p); }; const a = this.events.get(method) || []; a.push(fn); this.events.set(method, a); const tm = setTimeout(() => rej(new Error('event timeout ' + method)), timeout); }); }
  close() { try { this.ws.close(); } catch {} }
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--disable-background-networking', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=1080,1920',
  '--allow-file-access-from-files', 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = ''; chrome.stderr.on('data', d => chromeErr += d.toString());

try {
  await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const pages = await waitJson(`http://127.0.0.1:${PORT}/json/list`);
  const target = pages.find(p => p.type === 'page');
  const cdp = new CDP(target.webSocketDebuggerUrl); await cdp.ready;
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false, screenWidth: 1080, screenHeight: 1920 });
  const url = 'file:///' + path.join(HERE, 'template.html').replaceAll('\\', '/') + '?v=' + Date.now();
  await cdp.send('Page.navigate', { url });
  await cdp.once('Page.loadEventFired');
  const evalJS = async (expression, awaitPromise = false) => {
    const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result?.value;
  };
  await evalJS('document.fonts.ready.then(() => true)', true);
  const safeSpec = JSON.stringify(spec);
  await evalJS(`window.renderV2(${safeSpec}); true`);
  await sleep(200);
  if (mode === 'preview') {
    const times = (arg('--times') || '2.8,12,18').split(',').map(Number).filter(Number.isFinite);
    for (let i = 0; i < times.length; i++) {
      await evalJS(`window.renderAt(${times[i]}); true`);
      await sleep(50);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      fs.writeFileSync(path.join(outDir, `preview-${i + 1}.png`), Buffer.from(shot.data, 'base64'));
      log({ type: 'preview', index: i + 1, time: times[i] });
    }
    log({ type: 'done', mode: 'preview', previews: times.length });
    cdp.close();
    chrome.kill();
    process.exit(0);
  }

  for (let i = 0; i < total; i++) {
    await evalJS(`window.renderAt(${i / FPS}); true`);
    await sleep(4);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(framesDir, `frame_${String(i).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
    if (i % 30 === 0 || i === total - 1) log({ type: 'progress', current: i + 1, total, duration });
  }
  const layoutIssues = await evalJS('window.v2Check ? window.v2Check() : []');
  if (fs.existsSync(path.join(framesDir, 'frame_00090.jpg'))) fs.copyFileSync(path.join(framesDir, 'frame_00090.jpg'), path.join(outDir, 'cover.jpg'));
  for (const [i, sec] of [2.8, 8.0, 15.2, 21.5].entries()) {
    const f = path.join(framesDir, `frame_${String(Math.round(sec * FPS)).padStart(5, '0')}.jpg`);
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, `preview-${i + 1}.jpg`));
  }
  const video = path.join(outDir, 'video.mp4');
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'frame_%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', video], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; ff.stderr.on('data', d => err += d.toString()); ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg: ' + err.slice(-500))));
  });
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(video)).digest('hex');
  log({ type: 'done', mode, video, cover: path.join(outDir, 'cover.jpg'), sha256, duration, frames: total, layout_issues: layoutIssues });
  cdp.close();
} catch (e) {
  log({ type: 'error', message: String(e.stack || e), chrome: chromeErr.slice(-800) });
  process.exitCode = 1;
} finally {
  try { chrome.kill(); } catch {}
}



