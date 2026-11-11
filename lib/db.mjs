import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const ROOT = path.resolve('.');
export const DATA_DIR = path.resolve(process.env.STUDIO_DATA_DIR || path.join(ROOT, 'data'));
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
export const KITS_DIR = path.join(DATA_DIR, 'publish-kits');
export const SEED_ASSETS = path.join(ROOT, 'seed-assets');
const DB_PATH = path.join(DATA_DIR, 'studio.db');

fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.mkdirSync(KITS_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  content_id TEXT DEFAULT '',
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  audience TEXT DEFAULT '',
  quantity INTEGER DEFAULT 3,
  analogy_domains TEXT DEFAULT '[]',
  must_include TEXT DEFAULT '',
  must_avoid TEXT DEFAULT '',
  channels TEXT DEFAULT '[]',
  tone TEXT DEFAULT '',
  cta TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  structure_id TEXT DEFAULT '',
  structure_name TEXT DEFAULT '',
  structure_type TEXT DEFAULT '',
  structure_snapshot TEXT DEFAULT '',
  page_count INTEGER DEFAULT 4,
  page_plan TEXT DEFAULT '[]',
  theme TEXT DEFAULT 'archive',
  template_id TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  url TEXT DEFAULT '',
  title TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  retrieved_at TEXT DEFAULT '',
  status TEXT DEFAULT 'ok',
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS angles (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thesis TEXT DEFAULT '',
  analogy_map TEXT DEFAULT '[]',
  hook TEXT DEFAULT '',
  selected INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS specs (
  id TEXT PRIMARY KEY,
  content_id TEXT DEFAULT '',
  brief_id TEXT NOT NULL,
  angle_id TEXT,
  version INTEGER DEFAULT 1,
  spec_json TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS renders (
  id TEXT PRIMARY KEY,
  content_id TEXT DEFAULT '',
  spec_id TEXT NOT NULL,
  brief_id TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  progress INTEGER DEFAULT 0,
  video_path TEXT DEFAULT '',
  cover_path TEXT DEFAULT '',
  preview_paths TEXT DEFAULT '[]',
  sha256 TEXT DEFAULT '',
  duration REAL DEFAULT 18,
  preflight_json TEXT DEFAULT '',
  preflight_status TEXT DEFAULT '',
  preflight_at TEXT DEFAULT '',
  layout_json TEXT DEFAULT '[]',
  error TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (spec_id) REFERENCES specs(id) ON DELETE CASCADE,
  FOREIGN KEY (brief_id) REFERENCES briefs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  render_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reviewer TEXT DEFAULT '',
  checklist_json TEXT DEFAULT '[]',
  comment TEXT DEFAULT '',
  snapshot_hash TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (render_id) REFERENCES renders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  content_id TEXT DEFAULT '',
  variant_id TEXT DEFAULT '',
  template_version TEXT DEFAULT '',
  provider TEXT DEFAULT '',
  provider_account_id TEXT DEFAULT '',
  provider_task_id TEXT DEFAULT '',
  platform_ref TEXT DEFAULT '',
  ai_label_status TEXT DEFAULT '',
  render_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  scheduled_at TEXT DEFAULT '',
  external_id TEXT DEFAULT '',
  url TEXT DEFAULT '',
  receipt_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (render_id) REFERENCES renders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS video_tasks (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  engine TEXT DEFAULT 'template',
  mode TEXT DEFAULT 'auto',
  template TEXT DEFAULT '',
  style TEXT DEFAULT 'industrial',
  avatar INTEGER DEFAULT 0,
  publish_status TEXT DEFAULT 'none',
  structure_type TEXT DEFAULT '',
  structure_name TEXT DEFAULT '',
  script TEXT DEFAULT '',
  voice_path TEXT DEFAULT '',
  voice_provider TEXT DEFAULT '',
  timeline_json TEXT DEFAULT '',
  palette TEXT DEFAULT 'cream',
  duration_ms INTEGER DEFAULT 30000,
  status TEXT DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  video_path TEXT DEFAULT '',
  cover_path TEXT DEFAULT '',
  error TEXT DEFAULT '',
  retry_count INTEGER DEFAULT 0,
  user_id TEXT DEFAULT '',
  source TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  category TEXT DEFAULT 'image',
  mime TEXT DEFAULT '',
  path TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content_type TEXT DEFAULT 'video',
  publish_mode TEXT DEFAULT 'manual',
  note TEXT DEFAULT '',
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#C73520',
  description TEXT DEFAULT '',
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wechat_accounts (
  id TEXT PRIMARY KEY,
  group_id TEXT DEFAULT '',
  name TEXT NOT NULL,
  appid TEXT NOT NULL,
  secret TEXT DEFAULT '',
  author TEXT DEFAULT '',
  color TEXT DEFAULT '#C73520',
  channel TEXT DEFAULT 'wechat_article',
  description TEXT DEFAULT '',
  is_default INTEGER DEFAULT 0,
  dry_run INTEGER DEFAULT 1,
  auto_submit INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT DEFAULT 'file',
  source_path TEXT DEFAULT '',
  url TEXT DEFAULT '',
  content TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  char_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  text TEXT NOT NULL,
  char_count INTEGER DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analogies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_domain TEXT DEFAULT '',
  target_domain TEXT DEFAULT '',
  structure_type TEXT DEFAULT 'analogy',
  use_cases TEXT DEFAULT '',
  usage_count INTEGER DEFAULT 0,
  last_used_at TEXT DEFAULT '',
  raw_note TEXT DEFAULT '',
  mapping TEXT DEFAULT '[]',
  boundary TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  conclusions TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_item ON knowledge_chunks(item_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_items(status);
CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  concept TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  svg TEXT NOT NULL,
  source TEXT DEFAULT 'generated',
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analogies_status ON analogies(status);
CREATE INDEX IF NOT EXISTS idx_sources_brief ON sources(brief_id);
CREATE INDEX IF NOT EXISTS idx_angles_brief ON angles(brief_id);
CREATE INDEX IF NOT EXISTS idx_specs_brief ON specs(brief_id);
CREATE INDEX IF NOT EXISTS idx_renders_brief ON renders(brief_id);
CREATE INDEX IF NOT EXISTS idx_renders_spec ON renders(spec_id);
CREATE INDEX IF NOT EXISTS idx_pubs_render ON publications(render_id);
`);
// v0.2 migration: keep the raw freeform note that produced a structured analogy.
try { db.exec("ALTER TABLE analogies ADD COLUMN raw_note TEXT DEFAULT ''"); } catch {}
// v0.7 migration: structures = analogies + explicit type/use cases/usage.
for (const [table, col, ddl] of [
  ['analogies', 'structure_type', "TEXT DEFAULT 'analogy'"],
  ['analogies', 'use_cases', "TEXT DEFAULT ''"],
  ['analogies', 'usage_count', 'INTEGER DEFAULT 0'],
  ['analogies', 'last_used_at', "TEXT DEFAULT ''"],
  ['briefs', 'structure_id', "TEXT DEFAULT ''"],
  ['briefs', 'structure_name', "TEXT DEFAULT ''"],
  ['briefs', 'structure_type', "TEXT DEFAULT ''"],
  ['briefs', 'structure_snapshot', "TEXT DEFAULT ''"],
  ['briefs', 'page_count', 'INTEGER DEFAULT 4'],
  ['briefs', 'page_plan', "TEXT DEFAULT '[]'"],
  ['briefs', 'theme', "TEXT DEFAULT 'archive'"],
  ['briefs', 'template_id', "TEXT DEFAULT ''"],
  ['renders', 'layout_json', "TEXT DEFAULT '[]'"]
]) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`); } catch {}
}
try { db.exec("ALTER TABLE video_tasks ADD COLUMN template TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE video_tasks ADD COLUMN style TEXT DEFAULT 'industrial'"); } catch {}
try { db.exec("ALTER TABLE video_tasks ADD COLUMN avatar INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE video_tasks ADD COLUMN publish_status TEXT DEFAULT 'none'"); } catch {}
try { db.exec("ALTER TABLE media_assets ADD COLUMN group_name TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE media_assets ADD COLUMN tags TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE media_assets ADD COLUMN archived INTEGER DEFAULT 0"); } catch {}
try {
  const seed = [
    ['ch_video', '视频号', 'video', 'manual', '视频 + 封面 + 话题，人手动上传'],
    ['ch_article', '公众号', 'article', 'api', '文章草稿，可内嵌视频号视频'],
    ['ch_xhs', '小红书', 'image', 'manual', '封面图 + 标题(≤20字) + 正文标签'],
    ['ch_zhihu', '知乎', 'article', 'manual', '图文/视频 + 标题 + 回答'],
    ['ch_xigua', '西瓜视频', 'video', 'manual', '视频 + 标题 + 简介'],
    ['ch_douyin', '抖音', 'video', 'manual', '视频 + 标题 + 话题']
  ];
  const ins = db.prepare('INSERT OR IGNORE INTO channels (id,name,content_type,publish_mode,note,enabled,created_at) VALUES (?,?,?,?,?,1,?)');
  for (const [id, name, ct, pm, note] of seed) { ins.run(id, name, ct, pm, note, new Date().toISOString()); }
} catch {}

// v0.6 migration: keyframe preflight report attached to a render.
for (const col of ['preflight_json', 'preflight_status', 'preflight_at']) {
  try { db.exec(`ALTER TABLE renders ADD COLUMN ${col} TEXT DEFAULT ''`); } catch {}
}

// v0.9 migration: multi WeChat official accounts.
try { db.exec("ALTER TABLE publications ADD COLUMN account_id TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE wechat_accounts ADD COLUMN channel TEXT DEFAULT 'wechat_article'"); } catch {}
try { db.exec("ALTER TABLE wechat_accounts ADD COLUMN description TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE wechat_accounts ADD COLUMN group_id TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE briefs ADD COLUMN account_id TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE briefs ADD COLUMN group_id TEXT DEFAULT ''"); } catch {}
try {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  if (map.wechat_appid && !db.prepare('SELECT id FROM wechat_accounts WHERE appid=?').get(map.wechat_appid)) {
    db.prepare(`INSERT INTO wechat_accounts
      (id,name,appid,secret,author,color,channel,is_default,dry_run,auto_submit,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      'wechat_default',
      map.wechat_name || '默认公众号',
      map.wechat_appid,
      map.wechat_secret || '',
      map.wechat_author || '',
      map.wechat_color || '#C73520',
      'wechat_article',
      1,
      (map.wechat_dry_run === 'false' ? 0 : 1),
      (map.wechat_auto_submit === 'true' ? 1 : 0),
      new Date().toISOString(),
      new Date().toISOString()
    );
  }
  if (!db.prepare("SELECT id FROM wechat_accounts WHERE channel='wechat_channels' LIMIT 1").get()) {
    const t = new Date().toISOString();
    db.prepare(`INSERT INTO wechat_accounts
      (id,name,appid,secret,author,color,channel,description,is_default,dry_run,auto_submit,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      'video_default', '默认视频号', '', '', '', '#2E6F9E', 'wechat_channels', '视频号发布空间（人工发布）', 0, 1, 0, t, t
    );
  }
  const def = db.prepare("SELECT id FROM wechat_accounts WHERE channel='wechat_article' AND is_default=1 LIMIT 1").get()
    || db.prepare("SELECT id FROM wechat_accounts WHERE channel='wechat_article' ORDER BY created_at ASC LIMIT 1").get();
  const video = db.prepare("SELECT id FROM wechat_accounts WHERE channel='wechat_channels' ORDER BY created_at ASC LIMIT 1").get();
  if (def) db.prepare("UPDATE publications SET account_id=? WHERE channel='wechat_article' AND (account_id IS NULL OR account_id='')").run(def.id);
  if (video) db.prepare("UPDATE publications SET account_id=? WHERE channel='wechat_channels' AND (account_id IS NULL OR account_id='')").run(video.id);
  // Existing briefs: those with a WeChat article go there, the rest to the default video space.
  const briefs = db.prepare("SELECT id FROM briefs WHERE account_id IS NULL OR account_id=''").all();
  for (const b of briefs) {
    const art = db.prepare("SELECT 1 FROM publications p JOIN renders r ON r.id=p.render_id WHERE r.brief_id=? AND p.channel='wechat_article' LIMIT 1").get(b.id);
    const target = art && def ? def.id : (video ? video.id : (def ? def.id : ''));
    if (target) db.prepare('UPDATE briefs SET account_id=? WHERE id=?').run(target, b.id);
  }
  if (!db.prepare('SELECT id FROM account_groups LIMIT 1').get()) {
    const t = new Date().toISOString();
    db.prepare(`INSERT INTO account_groups (id,name,color,description,is_default,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)`).run('group_fixed', '固定地址', '#C73520', '默认账号组：公众号 + 视频号', 1, t, t);
  }
  const groupFixed = db.prepare('SELECT id FROM account_groups ORDER BY is_default DESC, created_at ASC LIMIT 1').get();
  if (groupFixed) {
    db.prepare("UPDATE wechat_accounts SET group_id=? WHERE group_id IS NULL OR group_id=''").run(groupFixed.id);
    db.prepare(`UPDATE briefs SET group_id=(SELECT group_id FROM wechat_accounts WHERE wechat_accounts.id=briefs.account_id)
      WHERE (group_id IS NULL OR group_id='') AND account_id<>''`).run();
  }
} catch {}


// v2.4 migration: content instance spine + provider fields.
for (const [table, col, ddl] of [
  ['briefs', 'content_id', "TEXT DEFAULT ''"],
  ['specs', 'content_id', "TEXT DEFAULT ''"],
  ['renders', 'content_id', "TEXT DEFAULT ''"],
  ['publications', 'content_id', "TEXT DEFAULT ''"],
  ['publications', 'variant_id', "TEXT DEFAULT ''"],
  ['publications', 'template_version', "TEXT DEFAULT ''"],
  ['publications', 'provider', "TEXT DEFAULT ''"],
  ['publications', 'provider_account_id', "TEXT DEFAULT ''"],
  ['publications', 'provider_task_id', "TEXT DEFAULT ''"],
  ['publications', 'platform_ref', "TEXT DEFAULT ''"],
  ['publications', 'ai_label_status', "TEXT DEFAULT ''"],
  ['wechat_accounts', 'provider', "TEXT DEFAULT 'direct'"],
  ['wechat_accounts', 'platform', "TEXT DEFAULT ''"],
  ['wechat_accounts', 'provider_account_id', "TEXT DEFAULT ''"]
]) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`); } catch {}
}
try {
  db.exec("UPDATE briefs SET content_id='content_' || id WHERE content_id IS NULL OR content_id=''");
  db.exec("UPDATE specs SET content_id=(SELECT content_id FROM briefs WHERE briefs.id=specs.brief_id) WHERE content_id IS NULL OR content_id=''");
  db.exec("UPDATE renders SET content_id=(SELECT content_id FROM briefs WHERE briefs.id=renders.brief_id) WHERE content_id IS NULL OR content_id=''");
  db.exec("UPDATE publications SET content_id=(SELECT content_id FROM renders WHERE renders.id=publications.render_id) WHERE content_id IS NULL OR content_id=''");
  db.exec("UPDATE wechat_accounts SET platform=channel WHERE platform IS NULL OR platform=''");
  db.exec("UPDATE wechat_accounts SET provider='manual' WHERE platform='wechat_channels' AND (provider IS NULL OR provider='' OR provider='direct')");
  db.exec("UPDATE wechat_accounts SET provider='yixiaoer' WHERE platform IN ('xiaohongshu','douyin') AND (provider IS NULL OR provider='' OR provider='direct')");
} catch {}

export const now = () => new Date().toISOString();
export const newId = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
export const jsonParse = (v, fallback) => {
  try { return JSON.parse(v); } catch { return fallback; }
};
export const jsonString = (v) => JSON.stringify(v ?? null);
export const sha256File = (file) => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
};
export const event = (type, entityId, action, detail = '') => {
  db.prepare('INSERT INTO events (id,type,entity_id,action,detail,created_at) VALUES (?,?,?,?,?,?)')
    .run(newId('evt'), type, entityId, action, typeof detail === 'string' ? detail : JSON.stringify(detail), now());
};

function setting(key, value) {
  db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(key, value);
}

export function getSettings() {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export function setSettings(values) {
  const stmt = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [key, value] of Object.entries(values)) stmt.run(key, String(value ?? ''));
}

export function listWechatAccounts(channel = '') {
  return channel
    ? db.prepare('SELECT * FROM wechat_accounts WHERE channel=? ORDER BY is_default DESC, created_at ASC').all(channel)
    : db.prepare('SELECT * FROM wechat_accounts ORDER BY channel ASC, is_default DESC, created_at ASC').all();
}
export function listAccountGroups() {
  return db.prepare('SELECT * FROM account_groups ORDER BY is_default DESC, created_at ASC').all();
}
export function getAccountGroup(id) {
  return db.prepare('SELECT * FROM account_groups WHERE id=?').get(id);
}
export function getDefaultAccountGroup() {
  return db.prepare('SELECT * FROM account_groups WHERE is_default=1 LIMIT 1').get()
    || db.prepare('SELECT * FROM account_groups ORDER BY created_at ASC LIMIT 1').get();
}
export function saveAccountGroup(group) {
  const t = now();
  if (group.id && getAccountGroup(group.id)) {
    db.prepare('UPDATE account_groups SET name=?, color=?, description=?, is_default=?, updated_at=? WHERE id=?')
      .run(group.name, group.color || '#C73520', group.description || '', group.is_default ? 1 : 0, t, group.id);
    return getAccountGroup(group.id);
  }
  const id = group.id || newId('group');
  db.prepare('INSERT INTO account_groups (id,name,color,description,is_default,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, group.name, group.color || '#C73520', group.description || '', group.is_default ? 1 : 0, t, t);
  return getAccountGroup(id);
}
export function deleteAccountGroup(id) {
  db.prepare('DELETE FROM account_groups WHERE id=?').run(id);
}
export function listChannelsByGroup(groupId) {
  return db.prepare('SELECT * FROM wechat_accounts WHERE group_id=? ORDER BY channel ASC, is_default DESC').all(groupId);
}
export function getWechatAccount(id) {
  return db.prepare('SELECT * FROM wechat_accounts WHERE id=?').get(id);
}
export function getDefaultWechatAccount(channel = 'wechat_article') {
  return db.prepare('SELECT * FROM wechat_accounts WHERE channel=? AND is_default=1 LIMIT 1').get(channel)
    || db.prepare('SELECT * FROM wechat_accounts WHERE channel=? ORDER BY created_at ASC LIMIT 1').get(channel)
    || db.prepare('SELECT * FROM wechat_accounts WHERE is_default=1 LIMIT 1').get()
    || db.prepare('SELECT * FROM wechat_accounts ORDER BY created_at ASC LIMIT 1').get();
}
export function saveWechatAccount(acc) {
  const nowIso = now();
  const existing = acc.id ? getWechatAccount(acc.id) : null;
  if (existing) {
    db.prepare(`UPDATE wechat_accounts SET group_id=?, name=?, appid=?, author=?, color=?, channel=?, platform=?, provider=?, provider_account_id=?, description=?, is_default=?, dry_run=?, auto_submit=?, updated_at=?
      WHERE id=?`).run(
      acc.group_id || existing.group_id || '', acc.name, acc.appid, acc.author || '', acc.color || '#C73520',
      acc.channel || existing.channel || 'wechat_article', acc.platform || existing.platform || acc.channel || 'wechat_article', acc.provider || existing.provider || 'direct', acc.provider_account_id || '', acc.description || '',
      acc.is_default ? 1 : 0, acc.dry_run ? 1 : 0, acc.auto_submit ? 1 : 0, nowIso, acc.id
    );
    if (acc.secret) db.prepare('UPDATE wechat_accounts SET secret=? WHERE id=?').run(acc.secret, acc.id);
    return getWechatAccount(acc.id);
  }
  const id = acc.id || newId('wechat');
  db.prepare(`INSERT INTO wechat_accounts
    (id,group_id,name,appid,secret,author,color,channel,platform,provider,provider_account_id,description,is_default,dry_run,auto_submit,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, acc.group_id || '', acc.name, acc.appid, acc.secret || '', acc.author || '', acc.color || '#C73520',
    acc.channel || 'wechat_article', acc.platform || acc.channel || 'wechat_article', acc.provider || 'direct', acc.provider_account_id || '', acc.description || '',
    acc.is_default ? 1 : 0, acc.dry_run ? 1 : 0, acc.auto_submit ? 1 : 0, nowIso, nowIso
  );
  return getWechatAccount(id);
}
export function deleteWechatAccount(id) {
  db.prepare('DELETE FROM wechat_accounts WHERE id=?').run(id);
}

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM briefs').get().n;
  if (count > 0) return false;

  const t = now();
  const brief1 = 'brief_fixed_address';
  const spec1 = 'spec_fixed_address';
  const angle1 = 'angle_postal';
  const render1 = 'render_fixed_address';

  db.prepare(`INSERT INTO briefs
    (id,title,topic,audience,quantity,analogy_domains,must_include,must_avoid,channels,tone,cta,deadline,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    brief1,
    '为什么自动化发布必须放在云服务器',
    '解释自动化发布为什么必须放在云服务器，NAS 替代不了。用邮局寄信做类比：邮局只给登记过固定地址的人寄信。',
    '做自媒体、用 NAS、想搭自动化发布的人',
    3,
    jsonString(['邮局寄信', '公司前台/助理']),
    '固定公网 IP\nNAS 替代不了\n公众号 IP 白名单',
    '绝对化承诺\n未证实的平台政策',
    jsonString(['wechat_article', 'wechat_channels']),
    '冷静、类比、结论明确',
    '关注，领取部署清单',
    '2026-11-10T18:00:00+08:00',
    'in_review',
    t, t
  );

  const sources = [
    {
      id: 'src_ip_whitelist',
      url: 'https://developers.weixin.qq.com/doc/oplatform/developers/basic_func/ip_whitelist.html',
      title: 'API IP 白名单（公众号 / 服务号）',
      excerpt: '仅白名单中的 IP 才可调用公众号/服务号的服务端接口；不在白名单内调用会返回 40164。'
    },
    {
      id: 'src_publish',
      url: 'https://developers.weixin.qq.com/doc/service/guide/product/publish.html',
      title: '公众号发布能力（2025-07 权限说明）',
      excerpt: '2025 年 7 月起，个人主体、企业主体未认证账号及不支持认证的账号将被回收草稿/发布接口权限。'
    },
    {
      id: 'src_channels',
      url: 'https://developers.weixin.qq.com/doc/channels/api/',
      title: '视频号 API 接口目录',
      excerpt: '截至 2026-11-03，目录包含直播、橱窗、留资、电商数据等接口，未见视频内容发布接口。'
    }
  ];
  for (const s of sources) {
    db.prepare(`INSERT INTO sources (id,brief_id,url,title,excerpt,retrieved_at,status) VALUES (?,?,?,?,?,?,?)`)
      .run(s.id, brief1, s.url, s.title, s.excerpt, '2026-11-03', 'ok');
  }

  const angles = [
    {
      id: angle1,
      title: '邮局只认门牌号',
      thesis: '平台只认固定入口：公众号 API 要固定 IP，视频号要稳定的操作环境。',
      map: [
        { from: '邮局', to: '平台审核' },
        { from: '固定地址', to: '固定公网 IP' },
        { from: '助理办公室', to: '云服务器' }
      ],
      hook: '你以为这是工具问题，其实是地址问题。',
      selected: 1
    },
    {
      id: 'angle_assistant',
      title: '让助理去寄，而不是自己跑',
      thesis: 'NAS 能干活，但它的出口地址每天在变；云服务器才是那个地址固定的助理。',
      map: [
        { from: '你', to: 'NAS' },
        { from: '助理', to: '云服务器' },
        { from: '寄信', to: '调用平台 API' }
      ],
      hook: '不是 NAS 不行，是它没有一个固定地址。',
      selected: 0
    },
    {
      id: 'angle_return',
      title: '被退回的那封信',
      thesis: '没有固定地址，接口调用会被平台退回；这不是能力问题，是投递问题。',
      map: [
        { from: '退信', to: '40164 IP 不在白名单' },
        { from: '地址变更', to: '家庭宽带动态 IP' },
        { from: '重新登记', to: '固定 EIP' }
      ],
      hook: '信寄不出去，往往不是内容不好。',
      selected: 0
    }
  ];
  for (const a of angles) {
    db.prepare(`INSERT INTO angles (id,brief_id,title,thesis,analogy_map,hook,selected,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(a.id, brief1, a.title, a.thesis, jsonString(a.map), a.hook, a.selected, t);
  }

  const spec = {
    brand: 'FIXED ADDRESS',
    meta: {
      p1_left: '01 / 邮局', p1_right: 'THE POST OFFICE',
      p2_left: '02 / 地址', p2_right: 'HOME VS. CLOUD',
      p3_left: '03 / 声音', p3_right: 'MUSIC PAGE'
    },
    page1: {
      kicker: '微信，就是那个',
      kicker_accent: '邮局',
      lines: ['微信只给', '登记过地址', '的人寄信'],
      quote_line2: true,
      addr_label: '这个地址，叫',
      highlight: '固定公网',
      highlight_latin: 'IP',
      en: 'STATIC PUBLIC IP · 门牌号',
      footnote: '地址不固定，信就寄不到。',
      stamp_line1: '固定',
      stamp_line2: '地址'
    },
    page2: {
      kicker: '同样是服务器，',
      kicker_accent: '待遇完全不同',
      left_tag: '你家 · NAS',
      left_thin: 'NAS',
      left_line1_rest: ' 的地址',
      left_line2: '每天都在变',
      left_stamp: '邮局不认',
      right_tag: '机房 · 云服务器',
      right_prefix: '地址是',
      right_highlight: '固定的',
      right_badge: '可以投递',
      conclusion_small: '所以，自动化发布',
      conclusion_prefix: '只能放在',
      conclusion_highlight: '云服务器',
      footnote: '<b>助理的办公室 = 云服务器。</b><br>地址固定，才能替你去寄。NAS 替代不了。'
    },
    page3: {
      title: 'FIXED ADDRESS',
      subtitle: '固定地址 · 自动化发布',
      note: '只有音乐，<b>没有解说</b>。',
      bottom: '地址固定，才能自动抵达。'
    },
    article: {
      title: '为什么自动化发布，必须放在云服务器',
      digest: '微信只给登记过地址的人寄信。你的 NAS，地址每天都在变。',
      cover_text: '地址固定，才能自动发布',
      series: { name: '固定地址 · 自动化发布', role: 'main', index: '01', total: '02' },
      lead: '微信只给「登记过地址」的人寄信。这个地址，叫固定公网 IP。',
      highlights: ['登记过地址', '固定公网 IP'],
      quote: '不是工具不行，是地址不行。',
      opening: '微信只给登记过地址的人寄信。你的 NAS，地址每天都在变。这不是工具强弱的问题，是地址问题。',
      sections: [
        {
          heading: '邮局只认登记过的门牌号',
          body: '微信就是那个邮局。它不关心你的内容多好，先看你的地址有没有登记。这个地址，就是固定公网 IP。\n\n地址不固定，信就寄不到。'
        },
        {
          heading: 'NAS 能干活，但它的地址每天都在变',
          body: 'NAS 不是不能跑脚本。它能干活，但家庭宽带的公网 IP 每天在变，平台不认。\n\n云服务器的地址是固定的，所以它能替你去寄。助理的办公室 = 云服务器。地址固定，才能替你去对接平台。'
        },
        {
          heading: '今天就能做的 3 个检查',
          body: '1. 公众号后台有没有配置固定 IP 白名单？\n2. 发布出口是不是固定 EIP？\n3. 失败重试有没有人/机器值守？\n\n三个都答“是”，自动化才算真的跑起来。'
        }
      ],
      cta: '关注，领取部署检查清单。',
      sources: [
        { title: 'API IP 白名单', url: 'https://developers.weixin.qq.com/doc/oplatform/developers/basic_func/ip_whitelist.html' },
        { title: '公众号发布能力', url: 'https://developers.weixin.qq.com/doc/service/guide/product/publish.html' }
      ],
      secondary: {
        title: '发布前 5 分钟检查清单：别让一条内容死在最后一步',
        digest: '账号、IP、封面、视频号链接，5 分钟过一遍。',
        cover_text: '发布前检查',
        series: { name: '固定地址 · 自动化发布', role: 'secondary', index: '02', total: '02' },
        companion_note: '本文是主条《为什么自动化发布，必须放在云服务器》的配套清单。',
        lead: '内容做完，不算完成。发布前还有 5 个地方最容易翻车。',
        highlights: ['5 个地方'],
        opening: '内容做完，不算完成。发布前还有 5 个地方最容易翻车。',
        sections: [
          { heading: '01 账号选对了吗', body: '公众号、服务号、视频号是三个后台。发之前先确认：这次发的是哪一个账号，别把服务号的内容发到订阅号。' },
          { heading: '02 IP 白名单还是当前出口吗', body: '公众号 API 只认白名单里的 IP。家庭宽带会变，云服务器 EIP 不会。发布前先跑一次「测试公众号连接」。' },
          { heading: '03 素材齐了吗', body: '头条封面 2.35:1；视频 MP4 不超过 10MB；标题、摘要、来源、视频号链接都补齐。' },
          { heading: '04 渠道排好了吗', body: '公众号发文章，视频号发视频，小红书用 3:4 封面。同一个 MP4 可以复用，但标题和封面不要复用。' },
          { heading: '05 回执填了吗', body: '发布后把链接回填平台。没有回执，就不算发过。' }
        ],
        cta: '收藏这张清单，发布前照着过一遍。',
        sources: []
      }
    },
    music: 'pulse',
    music_reason: '检测到自动化/效率类词汇，选 Pulse 120。',
    motion: {
      preset: 'flow',
      envelope: { type: 'slideX', start: 0.82, duration: 2.35, fromX: -300, toX: 0, fromRot: -7, toRot: 0, ease: 'outCubic' }
    }
  };

  db.prepare(`INSERT INTO specs (id,brief_id,angle_id,version,spec_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(spec1, brief1, angle1, 1, JSON.stringify(spec), 'ready', t, t);

  const seedFiles = [
    'fixed-address.mp4',
    'fixed-address-cover.png',
    'fixed-address-preview-1.png',
    'fixed-address-preview-2.png',
    'fixed-address-preview-3.png'
  ];
  for (const name of seedFiles) {
    const src = path.join(SEED_ASSETS, name);
    const dst = path.join(MEDIA_DIR, name);
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
  }
  const videoAbs = path.join(MEDIA_DIR, 'fixed-address.mp4');
  const coverAbs = path.join(MEDIA_DIR, 'fixed-address-cover.png');
  db.prepare(`INSERT INTO renders
    (id,spec_id,brief_id,status,progress,video_path,cover_path,preview_paths,sha256,duration,error,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    render1, spec1, brief1, 'rendered', 100,
    'media/fixed-address.mp4', 'media/fixed-address-cover.png',
    jsonString([
      'media/fixed-address-preview-1.png',
      'media/fixed-address-preview-2.png',
      'media/fixed-address-preview-3.png'
    ]),
    fs.existsSync(videoAbs) ? sha256File(videoAbs) : '',
    18, '', t, t
  );

  db.prepare(`INSERT INTO briefs
    (id,title,topic,audience,quantity,analogy_domains,must_include,must_avoid,channels,tone,cta,deadline,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    'brief_nas_checklist',
    'NAS 用户的三个自动化误区',
    '从「地址、权限、值守」三个角度，讲清楚 NAS 做自动化发布的边界。',
    '已经买了 NAS、想进一步做自动化的用户',
    3,
    jsonString(['快递柜', '家庭地址']),
    '固定 IP\n权限边界\n有人值守',
    '贬低 NAS\n绝对化承诺',
    jsonString(['wechat_channels']),
    '直接、清单感、少术语',
    '评论区聊聊你的 NAS 在跑什么',
    '2026-11-15T18:00:00+08:00',
    'draft',
    t, t
  );

  setting('wechat_appid', '');
  setting('wechat_secret', '');
  setting('wechat_author', '固定地址');
  setting('wechat_dry_run', 'true');
  setting('wechat_auto_submit', 'false');
  setting('article_style_version', 'wechat_article_v1');
  setting('article_style_frozen', 'true');
  setting('motion_preset', 'flow');
  setting('llm_base_url', '');
  setting('llm_api_key', '');
  setting('llm_model', 'deepseek-chat');
  setting('brand_name', 'FIXED ADDRESS');
  setting('operator_name', '主编');

  event('system', 'seed', 'seeded', '演示数据已写入');
  return true;
}

seedIfEmpty();


