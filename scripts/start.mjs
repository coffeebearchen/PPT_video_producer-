import net from 'node:net';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 4310);
const URL = `http://127.0.0.1:${PORT}`;
const probe = () => new Promise(resolve => {
  const s = net.connect(PORT, '127.0.0.1');
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
});
const open = () => {
  try { spawn('cmd', ['/c', 'start', '', URL], { stdio: 'ignore', detached: true }).unref(); } catch {}
};
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!fs.existsSync(chrome)) console.warn('[start] Chrome not found at', chrome);
if (!fs.existsSync('renderer/render.mjs')) console.error('[start] not in studio directory');
if (await probe()) {
  console.log('[start] already running:', URL);
  open();
  process.exit(0);
}
const child = spawn(process.execPath, ['server.mjs'], { stdio: 'inherit', env: process.env });
setTimeout(open, 1500);
child.on('exit', code => process.exit(code ?? 0));
