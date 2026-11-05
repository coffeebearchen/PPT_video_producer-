import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { buildMotion } from '../lib/motion.mjs';

const HERE = path.resolve(import.meta.dirname, '..', 'renderer');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CHROME_PORT || 9444);
const FPS = 30;
const DURATION = 21;
const TOTAL_FRAMES = FPS * DURATION;

const args = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const specPath = path.resolve(arg('--spec'));
const outDir = path.resolve(arg('--out'));
const mode = arg('--mode', 'preview');
if (!fs.existsSync(specPath)) throw new Error('spec not found: ' + specPath);
fs.mkdirSync(outDir, { recursive: true });
const framesDir = path.join(outDir, 'frames');
if (mode === 'full') {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const profileDir = path.join(outDir, '.chrome-profile');
fs.rmSync(profileDir, { recursive: true, force: true });
fs.mkdirSync(profileDir, { recursive: true });

const log = (obj) => console.log(JSON.stringify(obj));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const timing = (label) => console.error(`[timing] ${label} ${Date.now() - t0}ms`);

async function waitHttp(url, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(120);
  }
  throw new Error('Chrome DevTools did not start');
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        const list = this.events.get(msg.method) || [];
        for (const fn of list) fn(msg.params);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          rej(new Error('CDP timeout: ' + method));
        }
      }, 60000);
    });
  }
  once(method, timeout = 20000) {
    return new Promise((res, rej) => {
      const fn = (params) => {
        clearTimeout(tm);
        const arr = this.events.get(method) || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
        res(params);
      };
      const arr = this.events.get(method) || [];
      arr.push(fn);
      this.events.set(method, arr);
      const tm = setTimeout(() => rej(new Error('event timeout: ' + method)), timeout);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

function injectSpecScript(spec, motion) {
  const safeSpec = JSON.stringify(spec);
  const safeMotion = JSON.stringify(motion || {});
  return `(() => {
    const spec = ${safeSpec};
    window.MOTION = ${safeMotion};
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const allowBasic = (s) => String(s ?? '').replace(/<(?!\\/?(?:b|br)\\b)[^>]*>/gi, '');
    const setText = (el, v) => { if (el) el.textContent = String(v ?? ''); };
    const setHTML = (el, v) => { if (el) el.innerHTML = String(v ?? ''); };

    const meta1 = $('p1-meta');
    if (meta1?.children[0]) meta1.children[0].textContent = spec.meta.p1_left;
    if (meta1?.children[1]) meta1.children[1].textContent = spec.meta.p1_right;
    const meta2 = $('p2-meta');
    if (meta2?.children[0]) meta2.children[0].textContent = spec.meta.p2_left;
    if (meta2?.children[1]) meta2.children[1].textContent = spec.meta.p2_right;
    const meta3 = $('p3-meta');
    if (meta3?.children[0]) meta3.children[0].textContent = spec.meta.p3_left;
    if (meta3?.children[1]) meta3.children[1].textContent = spec.meta.p3_right;

    setHTML($('p1-kicker'), esc(spec.page1.kicker) + (spec.page1.kicker_accent ? '<b>' + esc(spec.page1.kicker_accent) + '</b>' : ''));
    const p1 = spec.page1.lines || [];
    const l1 = $('p1-l1'), l2 = $('p1-l2'), l3 = $('p1-l3');
    if (l1) l1.textContent = p1[0] || '';
    if (l2) {
      if (spec.page1.quote_line2) l2.innerHTML = '<span class="q">「</span>' + esc(p1[1] || '') + '<span class="q">」</span>';
      else l2.textContent = p1[1] || '';
    }
    if (l3) {
      l3.textContent = p1[2] || '';
      l3.parentElement.style.display = p1[2] ? '' : 'none';
    }
    // Dense page-1 copy should not run under the decorative stamp.
    const dense = p1.join('').length > 15 || (p1[0] || '').length > 7;
    const stampCard = $('p1-stamp');
    if (stampCard) stampCard.style.display = dense ? 'none' : '';
    setText($('p1-addr'), spec.page1.addr_label);
    const ip = $('p1-ip');
    if (ip) {
      ip.innerHTML = esc(spec.page1.highlight) + (spec.page1.highlight_latin ? '<span class="latin">' + esc(spec.page1.highlight_latin) + '</span>' : '');
    }
    setText($('p1-en'), spec.page1.en);
    setText($('p1-foot'), spec.page1.footnote);
    const stampWord = document.querySelector('#p1-stamp .stamp-word');
    if (stampWord) stampWord.innerHTML = esc(spec.page1.stamp_line1) + '<br><span>' + esc(spec.page1.stamp_line2) + '</span>';

    setHTML($('p2-kicker'), esc(spec.page2.kicker) + (spec.page2.kicker_accent ? '<b>' + esc(spec.page2.kicker_accent) + '</b>' : ''));
    const nas = $('p2-nas');
    if (nas) {
      setText(nas.querySelector('.tag'), '01 / ' + spec.page2.left_tag);
      const lines = nas.querySelectorAll('.bigline');
      if (lines[0]) {
        if (spec.page2.left_thin) lines[0].innerHTML = '<span class="thin">' + esc(spec.page2.left_thin) + '</span>' + esc(spec.page2.left_line1_rest);
        else lines[0].textContent = spec.page2.left_line1_rest;
      }
      if (lines[1]) lines[1].textContent = spec.page2.left_line2;
    }
    setText($('p2-stamp'), spec.page2.left_stamp);

    const cloud = $('p2-cloud');
    if (cloud) {
      setText(cloud.querySelector('.tag'), '02 / ' + spec.page2.right_tag);
    }
    const cloudLine = cloud?.querySelector('.bigline');
    if (cloudLine?.firstChild && cloudLine.firstChild.nodeType === 3) {
      cloudLine.firstChild.nodeValue = spec.page2.right_prefix;
    }
    setText($('p2-hl'), spec.page2.right_highlight);
    const tick = $('p2-tick');
    if (tick?.lastChild && tick.lastChild.nodeType === 3) tick.lastChild.nodeValue = ' ' + spec.page2.right_badge;

    setText($('p2-small'), spec.page2.conclusion_small);
    const big = $('p2-big');
    if (big?.firstChild && big.firstChild.nodeType === 3) big.firstChild.nodeValue = spec.page2.conclusion_prefix;
    setText($('p2-hl2'), spec.page2.conclusion_highlight);
    setHTML($('p2-foot'), allowBasic(spec.page2.footnote));

    setHTML($('p3-note'), allowBasic(spec.page3.note));
    setText($('p3-bottom'), spec.page3.bottom);
    const info = $('p3-info');
    if (info) {
      setText(info.querySelector('.title'), spec.page3.title);
      setText(info.querySelector('.sub'), spec.page3.subtitle);
    }
    setText(document.querySelector('.hud .brand'), spec.brand);

    const fitLine = (el, max, min) => {
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const available = parent.getBoundingClientRect().width;
      if (!available) return;
      let size = max;
      el.style.fontSize = size + 'px';
      let guard = 0;
      while (el.getBoundingClientRect().width > available && size > min && guard++ < 120) {
        size -= 1;
        el.style.fontSize = size + 'px';
      }
    };
    fitLine(l1, 128, 72);
    fitLine(l2, 158, 78);
    fitLine(l3, 128, 72);
    fitLine(nas?.querySelectorAll('.bigline')[0], 116, 64);
    fitLine(nas?.querySelectorAll('.bigline')[1], 116, 64);
    fitLine(cloudLine, 124, 64);
    fitLine(big, 84, 50);

    const fitPage = (selector) => {
      const pad = document.querySelector(selector + ' .pad');
      if (!pad) return;
      pad.style.zoom = '';
      let z = 1;
      while (pad.scrollHeight > pad.clientHeight + 2 && z > .78) {
        z -= .02;
        pad.style.zoom = z;
      }
    };
    fitPage('.p1');
    fitPage('.p2');

    window.renderAt(0);
    return { ok: true, spec: spec.brand };
  })()`;
}

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-features=CalculateNativeWinOcclusion',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1080,1920',
  '--allow-file-access-from-files',
  '--disable-gpu',
  '--font-render-hinting=none',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += d.toString(); });
let cdp;
try {
  timing('chrome-spawned');
  await waitHttp(`http://127.0.0.1:${PORT}/json/version`);
  timing('devtools-ready');
  const pages = await waitHttp(`http://127.0.0.1:${PORT}/json/list`);
  const target = pages.find(p => p.type === 'page');
  if (!target) throw new Error('No page target');
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false,
    screenWidth: 1080, screenHeight: 1920
  });
  const templateUrl = 'file:///' + path.join(HERE, 'template-quote-test.html').replaceAll('\\', '/');
  await cdp.send('Page.navigate', { url: templateUrl });
  timing('navigate-sent');
  await cdp.once('Page.loadEventFired');
  timing('load-event');

  const evalJS = async (expression, awaitPromise = false) => {
    const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result?.value;
  };

  await evalJS('document.fonts.ready.then(() => true)', true);
  timing('fonts-ready');
  const musicTrack = typeof spec.music === 'string' ? spec.music : (spec.music?.track || 'bgm');
  const waveFile = path.join(HERE, `waveform-${musicTrack}.js`);
  if (fs.existsSync(waveFile)) {
    const txt = fs.readFileSync(waveFile, 'utf8');
    const json = txt.replace(/^window\.WAVEFORM=/, '').replace(/;\s*$/, '');
    await evalJS(`window.WAVEFORM=${json}; true`);
  }
  const motion = buildMotion(spec.motion?.preset || 'flow', spec.motion || {});
  const applied = await evalJS(injectSpecScript(spec, motion), false);
  if (!applied?.ok) throw new Error('applySpec failed');
  timing('spec-applied');
  await sleep(300);

  if (mode === 'preview') {
    const times = arg('--times') ? arg('--times').split(',').map(Number).filter(Number.isFinite) : [2.8, 8.8, 15.2, 19.2];
    for (let i = 0; i < times.length; i++) {
      await evalJS(`window.renderAt(${times[i]}); true`);
      timing('renderAt-' + i);
      await sleep(40);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      timing('screenshot-' + i);
      const p = path.join(outDir, `preview-${i + 1}.png`);
      fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
      log({ type: 'preview', index: i + 1, path: p });
    }
    log({ type: 'done', mode, previews: 4 });
  } else {
    const started = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      await evalJS(`window.renderAt(${i / FPS}); true`);
      await sleep(4);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      fs.writeFileSync(path.join(framesDir, `frame_${String(i).padStart(5, '0')}.png`), Buffer.from(shot.data, 'base64'));
      if (i % 15 === 0 || i === TOTAL_FRAMES - 1) log({ type: 'progress', current: i + 1, total: TOTAL_FRAMES, sec: Math.round((Date.now() - started) / 1000) });
    }
    const coverSrc = path.join(framesDir, 'frame_00030.png');
    const coverDst = path.join(outDir, 'cover.png');
    if (fs.existsSync(coverSrc)) fs.copyFileSync(coverSrc, coverDst);
    for (const [i, sec] of [2.8, 8.8, 15.2, 19.2].entries()) {
      const src = path.join(framesDir, `frame_${String(Math.round(sec * FPS)).padStart(5, '0')}.png`);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, `preview-${i + 1}.png`));
    }

    const videoPath = path.join(outDir, 'video.mp4');
    let bgm = path.join(HERE, 'assets', musicTrack === 'pulse' ? 'music-pulse.wav' : 'bgm.wav');
    if (musicTrack !== 'pulse' && musicTrack !== 'minimal' && musicTrack !== 'none') {
      const libPath = path.join(HERE, '..', 'data', 'music', 'library.json');
      try {
        const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
        const entry = lib.find(t => t.id === musicTrack);
        if (entry?.file) bgm = path.join(HERE, '..', 'data', 'music', entry.file);
      } catch {}
    }
    const useAudio = musicTrack !== 'none' && fs.existsSync(bgm);
    const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'frame_%05d.png')];
    if (useAudio) ffArgs.push('-stream_loop', '-1', '-i', bgm);
    ffArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2');
    if (useAudio) ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    else ffArgs.push('-an');
    ffArgs.push('-movflags', '+faststart', '-metadata', `title=${spec.brand || 'FIXED ADDRESS'}`, videoPath);
    log({ type: 'encode_start' });
    const ff = spawnSync('ffmpeg', ffArgs, { encoding: 'utf8' });
    if (ff.status !== 0) throw new Error('ffmpeg failed: ' + (ff.stderr || '').slice(-1000));
    const hash = crypto.createHash('sha256').update(fs.readFileSync(videoPath)).digest('hex');
    log({ type: 'done', mode, video: videoPath, cover: coverDst, sha256: hash, duration: DURATION });
  }
  cdp.close();
} catch (e) {
  log({ type: 'error', message: String(e?.stack || e), chrome: chromeErr.slice(-1500) });
  process.exitCode = 1;
} finally {
  try { chrome.kill(); } catch {}
  await sleep(200);
}
