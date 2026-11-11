import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  db, ROOT, DATA_DIR, MEDIA_DIR, KITS_DIR,
  newId, jsonParse, jsonString, getSettings, setSettings, event,
  listWechatAccounts, getWechatAccount, getDefaultWechatAccount, saveWechatAccount, deleteWechatAccount,
  listAccountGroups, getAccountGroup, getDefaultAccountGroup, saveAccountGroup, deleteAccountGroup, listChannelsByGroup
} from './lib/db.mjs';
import { generateAngles, generateSpec, llmConfigured, testLLM, draftBriefFromDirection, draftAnalogyFromNote, draftSoulFromDirection, diagnoseStructures, checkDirection, checkStructure, draftQuoteCandidates, draftElementSvg, draftAutoScript } from './lib/generator.mjs';
import { publishWechat, testWechat, publishVtaskWechat } from './lib/wechat.mjs';
import { renderVibeMotion, buildTimeline, renderExplainer, renderFixedPages, ensureSilentVoice, ENGINE_DIR, activeVibeChildren } from './lib/vibemotion.mjs';
import { synthesizeSpeech, ttsConfigured } from './lib/tts.mjs';
import { compileExplainer, estimateCues, splitNarration } from './lib/explainer.mjs';
import { ELEMENT_CATALOG, PALETTES, FONT_PAIRS, TEMPLATES } from './lib/element-catalog.mjs';
import { listElementAssets } from './lib/element-assets.mjs';
import { checkCompliance } from './lib/compliance.mjs';
import { TEMPLATE_THEMES, listTemplates, getTemplate, applyTemplatePreset } from './lib/templates.mjs';
import { ELEMENTS, ELEMENT_SPEC, listElements, getElement, selectElements, validateGeneratedSvg } from './lib/elements.mjs';
import { runPreflight } from './lib/preflight.mjs';
import { buildVariantPayload } from './lib/publishers/mapping.mjs';
import { SCHEMAS } from './lib/publishers/schemas.mjs';
import { yixiaoerConfigured } from './lib/publishers/yixiaoer.mjs';
import { checkSpecCoverage, checkSpecRelevance } from './lib/spec-check.mjs';
import { listMusic, addUploadedMusic, deleteUploadedMusic, updateUploadedMusic, recommendMusic, resolveMusicFile } from './lib/music-library.mjs';
import {
  KNOWLEDGE_DIR, seedKnowledgeIfEmpty, listKnowledge, getKnowledge, indexKnowledge,
  scanKnowledgeDir, deleteKnowledge, searchKnowledge, listAnalogies, getAnalogy,
  createAnalogy, updateAnalogy, deleteAnalogy, touchStructure, getSoul, saveSoul, buildContext, contextMeta
} from './lib/knowledge.mjs';

const PORT = Number(process.env.PORT || 4310);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(ROOT, 'public');
const RENDER_SCRIPT = path.join(ROOT, 'renderer', 'render.mjs');
const RENDER_V2_SCRIPT = path.join(ROOT, 'renderer', 'v2', 'render.mjs');
const INPUT_DIR = path.join(DATA_DIR, 'render-input');
fs.mkdirSync(INPUT_DIR, { recursive: true });
seedKnowledgeIfEmpty();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const now = () => new Date().toISOString();
const send = (res, status, data, headers = {}) => {
  const body = typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data);
  res.writeHead(status, {
    'content-type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  res.end(body);
};
const fail = (res, status, message, detail = '') => send(res, status, { error: message, detail });
const readBody = async (req) => {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4_000_000) throw new Error('body too large');
  }
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw new Error('invalid JSON'); }
};
const readRaw = async (req, limit = 20_000_000) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('file too large (max 20MB)');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
const parseBrief = (b) => b ? ({
  ...b,
  analogy_domains: jsonParse(b.analogy_domains, []),
  channels: jsonParse(b.channels, []),
  structure_snapshot: jsonParse(b.structure_snapshot, null),
  page_plan: jsonParse(b.page_plan, []),
  theme: b.theme || 'archive',
  template_id: b.template_id || ''
}) : null;
const parseRender = (r) => r ? ({
  ...r,
  preview_paths: jsonParse(r.preview_paths, []),
  layout_issues: jsonParse(r.layout_json, []),
  preflight: jsonParse(r.preflight_json, null)
}) : null;
const parseSpec = (s) => s ? ({ ...s, spec_json: jsonParse(s.spec_json, {}) }) : null;
const relData = (p) => path.relative(DATA_DIR, p).replaceAll('\\', '/');

function migrateLegacyMusicPages() {
  const rows = db.prepare('SELECT id, spec_json FROM specs').all();
  let count = 0;
  for (const row of rows) {
    const spec = jsonParse(row.spec_json, null);
    const note = String(spec?.page3?.note || '');
    if (!spec || !/只有音乐|没有解说|BGM ONLY/i.test(note)) continue;
    spec.page3 = {
      ...(spec.page3 || {}),
      title: String(spec.page2?.conclusion_highlight || spec.page2?.conclusion_prefix || '先解决入口').slice(0, 14),
      subtitle: '所以，最后落到一句',
      note: String(spec.page2?.footnote || spec.page1?.footnote || '地址不固定，信就寄不到。').slice(0, 80),
      bottom: String(spec.page1?.footnote || '地址固定，才能自动抵达。').slice(0, 30)
    };
    db.prepare('UPDATE specs SET spec_json=?, updated_at=? WHERE id=?').run(jsonString(spec), now(), row.id);
    count++;
  }
  if (count) console.log(`[migration] replaced legacy music page in ${count} spec(s)`);
}
migrateLegacyMusicPages();
// A server restart kills any in-flight renderer; do not leave the UI polling forever.
db.prepare("UPDATE renders SET status='canceled', progress=0, error='服务重启，任务中断' WHERE status IN ('preview_queued','preview_rendering','render_queued','rendering')").run();
// video_tasks: running → interrupted (recoverable), queued → stays queued (re-enqueued below)
db.prepare("UPDATE video_tasks SET status='interrupted', progress=0, error='服务重启，任务中断' WHERE status='running'").run();

async function ensureSpecElements(spec, brief) {
  const custom = () => db.prepare("SELECT * FROM elements WHERE status='active'").all()
    .map(e => ({ ...e, tags: jsonParse(e.tags, []) }));
  spec.elements = selectElements(spec, brief, custom());
  if (spec.elements.length) return;
  const struct = brief.structure_snapshot || {};
  const concept = String(struct.name || struct.source_domain || brief.topic || '').trim();
  if (!concept || !llmConfigured()) return;
  try {
    const candidate = await draftElementSvg(`与“${concept}”对应的一个知识视频视觉元素`);
    const checked = validateGeneratedSvg(candidate.svg);
    if (!checked.ok) return;
    db.prepare('INSERT INTO elements (id,name,concept,tags,svg,source,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(newId('el'), candidate.name, concept, jsonString(candidate.tags || []), checked.svg, 'generated', 'active', now());
    spec.elements = selectElements(spec, brief, custom());
  } catch (e) {
    console.warn('auto element skipped:', e.message);
  }
}

function briefById(id) {
  return parseBrief(db.prepare('SELECT * FROM briefs WHERE id=?').get(id));
}
function latestSpec(briefId) {
  return parseSpec(db.prepare('SELECT * FROM specs WHERE brief_id=? ORDER BY version DESC, created_at DESC LIMIT 1').get(briefId));
}
function latestRender(briefId) {
  return parseRender(db.prepare('SELECT * FROM renders WHERE brief_id=? ORDER BY created_at DESC LIMIT 1').get(briefId));
}
function latestReview(renderId) {
  return db.prepare('SELECT * FROM reviews WHERE render_id=? ORDER BY created_at DESC LIMIT 1').get(renderId) || null;
}
function renderBundle(id) {
  const r = parseRender(db.prepare('SELECT * FROM renders WHERE id=?').get(id));
  if (!r) return null;
  const brief = briefById(r.brief_id);
  const specRow = db.prepare('SELECT * FROM specs WHERE id=?').get(r.spec_id);
  const spec = parseSpec(specRow);
  const review = latestReview(r.id);
  const pubs = db.prepare('SELECT * FROM publications WHERE render_id=? ORDER BY created_at DESC').all(r.id);
  const sources = db.prepare('SELECT * FROM sources WHERE brief_id=? ORDER BY retrieved_at DESC').all(r.brief_id);
  const soul = getSoul();
  const sj = spec?.spec_json || {};
  const specText = JSON.stringify({ meta: sj.meta, page1: sj.page1, page2: sj.page2, page3: sj.page3 });
  const banned_hits = (soul.banned || []).filter(w => w && specText.includes(w));
  return { render: r, brief: { ...brief, sources }, spec, review, publications: pubs, sources, soul, banned_hits };
}

function listBriefs(filter = '') {
  const rows = db.prepare('SELECT * FROM briefs ORDER BY updated_at DESC').all();
  return rows.map(b => {
    const r = latestRender(b.id);
    const s = latestSpec(b.id);
    const p = db.prepare('SELECT * FROM publications WHERE render_id=? ORDER BY created_at DESC LIMIT 1').get(r?.id || '');
    return {
      ...parseBrief(b),
      latest_render: r ? { id: r.id, status: r.status, cover_path: r.cover_path, video_path: r.video_path, sha256: r.sha256 } : null,
      latest_spec: s ? { id: s.id, version: s.version, status: s.status } : null,
      latest_publication: p || null
    };
  }).filter(b => !filter || filter === 'all' || b.status === filter);
}

function unifiedQueue() {
  const rows = [];
  const vtasks = db.prepare('SELECT * FROM video_tasks ORDER BY created_at DESC').all();
  for (const t of vtasks) {
    let bucket = 'todo';
    const pubLabel = t.publish_status === 'ready' ? '待发布' : t.publish_status === 'draft_created' ? '草稿已建' : t.publish_status === 'packaged' ? '发布包已生成' : t.publish_status === 'published' ? '已发布' : t.status;
    if (t.status === 'running') bucket = 'doing';
    else if (t.status === 'done') bucket = (t.publish_status === 'published') ? 'done' : (['ready', 'draft_created', 'packaged'].includes(t.publish_status) ? 'publish' : 'done');
    else if (['failed', 'blocked', 'interrupted'].includes(t.status)) bucket = 'error';
    else if (t.status === 'canceled') bucket = 'done';
    rows.push({ id: t.id, kind: 'vtask', title: t.title, engine: t.engine, mode: t.mode || 'auto', review_state: t.review_state || '', style: t.style, bucket, created_at: t.created_at, video_path: t.video_path, cover_path: t.cover_path, brief_status: pubLabel });
  }
  const briefs = db.prepare('SELECT * FROM briefs ORDER BY created_at DESC').all();
  for (const b of briefs) {
    let bucket = 'todo';
    if (b.status === 'in_review') bucket = 'review';
    else if (['approved', 'scheduled', 'published'].includes(b.status)) bucket = 'done';
    rows.push({ id: b.id, kind: 'brief', title: b.title, engine: 'template', style: '', bucket, created_at: b.created_at, video_path: '', cover_path: '', brief_status: b.status });
  }
  const pubs = db.prepare('SELECT * FROM publications ORDER BY created_at DESC').all();
  for (const p of pubs) {
    let bucket = 'publish';
    if (p.status === 'published') bucket = 'done';
    rows.push({ id: p.id, kind: 'pub', title: p.title || '', engine: 'template', style: '', bucket, created_at: p.created_at, video_path: p.video_path || '', cover_path: p.cover_path || '', brief_status: p.status });
  }
  const counts = { todo: 0, doing: 0, review: 0, publish: 0, done: 0, error: 0 };
  rows.forEach(r => { counts[r.bucket] = (counts[r.bucket] || 0) + 1; });
  return { rows: rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), counts };
}

// ---------- 阶段3 · 统一读模型（两引擎同一工作项 / 成片库·审批·发布覆盖两引擎） ----------
// 引擎A（本地模板）成片路径相对 data/（形如 media/xxx/video.mp4），前端直接加 "/"；
// 引擎B（VibeMotion）成片路径相对 data/media/，前端加 "/media/"。
const templateMediaUrl = (p) => p ? '/' + String(p).replace(/^\/+/, '') : '';
const vibemotionMediaUrl = (p) => p ? '/media/' + String(p).replace(/^\/+/, '') : '';

// 统一工件 DTO：content_id / engine / mode / revision / artifact_id / review_state / publication_id
function unifiedArtifacts() {
  const rows = [];
  // 引擎 A：renders（成片），补 brief/spec 上下文
  const renders = db.prepare(`
    SELECT r.*, b.title AS brief_title, b.topic AS brief_topic, b.status AS brief_status, s.version AS spec_version
    FROM renders r JOIN briefs b ON b.id=r.brief_id JOIN specs s ON s.id=r.spec_id
    ORDER BY r.created_at DESC
  `).all();
  for (const r of renders) {
    const review = latestReview(r.id);
    const pub = db.prepare('SELECT id FROM publications WHERE render_id=? ORDER BY created_at DESC LIMIT 1').get(r.id);
    rows.push({
      id: r.id,
      kind: 'render',
      content_id: r.brief_id,
      engine: 'template',
      mode: 'fixed',
      revision: r.spec_version || 1,
      artifact_id: r.id,
      review_state: review ? review.decision : '',
      publication_id: pub ? pub.id : '',
      title: r.brief_title || '',
      brief_id: r.brief_id,
      brief_title: r.brief_title || '',
      topic: r.brief_topic || '',
      brief_topic: r.brief_topic || '',
      duration: r.duration,
      status: r.status,
      brief_status: r.brief_status || '',
      spec_version: r.spec_version,
      video_path: r.video_path || '',
      cover_path: r.cover_path || '',
      media_video: templateMediaUrl(r.video_path),
      media_cover: templateMediaUrl(r.cover_path),
      created_at: r.created_at,
      updated_at: r.updated_at
    });
  }
  // 引擎 B：video_tasks（成片）
  const vtasks = db.prepare("SELECT * FROM video_tasks WHERE status='done' ORDER BY created_at DESC").all();
  for (const t of vtasks) {
    // 把引擎 B 状态映射到引擎 A 成片库的筛选词汇（rendered/approved/changes_requested/published）
    const mappedStatus = t.publish_status === 'published' ? 'published'
      : (t.review_state === 'approved') ? 'approved'
      : (['changes_requested', 'rejected'].includes(t.review_state)) ? 'changes_requested'
      : 'rendered';
    rows.push({
      id: t.id,
      kind: 'vtask',
      content_id: t.id,
      engine: 'vibemotion',
      mode: t.mode || 'auto',
      revision: (t.retry_count || 0) + 1,
      artifact_id: t.id,
      review_state: t.review_state || '',
      publication_id: '',
      title: t.title || '',
      brief_id: '',
      brief_title: t.title || '',
      topic: '',
      brief_topic: '',
      duration: Math.round((t.duration_ms || 0) / 1000),
      status: mappedStatus,
      raw_status: t.status,
      brief_status: t.publish_status || '',
      style: t.style || '',
      structure_type: t.structure_type || '',
      script: t.script || '',
      video_path: t.video_path || '',
      cover_path: t.cover_path || '',
      media_video: vibemotionMediaUrl(t.video_path),
      media_cover: vibemotionMediaUrl(t.cover_path),
      created_at: t.created_at,
      updated_at: t.updated_at
    });
  }
  return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function unifiedPublishQueue() {
  const rows = [];
  // 引擎 A：publications
  const pubs = db.prepare(`
    SELECT p.*, r.video_path, r.cover_path, r.sha256, b.title, b.id AS brief_id
    FROM publications p JOIN renders r ON r.id=p.render_id JOIN briefs b ON b.id=r.brief_id
    ORDER BY p.created_at DESC
  `).all();
  for (const p of pubs) {
    rows.push({
      ...p,
      kind: 'pub',
      engine: 'template',
      mode: 'fixed',
      content_id: p.brief_id || '',
      kit_video: `/kits/${p.render_id}-${p.channel}/video.mp4`,
      media_video: templateMediaUrl(p.video_path),
      media_cover: templateMediaUrl(p.cover_path)
    });
  }
  // 引擎 B：video_tasks 处于发布相关状态
  const vtasks = db.prepare("SELECT * FROM video_tasks WHERE publish_status IN ('ready','packaged','draft_created','published') ORDER BY updated_at DESC").all();
  for (const t of vtasks) {
    let receipt = {};
    try { receipt = jsonParse(t.publish_receipt, {}); } catch {}
    const channel = receipt.channel || 'wechat_channels';
    // 把引擎 B 发布状态映射到引擎 A 发布队列词汇
    const pubStatus = t.publish_status === 'published' ? 'published'
      : t.publish_status === 'draft_created' ? 'draft_created'
      : 'ready_for_manual';
    rows.push({
      id: t.id,
      kind: 'vtask_pub',
      engine: 'vibemotion',
      mode: t.mode || 'auto',
      content_id: t.id,
      channel,
      status: pubStatus,
      raw_status: t.publish_status,
      render_id: '',
      account_id: receipt.account_id || '',
      title: t.title || '',
      video_path: t.video_path || '',
      cover_path: t.cover_path || '',
      sha256: '',
      kit_video: `/kits/vtask-${t.id}-${channel}/video.mp4`,
      media_video: vibemotionMediaUrl(t.video_path),
      media_cover: vibemotionMediaUrl(t.cover_path),
      created_at: t.created_at,
      updated_at: t.updated_at
    });
  }
  return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function dashboard() {
  const briefs = db.prepare('SELECT * FROM briefs').all();
  const renders = db.prepare('SELECT * FROM renders').all();
  const pubs = db.prepare('SELECT * FROM publications').all();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const counts = {
    briefs: briefs.length,
    pending_review: briefs.filter(b => b.status === 'in_review').length,
    rendering: renders.filter(r => ['preview_queued', 'preview_rendering', 'render_queued', 'rendering'].includes(r.status)).length,
    ready_publish: pubs.filter(p => ['scheduled', 'ready_for_manual', 'draft_created', 'dry_run'].includes(p.status)).length,
    week_renders: renders.filter(r => ['rendered', 'approved', 'published'].includes(r.status) && r.created_at >= weekAgo).length,
    approved: briefs.filter(b => ['approved', 'scheduled', 'published'].includes(b.status)).length
  };
  const recent = listBriefs().slice(0, 5);
  const queue = db.prepare(`
    SELECT p.*, b.title, b.id AS brief_id, r.cover_path, r.video_path
    FROM publications p
    JOIN renders r ON r.id = p.render_id
    JOIN briefs b ON b.id = r.brief_id
    ORDER BY p.created_at DESC LIMIT 8
  `).all();
  const activity = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 10').all();
  return { counts, recent, queue, activity };
}

async function fetchSource(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36' },
    signal: AbortSignal.timeout(18000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const excerpt = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1600);
  return { title, excerpt };
}

// ---------- render queue ----------
const queue = [];
let pumping = false;
const activeRenders = new Map();
const cancelledRenders = new Set();
const APP_VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || ''; } catch { return ''; } })();
const BATCH_DIR = path.join(DATA_DIR, 'batch-output');
const BATCH_INDEX = path.join(DATA_DIR, 'batches.json');
const batchQueue = [];
let batchRunning = false;
fs.mkdirSync(BATCH_DIR, { recursive: true });
let batches = {};
let videoChain = Promise.resolve();

function updateVideoTask(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) { sets.push(`${k}=?`); vals.push(v); }
  vals.push(now(), id);
  db.prepare(`UPDATE video_tasks SET ${sets.join(',')}, updated_at=? WHERE id=?`).run(...vals);
}

async function processVideoTask(id) {
  const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
  if (!task || task.status === 'canceled') return;
  updateVideoTask(id, { status: 'running', progress: 2, error: '' });
  let script = task.script || '';
  if (!script && task.title) {
    try {
      script = await draftAutoScript(task.title, task.structure_type || 'causal');
      updateVideoTask(id, { script });
    } catch (e) { script = task.title + '。'; }
  }
  const compliance = checkCompliance(script || task.title);
  if (!compliance.ok) {
    updateVideoTask(id, { status: 'blocked', progress: 0, error: '合规拦截：' + compliance.hits.join('、') });
    return;
  }
  const taskWithScript = { ...task, script };
  const isManual = task.mode === 'manual';
  let voicePath = taskWithScript.voice_path || '';
  if (!voicePath && ttsConfigured()) {
    try {
      const voiceFile = path.join(ENGINE_DIR, 'public', 'audio', `${id}.mp3`);
      await synthesizeSpeech(taskWithScript.script || taskWithScript.title, voiceFile, { durationSec: Math.round((taskWithScript.duration_ms || 30000) / 1000) });
      voicePath = `audio/${id}.mp3`;
      updateVideoTask(id, { voice_path: voicePath });
    } catch (e) {
      console.error('[tts] skipped:', e.message);
    }
  }
  const taskWithVoice = { ...taskWithScript, voice_path: voicePath };
  let timeline = null;
  if (task.timeline_json) {
    try { timeline = JSON.parse(task.timeline_json); } catch {}
  }
  if (isManual && !timeline) {
    timeline = buildTimeline(taskWithVoice);
    updateVideoTask(id, { status: 'pending_confirm', progress: 25, timeline_json: JSON.stringify(timeline), error: '' });
    return;
  }
  // 固定页式：mode='fixed'，spec 存 timeline_json（含 spec 或直接是 spec）。
  let fixedSpec = null;
  if (task.mode === 'fixed') {
    try {
      const raw = JSON.parse(task.timeline_json || '{}');
      fixedSpec = raw.spec || raw;
    } catch {}
    if (!fixedSpec || !fixedSpec.page_count || !fixedSpec.theme) {
      updateVideoTask(id, { status: 'failed', progress: 0, error: '固定页式缺少 spec（timeline_json 需含 spec 或 {spec}）' });
      return;
    }
  }

  // 讲解式自动编排：非人工模式且文案 ≥ 8 句时，走 2B 的 compileExplainer + Explainer2B。
  let useExplainer = false;
  if (!fixedSpec && !isManual && !timeline && splitNarration(script).length >= 8) {
    try {
      let vp = voicePath;
      if (!vp) {
        vp = ensureSilentVoice(id, Number(taskWithVoice.duration_ms) || 30000);
        updateVideoTask(id, { voice_path: vp });
      }
      const cues = estimateCues(script, Number(taskWithVoice.duration_ms) || 30000);
      timeline = compileExplainer({ title: taskWithVoice.title || '讲解', script, style: taskWithVoice.style || 'industrial', cues, durationMs: Number(taskWithVoice.duration_ms) || 30000, voiceSrc: vp });
      useExplainer = true;
    } catch (e) {
      console.warn('[explainer] 回退到旧编排:', e.message);
      useExplainer = false;
      timeline = null;
    }
  }
  const outRel = path.join('video-tasks', id);
  const outDir = path.join(MEDIA_DIR, outRel);
  try {
    if (fixedSpec) {
      await renderFixedPages(fixedSpec, outDir, (p) => {
        updateVideoTask(id, { progress: p, error: '' });
      });
    } else if (useExplainer) {
      await renderExplainer(timeline, outDir, (p) => {
        updateVideoTask(id, { progress: p, error: '' });
      });
    } else {
      const tpl = TEMPLATES.find(t => t.templateId === task.template);
      const st = getSettings();
      const baseStyle = tpl ? (PALETTES[tpl.palette] || PALETTES['cream-paper']) : PALETTES['cream-paper'];
      const style = { ...baseStyle, fonts: { heading: st.font_heading || 'ZCOOL KuaiLe', body: st.font_body || 'LXGW WenKai' } };
      await renderVibeMotion(taskWithVoice, outDir, (p) => {
        updateVideoTask(id, { progress: p, error: '' });
      }, timeline, style);
    }
    updateVideoTask(id, {
      status: 'done', progress: 100,
      video_path: outRel.replaceAll('\\', '/') + '/video.mp4',
      cover_path: outRel.replaceAll('\\', '/') + '/cover.png'
    });
  } catch (e) {
    const cur = db.prepare('SELECT status FROM video_tasks WHERE id=?').get(id);
    if (cur?.status === 'canceled') return;
    updateVideoTask(id, { status: 'failed', progress: 0, error: String(e.message || e).slice(-900) });
  }
}

function enqueueVideoTask(id) {
  videoChain = videoChain.then(() => processVideoTask(id)).catch(e => {
    updateVideoTask(id, { status: 'failed', progress: 0, error: String(e.message || e).slice(-900) });
  });
}

try { batches = JSON.parse(fs.readFileSync(BATCH_INDEX, 'utf8')) || {}; } catch {}
const saveBatches = () => fs.writeFileSync(BATCH_INDEX, JSON.stringify(batches, null, 2));

function enqueueRender(renderId, specId, mode) {
  queue.push({ renderId, specId, mode });
  pumpQueue().catch(e => console.error('queue', e));
}

async function pumpQueue() {
  if (pumping) return;
  pumping = true;
  while (queue.length) {
    const job = queue.shift();
    try { await runRender(job); } catch (e) {
      console.error('render job', e);
      try { updateRender(job.renderId, { status: 'failed', error: String(e.message || e).slice(-1200) }); } catch {}
    }
  }
  pumping = false;
}

function updateRender(id, fields) {
  const keys = Object.keys(fields);
  const sql = 'UPDATE renders SET ' + keys.map(k => `${k}=?`).join(', ') + ', updated_at=? WHERE id=?';
  db.prepare(sql).run(...keys.map(k => fields[k]), now(), id);
}

async function runRender({ renderId, specId, mode }) {
  const specRow = db.prepare('SELECT * FROM specs WHERE id=?').get(specId);
  if (!specRow) throw new Error('spec missing');
  const spec = jsonParse(specRow.spec_json, {});
  const outDir = path.join(MEDIA_DIR, renderId);
  fs.mkdirSync(outDir, { recursive: true });
  const renderBrief = briefById(specRow.brief_id) || {};
  spec.structure_type = renderBrief.structure_type || 'analogy';
  spec.structure_snapshot = renderBrief.structure_snapshot || null;
  applyTemplatePreset(spec, renderBrief);
  const customElements = db.prepare("SELECT * FROM elements WHERE status='active'").all()
    .map(e => ({ ...e, tags: jsonParse(e.tags, []) }));
  spec.elements = selectElements(spec, renderBrief, customElements);
  const specFile = path.join(INPUT_DIR, `${renderId}.json`);
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));

  updateRender(renderId, {
    status: (mode === 'preview' || mode === 'themes') ? 'preview_rendering' : 'rendering',
    progress: 0, error: ''
  });
  event('render', renderId, (mode === 'preview' || mode === 'themes') ? 'preview_started' : 'render_started', '');

  const renderScript = spec.renderer === 'v2' ? RENDER_V2_SCRIPT : RENDER_SCRIPT;
  const child = spawn(process.execPath, [
    renderScript,
    '--spec', specFile,
    '--out', outDir,
    '--mode', mode
  ], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  activeRenders.set(renderId, child);

  let stdout = '';
  let stderr = '';
  let previews = [];
  let done = null;
  let layoutIssues = [];

  const handleLine = (line) => {
    const text = line.trim();
    if (!text.startsWith('{')) return;
    try {
      const msg = JSON.parse(text);
      if (msg.type === 'progress') {
        const pct = Math.round((msg.current / msg.total) * 100);
        updateRender(renderId, { progress: pct });
      } else if (msg.type === 'preview') {
        previews.push(relData(msg.path));
      } else if (msg.type === 'done') {
        done = msg;
        layoutIssues = Array.isArray(msg.layout_issues) ? msg.layout_issues : [];
      } else if (msg.type === 'error') {
        stderr += '\n' + (msg.message || 'render error');
      }
    } catch {}
  };

  child.stdout.on('data', d => {
    stdout += d.toString();
    const lines = stdout.split('\n');
    stdout = lines.pop() || '';
    lines.forEach(handleLine);
  });
  child.stderr.on('data', d => { stderr += d.toString(); });

  const code = await new Promise((resolve) => child.on('close', resolve));
  activeRenders.delete(renderId);
  if (stdout) handleLine(stdout);
  if (cancelledRenders.has(renderId)) {
    cancelledRenders.delete(renderId);
    updateRender(renderId, { status: 'canceled', progress: 0, error: '用户取消' });
    event('render', renderId, 'canceled', '');
    return;
  }
  if (code !== 0 || !done) {
    updateRender(renderId, { status: 'failed', error: (stderr || 'render failed').slice(-1200) });
    event('render', renderId, 'failed', (stderr || '').slice(0, 400));
    throw new Error('render failed');
  }

  if (mode === 'preview' || mode === 'themes') {
    updateRender(renderId, { status: 'preview_ready', progress: 100, preview_paths: jsonString(previews), layout_json: jsonString(layoutIssues) });
    event('render', renderId, 'preview_ready', '');
  } else {
    const previewPaths = [1, 2, 3]
      .map(i => [path.join(outDir, `preview-${i}.jpg`), path.join(outDir, `preview-${i}.png`)].find(fs.existsSync))
      .filter(Boolean)
      .map(relData);
    updateRender(renderId, {
      status: 'rendered',
      progress: 100,
      video_path: relData(done.video),
      cover_path: relData(done.cover),
      preview_paths: jsonString(previewPaths),
      sha256: done.sha256,
      duration: done.duration || 18,
      layout_json: jsonString(layoutIssues),
      preflight_status: 'running',
      preflight_json: ''
    });
    db.prepare('UPDATE briefs SET status=?, updated_at=? WHERE id=?').run('in_review', now(), specRow.brief_id);
    event('render', renderId, 'rendered', done.sha256 || '');

    try {
      const videoAbs = path.isAbsolute(done.video) ? done.video : path.join(ROOT, done.video);
      const preflight = await runPreflight({
        renderId,
        videoPath: videoAbs,
        outDir,
        duration: done.duration || 18,
        previewCount: previewPaths.length
      });
      updateRender(renderId, {
        preflight_json: jsonString(preflight),
        preflight_status: preflight.status,
        preflight_at: now()
      });
      event('render', renderId, 'preflight', preflight.status);
    } catch (e) {
      const fallback = {
        status: 'warn',
        technical: {},
        frames: [],
        issues: [{ severity: 'warn', code: 'preflight_error', message: `预检失败：${e.message}`, suggest: '可人工看片，或稍后重新预检' }],
        vision: { status: 'skipped', model: '' },
        checked_at: now()
      };
      updateRender(renderId, {
        preflight_json: jsonString(fallback),
        preflight_status: 'warn',
        preflight_at: now()
      });
      event('render', renderId, 'preflight_error', String(e.message).slice(0, 400));
    }
  }

  try { fs.rmSync(path.join(outDir, '.chrome-profile'), { recursive: true, force: true }); } catch {}
  try { fs.rmSync(path.join(outDir, 'frames'), { recursive: true, force: true }); } catch {}
}

function ensureRender(specId, mode) {
  const spec = db.prepare('SELECT * FROM specs WHERE id=?').get(specId);
  if (!spec) throw new Error('spec not found');
  const coverage = checkSpecCoverage(jsonParse(spec.spec_json, {}));
  if (!coverage.ok) throw new Error('内容检查未通过：' + coverage.errors.map(e => e.message).join('；'));
  let r = db.prepare('SELECT * FROM renders WHERE spec_id=? ORDER BY created_at DESC LIMIT 1').get(specId);
  if (!r) {
    const id = newId('render');
    db.prepare(`INSERT INTO renders (id,spec_id,brief_id,status,progress,video_path,cover_path,preview_paths,sha256,duration,error,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, specId, spec.brief_id, 'draft', 0, '', '', '[]', '', 18, '', now(), now());
    r = db.prepare('SELECT * FROM renders WHERE id=?').get(id);
  }
  if (['preview_rendering', 'render_queued', 'rendering'].includes(r.status)) {
    throw new Error('该版本正在渲染中');
  }
  updateRender(r.id, { status: (mode === 'preview' || mode === 'themes') ? 'preview_queued' : 'render_queued', progress: 0, error: '' });
  enqueueRender(r.id, specId, mode);
  return parseRender(db.prepare('SELECT * FROM renders WHERE id=?').get(r.id));
}

// ---------- spec migration v2 ----------
const migrateClean = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
function migrateShortTitle(value, max = 18) {
  const text = migrateClean(value);
  if (text.length <= max) return text;
  const parts = text.split(/[：:，,。；;]/).map(migrateClean).filter(Boolean);
  const good = parts.find(p => p.length >= 6 && p.length <= max) || parts[0] || text;
  return good.slice(0, max);
}
function migrateFields(brief, spec) {
  const snap = typeof brief.structure_snapshot === 'string' ? jsonParse(brief.structure_snapshot, {}) : (brief.structure_snapshot || {});
  const type = brief.structure_type || spec.structure_type || 'analogy';
  const mapping = Array.isArray(snap.mapping) ? snap.mapping : [];
  if (type === 'causal') return { causal: mapping.map(m => migrateClean(m.to)).filter(Boolean).slice(0, 3) };
  if (type === 'checklist') {
    const items = String(brief.must_include || '').split(/[；;\n]/).map(migrateClean).filter(Boolean);
    return { checklist: (items.length ? items : mapping.map(m => migrateClean(m.to))).filter(Boolean).slice(0, 5) };
  }
  if (type === 'boundary') {
    const fit = mapping.slice(0, 3).map(m => migrateClean(m.from)).filter(Boolean).join('、');
    const no = mapping.slice(-1).map(m => migrateClean(m.from)).filter(Boolean).join('、');
    return { boundary: [fit || '查资料、写初稿、提建议', no || '签字、承担后果'] };
  }
  if (type === 'misconception') {
    const first = mapping[0] || {};
    return { misconception: [migrateClean(first.from) || '常见误解', migrateClean(first.to) || '正确认知'] };
  }
  return null;
}
function migrateSpec(specId) {
  const row = db.prepare('SELECT * FROM specs WHERE id=?').get(specId);
  if (!row) throw new Error('spec not found');
  const latest = db.prepare('SELECT * FROM specs WHERE brief_id=? ORDER BY version DESC, created_at DESC LIMIT 1').get(row.brief_id);
  if (latest && latest.id !== specId && Number(jsonParse(latest.spec_json, {}).content_schema_version) >= 2) {
    throw new Error(`已有 v2 版本：${latest.id}`);
  }
  const brief = briefById(row.brief_id);
  if (!brief) throw new Error('brief not found');
  if (['approved', 'published'].includes(brief.status)) throw new Error('已审批/已发布文案不自动迁移');
  const spec = jsonParse(row.spec_json, {});
  const next = JSON.parse(JSON.stringify(spec));
  next.page1 = next.page1 || {};
  const rawLines = (next.page1.lines || []).map(migrateClean).filter(Boolean);
  const merged = [];
  for (const line of rawLines) {
    if (line.length <= 2 && merged.length) merged[merged.length - 1] += line;
    else merged.push(line);
  }
  if (merged.length > 1 && merged[0].length <= 2) { merged[1] = merged[0] + merged[1]; merged.shift(); }
  next.page1.lines = merged;
  next.page1.headline = migrateClean(next.page1.headline || merged.join(''));
  next.page1.emphasis = Array.isArray(next.page1.emphasis) && next.page1.emphasis.length ? next.page1.emphasis : [migrateClean(next.page1.highlight)].filter(Boolean);
  next.page1.max_lines = Math.max(2, Math.min(3, Number(next.page1.max_lines) || merged.length || 3));
  const p1All = [next.page1.headline, ...merged].join('');
  const hi = migrateClean(next.page1.highlight);
  if (hi && !p1All.includes(hi)) next.page1.highlight = migrateClean(merged[merged.length - 1] || merged[0] || '').slice(0, 12);
  next.context = next.context || {};
  const oldTitle = migrateClean(next.context.title);
  const snap = typeof brief.structure_snapshot === 'string' ? jsonParse(brief.structure_snapshot, {}) : (brief.structure_snapshot || {});
  if (oldTitle.length > 18 || /(资|个|判|负|责)$/.test(oldTitle)) {
    next.context.title = migrateShortTitle(oldTitle || snap.signature, 18);
    if (/(资|个|判|负|责)$/.test(next.context.title) || next.context.title.length > 18) next.context.title = migrateShortTitle(snap.signature || brief.title, 18);
  }
  const fields = migrateFields(brief, next);
  if (fields) {
    const key = Object.keys(fields)[0];
    if (!Array.isArray(next.structure_fields?.[key]) || !next.structure_fields[key].length) {
      next.structure_fields = { ...(next.structure_fields || {}), ...fields };
    }
  }
  next.content_schema_version = 2;
  next.structure_type = brief.structure_type || next.structure_type || 'analogy';
  const maxVersion = db.prepare('SELECT MAX(version) AS v FROM specs WHERE brief_id=?').get(row.brief_id)?.v || 0;
  const newSpecId = newId('spec');
  const t = now();
  db.prepare('INSERT INTO specs (id,brief_id,angle_id,version,spec_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(newSpecId, row.brief_id, row.angle_id || null, maxVersion + 1, JSON.stringify(next), 'ready', t, t);
  db.prepare("UPDATE briefs SET status='script_ready', updated_at=? WHERE id=?").run(t, row.brief_id);
  event('spec', newSpecId, 'migrated_v2', specId);
  return { spec: parseSpec(db.prepare('SELECT * FROM specs WHERE id=?').get(newSpecId)), source_id: specId };
}

// ---------- batch production ----------
function findSpecForBatch(id) {
  return db.prepare('SELECT s.*, b.title, b.theme, b.page_count FROM specs s JOIN briefs b ON b.id=s.brief_id WHERE s.id=?').get(id);
}

function enqueueBatch(batch) {
  if (!batchQueue.includes(batch)) batchQueue.push(batch);
  batch.status = 'queued';
  batch.updated_at = new Date().toISOString();
  saveBatches();
  pumpBatchQueue();
}

async function pumpBatchQueue() {
  if (batchRunning) return;
  const next = batchQueue.shift();
  if (!next) return;
  batchRunning = true;
  try {
    await runBatchJob(next);
  } catch (e) {
    next.status = 'failed';
    next.error = String(e.message || e).slice(-500);
    saveBatches();
  } finally {
    batchRunning = false;
    saveBatches();
    pumpBatchQueue();
  }
}

async function ensureFullRenderForBatch(specId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return ensureRender(specId, 'full');
    } catch (e) {
      if (!/正在渲染/.test(String(e.message))) throw e;
      const active = db.prepare('SELECT id,status FROM renders WHERE spec_id=? ORDER BY created_at DESC LIMIT 1').get(specId);
      if (!active) throw e;
      for (let i = 0; i < 180; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const row = db.prepare('SELECT status FROM renders WHERE id=?').get(active.id);
        if (!row) break;
        if (!['preview_rendering', 'preview_queued', 'render_queued', 'rendering'].includes(row.status)) break;
      }
    }
  }
  throw new Error('该版本正在渲染中');
}

async function runBatchJob(batch) {
  batch.status = 'running';
  saveBatches();
  try {
    for (let i = 0; i < batch.items.length; i++) {
      const item = batch.items[i];
      if (batch.canceled) break;
      if (item.status === 'done') continue;
      item.status = 'rendering';
      saveBatches();
      try {
        const spec = findSpecForBatch(item.spec_id);
        if (!spec) throw new Error('spec missing');
        const render = await ensureFullRenderForBatch(item.spec_id);
        item.render_id = render.id;
        saveBatches();
        let rr = null;
        for (let n = 0; n < 300; n++) {
          await new Promise(r => setTimeout(r, 2000));
          const row = db.prepare('SELECT * FROM renders WHERE id=?').get(render.id);
          if (!row) continue;
          if (row.status === 'rendered') { rr = row; break; }
          if (['failed', 'canceled'].includes(row.status)) throw new Error(row.error || row.status);
        }
        if (!rr) throw new Error('render timeout');
        const layoutIssues = jsonParse(rr.layout_json, []);
        item.layout_issues = layoutIssues;
        if (layoutIssues.length) {
          throw new Error(`布局闸门：${layoutIssues.map(x => x.reason || x.id).join('；')}`);
        }
        item.quality = 'pass';
        item.app_version = APP_VERSION;
        const safe = `${String(i + 1).padStart(2, '0')}-${String(item.title || spec.title || item.spec_id).replace(/[\\/:*?"<>|]/g, '-').slice(0, 40)}`;
        const videoSrc = path.join(DATA_DIR, rr.video_path);
        const coverSrc = path.join(DATA_DIR, rr.cover_path);
        const videoDst = path.join(BATCH_DIR, batch.id, `${safe}.mp4`);
        const coverDst = path.join(BATCH_DIR, batch.id, `${safe}.jpg`);
        fs.copyFileSync(videoSrc, videoDst);
        if (fs.existsSync(coverSrc)) fs.copyFileSync(coverSrc, coverDst);
        item.status = 'done';
        item.video = path.relative(DATA_DIR, videoDst).replaceAll('\\', '/');
        item.cover = path.relative(DATA_DIR, coverDst).replaceAll('\\', '/');
      } catch (e) {
        item.status = 'failed';
        item.error = String(e.message || e).slice(-500);
      }
      saveBatches();
    }
    const dir = path.join(BATCH_DIR, batch.id);
    const zip = path.join(BATCH_DIR, `${batch.id}.zip`);
    if (fs.existsSync(zip)) fs.rmSync(zip, { force: true });
    const cmd = `Compress-Archive -Path '${dir.replaceAll("'", "''")}\\*' -DestinationPath '${zip.replaceAll("'", "''")}' -Force`;
    spawnSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' });
    batch.zip = fs.existsSync(zip) ? path.relative(DATA_DIR, zip).replaceAll('\\', '/') : '';
    batch.status = batch.canceled ? 'canceled' : (batch.items.some(x => x.status === 'failed') ? 'partial' : 'done');
  } catch (e) {
    if (batch.canceled) {
      batch.status = 'canceled';
      batch.error = '';
    } else {
      batch.status = 'failed';
      batch.error = String(e.message || e).slice(-500);
    }
  }
  batch.updated_at = new Date().toISOString();
  saveBatches();
}

async function runBatchPreviews(batch) {
  batch.previewing = true;
  saveBatches();
  try {
    for (const item of batch.items) {
      item.preview_status = 'rendering';
      saveBatches();
      try {
        const render = ensureRender(item.spec_id, 'preview');
        let row = null;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const r = db.prepare('SELECT * FROM renders WHERE id=?').get(render.id);
          if (!r) continue;
          if (r.status === 'preview_ready') { row = r; break; }
          if (['failed', 'canceled'].includes(r.status)) throw new Error(r.error || r.status);
        }
        if (!row) throw new Error('preview timeout');
        item.preview_paths = jsonParse(row.preview_paths, []);
        item.preview_status = 'ready';
        item.preview_render_id = row.id;
      } catch (e) {
        item.preview_status = 'failed';
        item.preview_error = String(e.message || e).slice(-400);
      }
      saveBatches();
    }
  } finally {
    batch.previewing = false;
    batch.previewed_at = new Date().toISOString();
    saveBatches();
  }
}

// ---------- static ----------
function serveFile(req, res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    const [s, e] = range.replace(/bytes=/, '').split('-');
    const start = Number(s) || 0;
    const end = e ? Math.min(Number(e), stat.size - 1) : stat.size - 1;
    if (start >= stat.size) { res.writeHead(416, { 'content-range': `bytes */${stat.size}` }); res.end(); return true; }
    res.writeHead(206, {
      'content-range': `bytes ${start}-${end}/${stat.size}`,
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      'content-type': type,
      'cache-control': 'public, max-age=60'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return true;
  }
  res.writeHead(200, {
    'content-type': type,
    'content-length': stat.size,
    'accept-ranges': 'bytes',
    'cache-control': ['.html', '.js', '.css'].includes(ext) ? 'no-store' : 'public, max-age=60'
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function safeJoin(base, rel) {
  const target = path.resolve(base, rel);
  return target.startsWith(path.resolve(base)) ? target : null;
}

// ---------- routes ----------
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = decodeURIComponent(url.pathname);
  const method = req.method;

  if (p === '/api/health') return send(res, 200, { ok: true, time: now(), llm: llmConfigured(), knowledge_dir: KNOWLEDGE_DIR });

  if (method === 'GET' && p === '/api/knowledge') {
    const items = listKnowledge();
    const chunks = items.reduce((n, i) => n + i.chunk_count, 0);
    return send(res, 200, { items, count: items.length, chunks, dir: KNOWLEDGE_DIR });
  }
  if (method === 'POST' && p === '/api/knowledge') {
    const body = await readBody(req);
    try {
      const item = indexKnowledge({
        title: body.title, content: body.content, url: body.url,
        source_type: body.source_type || 'manual', tags: body.tags || []
      });
      return send(res, 201, item);
    } catch (e) { return fail(res, 400, e.message); }
  }
  if (method === 'POST' && p === '/api/knowledge/scan') {
    const body = await readBody(req).catch(() => ({}));
    try {
      const result = scanKnowledgeDir(body.dir || KNOWLEDGE_DIR, { force: Boolean(body.force) });
      return send(res, 200, result);
    } catch (e) { return fail(res, 400, e.message); }
  }
  if (method === 'GET' && p === '/api/knowledge/search') {
    const q = url.searchParams.get('q') || '';
    return send(res, 200, { query: q, results: searchKnowledge(q, 8) });
  }
  if (method === 'GET' && /^\/api\/knowledge\/[^/]+$/.test(p)) {
    const item = getKnowledge(p.split('/').pop());
    if (!item) return fail(res, 404, '资料不存在');
    return send(res, 200, item);
  }
  if (method === 'DELETE' && /^\/api\/knowledge\/[^/]+$/.test(p)) {
    deleteKnowledge(p.split('/').pop());
    return send(res, 200, { ok: true });
  }
  if (method === 'GET' && p === '/api/inbox') {
    const dir = path.join(KNOWLEDGE_DIR, 'inbox');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.(md|txt)$/i.test(f)).slice(0, 100) : [];
    return send(res, 200, {
      items: files.map(f => {
        const full = path.join(dir, f);
        let content = '';
        try { content = fs.readFileSync(full, 'utf8').slice(0, 12000); } catch {}
        return { name: f, content, size: fs.statSync(full).size };
      })
    });
  }
  if (method === 'GET' && p === '/api/analogies') {
    return send(res, 200, listAnalogies());
  }
  if (method === 'POST' && p === '/api/analogies') {
    const body = await readBody(req);
    if (!body.title) return fail(res, 400, 'title 必填');
    return send(res, 201, createAnalogy(body));
  }
  if (method === 'PATCH' && /^\/api\/analogies\/[^/]+$/.test(p)) {
    const body = await readBody(req);
    return send(res, 200, updateAnalogy(p.split('/').pop(), body));
  }
  if (method === 'DELETE' && /^\/api\/analogies\/[^/]+$/.test(p)) {
    deleteAnalogy(p.split('/').pop());
    return send(res, 200, { ok: true });
  }
  if (method === 'GET' && p === '/api/soul') {
    return send(res, 200, getSoul());
  }
  if (method === 'PUT' && p === '/api/soul') {
    const body = await readBody(req);
    return send(res, 200, saveSoul(body));
  }

  if (p.startsWith('/api/')) {
    if (method === 'GET' && p === '/api/dashboard') return send(res, 200, dashboard());
    if (method === 'GET' && p === '/api/unified-queue') return send(res, 200, unifiedQueue());
    if (method === 'POST' && p === '/api/ai/quote-candidates') {
      const body = await readBody(req);
      const specRow = db.prepare('SELECT * FROM specs WHERE id=?').get(body.spec_id || '');
      if (!specRow) return fail(res, 400, '先保存文案，再生成金句');
      const spec = jsonParse(specRow.spec_json, {});
      const brief = briefById(specRow.brief_id);
      const angle = db.prepare('SELECT * FROM angles WHERE brief_id=? AND selected=1 ORDER BY created_at DESC LIMIT 1').get(specRow.brief_id);
      try {
        const candidates = await draftQuoteCandidates(brief || {}, spec, angle);
        return send(res, 200, { ok: true, candidates });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/ai/direction-check') {
      const body = await readBody(req);
      try {
        const result = await checkDirection(body.direction || body.text || '');
        return send(res, 200, { ok: true, ...result });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/ai/structure-check') {
      const body = await readBody(req);
      try {
        const result = await checkStructure(body.structure || body);
        return send(res, 200, { ok: true, ...result });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/ai/structure-diagnosis') {
      const body = await readBody(req);
      try {
        const structures = await diagnoseStructures(body.direction || body.text || '', listAnalogies());
        return send(res, 200, { ok: true, structures });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/ai/brief-draft') {
      const body = await readBody(req);
      try {
        const draft = await draftBriefFromDirection(body.direction || body.text || '');
        return send(res, 200, { ok: true, draft });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/ai/soul-draft') {
      const body = await readBody(req);
      try {
        const draft = await draftSoulFromDirection(body.direction || body.text || '');
        return send(res, 200, { ok: true, draft });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/ai/analogy-draft') {
      const body = await readBody(req);
      try {
        const draft = await draftAnalogyFromNote(body.note || body.text || '');
        return send(res, 200, { ok: true, draft });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'GET' && p === '/api/briefs') return send(res, 200, listBriefs(url.searchParams.get('status') || 'all'));
    if (method === 'POST' && p === '/api/briefs') {
      const body = await readBody(req);
      if (!body.title || !body.topic) return fail(res, 400, 'title 和 topic 必填');
      const id = newId('brief');
      const t = now();
      const domains = Array.isArray(body.analogy_domains) ? body.analogy_domains : String(body.analogy_domains || '').split(/\n|,/).map(x => x.trim()).filter(Boolean);
      const channels = Array.isArray(body.channels) ? body.channels : ['wechat_channels'];
      let structureId = String(body.structure_id || '');
      if (!structureId && body.structure_name) {
        const found = listAnalogies().find(a => a.title === String(body.structure_name));
        if (found) structureId = found.id;
      }
      const preset = getTemplate(body.template_id);
      const pageCount = Math.max(3, Math.min(6, preset?.pages || Number(body.page_count) || 4));
      const theme = preset?.theme_id || (['archive', 'terminal', 'editorial', 'noir', 'earth'].includes(body.theme) ? body.theme : 'archive');
      const defaultPlans = {
        3: ['hook', 'contrast', 'quote'],
        4: ['hook', 'context', 'contrast', 'quote'],
        5: ['hook', 'context', 'contrast', 'evidence', 'quote'],
        6: ['hook', 'context', 'objection', 'contrast', 'evidence', 'quote']
      };
      const pagePlan = Array.isArray(body.page_plan) && body.page_plan.length ? body.page_plan.slice(0, pageCount) : defaultPlans[pageCount];
      let accountId = String(body.account_id || '');
      const primaryChannel = channels.includes('wechat_channels') ? 'wechat_channels' : (channels[0] || 'wechat_channels');
      let groupId = String(body.group_id || '');
      if (accountId && getWechatAccount(accountId) && !groupId) groupId = getWechatAccount(accountId).group_id || '';
      if (!groupId || !getAccountGroup(groupId)) groupId = (getDefaultAccountGroup() || {}).id || '';
      if (!accountId || !getWechatAccount(accountId) || getWechatAccount(accountId).group_id !== groupId) {
        accountId = (getDefaultWechatAccount(primaryChannel) || {}).id || '';
      }
      const contentId = newId('content');
      db.prepare(`INSERT INTO briefs (id,content_id,title,topic,audience,quantity,analogy_domains,must_include,must_avoid,channels,tone,cta,deadline,structure_id,structure_name,structure_type,structure_snapshot,page_count,page_plan,theme,template_id,account_id,group_id,status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, contentId, String(body.title).trim(), String(body.topic).trim(), String(body.audience || ''), Math.max(1, Math.min(6, Number(body.quantity) || 3)),
        jsonString(domains), String(body.must_include || ''), String(body.must_avoid || ''), jsonString(channels),
        String(body.tone || ''), String(body.cta || ''), String(body.deadline || ''),
        structureId, String(body.structure_name || ''), String(body.structure_type || ''),
        body.structure_snapshot ? jsonString(body.structure_snapshot) : '',
        pageCount, jsonString(pagePlan), theme, String(body.template_id || '').slice(0, 80), accountId, groupId, 'draft', t, t
      );
      touchStructure(structureId);
      event('brief', id, 'created', body.title);
      return send(res, 201, briefById(id));
    }
    if (method === 'GET' && /^\/api\/briefs\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const brief = briefById(id);
      if (!brief) return fail(res, 404, '选题不存在');
      const sources = db.prepare('SELECT * FROM sources WHERE brief_id=? ORDER BY retrieved_at DESC').all(id);
      const angles = db.prepare('SELECT * FROM angles WHERE brief_id=? ORDER BY created_at ASC').all(id)
        .map(a => ({ ...a, analogy_map: jsonParse(a.analogy_map, []) }));
      const specs = db.prepare('SELECT * FROM specs WHERE brief_id=? ORDER BY version DESC').all(id).map(parseSpec);
      const renders = db.prepare('SELECT * FROM renders WHERE brief_id=? ORDER BY created_at DESC').all(id).map(parseRender);
      const publications = db.prepare('SELECT p.* FROM publications p JOIN renders r ON r.id=p.render_id WHERE r.brief_id=? ORDER BY p.created_at DESC').all(id);
      return send(res, 200, {
        brief, sources, angles, specs, renders, publications,
        latest_spec: specs[0] || null,
        latest_render: renders[0] || null,
        llm: llmConfigured()
      });
    }
    if (method === 'PATCH' && /^\/api\/briefs\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const body = await readBody(req);
      const allowed = ['title', 'topic', 'audience', 'quantity', 'must_include', 'must_avoid', 'tone', 'cta', 'deadline', 'status'];
      const fields = [];
      const values = [];
      for (const k of allowed) if (body[k] !== undefined) { fields.push(`${k}=?`); values.push(body[k]); }
      if (body.analogy_domains !== undefined) {
        const domains = Array.isArray(body.analogy_domains) ? body.analogy_domains : String(body.analogy_domains).split(/\n|,/).map(x => x.trim()).filter(Boolean);
        fields.push('analogy_domains=?'); values.push(jsonString(domains));
      }
      if (body.channels !== undefined) { fields.push('channels=?'); values.push(jsonString(body.channels)); }
      if (!fields.length) return send(res, 200, briefById(id));
      fields.push('updated_at=?'); values.push(now()); values.push(id);
      db.prepare(`UPDATE briefs SET ${fields.join(', ')} WHERE id=?`).run(...values);
      return send(res, 200, briefById(id));
    }

    if (method === 'POST' && /^\/api\/briefs\/[^/]+\/sources$/.test(p)) {
      const briefId = p.split('/')[3];
      const body = await readBody(req);
      let title = String(body.title || '').trim();
      let excerpt = String(body.excerpt || body.text || '').trim();
      let status = 'ok';
      let url = String(body.url || '').trim();
      if (url && !excerpt) {
        try {
          const fetched = await fetchSource(url);
          title = title || fetched.title;
          excerpt = fetched.excerpt;
        } catch (e) {
          status = 'error';
          excerpt = `抓取失败：${e.message}`;
        }
      }
      if (!excerpt) return fail(res, 400, '需要 URL 或正文');
      const id = newId('src');
      db.prepare('INSERT INTO sources (id,brief_id,url,title,excerpt,retrieved_at,status) VALUES (?,?,?,?,?,?,?)')
        .run(id, briefId, url, title || url || '手动录入', excerpt.slice(0, 2400), now().slice(0, 10), status);
      event('source', briefId, 'added', title || url);
      return send(res, 201, db.prepare('SELECT * FROM sources WHERE id=?').get(id));
    }
    if (method === 'DELETE' && /^\/api\/sources\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      db.prepare('DELETE FROM sources WHERE id=?').run(id);
      return send(res, 200, { ok: true });
    }

    if (method === 'POST' && /^\/api\/briefs\/[^/]+\/angles$/.test(p)) {
      const briefId = p.split('/')[3];
      const brief = briefById(briefId);
      if (!brief) return fail(res, 404, '选题不存在');
      const sources = db.prepare('SELECT * FROM sources WHERE brief_id=?').all(briefId);
      const body = await readBody(req).catch(() => ({}));
      if (!body.regenerate) {
        const existing = db.prepare('SELECT COUNT(*) AS n FROM angles WHERE brief_id=?').get(briefId).n;
        if (existing > 0) return send(res, 200, db.prepare('SELECT * FROM angles WHERE brief_id=? ORDER BY created_at').all(briefId).map(a => ({ ...a, analogy_map: jsonParse(a.analogy_map, []) })));
      }
      const context = buildContext(brief);
      const generated = await generateAngles(brief, sources, context);
      db.prepare('DELETE FROM angles WHERE brief_id=?').run(briefId);
      const t = now();
      const created = [];
      for (let i = 0; i < generated.length; i++) {
        const a = generated[i];
        const id = newId('angle');
        db.prepare('INSERT INTO angles (id,brief_id,title,thesis,analogy_map,hook,selected,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(id, briefId, a.title, a.thesis, jsonString(a.analogy_map || []), a.hook, i === 0 ? 1 : 0, t);
        created.push(db.prepare('SELECT * FROM angles WHERE id=?').get(id));
      }
      db.prepare('UPDATE briefs SET status=?, updated_at=? WHERE id=?').run('angles_ready', t, briefId);
      event('angles', briefId, 'generated', `${created.length} 个角度 · 知识 ${context.knowledge.length} 条`);
      return send(res, 201, created.map(a => ({ ...a, analogy_map: jsonParse(a.analogy_map, []) })));
    }
    if (method === 'PATCH' && /^\/api\/angles\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const body = await readBody(req);
      const fields = []; const values = [];
      for (const k of ['title', 'thesis', 'hook']) if (body[k] !== undefined) { fields.push(`${k}=?`); values.push(String(body[k])); }
      if (body.analogy_map !== undefined) { fields.push('analogy_map=?'); values.push(jsonString(body.analogy_map)); }
      if (fields.length) { values.push(id); db.prepare(`UPDATE angles SET ${fields.join(', ')} WHERE id=?`).run(...values); }
      return send(res, 200, db.prepare('SELECT * FROM angles WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/angles\/[^/]+\/select$/.test(p)) {
      const id = p.split('/')[3];
      const angle = db.prepare('SELECT * FROM angles WHERE id=?').get(id);
      if (!angle) return fail(res, 404, '角度不存在');
      db.prepare('UPDATE angles SET selected=0 WHERE brief_id=?').run(angle.brief_id);
      db.prepare('UPDATE angles SET selected=1 WHERE id=?').run(id);
      db.prepare('UPDATE briefs SET updated_at=? WHERE id=?').run(now(), angle.brief_id);
      return send(res, 200, { ok: true });
    }

    if (method === 'POST' && /^\/api\/briefs\/[^/]+\/spec$/.test(p)) {
      const briefId = p.split('/')[3];
      const brief = briefById(briefId);
      if (!brief) return fail(res, 404, '选题不存在');
      const body = await readBody(req).catch(() => ({}));
      let angle = null;
      if (body.angle_id) angle = db.prepare('SELECT * FROM angles WHERE id=?').get(body.angle_id);
      if (!angle) angle = db.prepare('SELECT * FROM angles WHERE brief_id=? AND selected=1').get(briefId);
      if (!angle) return fail(res, 400, '请先选择一个角度');
      angle = { ...angle, analogy_map: jsonParse(angle.analogy_map, []) };
      const sources = db.prepare('SELECT * FROM sources WHERE brief_id=?').all(briefId);
      const context = buildContext(brief, angle);
      const spec = await generateSpec(brief, angle, sources, context);
      applyTemplatePreset(spec, brief);
      await ensureSpecElements(spec, brief);
      spec._meta = { ...(spec._meta || {}), ...contextMeta(context), generated_at: now() };
      const version = (db.prepare('SELECT MAX(version) AS v FROM specs WHERE brief_id=?').get(briefId).v || 0) + 1;
      const id = newId('spec');
      const t = now();
      db.prepare('INSERT INTO specs (id,brief_id,angle_id,version,spec_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, briefId, angle.id, version, JSON.stringify(spec), 'ready', t, t);
      db.prepare('UPDATE briefs SET status=?, updated_at=? WHERE id=?').run('script_ready', t, briefId);
      event('spec', briefId, 'created', `v${version} · 引用 ${context.knowledge.length} 条知识`);
      return send(res, 201, parseSpec(db.prepare('SELECT * FROM specs WHERE id=?').get(id)));
    }
    if (method === 'PATCH' && /^\/api\/specs\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const body = await readBody(req);
      if (!body.spec) return fail(res, 400, 'spec 必填');
      db.prepare('UPDATE specs SET spec_json=?, status=?, updated_at=? WHERE id=?').run(JSON.stringify(body.spec), 'ready', now(), id);
      db.prepare("UPDATE renders SET status='stale', updated_at=? WHERE spec_id=? AND status NOT IN ('queued','preview_queued','preview_rendering','render_queued','rendering')").run(now(), id);
      const spec = db.prepare('SELECT * FROM specs WHERE id=?').get(id);
      db.prepare('UPDATE briefs SET status=?, updated_at=? WHERE id=?').run('script_ready', now(), spec.brief_id);
      event('spec', id, 'updated', '');
      return send(res, 200, parseSpec(spec));
    }
    if (method === 'POST' && /^\/api\/specs\/[^/]+\/migrate$/.test(p)) {
      try { return send(res, 201, migrateSpec(p.split('/')[3])); }
      catch (e) { return fail(res, 400, e.message); }
    }
    if ((method === 'GET' || method === 'POST') && /^\/api\/specs\/[^/]+\/check$/.test(p)) {
      const specRow = db.prepare('SELECT * FROM specs WHERE id=?').get(p.split('/')[3]);
      if (!specRow) return fail(res, 404, '文案不存在');
      const coverage = checkSpecCoverage(jsonParse(specRow.spec_json, {}));
      const brief = briefById(specRow.brief_id) || {};
      coverage.relevance = checkSpecRelevance(jsonParse(specRow.spec_json, {}), brief);
      if (!coverage.relevance.ok) coverage.warnings.push({ field: 'relevance', message: coverage.relevance.warning });
      return send(res, 200, coverage);
    }
    if (method === 'POST' && /^\/api\/specs\/[^/]+\/theme-previews$/.test(p)) {
      const id = p.split('/')[3];
      try {
        const r = ensureRender(id, 'themes');
        return send(res, 202, r);
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && /^\/api\/specs\/[^/]+\/preview$/.test(p)) {
      const id = p.split('/')[3];
      try {
        const r = ensureRender(id, 'preview');
        return send(res, 202, r);
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && /^\/api\/specs\/[^/]+\/render$/.test(p)) {
      const id = p.split('/')[3];
      try {
        const r = ensureRender(id, 'full');
        return send(res, 202, r);
      } catch (e) { return fail(res, 400, e.message); }
    }

    if (method === 'POST' && /^\/api\/renders\/[^/]+\/cancel$/.test(p)) {
      const id = p.split('/')[3];
      const child = activeRenders.get(id);
      if (!child) {
        const row = db.prepare('SELECT status FROM renders WHERE id=?').get(id);
        if (row && ['preview_queued', 'preview_rendering', 'render_queued', 'rendering'].includes(row.status)) {
          updateRender(id, { status: 'canceled', progress: 0, error: '任务已不在运行' });
          event('render', id, 'cancel_stale', '');
          return send(res, 200, { ok: true, stale: true });
        }
        return send(res, 200, { ok: true, noop: true });
      }
      cancelledRenders.add(id);
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8' });
        } else {
          child.kill('SIGTERM');
        }
      } catch {}
      updateRender(id, { status: 'canceled', progress: 0, error: '用户取消' });
      event('render', id, 'cancel_requested', '');
      return send(res, 200, { ok: true });
    }
    if (method === 'POST' && /^\/api\/renders\/[^/]+\/preflight$/.test(p)) {
      const id = p.split('/')[3];
      const row = db.prepare('SELECT * FROM renders WHERE id=?').get(id);
      if (!row) return fail(res, 404, '成片不存在');
      if (!row.video_path) return fail(res, 400, '还没有成片');
      const outDir = path.join(MEDIA_DIR, id);
      updateRender(id, { preflight_status: 'running', preflight_json: '' });
      try {
        const preflight = await runPreflight({
          renderId: id,
          videoPath: path.join(DATA_DIR, row.video_path),
          outDir,
          duration: row.duration || 18,
          previewCount: jsonParse(row.preview_paths, []).length
        });
        updateRender(id, {
          preflight_json: jsonString(preflight),
          preflight_status: preflight.status,
          preflight_at: now()
        });
        event('render', id, 'preflight_manual', preflight.status);
        return send(res, 200, preflight);
      } catch (e) {
        updateRender(id, { preflight_status: 'warn' });
        return fail(res, 500, e.message);
      }
    }
    if (method === 'GET' && /^\/api\/renders\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const row = db.prepare('SELECT status, updated_at FROM renders WHERE id=?').get(id);
      const stale = row && row.updated_at && (Date.now() - Date.parse(row.updated_at) > 15000);
      if (row && stale && ['preview_rendering', 'rendering'].includes(row.status) && !activeRenders.has(id)) {
        updateRender(id, { status: 'failed', error: '渲染进程已中断，请重新生成预览或渲染' });
      }
      const bundle = renderBundle(id);
      if (!bundle) return fail(res, 404, '成片不存在');
      return send(res, 200, bundle);
    }
    if (method === 'POST' && /^\/api\/renders\/[^/]+\/review$/.test(p)) {
      const id = p.split('/')[3];
      const body = await readBody(req);
      const decision = String(body.decision || '');
      if (!['approved', 'changes_requested', 'rejected'].includes(decision)) return fail(res, 400, 'decision 不合法');
      const bundle = renderBundle(id);
      if (!bundle) return fail(res, 404, '成片不存在');
      if (bundle.render.status !== 'rendered') return fail(res, 400, '只有已渲染的成片可以审批');
      const reviewId = newId('review');
      const snapshot = bundle.render.sha256 || crypto.createHash('sha256').update(JSON.stringify(bundle.spec?.spec_json || {})).digest('hex');
      db.prepare('INSERT INTO reviews (id,render_id,decision,reviewer,checklist_json,comment,snapshot_hash,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(reviewId, id, decision, String(body.reviewer || '主编'), jsonString(body.checklist || []), String(body.comment || ''), snapshot, now());
      updateRender(id, { status: decision });
      const briefStatus = decision === 'approved' ? 'approved' : 'changes_requested';
      db.prepare('UPDATE briefs SET status=?, updated_at=? WHERE id=?').run(briefStatus, now(), bundle.brief.id);
      event('review', id, decision, String(body.comment || ''));
      return send(res, 201, { review: db.prepare('SELECT * FROM reviews WHERE id=?').get(reviewId), render: parseRender(db.prepare('SELECT * FROM renders WHERE id=?').get(id)) });
    }

    if (method === 'GET' && p === '/api/batch/specs') {
      const rows = db.prepare(`
        SELECT s.id AS spec_id, s.version, b.id AS brief_id, b.title, b.page_count, b.theme, b.status
        FROM specs s JOIN briefs b ON b.id=s.brief_id
        WHERE s.id = (SELECT id FROM specs x WHERE x.brief_id=s.brief_id ORDER BY x.version DESC, x.created_at DESC LIMIT 1)
        ORDER BY b.updated_at DESC
      `).all();
      return send(res, 200, rows);
    }
    if (method === 'GET' && p === '/api/batches') {
      return send(res, 200, Object.values(batches).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
    }
    if (method === 'POST' && p === '/api/batches') {
      const body = await readBody(req);
      const ids = [...new Set((Array.isArray(body.spec_ids) ? body.spec_ids : []).filter(Boolean))].slice(0, 50);
      if (!ids.length) return fail(res, 400, '至少选择一条文案');
      const id = newId('batch');
      const items = ids.map(specId => {
        const s = findSpecForBatch(specId);
        return s ? { spec_id: specId, brief_id: s.brief_id, title: s.title, status: 'queued', app_version: APP_VERSION, content_schema_version: Number(jsonParse(s.spec_json, {}).content_schema_version || 0), video: '', cover: '', error: '' } : null;
      }).filter(Boolean);
      if (!items.length) return fail(res, 400, '没有可用的文案');
      const batch = { id, status: 'queued', app_version: APP_VERSION, items, dir: `batch-output/${id}`, zip: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      batches[id] = batch;
      fs.mkdirSync(path.join(BATCH_DIR, id), { recursive: true });
      enqueueBatch(batch);
      return send(res, 201, batch);
    }
    if (method === 'GET' && /^\/api\/batches\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      return batches[id] ? send(res, 200, batches[id]) : fail(res, 404, '批次不存在');
    }
    if (method === 'POST' && /^\/api\/batches\/[^/]+\/cancel$/.test(p)) {
      const id = p.split('/')[3];
      const b = batches[id];
      if (!b) return fail(res, 404, '批次不存在');
      b.canceled = true;
      b.status = 'canceled';
      const qi = batchQueue.indexOf(b);
      if (qi >= 0) batchQueue.splice(qi, 1);
      for (const x of b.items) {
        if (x.status === 'queued') x.status = 'canceled';
        if (x.status === 'rendering' && x.render_id) {
          const child = activeRenders.get(x.render_id);
          try { child?.kill(); } catch {}
          try { updateRender(x.render_id, { status: 'canceled', progress: 0, error: '批次已取消' }); } catch {}
          x.status = 'canceled';
        }
      }
      b.updated_at = new Date().toISOString();
      saveBatches();
      return send(res, 200, b);
    }
    if (method === 'DELETE' && /^\/api\/batches\/[^/]+$/.test(p)) {
      const id = p.split('/')[3];
      const b = batches[id];
      if (!b) return fail(res, 404, '批次不存在');
      if (['queued', 'running'].includes(b.status)) return fail(res, 409, '先取消批次，再删除');
      try { fs.rmSync(path.join(BATCH_DIR, id), { recursive: true, force: true }); } catch {}
      try { fs.rmSync(path.join(BATCH_DIR, `${id}.zip`), { force: true }); } catch {}
      delete batches[id];
      saveBatches();
      return send(res, 200, { ok: true, id });
    }
    if (method === 'POST' && /^\/api\/batches\/[^/]+\/rerender$/.test(p)) {
      const id = p.split('/')[3];
      const b = batches[id];
      if (!b) return fail(res, 404, '批次不存在');
      if (['running', 'previewing'].includes(b.status) || b.previewing) return fail(res, 409, '批次还在运行');
      for (const item of b.items) {
        item.status = 'queued';
        item.app_version = APP_VERSION;
        item.error = '';
        item.quality = '';
        item.layout_issues = [];
        item.video = '';
        item.cover = '';
        item.preview_paths = [];
        item.preview_status = '';
        item.review_status = '';
      }
      b.status = 'queued';
      b.canceled = false;
      b.zip = '';
      b.error = '';
      b.updated_at = new Date().toISOString();
      saveBatches();
      enqueueBatch(b);
      return send(res, 202, b);
    }
    if (method === 'POST' && /^\/api\/batches\/[^/]+\/preview$/.test(p)) {
      const id = p.split('/')[3];
      const b = batches[id];
      if (!b) return fail(res, 404, '批次不存在');
      if (['queued', 'running', 'previewing'].includes(b.status) || b.previewing) return fail(res, 409, '批次还在运行');
      runBatchPreviews(b).catch(e => { b.previewing = false; b.error = e.message; saveBatches(); });
      return send(res, 202, { ok: true, id });
    }
    if (method === 'POST' && /^\/api\/batches\/[^/]+\/review$/.test(p)) {
      const id = p.split('/')[3];
      const b = batches[id];
      if (!b) return fail(res, 404, '批次不存在');
      if (['queued', 'running'].includes(b.status)) return fail(res, 409, '批次还在运行');
      const body = await readBody(req);
      const decision = String(body.decision || '');
      if (!['approved', 'changes_requested'].includes(decision)) return fail(res, 400, 'decision 不合法');
      let reviewed = 0;
      let skipped = 0;
      for (const item of b.items) {
        let rid = item.render_id;
        if (!rid) {
          const row = db.prepare('SELECT id FROM renders WHERE spec_id=? ORDER BY created_at DESC LIMIT 1').get(item.spec_id);
          rid = row?.id;
        }
        if (!rid) { skipped++; continue; }
        const bundle = renderBundle(rid);
        if (!bundle) { skipped++; continue; }
        if (!['rendered'].includes(bundle.render.status)) { skipped++; continue; }
        const reviewId = newId('review');
        const snapshot = bundle.render.sha256 || crypto.createHash('sha256').update(JSON.stringify(bundle.spec?.spec_json || {})).digest('hex');
        db.prepare('INSERT INTO reviews (id,render_id,decision,reviewer,checklist_json,comment,snapshot_hash,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(reviewId, rid, decision, String(body.reviewer || '批量审批'), jsonString(body.checklist || []), String(body.comment || ''), snapshot, now());
        updateRender(rid, { status: decision });
        const briefStatus = decision === 'approved' ? 'approved' : 'changes_requested';
        db.prepare('UPDATE briefs SET status=?, updated_at=? WHERE id=?').run(briefStatus, now(), bundle.brief.id);
        item.render_id = rid;
        item.review_status = decision;
        reviewed++;
      }
      b.review_status = decision;
      b.reviewed_at = new Date().toISOString();
      b.status = reviewed ? (decision === 'approved' ? 'approved' : 'changes_requested') : (b.status || 'done');
      b.updated_at = b.reviewed_at;
      saveBatches();
      return send(res, 200, { ok: true, reviewed, skipped, batch: b });
    }
    if (method === 'POST' && /^\/api\/batches\/[^/]+\/retry$/.test(p)) {
      const id = p.split('/')[3];
      const b = batches[id];
      if (!b) return fail(res, 404, '批次不存在');
      if (['queued', 'running'].includes(b.status)) return fail(res, 409, '批次还在运行');
      const failed = b.items.filter(x => x.status === 'failed');
      if (!failed.length) return fail(res, 400, '没有失败项');
      for (const x of failed) { x.status = 'queued'; x.error = ''; }
      b.status = 'queued'; b.error = ''; b.zip = ''; b.updated_at = new Date().toISOString();
      saveBatches();
      enqueueBatch(b);
      return send(res, 202, b);
    }

    if (method === 'GET' && p === '/api/library') {
      return send(res, 200, unifiedArtifacts());
    }

    if (method === 'GET' && p === '/api/publish/queue') {
      return send(res, 200, unifiedPublishQueue());
    }
    if (method === 'POST' && /^\/api\/renders\/[^/]+\/publish-kit$/.test(p)) {
      const renderId = p.split('/')[3];
      const body = await readBody(req);
      const channel = ['wechat_article', 'wechat_channels', 'xiaohongshu'].includes(body.channel) ? body.channel : 'wechat_channels';
      let accountId = '';
      let accountMeta = null;
      if (channel === 'wechat_article' || channel === 'wechat_channels') {
        accountId = body.account_id || (getDefaultWechatAccount(channel) || {}).id || '';
        accountMeta = accountId ? getWechatAccount(accountId) : null;
      }
      const bundle = renderBundle(renderId);
      if (!bundle) return fail(res, 404, '成片不存在');
      if (bundle.render.status !== 'approved') return fail(res, 400, '先审批通过，再生成发布包');
      const dir = path.join(KITS_DIR, `${renderId}-${channel}`);
      fs.mkdirSync(dir, { recursive: true });
      const videoSrc = path.join(DATA_DIR, bundle.render.video_path);
      const coverSrc = path.join(DATA_DIR, bundle.render.cover_path);
      if (fs.existsSync(videoSrc)) fs.copyFileSync(videoSrc, path.join(dir, 'video.mp4'));
      let files = { video: 'video.mp4', cover: 'cover.png' };
      if (fs.existsSync(coverSrc)) {
        if (channel === 'xiaohongshu') {
          fs.copyFileSync(coverSrc, path.join(dir, 'cover-9x16.png'));
          const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', coverSrc,
            '-vf', 'scale=1080:1440:force_original_aspect_ratio=decrease,pad=1080:1440:(ow-iw)/2:(oh-ih)/2:color=0x101112',
            '-frames:v', '1', path.join(dir, 'cover.png')], { encoding: 'utf8' });
          if (r.status !== 0) fs.copyFileSync(coverSrc, path.join(dir, 'cover.png'));
          files = { video: 'video.mp4', cover: 'cover.png', cover_9x16: 'cover-9x16.png' };
        } else {
          fs.copyFileSync(coverSrc, path.join(dir, 'cover.png'));
        }
      }
      const spec = bundle.spec?.spec_json || {};
      const article = spec.article || {};
      const meta = {
        channel,
        title: article.title || bundle.brief.title,
        caption: String(article.digest || `${spec.page1?.footnote || ''} ${spec.page2?.conclusion_small || ''}${spec.page2?.conclusion_prefix || ''}${spec.page2?.conclusion_highlight || ''}`).trim(),
        hashtags: String(bundle.brief.must_include || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => `#${x.replace(/\s+/g, '')}`),
        files,
        music: spec.music || 'pulse',
        content_id: bundle.brief?.content_id || '',
        template_version: spec.template_version || 'hybrid-v2.2',
        sha256: bundle.render.sha256,
        account: accountMeta ? { id: accountMeta.id, name: accountMeta.name, color: accountMeta.color } : null,
        generated_at: now()
      };
      fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
      const channelName = channel === 'wechat_channels' ? '视频号（人工最后发布）' : (channel === 'xiaohongshu' ? '小红书（人工最后发布）' : `公众号（图文草稿）${accountMeta ? ' · ' + accountMeta.name : ''}`);
      fs.writeFileSync(path.join(dir, 'README.txt'), [
        `发布渠道：${channelName}`,
        accountMeta ? `${channel === 'wechat_channels' ? '视频号' : '公众号'}账号：${accountMeta.name}${accountMeta.appid ? `（${accountMeta.appid}）` : ''}` : '',
        '1. 打开平台后台上传 video.mp4，封面用 cover.png。',
        '2. 标题、描述、话题标签见 metadata.json。',
        channel === 'xiaohongshu' ? '3. 小红书标题带搜索词，正文用 3:4 封面；视频仍用 9:16。' : '3. 发布完成后回到平台，点击“标记已发布”并粘贴链接。',
        `SHA256: ${bundle.render.sha256}`
      ].filter(Boolean).join('\r\n'));
      let pub = db.prepare('SELECT * FROM publications WHERE render_id=? AND channel=? ORDER BY created_at DESC LIMIT 1').get(renderId, channel);
      const status = channel === 'wechat_channels' || channel === 'xiaohongshu' ? 'ready_for_manual' : 'scheduled';
      if (!pub) {
        pub = { id: newId('pub'), render_id: renderId, content_id: bundle.brief?.content_id || '', channel, status, scheduled_at: body.scheduled_at || '', external_id: '', url: '', receipt_json: '{}', account_id: accountId, template_version: spec.template_version || 'hybrid-v2.2', created_at: now(), updated_at: now() };
        db.prepare('INSERT INTO publications (id,render_id,content_id,channel,status,scheduled_at,external_id,url,receipt_json,account_id,template_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(pub.id, pub.render_id, pub.content_id, pub.channel, pub.status, pub.scheduled_at, '', '', '{}', pub.account_id, pub.template_version, pub.created_at, pub.updated_at);
      } else {
        db.prepare('UPDATE publications SET status=?, scheduled_at=?, account_id=?, content_id=?, template_version=?, updated_at=? WHERE id=?').run(status, body.scheduled_at || pub.scheduled_at || '', accountId || pub.account_id || '', bundle.brief?.content_id || '', spec.template_version || 'hybrid-v2.2', now(), pub.id);
      }
      event('publish', renderId, 'kit_created', channel);
      return send(res, 201, { publication: db.prepare('SELECT * FROM publications WHERE id=?').get(pub.id), files: { dir: relData(dir), ...meta.files } });
    }
    if (method === 'POST' && /^\/api\/publications\/[^/]+\/mark-published$/.test(p)) {
      const id = p.split('/')[3];
      const body = await readBody(req);
      db.prepare('UPDATE publications SET status=?, url=?, external_id=?, updated_at=? WHERE id=?')
        .run('published', String(body.url || ''), String(body.external_id || ''), now(), id);
      event('publish', id, 'marked_published', body.url || '');
      return send(res, 200, db.prepare('SELECT * FROM publications WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/publications\/[^/]+\/publish-wechat$/.test(p)) {
      const id = p.split('/')[3];
      const body = await readBody(req).catch(() => ({}));
      const pub = db.prepare('SELECT * FROM publications WHERE id=?').get(id);
      if (!pub) return fail(res, 404, '发布任务不存在');
      try {
        const result = await publishWechat(pub, { dryRun: body.dryRun, accountId: body.account_id || pub.account_id || '', submit: body.submit });
        return send(res, 200, result);
      } catch (e) {
        return fail(res, 500, e.message);
      }
    }

    if (method === 'GET' && p === '/api/egress-ip') {
      try {
        const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(10000) });
        const data = await r.json();
        return send(res, 200, { ip: data.ip || '', checked_at: now() });
      } catch (e) {
        return fail(res, 502, '无法获取出口 IP：' + e.message);
      }
    }

    if (method === 'GET' && p === '/api/elements') {
      const custom = db.prepare("SELECT * FROM elements WHERE status='active' ORDER BY created_at DESC").all()
        .map(e => ({ ...e, tags: jsonParse(e.tags, []) }));
      return send(res, 200, { elements: [...listElements(), ...custom], spec: ELEMENT_SPEC });
    }
    if (method === 'GET' && /^\/api\/elements\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const custom = db.prepare("SELECT * FROM elements WHERE id=? AND status='active'").get(id);
      const e = custom ? { ...custom, tags: jsonParse(custom.tags, []) } : getElement(id);
      return e ? send(res, 200, e) : fail(res, 404, '元素不存在');
    }
    if (method === 'POST' && p === '/api/ai/element-draft') {
      const body = await readBody(req);
      try {
        const candidate = await draftElementSvg(body.concept || '');
        const checked = validateGeneratedSvg(candidate.svg);
        if (!checked.ok) return fail(res, 400, checked.error);
        return send(res, 200, { ok: true, element: { ...candidate, svg: checked.svg } });
      } catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/elements') {
      const body = await readBody(req);
      const checked = validateGeneratedSvg(body.svg);
      if (!checked.ok) return fail(res, 400, checked.error);
      const id = newId('el');
      const t = now();
      db.prepare('INSERT INTO elements (id,name,concept,tags,svg,source,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, String(body.name || 'AI 元素').slice(0, 30), String(body.concept || '').slice(0, 100), jsonString(body.tags || []), checked.svg, 'generated', 'active', t);
      return send(res, 201, { ...body, id, svg: checked.svg, tags: body.tags || [], source: 'generated' });
    }
    if (method === 'GET' && p === '/api/templates') {
      return send(res, 200, { themes: TEMPLATE_THEMES, templates: listTemplates() });
    }
    if (method === 'GET' && /^\/api\/templates\/[^/]+$/.test(p)) {
      const t = getTemplate(p.split('/').pop());
      return t ? send(res, 200, t) : fail(res, 404, '模板不存在');
    }
    if (method === 'GET' && p === '/api/music') {
      return send(res, 200, { tracks: listMusic() });
    }
    if (method === 'POST' && p === '/api/music/recommend') {
      const body = await readBody(req);
      return send(res, 200, recommendMusic({ text: body.text || '', category: body.category || '' }));
    }
    if (method === 'GET' && /^\/api\/music\/[^/]+\/audio$/.test(p)) {
      const id = p.split('/')[3];
      const file = resolveMusicFile(id);
      if (!file || !fs.existsSync(file)) return fail(res, 404, '音频不存在');
      return serveFile(req, res, file);
    }
    if (method === 'PATCH' && /^\/api\/music\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const body = await readBody(req);
      try { return send(res, 200, updateUploadedMusic(id, body)); }
      catch (e) { return fail(res, 400, e.message); }
    }
    if (method === 'POST' && p === '/api/music/upload') {
      const buf = await readRaw(req);
      if (!buf.length) return fail(res, 400, '音乐文件为空');
      const filename = decodeURIComponent(req.headers['x-filename'] || 'track.wav');
      const entry = addUploadedMusic(buf, filename, {
        name: decodeURIComponent(req.headers['x-music-name'] || filename),
        category: decodeURIComponent(req.headers['x-music-category'] || '其他'),
        tags: decodeURIComponent(req.headers['x-music-tags'] || ''),
        bpm: req.headers['x-music-bpm'] || 0
      });
      return send(res, 200, { ok: true, track: entry });
    }
    if (method === 'DELETE' && /^\/api\/music\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      return send(res, 200, { ok: deleteUploadedMusic(id) });
    }
    if (method === 'GET' && /^\/api\/publish\/schema\/[^/]+\/[^/]+$/.test(p)) {
      const parts = p.split('/');
      const key = `${parts[4]}:${parts[5]}`;
      const schema = SCHEMAS[key];
      if (!schema) return fail(res, 404, '没有这个平台 schema');
      return send(res, 200, { key, schema, source: 'apifox-snapshot-2026-11-08', verified: false });
    }
    if (method === 'GET' && p === '/api/publish/providers') {
      const s = getSettings();
      return send(res, 200, {
        yixiaoer: {
          configured: yixiaoerConfigured(),
          base_url: s.yixiaoer_base_url || 'https://open-api.yixiaoer.cn',
          publish_channel: s.yixiaoer_publish_channel || 'cloud'
        }
      });
    }
    if (method === 'POST' && p === '/api/publish/preflight') {
      const body = await readBody(req);
      const r = buildVariantPayload(String(body.platform || ''), String(body.publish_type || ''), body.variant || {});
      return send(res, 200, {
        ok: r.ok,
        errors: r.errors,
        profile: r.profile || '',
        payload: r.payload,
        provider: 'yixiaoer',
        dry_run: true
      });
    }
    if (method === 'GET' && p === '/api/settings') {
      const s = getSettings();
      const accounts = listWechatAccounts().map(a => ({ ...a, secret_set: Boolean(a.secret), secret: undefined }));
      const accountGroups = listAccountGroups().map(g => ({
        ...g,
        channels: listChannelsByGroup(g.id).map(a => ({ ...a, secret_set: Boolean(a.secret), secret: undefined }))
      }));
      return send(res, 200, {
        wechat_appid: s.wechat_appid || '',
        wechat_author: s.wechat_author || '',
        wechat_dry_run: (s.wechat_dry_run || 'true') === 'true',
        wechat_auto_submit: (s.wechat_auto_submit || 'false') === 'true',
        wechat_secret_set: Boolean(s.wechat_secret),
        wechat_accounts: accounts,
        account_groups: accountGroups,
        wechat_default_account_id: (getDefaultWechatAccount() || {}).id || '',
        llm_base_url: s.llm_base_url || '',
        llm_model: s.llm_model || 'deepseek-chat',
        llm_api_key_set: Boolean(s.llm_api_key),
        brand_name: s.brand_name || 'FIXED ADDRESS',
        operator_name: s.operator_name || '主编',
        article_style_version: s.article_style_version || 'wechat_article_v1',
        article_style_frozen: (s.article_style_frozen || 'true') === 'true',
        motion_preset: s.motion_preset || 'flow',
        engine_default_mode: s.engine_default_mode || 'auto',
        engine_default: s.engine_default || 'vibemotion',
        render_service_url: s.render_service_url || 'http://127.0.0.1:5001',
        tts_provider: s.tts_provider || 'none',
        tts_base_url: s.tts_base_url || '',
        tts_model: s.tts_model || '',
        tts_voice: s.tts_voice || '',
        tts_appid: s.tts_appid || '',
        tts_speed: Number(s.tts_speed) || 1,
        tts_api_key_set: Boolean(s.tts_api_key),
        font_heading: s.font_heading || 'ZCOOL KuaiLe',
        font_body: s.font_body || 'LXGW WenKai',
        yixiaoer_base_url: s.yixiaoer_base_url || 'https://open-api.yixiaoer.cn',
        yixiaoer_api_key_set: Boolean(s.yixiaoer_api_key),
        yixiaoer_authorization_set: Boolean(s.yixiaoer_authorization),
        yixiaoer_publish_channel: s.yixiaoer_publish_channel || 'cloud'
      });
    }
    if (method === 'PUT' && p === '/api/settings') {
      const body = await readBody(req);
      const map = {};
      for (const k of ['wechat_appid', 'wechat_author', 'wechat_dry_run', 'wechat_auto_submit', 'llm_base_url', 'llm_model', 'brand_name', 'operator_name', 'engine_default', 'engine_default_mode', 'render_service_url', 'tts_provider', 'tts_base_url', 'tts_model', 'tts_voice', 'tts_appid', 'font_heading', 'font_body']) {
        if (body[k] !== undefined) map[k] = String(body[k]);
      }
      if (body.tts_speed !== undefined) map.tts_speed = String(body.tts_speed);
      if (body.tts_api_key) map.tts_api_key = String(body.tts_api_key);
      if (body.wechat_secret) map.wechat_secret = String(body.wechat_secret);
      if (body.llm_api_key) map.llm_api_key = String(body.llm_api_key);
      for (const k of ['yixiaoer_base_url','yixiaoer_publish_channel']) if (body[k] !== undefined) map[k] = String(body[k]);
      if (body.yixiaoer_api_key) map.yixiaoer_api_key = String(body.yixiaoer_api_key);
      if (body.yixiaoer_authorization) map.yixiaoer_authorization = String(body.yixiaoer_authorization);
      setSettings(map);
      event('settings', 'global', 'updated', Object.keys(map).join(','));
      const s = getSettings();
      return send(res, 200, {
        ok: true,
        wechat_appid: s.wechat_appid || '',
        wechat_author: s.wechat_author || '',
        wechat_dry_run: (s.wechat_dry_run || 'true') === 'true',
        wechat_auto_submit: (s.wechat_auto_submit || 'false') === 'true',
        wechat_secret_set: Boolean(s.wechat_secret),
        llm_base_url: s.llm_base_url || '',
        llm_model: s.llm_model || 'deepseek-chat',
        llm_api_key_set: Boolean(s.llm_api_key)
      });
    }
    if (method === 'POST' && p === '/api/settings/test-llm') {
      try {
        const result = await testLLM();
        return send(res, 200, result);
      } catch (e) {
        return fail(res, 500, e.message);
      }
    }
    const accountSanitize = (a) => a ? { ...a, secret_set: Boolean(a.secret), secret: undefined } : null;
    if (method === 'GET' && p === '/api/account-groups') {
      return send(res, 200, {
        groups: listAccountGroups().map(g => ({ ...g, channels: listChannelsByGroup(g.id).map(accountSanitize) })),
        default_id: (getDefaultAccountGroup() || {}).id || ''
      });
    }
    if (method === 'POST' && p === '/api/account-groups') {
      const body = await readBody(req);
      if (!body.name) return fail(res, 400, '账号组名称必填');
      const group = saveAccountGroup({ name: String(body.name), color: body.color || '#C73520', description: body.description || '', is_default: body.is_default });
      if (body.is_default || listAccountGroups().length === 1) {
        db.prepare('UPDATE account_groups SET is_default=0').run();
        db.prepare('UPDATE account_groups SET is_default=1 WHERE id=?').run(group.id);
      }
      event('settings', group.id, 'account_group_saved', group.name);
      return send(res, 201, { group });
    }
    if (method === 'PUT' && /^\/api\/account-groups\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const body = await readBody(req);
      if (!getAccountGroup(id)) return fail(res, 404, '账号组不存在');
      if (!body.name) return fail(res, 400, '账号组名称必填');
      const group = saveAccountGroup({ id, name: String(body.name), color: body.color || '#C73520', description: body.description || '', is_default: body.is_default });
      if (body.is_default) {
        db.prepare('UPDATE account_groups SET is_default=0').run();
        db.prepare('UPDATE account_groups SET is_default=1 WHERE id=?').run(id);
      }
      event('settings', id, 'account_group_updated', group.name);
      return send(res, 200, { group });
    }
    if (method === 'POST' && /^\/api\/account-groups\/[^/]+\/default$/.test(p)) {
      const id = p.split('/')[3];
      if (!getAccountGroup(id)) return fail(res, 404, '账号组不存在');
      db.prepare('UPDATE account_groups SET is_default=0').run();
      db.prepare('UPDATE account_groups SET is_default=1 WHERE id=?').run(id);
      event('settings', id, 'account_group_default', '');
      return send(res, 200, { default_id: id });
    }
    if (method === 'DELETE' && /^\/api\/account-groups\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const group = getAccountGroup(id);
      if (!group) return fail(res, 404, '账号组不存在');
      if (group.is_default) return fail(res, 400, '默认账号组不能删除');
      const channels = listChannelsByGroup(id).length;
      const briefs = db.prepare('SELECT COUNT(*) AS n FROM briefs WHERE group_id=?').get(id).n;
      if (channels || briefs) return fail(res, 400, `账号组下还有 ${channels} 个渠道、${briefs} 条选题，请先清理`);
      deleteAccountGroup(id);
      event('settings', id, 'account_group_deleted', group.name);
      return send(res, 200, { ok: true });
    }
    if (method === 'GET' && p === '/api/wechat-accounts') {
      return send(res, 200, { accounts: listWechatAccounts().map(accountSanitize), default_id: (getDefaultWechatAccount() || {}).id || '' });
    }
    if (method === 'POST' && p === '/api/wechat-accounts') {
      const body = await readBody(req);
      const channel = ['wechat_article','wechat_channels','xiaohongshu','douyin'].includes(body.channel) ? body.channel : 'wechat_article';
      const platform = ['wechat_article','wechat_channels','xiaohongshu','douyin'].includes(body.platform) ? body.platform : channel;
      if (!body.name) return fail(res, 400, '账号名称必填');
      if (platform === 'wechat_article' && !body.appid) return fail(res, 400, '公众号 AppID 必填');
      const existing = body.appid && listWechatAccounts().find(a => a.id !== body.id && a.appid === body.appid);
      if (existing) return fail(res, 409, '该 AppID 已存在');
      const acc = saveWechatAccount({
        id: body.id || '',
        group_id: body.group_id || (getDefaultAccountGroup() || {}).id || '',
        name: String(body.name),
        appid: String(body.appid || ''),
        secret: body.secret ? String(body.secret) : '',
        author: body.author || '',
        color: body.color || (platform === 'wechat_channels' ? '#2E6F9E' : '#C73520'),
        channel,
        platform,
        provider: body.provider || (platform === 'wechat_article' ? 'direct' : (platform === 'wechat_channels' ? 'manual' : 'yixiaoer')),
        provider_account_id: body.provider_account_id || '',
        description: body.description || '',
        is_default: body.is_default,
        dry_run: body.dry_run !== false,
        auto_submit: body.auto_submit === true
      });
      if (body.is_default || listWechatAccounts(channel).length === 1) {
        db.prepare('UPDATE wechat_accounts SET is_default=0 WHERE channel=?').run(channel);
        db.prepare('UPDATE wechat_accounts SET is_default=1 WHERE id=?').run(acc.id);
      }
      event('settings', acc.id, 'wechat_account_saved', acc.name);
      return send(res, 201, { account: accountSanitize(getWechatAccount(acc.id)) });
    }
    if (method === 'PUT' && /^\/api\/wechat-accounts\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const body = await readBody(req);
      const prior = getWechatAccount(id);
      if (!prior) return fail(res, 404, '账号不存在');
      const channel = ['wechat_article','wechat_channels','xiaohongshu','douyin'].includes(body.channel) ? body.channel : (prior.channel || 'wechat_article');
      const platform = ['wechat_article','wechat_channels','xiaohongshu','douyin'].includes(body.platform) ? body.platform : (prior.platform || channel);
      if (!body.name) return fail(res, 400, '账号名称必填');
      if (platform === 'wechat_article' && !body.appid) return fail(res, 400, '公众号 AppID 必填');
      const acc = saveWechatAccount({
        id,
        group_id: body.group_id || prior.group_id || (getDefaultAccountGroup() || {}).id || '',
        name: String(body.name),
        appid: String(body.appid || ''),
        secret: body.secret ? String(body.secret) : '',
        author: body.author || '',
        color: body.color || (platform === 'wechat_channels' ? '#2E6F9E' : '#C73520'),
        channel,
        platform,
        provider: body.provider || (platform === 'wechat_article' ? 'direct' : (platform === 'wechat_channels' ? 'manual' : 'yixiaoer')),
        provider_account_id: body.provider_account_id || '',
        description: body.description || '',
        is_default: body.is_default,
        dry_run: body.dry_run !== false,
        auto_submit: body.auto_submit === true
      });
      if (body.is_default) {
        db.prepare('UPDATE wechat_accounts SET is_default=0 WHERE channel=?').run(channel);
        db.prepare('UPDATE wechat_accounts SET is_default=1 WHERE id=?').run(id);
      }
      event('settings', id, 'wechat_account_updated', acc.name);
      return send(res, 200, { account: accountSanitize(getWechatAccount(id)) });
    }
    if (method === 'POST' && /^\/api\/wechat-accounts\/[^/]+\/default$/.test(p)) {
      const id = p.split('/')[3];
      const acc = getWechatAccount(id);
      if (!acc) return fail(res, 404, '账号不存在');
      db.prepare('UPDATE wechat_accounts SET is_default=0 WHERE channel=?').run(acc.channel || 'wechat_article');
      db.prepare('UPDATE wechat_accounts SET is_default=1 WHERE id=?').run(id);
      event('settings', id, 'wechat_account_default', '');
      return send(res, 200, { default_id: id });
    }
    if (method === 'DELETE' && /^\/api\/wechat-accounts\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const acc = getWechatAccount(id);
      if (!acc) return fail(res, 404, '账号不存在');
      if (acc.is_default) return fail(res, 400, '默认账号不能删除，先把另一个账号设为默认');
      const briefCount = db.prepare('SELECT COUNT(*) AS n FROM briefs WHERE account_id=?').get(id).n;
      const pubCount = db.prepare('SELECT COUNT(*) AS n FROM publications WHERE account_id=?').get(id).n;
      if (briefCount || pubCount) return fail(res, 400, `这个账号下还有 ${briefCount} 条选题、${pubCount} 条发布记录，请先转移内容`);
      deleteWechatAccount(id);
      event('settings', id, 'wechat_account_deleted', acc.name);
      return send(res, 200, { ok: true });
    }
    if (method === 'PUT' && /^\/api\/briefs\/[^/]+\/account$/.test(p)) {
      const briefId = p.split('/')[3];
      const body = await readBody(req);
      const account = getWechatAccount(String(body.account_id || ''));
      if (!account) return fail(res, 404, '账号不存在');
      const brief = db.prepare('SELECT * FROM briefs WHERE id=?').get(briefId);
      if (!brief) return fail(res, 404, '选题不存在');
      db.prepare('UPDATE briefs SET account_id=?, group_id=?, updated_at=? WHERE id=?').run(account.id, account.group_id || '', now(), briefId);
      db.prepare(`UPDATE publications SET account_id=?, updated_at=? WHERE account_id<>? AND channel=? AND render_id IN
        (SELECT id FROM renders WHERE brief_id=?)`).run(account.id, now(), account.id, account.channel, briefId);
      event('brief', briefId, 'account_changed', account.name);
      return send(res, 200, { ok: true, account_id: account.id });
    }
    if (method === 'POST' && p === '/api/settings/test-wechat') {
      try {
        const body = await readBody(req).catch(() => ({}));
        const result = await testWechat(body.account_id || '');
        return send(res, 200, result);
      } catch (e) {
        return fail(res, 500, e.message);
      }
    }

    if (method === 'GET' && p === '/api/video-tasks') {
      const rows = db.prepare('SELECT * FROM video_tasks ORDER BY created_at DESC').all();
      return send(res, 200, { tasks: rows, counts: {
        todo: rows.filter(t => ['queued', 'pending_confirm'].includes(t.status)).length,
        doing: rows.filter(t => ['running'].includes(t.status)).length,
        done: rows.filter(t => ['done'].includes(t.status)).length,
        blocked: rows.filter(t => ['blocked', 'failed'].includes(t.status)).length
      } });
    }
    if (method === 'POST' && p === '/api/video-tasks') {
      const body = await readBody(req);
      const mode = String(body.mode || 'auto');
      let title = String(body.title || '');
      let script = String(body.script || '');
      let timelineJson = '';
      let durationMs = Math.max(5000, Number(body.duration_ms) || 30000);

      // 固定页式：从 data/regression 选「主题 + 页数」加载 spec。
      if (mode === 'fixed') {
        const theme = String(body.theme || 'archive');
        const pageCount = Number(body.page_count) || 4;
        if (!['archive', 'terminal', 'editorial', 'noir', 'earth'].includes(theme)) return fail(res, 400, '主题不合法');
        if (![4, 5, 6].includes(pageCount)) return fail(res, 400, '页数须为 4/5/6');
        const specFile = path.join(DATA_DIR, 'regression', `${theme}-${pageCount}.json`);
        if (!fs.existsSync(specFile)) return fail(res, 404, `固定页式样本不存在：${theme}-${pageCount}`);
        const spec = JSON.parse(fs.readFileSync(specFile, 'utf8').replace(/^\uFEFF/, ''));
        timelineJson = JSON.stringify({ spec });
        title = title || `固定页式 · ${theme} · ${pageCount} 页`;
        if (!script) script = title;
        durationMs = [20, 24, 28][pageCount - 4] * 1000;
      }

      if (!title && !script) return fail(res, 400, '标题或文案必填');
      const id = newId('vtask');
      const t = now();
      const structureType = String(body.structure_type || 'causal');
      const structureName = String(body.structure_name || '');
      db.prepare(`INSERT INTO video_tasks
        (id,title,engine,mode,template,style,avatar,structure_type,structure_name,script,voice_path,voice_provider,timeline_json,palette,duration_ms,status,progress,video_path,cover_path,error,retry_count,user_id,source,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, title, String(body.engine || 'vibemotion'), mode,
        String(body.template || ''), String(body.style || 'industrial'), body.avatar ? 1 : 0, structureType, structureName, script, String(body.voice_path || ''),
        String(body.voice_provider || ''), timelineJson, String(body.palette || 'cream'), durationMs,
        'queued', 0, '', '', '', 0, String(body.user_id || ''), String(body.source || (mode === 'fixed' ? 'fixed-pages' : 'autogen')), t, t
      );
      event('video_task', id, 'created', body.title || '');
      enqueueVideoTask(id);
      return send(res, 201, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }
    if (method === 'GET' && /^\/api\/video-tasks\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      return send(res, 200, task);
    }
    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/cancel$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (['queued', 'running'].includes(task.status)) {
        updateVideoTask(id, { status: 'canceled' });
        const child = activeVibeChildren.get(id);
        if (child) { try { child.kill(); } catch {} activeVibeChildren.delete(id); }
      }
      return send(res, 200, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/retry$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (!['failed', 'blocked', 'canceled', 'interrupted'].includes(task.status)) return fail(res, 400, '只有失败/拦截/取消/中断的任务才能重试');
      updateVideoTask(id, { status: 'queued', progress: 0, error: '', retry_count: (task.retry_count || 0) + 1 });
      enqueueVideoTask(id);
      return send(res, 200, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/review$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (task.status !== 'done') return fail(res, 400, '只有完成的视频才能审批');
      const body = await readBody(req);
      const decision = String(body.decision || '');
      if (!['approved', 'changes_requested', 'rejected'].includes(decision)) return fail(res, 400, 'decision 不合法');
      updateVideoTask(id, {
        review_state: decision,
        review_comment: String(body.comment || ''),
        reviewed_at: now()
      });
      event('review', id, decision, String(body.comment || ''));
      return send(res, 201, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }
    if (method === 'PUT' && /^\/api\/video-tasks\/[^/]+$/.test(p)) {
      const id = p.split('/').pop();
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      const body = await readBody(req);
      updateVideoTask(id, {
        title: body.title !== undefined ? String(body.title) : task.title,
        script: body.script !== undefined ? String(body.script) : task.script,
        structure_type: body.structure_type !== undefined ? String(body.structure_type) : task.structure_type,
        style: body.style !== undefined ? String(body.style) : task.style,
        avatar: body.avatar !== undefined ? (body.avatar ? 1 : 0) : task.avatar,
        duration_ms: body.duration_ms !== undefined ? Number(body.duration_ms) : task.duration_ms,
        mode: body.mode !== undefined ? String(body.mode) : task.mode,
        status: 'queued', progress: 0, error: '', timeline_json: '', video_path: '', cover_path: '',
        voice_path: '', publish_status: 'none', publish_receipt: '', review_state: '', review_comment: '', reviewed_at: ''
      });
      enqueueVideoTask(id);
      return send(res, 200, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/publish-wechat$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (['draft_created', 'published'].includes(task.publish_status)) return fail(res, 400, '该视频已创建草稿或已发布，勿重复操作');
      const body = await readBody(req);
      const accountId = String(body.account_id || '');
      try {
        const r = await publishVtaskWechat(task, { accountId });
        updateVideoTask(id, {
          publish_status: r.dry_run ? 'ready' : 'draft_created',
          publish_receipt: JSON.stringify({ media_id: r.media_id || '', account_id: accountId, channel: 'wechat_article', dry_run: r.dry_run, at: now() })
        });
        return send(res, 200, r);
      } catch (e) {
        return fail(res, 500, e.message);
      }
    }
    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/publish$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (task.status !== 'done') return fail(res, 400, '只有完成的视频才能发布');
      const body = await readBody(req);
      const channel = String(body.channel || 'wechat_channels');
      if (!['wechat_channels', 'wechat_article'].includes(channel)) return fail(res, 400, '非法渠道');
      const safe = channel === 'wechat_article' ? 'wechat_article' : 'wechat_channels';
      const kitDir = path.join(KITS_DIR, `vtask-${id}-${safe}`);
      fs.mkdirSync(kitDir, { recursive: true });
      const videoSrc = path.join(MEDIA_DIR, task.video_path);
      const coverSrc = path.join(MEDIA_DIR, task.cover_path);
      if (fs.existsSync(videoSrc)) fs.copyFileSync(videoSrc, path.join(kitDir, 'video.mp4'));
      if (fs.existsSync(coverSrc)) fs.copyFileSync(coverSrc, path.join(kitDir, 'cover.png'));
      const channelName = safe === 'wechat_article' ? '公众号（文章草稿）' : '视频号（手动上传）';
      fs.writeFileSync(path.join(kitDir, 'copy.txt'), `标题：${task.title}\n\n文案：\n${task.script || ''}\n\n结构：${task.structure_type || ''}\n风格：${task.style || ''}\n`, 'utf8');
      fs.writeFileSync(path.join(kitDir, 'README.txt'), [
        `发布渠道：${channelName}`,
        `标题：${task.title}`,
        ``,
        '视频号：请用「视频.mp4 + 封面.png + 文案」手动上传。',
        '公众号：请用文案生成文章草稿，可内嵌视频号视频。',
        '发布前请再次检查：标题 / 文案 / 封面 / 合规。'
      ].join('\n'), 'utf8');
      updateVideoTask(id, { publish_status: 'packaged' });
      return send(res, 200, { ok: true, kit: `kits/vtask-${id}-${safe}` });
    }

    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/publish-ready$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (task.status !== 'done') return fail(res, 400, '只有完成的视频才能准备发布');
      updateVideoTask(id, { publish_status: 'ready' });
      return send(res, 200, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/video-tasks\/[^/]+\/confirm$/.test(p)) {
      const id = p.split('/')[3];
      const task = db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id);
      if (!task) return fail(res, 404, '任务不存在');
      if (task.status !== 'pending_confirm') return fail(res, 400, '任务不在待确认状态');
      updateVideoTask(id, { status: 'queued', progress: 25, error: '' });
      enqueueVideoTask(id);
      return send(res, 200, db.prepare('SELECT * FROM video_tasks WHERE id=?').get(id));
    }

    if (method === 'GET' && p === '/api/element-catalog') return send(res, 200, { elements: ELEMENT_CATALOG, palettes: PALETTES, fonts: FONT_PAIRS, templates: TEMPLATES });
    if (method === 'GET' && p === '/api/element-assets') return send(res, 200, listElementAssets());
    if (method === 'POST' && p === '/api/ai/draft-script') {
      const body = await readBody(req);
      const script = await draftAutoScript(String(body.title || ''), String(body.structure_type || 'causal'));
      return send(res, 200, { script });
    }
    if (method === 'GET' && p === '/api/fonts') {
      const fontsFile = path.join(ENGINE_DIR, 'fonts.json');
      let fonts = ['LXGW WenKai', 'ZCOOL KuaiLe'];
      try { fonts = Object.keys(JSON.parse(fs.readFileSync(fontsFile, 'utf8'))); } catch {}
      return send(res, 200, { fonts });
    }
    if (method === 'GET' && p === '/api/voice-assets') {
      const u = new URL(req.url, 'http://x');
      const q = u.searchParams.get('q') || '';
      const group = u.searchParams.get('group') || '';
      const archived = u.searchParams.get('archived') === '1';
      let rows;
      if (archived) rows = db.prepare("SELECT * FROM media_assets WHERE category='voice' AND archived=1 ORDER BY created_at DESC").all();
      else if (group) rows = db.prepare("SELECT * FROM media_assets WHERE category='voice' AND archived=0 AND group_name=? ORDER BY created_at DESC").all(group);
      else rows = db.prepare("SELECT * FROM media_assets WHERE category='voice' AND archived=0 ORDER BY created_at DESC").all();
      if (q) rows = rows.filter(r => (r.name || '').includes(q) || (r.tags || '').includes(q));
      const groups = db.prepare("SELECT DISTINCT group_name FROM media_assets WHERE category='voice' AND group_name != ''").all().map(r => r.group_name);
      return send(res, 200, { assets: rows, groups });
    }
    if (method === 'POST' && p === '/api/voice-assets') {
      const body = await readBody(req);
      if (!body.data) return fail(res, 400, '缺少音频数据');
      const id = newId('voice');
      const ext = (body.mime || '').includes('wav') ? 'wav' : 'mp3';
      const dir = path.join(MEDIA_DIR, 'voice-assets');
      fs.mkdirSync(dir, { recursive: true });
      const file = `${id}.${ext}`;
      fs.writeFileSync(path.join(dir, file), Buffer.from(String(body.data).replace(/^data:[^;]+;base64,/, ''), 'base64'));
      const t = now();
      db.prepare('INSERT INTO media_assets (id,name,category,mime,path,group_name,tags,archived,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id, String(body.name || id), 'voice', String(body.mime || 'audio/mpeg'), 'voice-assets/' + file, String(body.group_name || ''), String(body.tags || ''), 0, t);
      return send(res, 201, db.prepare('SELECT * FROM media_assets WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/voice-assets\/[^/]+\/archive$/.test(p)) {
      const id = p.split('/')[3];
      const row = db.prepare("SELECT * FROM media_assets WHERE id=? AND category='voice'").get(id);
      if (!row) return fail(res, 404, '声音不存在');
      db.prepare('UPDATE media_assets SET archived=? WHERE id=?').run(row.archived ? 0 : 1, id);
      return send(res, 200, db.prepare('SELECT * FROM media_assets WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/voice-assets\/[^/]+\/delete$/.test(p)) {
      const id = p.split('/')[3];
      const row = db.prepare("SELECT * FROM media_assets WHERE id=? AND category='voice'").get(id);
      if (!row) return fail(res, 404, '声音不存在');
      const full = path.join(MEDIA_DIR, row.path);
      if (fs.existsSync(full)) { try { fs.unlinkSync(full); } catch {} }
      db.prepare('DELETE FROM media_assets WHERE id=?').run(id);
      return send(res, 200, { ok: true });
    }

    if (method === 'GET' && p === '/api/media-assets') {
      const u = new URL(req.url, 'http://x');
      const q = u.searchParams.get('q') || '';
      const group = u.searchParams.get('group') || '';
      const archived = u.searchParams.get('archived') === '1';
      let rows;
      if (archived) {
        rows = db.prepare("SELECT * FROM media_assets WHERE category='image' AND archived=1 ORDER BY created_at DESC").all();
      } else if (group) {
        rows = db.prepare("SELECT * FROM media_assets WHERE category='image' AND archived=0 AND group_name=? ORDER BY created_at DESC").all(group);
      } else {
        rows = db.prepare("SELECT * FROM media_assets WHERE category='image' AND archived=0 ORDER BY created_at DESC").all();
      }
      if (q) rows = rows.filter(r => (r.name || '').includes(q) || (r.tags || '').includes(q));
      const groups = db.prepare("SELECT DISTINCT group_name FROM media_assets WHERE category='image' AND group_name != ''").all().map(r => r.group_name);
      return send(res, 200, { assets: rows, groups });
    }
    if (method === 'POST' && p === '/api/media-assets') {
      const body = await readBody(req);
      if (!body.data) return fail(res, 400, '缺少图片数据');
      const id = newId('asset');
      const ext = (body.mime || '').includes('png') ? 'png' : (body.mime || '').includes('gif') ? 'gif' : 'jpg';
      const dir = path.join(MEDIA_DIR, 'media-assets');
      fs.mkdirSync(dir, { recursive: true });
      const file = `${id}.${ext}`;
      const full = path.join(dir, file);
      fs.writeFileSync(full, Buffer.from(String(body.data).replace(/^data:[^;]+;base64,/, ''), 'base64'));
      const t = now();
      db.prepare('INSERT INTO media_assets (id,name,category,mime,path,group_name,tags,archived,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id, String(body.name || id), 'image', String(body.mime || 'image/jpeg'), 'media-assets/' + file, String(body.group_name || ''), String(body.tags || ''), 0, t);
      return send(res, 201, db.prepare('SELECT * FROM media_assets WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/media-assets\/[^/]+\/archive$/.test(p)) {
      const id = p.split('/')[3];
      const row = db.prepare('SELECT * FROM media_assets WHERE id=?').get(id);
      if (!row) return fail(res, 404, '素材不存在');
      db.prepare('UPDATE media_assets SET archived=? WHERE id=?').run(row.archived ? 0 : 1, id);
      return send(res, 200, db.prepare('SELECT * FROM media_assets WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/media-assets\/[^/]+\/delete$/.test(p)) {
      const id = p.split('/')[3];
      const row = db.prepare('SELECT * FROM media_assets WHERE id=?').get(id);
      if (!row) return fail(res, 404, '素材不存在');
      const full = path.join(MEDIA_DIR, row.path);
      if (fs.existsSync(full)) { try { fs.unlinkSync(full); } catch {} }
      db.prepare('DELETE FROM media_assets WHERE id=?').run(id);
      return send(res, 200, { ok: true });
    }

    if (method === 'GET' && p === '/api/channels') {
      return send(res, 200, { channels: db.prepare('SELECT * FROM channels ORDER BY created_at').all() });
    }
    if (method === 'POST' && p === '/api/channels') {
      const body = await readBody(req);
      if (!body.name) return fail(res, 400, '渠道名必填');
      const id = newId('ch');
      db.prepare('INSERT INTO channels (id,name,content_type,publish_mode,note,enabled,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, String(body.name), String(body.content_type || 'video'), String(body.publish_mode || 'manual'), String(body.note || ''), body.enabled === false ? 0 : 1, now());
      return send(res, 201, db.prepare('SELECT * FROM channels WHERE id=?').get(id));
    }
    if (method === 'POST' && /^\/api\/channels\/[^/]+\/delete$/.test(p)) {
      const id = p.split('/')[3];
      db.prepare('DELETE FROM channels WHERE id=?').run(id);
      return send(res, 200, { ok: true });
    }
    if (method === 'POST' && /^\/api\/channels\/[^/]+\/toggle$/.test(p)) {
      const id = p.split('/')[3];
      const ch = db.prepare('SELECT * FROM channels WHERE id=?').get(id);
      if (!ch) return fail(res, 404, '渠道不存在');
      db.prepare('UPDATE channels SET enabled=? WHERE id=?').run(ch.enabled ? 0 : 1, id);
      return send(res, 200, db.prepare('SELECT * FROM channels WHERE id=?').get(id));
    }

    return fail(res, 404, 'API 不存在');
  }

  // static media / kits
  if (p.startsWith('/media/')) {
    const file = safeJoin(MEDIA_DIR, p.slice('/media/'.length));
    if (file && serveFile(req, res, file)) return;
    return fail(res, 404, 'media not found');
  }
  if (p.startsWith('/assets/')) {
    const file = safeJoin(path.join(ENGINE_DIR, 'public', 'assets'), p.slice('/assets/'.length));
    if (file && serveFile(req, res, file)) return;
    return fail(res, 404, 'asset not found');
  }
  if (p.startsWith('/gallery/')) {
    const file = safeJoin(path.join(ENGINE_DIR, 'public', 'gallery'), p.slice('/gallery/'.length));
    if (file && serveFile(req, res, file)) return;
    return fail(res, 404, 'gallery not found');
  }
  if (p.startsWith('/kits/')) {
    const file = safeJoin(KITS_DIR, p.slice('/kits/'.length));
    if (file && serveFile(req, res, file)) return;
    return fail(res, 404, 'kit not found');
  }
  if (p.startsWith('/batch-output/')) {
    const file = safeJoin(BATCH_DIR, p.slice('/batch-output/'.length));
    if (file && serveFile(req, res, file)) return;
    return fail(res, 404, 'batch file not found');
  }
  if (p === '/' || p === '/index.html') {
    return serveFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
  }
  if (p.startsWith('/')) {
    const file = safeJoin(PUBLIC_DIR, p.slice(1));
    if (file && serveFile(req, res, file)) return;
  }
  // SPA fallback
  return serveFile(req, res, path.join(PUBLIC_DIR, 'index.html'));
}

function hydrateAndResumeBatches() {
  let changed = false;
  for (const b of Object.values(batches)) {
    for (const item of (b.items || [])) {
      if (!item.brief_id) {
        const s = db.prepare('SELECT brief_id FROM specs WHERE id=?').get(item.spec_id);
        if (s?.brief_id) { item.brief_id = s.brief_id; changed = true; }
      }
      if (!item.render_id) {
        const r = db.prepare('SELECT id FROM renders WHERE spec_id=? ORDER BY created_at DESC LIMIT 1').get(item.spec_id);
        if (r?.id) { item.render_id = r.id; changed = true; }
      }
    }
    if (['queued', 'running'].includes(b.status)) {
      for (const item of b.items || []) {
        if (item.status === 'rendering' || item.status === 'queued') item.status = 'queued';
      }
      b.status = 'queued';
      b.canceled = false;
      b.updated_at = new Date().toISOString();
      changed = true;
      setTimeout(() => enqueueBatch(b), 1800);
    }
  }
  if (changed) saveBatches();
}
hydrateAndResumeBatches();

const server = http.createServer((req, res) => {
  route(req, res).catch(e => {
    console.error(e);
    if (!res.headersSent) fail(res, 500, e.message || 'server error');
    else res.end();
  });
});
server.listen(PORT, HOST, () => {
  console.log(`[studio] http://${HOST}:${PORT}`);
  console.log(`[studio] data: ${DATA_DIR}`);
  // Re-enqueue tasks that were queued before a restart.
  const queued = db.prepare("SELECT id FROM video_tasks WHERE status='queued'").all();
  for (const q of queued) enqueueVideoTask(q.id);
});












