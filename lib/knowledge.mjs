import fs from 'node:fs';
import path from 'node:path';
import { db, ROOT, newId, now, jsonParse, jsonString, event } from './db.mjs';

export const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR
  ? path.resolve(process.env.KNOWLEDGE_DIR)
  : path.resolve(ROOT, '..', 'knowledge');

fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
fs.mkdirSync(path.join(KNOWLEDGE_DIR, 'inbox'), { recursive: true });

const clean = (s) => String(s ?? '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

function parseFrontmatter(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return { meta: {}, body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { meta: {}, body: text };
  const head = text.slice(4, end).trim();
  const body = text.slice(end + 4).replace(/^\n+/, '');
  const meta = {};
  for (const line of head.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return { meta, body };
}

export function chunkText(text, maxChars = 700, overlap = 100) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const p of paragraphs) {
    if (!current) current = p;
    else if ((current + '\n\n' + p).length <= maxChars) current += '\n\n' + p;
    else {
      chunks.push(current);
      const tail = current.slice(-overlap);
      current = (tail ? tail + '\n\n' : '') + p;
    }
  }
  if (current) chunks.push(current);
  // Very long single paragraphs: hard split.
  const final = [];
  for (const c of chunks) {
    if (c.length <= maxChars * 1.4) final.push(c);
    else {
      for (let i = 0; i < c.length; i += maxChars - overlap) {
        final.push(c.slice(i, i + maxChars));
        if (i + maxChars >= c.length) break;
      }
    }
  }
  return final.map(c => String(c).trim()).filter(Boolean);
}

export function indexKnowledge({ title, content, source_type = 'manual', source_path = '', url = '', tags = [] } = {}) {
  const raw = String(content || '');
  if (!raw.trim()) throw new Error('内容为空');
  const parsed = parseFrontmatter(raw);
  const body = parsed.body || raw;
  const finalTitle = clean(title || parsed.meta.title || path.basename(source_path, path.extname(source_path)) || '未命名资料');
  const finalTags = Array.isArray(tags) && tags.length
    ? tags
    : String(parsed.meta.tags || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);
  const id = newId('kn');
  const t = now();
  db.prepare(`INSERT INTO knowledge_items
    (id,title,source_type,source_path,url,content,tags,status,char_count,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, finalTitle, source_type, source_path, url, body, jsonString(finalTags), 'active', body.length, t, t
  );
  const chunks = chunkText(body);
  const ins = db.prepare('INSERT INTO knowledge_chunks (id,item_id,chunk_index,text,char_count) VALUES (?,?,?,?,?)');
  chunks.forEach((c, i) => ins.run(newId('chunk'), id, i, c, c.length));
  event('knowledge', id, 'indexed', `${chunks.length} 个切块`);
  return getKnowledge(id);
}

export function listKnowledge() {
  return db.prepare(`
    SELECT i.*, (SELECT COUNT(*) FROM knowledge_chunks c WHERE c.item_id=i.id) AS chunk_count
    FROM knowledge_items i ORDER BY i.updated_at DESC
  `).all().map(r => ({ ...r, tags: jsonParse(r.tags, []) }));
}

export function getKnowledge(id) {
  const item = db.prepare('SELECT * FROM knowledge_items WHERE id=?').get(id);
  if (!item) return null;
  const chunks = db.prepare('SELECT * FROM knowledge_chunks WHERE item_id=? ORDER BY chunk_index').all(id);
  return { ...item, tags: jsonParse(item.tags, []), chunks };
}

export function deleteKnowledge(id) {
  db.prepare('DELETE FROM knowledge_items WHERE id=?').run(id);
  event('knowledge', id, 'deleted', '');
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walkFiles(full, out);
    } else if (/\.(md|markdown|txt)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export function scanKnowledgeDir(dir = KNOWLEDGE_DIR, { force = false } = {}) {
  const root = path.resolve(dir);
  if (!root.startsWith(path.resolve(KNOWLEDGE_DIR))) throw new Error('只能扫描 knowledge 目录');
  const files = walkFiles(root);
  let added = 0, skipped = 0;
  for (const file of files) {
    const name = path.basename(file);
    if (name.startsWith('_template') || name.toLowerCase() === 'readme.md') { skipped++; continue; }
    const existing = db.prepare('SELECT id,updated_at FROM knowledge_items WHERE source_type=? AND source_path=?').get('file', file);
    if (existing && !force) {
      const mtime = fs.statSync(file).mtimeMs;
      if (Date.parse(existing.updated_at) >= mtime) { skipped++; continue; }
      deleteKnowledge(existing.id);
    }
    if (existing && force) deleteKnowledge(existing.id);
    try {
      const raw = fs.readFileSync(file, 'utf8');
      indexKnowledge({ content: raw, source_type: 'file', source_path: file });
      added++;
    } catch (e) {
      console.warn('knowledge import failed', file, e.message);
      skipped++;
    }
  }
  return { added, skipped, total: files.length, dir: root };
}

function tokenize(q) {
  const text = String(q || '').toLowerCase();
  const terms = new Set(text.split(/[\s,，。；;、！？!?:：/\\|()（）\[\]【】"'“”]+/).filter(x => x.length >= 2));
  // Chinese n-grams help with compound queries.
  const cn = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  for (const run of cn) {
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i + n <= run.length; i++) terms.add(run.slice(i, i + n));
    }
  }
  return [...terms].slice(0, 30);
}

export function searchKnowledge(query, limit = 6) {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const clauses = terms.map(() => 'c.text LIKE ?').join(' OR ');
  const params = terms.map(t => `%${t}%`);
  const rows = db.prepare(`
    SELECT c.id, c.item_id, c.text, c.chunk_index, i.title, i.source_path, i.url, i.tags
    FROM knowledge_chunks c JOIN knowledge_items i ON i.id=c.item_id
    WHERE i.status='active' AND (${clauses})
    LIMIT 80
  `).all(...params);
  const scored = rows.map(r => {
    const low = r.text.toLowerCase();
    const tags = jsonParse(r.tags, []);
    const titleLow = `${r.title} ${tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      const n = low.split(t).length - 1;
      if (n) score += n * Math.min(6, t.length);
      if (titleLow.includes(t)) score += 10;
    }
    return { ...r, tags, score };
  }).sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const r of scored) {
    if (seen.has(r.item_id)) continue;
    seen.add(r.item_id);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function listAnalogies() {
  return db.prepare('SELECT * FROM analogies ORDER BY updated_at DESC').all().map(a => ({
    ...a,
    mapping: jsonParse(a.mapping, []),
    tags: jsonParse(a.tags, [])
  }));
}

export function getAnalogy(id) {
  const a = db.prepare('SELECT * FROM analogies WHERE id=?').get(id);
  return a ? { ...a, mapping: jsonParse(a.mapping, []), tags: jsonParse(a.tags, []) } : null;
}

export function createAnalogy(input) {
  const id = newId('ana');
  const t = now();
  db.prepare(`INSERT INTO analogies
    (id,title,source_domain,target_domain,structure_type,use_cases,usage_count,last_used_at,raw_note,mapping,boundary,signature,conclusions,tags,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, clean(input.title), clean(input.source_domain), clean(input.target_domain),
    clean(input.structure_type) || 'analogy', String(input.use_cases || ''), 0, '', String(input.raw_note || ''),
    jsonString(input.mapping || []), String(input.boundary || ''), String(input.signature || ''), String(input.conclusions || ''),
    jsonString(input.tags || []), 'active', t, t
  );
  if (input.raw_note) {
    const noteDir = path.join(KNOWLEDGE_DIR, 'inbox');
    fs.mkdirSync(noteDir, { recursive: true });
    fs.writeFileSync(path.join(noteDir, `analogy-${id}.md`), [
      `# ${clean(input.title)}`, '',
      '## 随手记', '', String(input.raw_note), '',
      '## 结构化', '',
      `源域：${clean(input.source_domain)}`, `目标域：${clean(input.target_domain)}`,
      `边界：${String(input.boundary || '')}`, `签名：${String(input.signature || '')}`
    ].join('\n'), 'utf8');
  }
  event('analogy', id, 'created', input.title);
  return getAnalogy(id);
}

export function updateAnalogy(id, input) {
  const fields = [];
  const values = [];
  const map = {
    title: 'title', source_domain: 'source_domain', target_domain: 'target_domain',
    structure_type: 'structure_type', use_cases: 'use_cases',
    raw_note: 'raw_note',
    boundary: 'boundary', signature: 'signature', conclusions: 'conclusions', status: 'status'
  };
  for (const [k, col] of Object.entries(map)) {
    if (input[k] !== undefined) { fields.push(`${col}=?`); values.push(String(input[k])); }
  }
  if (input.mapping !== undefined) { fields.push('mapping=?'); values.push(jsonString(input.mapping)); }
  if (input.tags !== undefined) { fields.push('tags=?'); values.push(jsonString(input.tags)); }
  if (fields.length) {
    fields.push('updated_at=?'); values.push(now(), id);
    db.prepare(`UPDATE analogies SET ${fields.join(', ')} WHERE id=?`).run(...values);
  }
  return getAnalogy(id);
}

export function touchStructure(id) {
  if (!id) return;
  db.prepare('UPDATE analogies SET usage_count=COALESCE(usage_count,0)+1, last_used_at=?, updated_at=? WHERE id=?')
    .run(now(), now(), id);
}

export function deleteAnalogy(id) {
  db.prepare('DELETE FROM analogies WHERE id=?').run(id);
  event('analogy', id, 'deleted', '');
}

const DEFAULT_SOUL = {
  beliefs: [
    '平台只认固定入口。',
    '工具不是能力，地址才是。',
    '自动化不是脚本跑起来，是有人/有机器在固定时间守着。',
    '很多技术问题，本质是投递问题。'
  ],
  banned: ['赋能', '闭环', '抓手', '降本增效', '百分百', '保证有效', '全网最', '颠覆'],
  tone_rules: [
    '先给一个具体日常物件，再翻到技术结论。',
    '短句，少术语，不堆名词。',
    '中段有一个反转，结尾一句冷判断。',
    '不喊口号，不用“家人们”。'
  ],
  signature_moves: [
    '不是工具不行，是地址不行。',
    '先问谁有资格把信送到，再问哪个工具更强。'
  ],
  golden_examples: [
    {
      title: '固定地址',
      text: '微信只给「登记过地址」的人寄信。这个地址，叫固定公网 IP。',
      why: '先把平台规则变成日常投递，再落技术名词。'
    },
    {
      title: '助理办公室',
      text: '助理的办公室 = 云服务器。地址固定，才能替你去寄。NAS 替代不了。',
      why: '把“云服务器”翻译成一个有地址的执行者。'
    }
  ]
};

export function getSoul() {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get('soul_profile');
  const parsed = row ? jsonParse(row.value, null) : null;
  return { ...DEFAULT_SOUL, ...(parsed || {}) };
}

export function saveSoul(profile) {
  const current = getSoul();
  const next = { ...current, ...(profile || {}) };
  db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run('soul_profile', JSON.stringify(next));
  event('soul', 'global', 'updated', '');
  return next;
}

function analogyScore(analogy, brief, angle) {
  const hay = `${brief.title} ${brief.topic} ${brief.analogy_domains || ''} ${angle?.title || ''} ${angle?.thesis || ''}`.toLowerCase();
  let score = 0;
  for (const tag of analogy.tags || []) if (hay.includes(String(tag).toLowerCase())) score += 3;
  if (hay.includes(String(analogy.source_domain || '').toLowerCase())) score += 2;
  if (hay.includes(String(analogy.target_domain || '').toLowerCase())) score += 2;
  return score;
}

export function buildContext(brief, angle = null) {
  const query = [brief.title, brief.topic, brief.must_include, angle?.title, angle?.thesis].filter(Boolean).join(' ');
  const knowledge = searchKnowledge(query, 6);
  const analogies = listAnalogies()
    .filter(a => a.status === 'active')
    .map(a => ({ ...a, _score: analogyScore(a, brief, angle) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 4);
  const soul = getSoul();
  return { knowledge, analogies, soul, query };
}

export function contextPrompt(ctx, maxChars = 5000) {
  if (!ctx) return '';
  const parts = [];
  parts.push('【灵魂 · 信念】\n' + (ctx.soul.beliefs || []).map(x => `- ${x}`).join('\n'));
  if ((ctx.soul.banned || []).length) parts.push('【禁用表达】\n' + ctx.soul.banned.join('、'));
  if ((ctx.soul.tone_rules || []).length) parts.push('【语感规则】\n' + ctx.soul.tone_rules.map(x => `- ${x}`).join('\n'));
  if ((ctx.analogies || []).length) {
    parts.push('【可用的类比】\n' + ctx.analogies.map((a, i) => {
      const maps = (a.mapping || []).map(m => `${m.from}→${m.to}`).join('；');
      return `A${i + 1}. ${a.title}：${maps}。边界：${a.boundary || '未写'}。签名：${a.signature || ''}`;
    }).join('\n'));
  }
  if ((ctx.knowledge || []).length) {
    let total = 0;
    const lines = [];
    for (const [i, k] of ctx.knowledge.entries()) {
      const text = String(k.text || '').slice(0, 700);
      if (total + text.length > maxChars) break;
      total += text.length;
      lines.push(`K${i + 1}. 《${k.title}》\n${text}`);
    }
    if (lines.length) parts.push('【知识库片段】\n' + lines.join('\n\n'));
  }
  return parts.join('\n\n');
}

export function contextMeta(ctx) {
  if (!ctx) return {};
  return {
    knowledge: (ctx.knowledge || []).map(k => ({
      id: k.id, item_id: k.item_id, title: k.title, snippet: String(k.text || '').slice(0, 180),
      source_path: k.source_path || '', url: k.url || '', score: k.score || 0
    })),
    analogies: (ctx.analogies || []).map(a => ({
      id: a.id, title: a.title, mapping: a.mapping || [], boundary: a.boundary || '', signature: a.signature || ''
    })),
    soul: {
      beliefs: ctx.soul.beliefs || [],
      banned: ctx.soul.banned || []
    }
  };
}

export function seedKnowledgeIfEmpty() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM knowledge_items').get().n;
  if (n === 0) {
    try { scanKnowledgeDir(KNOWLEDGE_DIR); } catch (e) { console.warn('seed knowledge', e.message); }
  }
  const a = db.prepare('SELECT COUNT(*) AS n FROM analogies').get().n;
  if (a === 0) {
    createAnalogy({
      title: '邮局寄信',
      source_domain: '邮局、寄信、登记地址、退信、助理办公室',
      target_domain: '平台 API、固定公网 IP、IP 白名单、40164、云服务器',
      mapping: [
        { from: '寄信', to: '调用平台接口', note: '内容要送达' },
        { from: '登记地址', to: 'IP 白名单', note: '平台只认登记过的来源' },
        { from: '地址每天变', to: '家庭宽带动态 IP', note: '今天能寄，明天不一定' },
        { from: '退信', to: '40164 / 审核失败', note: '不是内容问题，是投递问题' },
        { from: '助理办公室', to: '云服务器', note: '地址固定，才能替你去寄' }
      ],
      boundary: '只适用于有明确投递/准入规则的平台；不适合推荐算法、内容分发这类没有固定入口的场景。',
      signature: '先给一个日常物件，再翻到技术结论：不是工具不行，是地址不行。',
      conclusions: '平台只认固定入口。\n工具不是能力，地址才是。\n很多技术问题，本质是投递问题。',
      tags: ['固定地址', '自动化发布', '云服务器', 'NAS']
    });
    createAnalogy({
      title: '助理替你跑腿',
      source_domain: '你、助理、办公室地址、跑腿',
      target_domain: 'NAS、云服务器、固定出口、调用平台',
      mapping: [
        { from: '你', to: 'NAS / 本地机器', note: '能干活，但地址在变' },
        { from: '助理', to: '云服务器', note: '地址固定' },
        { from: '办公室地址', to: '固定公网 IP', note: '平台能登记' },
        { from: '跑腿', to: '调用平台 API', note: '替你去对接' }
      ],
      boundary: '适用于“需要第三方代为对接”的场景；不适用于必须本人出面的场景。',
      signature: '不是工具不行，是它没有一个每天都不变的出口。',
      conclusions: '你不缺一个能干活的工具，你缺一个地址固定的执行者。',
      tags: ['助理', '云服务器', 'NAS', '固定 IP']
    });
    createAnalogy({
      title: '被退回的那封信',
      source_domain: '退信、地址变更、重新登记',
      target_domain: '接口报错、动态 IP、固定 EIP',
      mapping: [
        { from: '退信', to: '接口报错 / 审核失败', note: '结果一样：没送到' },
        { from: '地址变更', to: '家庭宽带动态 IP', note: '入口不稳定' },
        { from: '重新登记', to: '固定 EIP / 白名单', note: '把入口固定下来' }
      ],
      boundary: '适用于有明确错误回执的平台；不适用于黑箱推荐。',
      signature: '信寄不出去，往往不是内容不好。',
      conclusions: '很多失败不是能力问题，而是投递问题。',
      tags: ['退信', '40164', 'IP 白名单', '动态 IP']
    });
  }
  const soul = db.prepare('SELECT value FROM settings WHERE key=?').get('soul_profile');
  if (!soul) saveSoul(DEFAULT_SOUL);

  // Attach seed references to the demo spec on a fresh install, without
  // overwriting specs the user has already edited.
  const seedSpec = db.prepare('SELECT spec_json FROM specs WHERE id=?').get('spec_fixed_address');
  if (seedSpec) {
    const spec = jsonParse(seedSpec.spec_json, {});
    if (!spec._meta?.knowledge?.length) {
      const item = db.prepare("SELECT id,title,source_path FROM knowledge_items WHERE title LIKE ? LIMIT 1").get('%固定地址%');
      const chunk = item ? db.prepare('SELECT text FROM knowledge_chunks WHERE item_id=? ORDER BY chunk_index LIMIT 1').get(item.id) : null;
      const ana = db.prepare('SELECT id,title,mapping,boundary,signature FROM analogies WHERE title=? LIMIT 1').get('邮局寄信');
      spec._meta = {
        knowledge: item ? [{
          id: 'seed-k1', item_id: item.id, title: item.title,
          snippet: (chunk?.text || '').slice(0, 180), source_path: item.source_path, url: '', score: 12
        }] : [],
        analogies: ana ? [{
          id: ana.id, title: ana.title, mapping: jsonParse(ana.mapping, []),
          boundary: ana.boundary, signature: ana.signature
        }] : [],
        soul: { beliefs: DEFAULT_SOUL.beliefs, banned: DEFAULT_SOUL.banned }
      };
      db.prepare('UPDATE specs SET spec_json=? WHERE id=?').run(JSON.stringify(spec), 'spec_fixed_address');
    }
  }
}
