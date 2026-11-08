import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9462;
const profile = path.resolve('data/e2e-chrome-profile');
fs.rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--window-size=1440,1100',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'inherit'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitJson(url, timeout = 20000) {
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
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      } else if (m.method) for (const fn of this.events.get(m.method) || []) fn(m.params);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
  once(method, timeout = 20000) {
    return new Promise((res, rej) => {
      const fn = p => { clearTimeout(tm); res(p); };
      const a = this.events.get(method) || []; a.push(fn); this.events.set(method, a);
      const tm = setTimeout(() => rej(new Error('event timeout ' + method)), timeout);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

let cdp;
try {
  await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const pages = await waitJson(`http://127.0.0.1:${PORT}/json/list`);
  const target = pages.find(p => p.type === 'page');
  cdp = new CDP(target.webSocketDebuggerUrl); await cdp.ready;
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  const evalJS = async expression => {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result?.value;
  };
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4310/#/settings' });
  await cdp.once('Page.loadEventFired'); await sleep(1200);

  const before = await (await fetch('http://127.0.0.1:4310/api/settings')).json();
  const beforeCount = before.wechat_accounts.length;
  await evalJS(`document.querySelector('[data-action="add-wechat-account"]').click(); true`);
  await sleep(300);
  const hasForm = await evalJS(`Boolean(document.querySelector('#wechat-account-form'))`);
  if (!hasForm) throw new Error('account form did not open');
  await evalJS(`(() => {
    const f = document.querySelector('#wechat-account-form');
    f.querySelector('[name="name"]').value = 'E2E测试公众号';
    f.querySelector('[name="appid"]').value = 'wx_e2e_test_account';
    f.querySelector('[name="secret"]').value = 'e2e_secret';
    f.querySelector('[name="color"]').value = '#2E7D6B';
    f.querySelector('[name="channel"]').value = 'wechat_article';
    f.requestSubmit();
    return true;
  })()`);
  await sleep(1200);
  const uiState = await evalJS("JSON.stringify({toast:document.querySelector('#toast')?.innerText||'',modal:!!document.querySelector('#wechat-account-form'),status:document.querySelector('#settings-status')?.innerText||''})");
  console.log('UI_STATE', uiState);
  const after = await (await fetch('http://127.0.0.1:4310/api/settings')).json();
  const created = after.wechat_accounts.find(a => a.name === 'E2E测试公众号');
  if (!created || after.wechat_accounts.length !== beforeCount + 1) throw new Error('account was not persisted via UI');

  await evalJS(`location.hash = '#/wechat/' + ${JSON.stringify(created.id)}; true`);
  await sleep(1500);
  const pageText = await evalJS(`document.body.innerText`);
  if (!pageText.includes('E2E测试公众号')) throw new Error('account workspace did not show the new account');
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync('data/e2e-account-workspace.png', Buffer.from(shot.data, 'base64'));

  await fetch('http://127.0.0.1:4310/api/wechat-accounts/' + created.id, { method: 'DELETE' });
  const final = await (await fetch('http://127.0.0.1:4310/api/settings')).json();
  if (final.wechat_accounts.some(a => a.id === created.id)) throw new Error('cleanup failed');

  console.log(JSON.stringify({ ok: true, beforeCount, afterCount: after.wechat_accounts.length, created: created.id, workspace: true, cleanup: true }));
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e.stack || e) }));
  process.exitCode = 1;
} finally {
  try { cdp?.close(); } catch {}
  try { chrome.kill(); } catch {}
}




