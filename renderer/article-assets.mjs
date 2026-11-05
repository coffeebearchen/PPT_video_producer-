import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const HERE = import.meta.dirname;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CHROME_ARTICLE_PORT || 9445);

const args = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const specPath = path.resolve(arg('--spec'));
const outDir = path.resolve(arg('--out'));
if (!fs.existsSync(specPath)) throw new Error('spec not found: ' + specPath);
fs.mkdirSync(outDir, { recursive: true });
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const a = spec.article || {};
const p1 = spec.page1 || {};
const p2 = spec.page2 || {};
const sections = Array.isArray(a.sections) ? a.sections : [];
const data = {
  title: a.title || p1.highlight || '固定地址',
  cover_text: a.cover_text || p1.highlight || '地址固定，才能自动发布',
  h1: sections[0]?.heading || p1.kicker || '先把问题讲成一张门牌',
  highlight: p1.highlight || '固定公网 IP',
  footnote: p1.footnote || '地址不固定，信就寄不到。',
  h2: sections[1]?.heading || p2.kicker || 'NAS 能干活，但地址每天在变',
  h3: sections[2]?.heading || '今天就能做的 3 个检查'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitHttp(url, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch {}
    await sleep(100);
  }
  throw new Error('Chrome DevTools not ready');
}
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        for (const fn of (this.events.get(msg.method) || [])) fn(msg.params);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('CDP timeout: ' + method)); }
      }, 30000);
    });
  }
  once(method, timeout = 15000) {
    return new Promise((res, rej) => {
      const fn = (params) => {
        clearTimeout(tm);
        const arr = this.events.get(method) || [];
        const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1);
        res(params);
      };
      const arr = this.events.get(method) || [];
      arr.push(fn); this.events.set(method, arr);
      const tm = setTimeout(() => rej(new Error('event timeout: ' + method)), timeout);
    });
  }
}

const profileDir = path.join(outDir, '.chrome-profile');
fs.rmSync(profileDir, { recursive: true, force: true });
fs.mkdirSync(profileDir, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu',
  '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
  '--window-size=1080,720', 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += d.toString(); });

try {
  await waitHttp(`http://127.0.0.1:${PORT}/json/version`);
  const pages = await waitHttp(`http://127.0.0.1:${PORT}/json/list`);
  const target = pages.find(p => p.type === 'page');
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const templateUrl = 'file:///' + path.join(HERE, 'article-assets.html').replaceAll('\\', '/');
  await cdp.send('Page.navigate', { url: templateUrl });
  await cdp.once('Page.loadEventFired');
  const evalJS = async (expression, awaitPromise = false) => {
    const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
    return r.result?.value;
  };
  await evalJS('document.fonts.ready.then(() => true)', true);
  await sleep(150);

  const jobs = [
    ['cover', 900, 383, 'article-cover.png'],
    ['f1', 1080, 720, 'article-1.png'],
    ['f2', 1080, 720, 'article-2.png'],
    ['f3', 1080, 720, 'article-3.png']
  ];
  for (const [mode, width, height, filename] of jobs) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false,
      screenWidth: width, screenHeight: height
    });
    await evalJS(`window.renderAsset(${JSON.stringify(mode)}, ${JSON.stringify(data)}); true`);
    await sleep(80);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const p = path.join(outDir, filename);
    fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
    console.log(JSON.stringify({ type: 'asset', mode, path: p }));
  }
  console.log(JSON.stringify({ type: 'done', count: jobs.length }));
} catch (e) {
  console.log(JSON.stringify({ type: 'error', message: String(e?.stack || e), chrome: chromeErr.slice(-1200) }));
  process.exitCode = 1;
} finally {
  try { chrome.kill(); } catch {}
  await sleep(150);
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
