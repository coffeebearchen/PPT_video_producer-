import { DatabaseSync } from 'node:sqlite';

const base = 'http://127.0.0.1:4310';
const json = async (url, opts = {}) => {
  const r = await fetch(base + url, { headers: { 'content-type': 'application/json' }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${data.error || JSON.stringify(data)}`);
  return data;
};
const stamp = Date.now();
let groupId = '', briefId = '';
const channelIds = [];
try {
  const group = (await json('/api/account-groups', { method: 'POST', body: JSON.stringify({ name: `E2E品牌${stamp}`, color: '#8E44AD', description: '测试账号组' }) })).group;
  groupId = group.id;
  const article = (await json('/api/wechat-accounts', { method: 'POST', body: JSON.stringify({ group_id: groupId, name: 'E2E品牌公众号', appid: `wx_group_${stamp}`, secret: 'x', color: '#8E44AD', channel: 'wechat_article' }) })).account;
  channelIds.push(article.id);
  const video = (await json('/api/wechat-accounts', { method: 'POST', body: JSON.stringify({ group_id: groupId, name: 'E2E品牌视频号', appid: '', secret: '', color: '#2E6F9E', channel: 'wechat_channels' }) })).account;
  channelIds.push(video.id);

  const brief = await json('/api/briefs', {
    method: 'POST',
    body: JSON.stringify({ title: `E2E账号组选题 ${stamp}`, topic: '测试账号组内容池', channels: ['wechat_article', 'wechat_channels'], group_id: groupId, account_id: article.id, quantity: 1 })
  });
  briefId = brief.id;
  if (brief.group_id !== groupId) throw new Error('brief group_id not persisted');

  const settings = await json('/api/settings');
  const g = settings.account_groups.find(x => x.id === groupId);
  if (!g || g.channels.length !== 2) throw new Error('group channels not returned');

  const briefs = await json('/api/briefs');
  if (!briefs.some(b => b.id === briefId && b.group_id === groupId)) throw new Error('group brief isolation failed');

  let groupGuard = false;
  try { await json(`/api/account-groups/${groupId}`, { method: 'DELETE' }); }
  catch (e) { groupGuard = String(e.message).includes('请先清理'); }
  if (!groupGuard) throw new Error('group delete guard failed');

  const db = new DatabaseSync('data/studio.db');
  db.prepare('DELETE FROM briefs WHERE id=?').run(briefId);
  db.close();
  briefId = '';
  for (const id of channelIds.reverse()) await json(`/api/wechat-accounts/${id}`, { method: 'DELETE' });
  channelIds.length = 0;
  await json(`/api/account-groups/${groupId}`, { method: 'DELETE' });
  groupId = '';

  console.log(JSON.stringify({ ok: true, group: true, twoChannels: true, briefGroup: true, groupGuard: true, cleanup: true }));
} catch (e) {
  try { if (briefId) { const db = new DatabaseSync('data/studio.db'); db.prepare('DELETE FROM briefs WHERE id=?').run(briefId); db.close(); } } catch {}
  for (const id of channelIds) { try { await json(`/api/wechat-accounts/${id}`, { method: 'DELETE' }); } catch {} }
  if (groupId) { try { await json(`/api/account-groups/${groupId}`, { method: 'DELETE' }); } catch {} }
  console.error(JSON.stringify({ ok: false, error: String(e.stack || e) }));
  process.exitCode = 1;
}
