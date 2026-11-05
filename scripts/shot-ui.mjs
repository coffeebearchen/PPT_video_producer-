#!/usr/bin/env node
/**
 * Screenshot a Studio page after running one JS expression (for modals).
 *
 * Usage:
 *   node scripts/shot-ui.mjs "#/briefs" "document.querySelector('.head-actions [data-action=\"new-brief\"]')?.click()" out/shot.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [, , route = '#/', expression = '', output = 'out/shot.png'] = process.argv;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333 + Math.floor(Math.random() * 200);
const profile = path.resolve('out', `.chrome-shot-${PORT}`);
const url = `http://127.0.0.1:4310/${route.startsWith('#') ? route : '#' + route}`;
const target = path.resolve(output);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1600,1400', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function json(pathname, opts) {
  const res = await fetch(`http://127.0.0.1:${PORT}${pathname}`, opts);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

let ws;
try {
  for (let i = 0; i < 50; i++) {
    try { await json('/json/version'); break; } catch { await sleep(100); }
  }
  const page = await json(`/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  const cmd = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await sleep(2200);
  if (expression) {
    const result = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result?.exceptionDetails) throw new Error(result.exceptionDetails.text);
    if (result?.result?.value !== undefined) console.log('eval:', String(result.result.value).slice(0, 1200));
    await sleep(700);
  }
  const shot = await cmd('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(target, Buffer.from(shot.data, 'base64'));
  console.log(`screenshot: ${target}`);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
