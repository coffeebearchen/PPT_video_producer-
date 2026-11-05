#!/usr/bin/env node
/**
 * v0.5 smoke test. Read-only; does not render or publish.
 * Run: npm run smoke:v0.5
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const BASE = process.env.STUDIO_URL || 'http://127.0.0.1:4310';
const checks = [];
const ok = (name, detail = '') => checks.push({ name, detail, pass: true });
const bad = (name, detail = '') => checks.push({ name, detail, pass: false });

async function get(pathname) {
  const res = await fetch(`${BASE}${pathname}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${pathname} HTTP ${res.status}`);
  return res.json();
}

try {
  const health = await get('/api/health');
  health.ok ? ok('server health', `llm=${health.llm}`) : bad('server health', JSON.stringify(health));
} catch (e) { bad('server health', e.message); }

for (const [name, pathname] of [
  ['briefs', '/api/briefs'],
  ['analogies', '/api/analogies'],
  ['soul', '/api/soul'],
  ['settings', '/api/settings'],
  ['music', '/api/music'],
  ['publish queue', '/api/publish/queue']
]) {
  try {
    const data = await get(pathname);
    const n = Array.isArray(data) ? data.length : (data.tracks?.length ?? data.items?.length ?? 'ok');
    ok(name, String(n));
  } catch (e) { bad(name, e.message); }
}

for (const file of ['server.mjs', 'public/index.html', 'public/app.js', 'public/styles.css', 'renderer/template.html', 'renderer/render.mjs']) {
  fs.existsSync(path.join(ROOT, file)) ? ok(`file ${file}`) : bad(`file ${file}`, 'missing');
}

try {
  const dbFile = path.join(ROOT, 'data', 'studio.db');
  fs.existsSync(dbFile) && fs.statSync(dbFile).size > 0 ? ok('database file') : bad('database file', 'missing or empty');
} catch (e) { bad('database file', e.message); }

const failed = checks.filter(c => !c.pass);
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? '  ' + c.detail : ''}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exitCode = failed.length ? 1 : 0;
