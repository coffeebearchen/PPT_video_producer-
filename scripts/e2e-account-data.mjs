import { DatabaseSync } from 'node:sqlite';

const base = 'http://127.0.0.1:4310';
const json = async (url, opts = {}) => {
  const r = await fetch(base + url, { headers: { 'content-type': 'application/json' }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${data.error || JSON.stringify(data)}`);
  return data;
};
const stamp = Date.now();
const created = [];
let briefId = '';
try {
  const a1 = (await json('/api/wechat-accounts', { method: 'POST', body: JSON.stringify({ name: 'E2E公众号A', appid: `wx_e2e_${stamp}_a`, secret: 'x', color: '#2E7D6B', channel: 'wechat_article' }) })).account;
  created.push(a1);
  const a2 = (await json('/api/wechat-accounts', { method: 'POST', body: JSON.stringify({ name: 'E2E视频号B', appid: '', secret: '', color: '#8E44AD', channel: 'wechat_channels' }) })).account;
  created.push(a2);

  const brief = await json('/api/briefs', {
    method: 'POST',
    body: JSON.stringify({
      title: `E2E归属测试 ${stamp}`,
      topic: '验证选题只进入指定账号空间',
      channels: ['wechat_article'],
      account_id: a1.id,
      quantity: 1
    })
  });
  briefId = brief.id;
  if (brief.account_id !== a1.id) throw new Error('brief account_id not persisted');

  const list = await json('/api/briefs');
  const inA = list.filter(b => b.account_id === a1.id && b.id === briefId);
  const inB = list.filter(b => b.account_id === a2.id && b.id === briefId);
  if (inA.length !== 1 || inB.length !== 0) throw new Error('account isolation failed');

  let guard = false;
  try { await json(`/api/wechat-accounts/${a1.id}`, { method: 'DELETE' }); }
  catch (e) { guard = String(e.message).includes('请先转移内容'); }
  if (!guard) throw new Error('delete guard failed');

  await json(`/api/briefs/${briefId}/account`, { method: 'PUT', body: JSON.stringify({ account_id: a2.id }) });
  const after = (await json('/api/briefs')).find(b => b.id === briefId);
  if (after.account_id !== a2.id) throw new Error('brief reassignment failed');

  const db = new DatabaseSync('data/studio.db');
  db.prepare('DELETE FROM briefs WHERE id=?').run(briefId);
  db.close();
  briefId = '';

  for (const a of created.reverse()) await json(`/api/wechat-accounts/${a.id}`, { method: 'DELETE' });
  console.log(JSON.stringify({ ok: true, accountsCreated: 2, briefIsolation: true, deleteGuard: true, reassignment: true, cleanup: true }));
} catch (e) {
  if (briefId) {
    try { const db = new DatabaseSync('data/studio.db'); db.prepare('DELETE FROM briefs WHERE id=?').run(briefId); db.close(); } catch {}
  }
  for (const a of created) { try { await json(`/api/wechat-accounts/${a.id}`, { method: 'DELETE' }); } catch {} }
  console.error(JSON.stringify({ ok: false, error: String(e.stack || e) }));
  process.exitCode = 1;
}
