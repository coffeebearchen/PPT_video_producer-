import fs from 'node:fs';
import path from 'node:path';
import { getSettings, jsonParse } from './db.mjs';
import { contextPrompt } from './knowledge.mjs';
import { pickMusicFromLibrary } from './music.mjs';
import { listMusic } from './music-library.mjs';

// 读导演手册（docs/DIRECTOR-MANUAL.md，回退 collab/），注入给分镜 AI 遵守。
function readDirectorManual() {
  try {
    const candidates = [
      path.join(process.cwd(), 'docs', 'DIRECTOR-MANUAL.md'),
      path.join(process.cwd(), '..', 'collab', 'DIRECTOR-MANUAL.md')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
    }
  } catch {}
  return '';
}

const clean = (s, fallback = '') => String(s ?? fallback).replace(/\s+/g, ' ').trim();
const stripTags = (s) => String(s ?? '').replace(/<[^>]*>/g, '');

function settingsForLLM() {
  const s = getSettings();
  return {
    baseUrl: (s.llm_base_url || '').replace(/\/+$/, ''),
    apiKey: s.llm_api_key || '',
    model: s.llm_model || 'deepseek-chat'
  };
}

function isLocalBase(url) {
  try {
    const u = new URL(url);
    return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(u.hostname);
  } catch { return false; }
}

export function llmConfigured() {
  const s = settingsForLLM();
  return Boolean(s.baseUrl && (s.apiKey || isLocalBase(s.baseUrl)));
}

function extractJson(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(raw); } catch {}
  const firstObj = raw.indexOf('{');
  const firstArr = raw.indexOf('[');
  const start = firstObj === -1 ? firstArr : (firstArr === -1 ? firstObj : Math.min(firstObj, firstArr));
  if (start === -1) return null;
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

async function callLLM(system, user, { jsonMode = true } = {}) {
  const s = settingsForLLM();
  if (!s.baseUrl) throw new Error('LLM 未配置：先填 Base URL');
  if (!s.apiKey && !isLocalBase(s.baseUrl)) throw new Error('LLM 未配置：远程模型需要 API Key');
  const headers = { 'content-type': 'application/json' };
  if (s.apiKey) headers.authorization = `Bearer ${s.apiKey}`;
  const body = {
    model: s.model,
    temperature: 0.7,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const run = async (payload) => fetch(`${s.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90000)
  });

  let res = await run(body);
  // Some self-hosted / OpenAI-compatible servers do not implement response_format.
  if (!res.ok && jsonMode && res.status === 400) res = await run({ ...body, response_format: undefined });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

export async function draftBriefFromDirection(direction) {
  const text = clean(direction);
  if (!text) throw new Error('先写一个方向');
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文内容策划。根据用户给的方向，填写一张选题任务书。只输出 JSON，不要解释。
结构：
{"title":"","topic":"","audience":"","analogy_domains":[""],"must_include":"","must_avoid":"","tone":"","cta":"","quantity":3,"channels":["wechat_channels"]}
要求：title <= 30 字；topic 1–2 句，讲清给谁看/打破什么误解/落到什么结论；audience 必填，写具体人群；analogy_domains 1–3 个日常物件；must_include / must_avoid 用换行分隔；tone 冷静、具体、少术语；channels 从 wechat_channels / wechat_article / xiaohongshu 中选。不要编造具体平台政策或数字。`,
        `方向：${text}`
      );
      const p = extractJson(content);
      if (p && p.title && p.topic) {
        return {
          ai: true,
          title: clean(p.title).slice(0, 60),
          topic: clean(p.topic).slice(0, 300),
          audience: clean(p.audience || '关注自动化发布的内容创作者').slice(0, 120),
          analogy_domains: (Array.isArray(p.analogy_domains) ? p.analogy_domains : String(p.analogy_domains || '').split(/[,，\n]/)).map(clean).filter(Boolean).slice(0, 4),
          must_include: String(p.must_include || '').trim(),
          must_avoid: String(p.must_avoid || '').trim(),
          tone: clean(p.tone).slice(0, 80),
          cta: clean(p.cta).slice(0, 80),
          quantity: Math.max(1, Math.min(6, Number(p.quantity) || 3)),
          channels: (Array.isArray(p.channels) ? p.channels : ['wechat_channels']).filter(x => ['wechat_channels', 'wechat_article', 'xiaohongshu'].includes(x))
        };
      }
    } catch (e) {
      console.warn('draftBrief fallback:', e.message);
    }
  }
  const first = text.split(/[。！？\n]/).map(clean).filter(Boolean)[0] || text;
  return {
    ai: false,
    title: first.slice(0, 40),
    topic: text.slice(0, 300),
    audience: '',
    analogy_domains: [],
    must_include: '',
    must_avoid: '',
    tone: '冷静、类比、结论明确',
    cta: '',
    quantity: 3,
    channels: ['wechat_channels']
  };
}

export async function draftAnalogyFromNote(note) {
  const text = String(note || '').trim();
  if (!text) throw new Error('先写一段随手记');
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文类比编辑。把用户随手写的素材整理成一个可复用的类比条目。只输出 JSON，不要解释。
结构：
{"title":"","source_domain":"","target_domain":"","mapping":[{"from":"","to":"","note":""}],"boundary":"","signature":"","conclusions":"","tags":[""]}
要求：title 是日常物件名；source_domain 是日常那边；target_domain 是技术/业务那边；mapping 至少 2 行，A→B 必须能一一对应；boundary 写清楚哪里不能硬套；signature 是一句可复用的冷判断；conclusions 一行一条；tags 3–6 个。不要编造事实。`,
        `随手记：\n${text}`
      );
      const p = extractJson(content);
      if (p && p.title) {
        const mapping = Array.isArray(p.mapping) ? p.mapping.map(m => ({ from: clean(m.from), to: clean(m.to), note: clean(m.note) })).filter(m => m.from || m.to) : [];
        return {
          ai: true,
          title: clean(p.title).slice(0, 40),
          source_domain: clean(p.source_domain).slice(0, 120),
          target_domain: clean(p.target_domain).slice(0, 120),
          mapping: mapping.slice(0, 8),
          boundary: String(p.boundary || '').trim(),
          signature: clean(p.signature).slice(0, 120),
          conclusions: String(p.conclusions || '').trim(),
          tags: (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(/[,，]/)).map(clean).filter(Boolean).slice(0, 8)
        };
      }
    } catch (e) {
      console.warn('draftAnalogy fallback:', e.message);
    }
  }
  const first = text.split(/\n/)[0].trim().slice(0, 40);
  return { ai: false, title: first, source_domain: '', target_domain: '', mapping: [], boundary: '', signature: '', conclusions: '', tags: [] };
}

export async function draftSoulFromDirection(direction) {
  const text = clean(direction);
  if (!text) throw new Error('先写一个方向');
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文个人品牌编辑。根据方向，起草一份可执行的“灵魂档案”。只输出 JSON，不要解释。
结构：
{"beliefs":[""],"banned":[""],"tone_rules":[""],"signature_moves":[""],"golden_examples":[{"title":"","text":"","why":""}]}
要求：beliefs 4–6 条，是愿意反复讲的结论；banned 8–12 个空泛/夸大词；tone_rules 4–6 条，写句子怎么起承转合；signature_moves 2–4 句可复用签名；golden_examples 2–3 条，每条有标题、文案、为什么好。不要编造事实，不要绝对化。`,
        `方向：${text}`
      );
      const p = extractJson(content);
      if (p && Array.isArray(p.beliefs)) {
        const toArr = (v) => (Array.isArray(v) ? v : String(v || '').split(/\n/)).map(clean).filter(Boolean);
        return {
          ai: true,
          beliefs: toArr(p.beliefs).slice(0, 8),
          banned: toArr(p.banned).slice(0, 20),
          tone_rules: toArr(p.tone_rules).slice(0, 8),
          signature_moves: toArr(p.signature_moves).slice(0, 6),
          golden_examples: (Array.isArray(p.golden_examples) ? p.golden_examples : []).slice(0, 5).map(x => ({
            title: clean(x.title), text: clean(x.text), why: clean(x.why)
          })).filter(x => x.title || x.text)
        };
      }
    } catch (e) {
      console.warn('draftSoul fallback:', e.message);
    }
  }
  return {
    ai: false,
    beliefs: [text],
    banned: ['赋能', '闭环', '抓手', '百分百', '保证有效'],
    tone_rules: ['先给具体场景，再落到结论。', '短句，少术语。'],
    signature_moves: [],
    golden_examples: []
  };
}

export async function diagnoseStructures(direction, existing = []) {
  const text = clean(direction);
  if (!text) throw new Error('先写一个方向');
  const library = (existing || []).slice(0, 12).map(s => ({
    id: s.id, title: s.title, type: s.structure_type || 'analogy',
    source_domain: s.source_domain, target_domain: s.target_domain,
    mapping: s.mapping, boundary: s.boundary, signature: s.signature
  }));
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文内容的结构编辑。根据用户方向，从“结构”而不是“金句”的角度给出 3 个可选方案。只输出 JSON。
结构：
{"structures":[{"title":"","structure_type":"analogy|contrast|causal|misconception|boundary|checklist","source_domain":"","target_domain":"","mapping":[{"from":"","to":"","note":""}],"boundary":"","signature":"","use_cases":"","reason":""}]}
要求：3 个方案必须有明显差异；优先复用给定结构库；mapping 至少 2 行；boundary 写清哪里不能硬套；reason 说明为什么适合这个方向。不要编造事实。`,
        `方向：${text}\n\n已有结构库：${JSON.stringify(library)}`
      );
      const parsed = extractJson(content);
      const list = parsed?.structures;
      if (Array.isArray(list) && list.length) {
        return list.slice(0, 3).map((s, i) => ({
          title: clean(s.title, `结构方案 ${i + 1}`).slice(0, 40),
          structure_type: ['analogy','contrast','causal','misconception','boundary','checklist'].includes(s.structure_type) ? s.structure_type : 'analogy',
          source_domain: clean(s.source_domain).slice(0, 60),
          target_domain: clean(s.target_domain).slice(0, 60),
          mapping: Array.isArray(s.mapping) ? s.mapping.slice(0, 8).map(m => ({ from: clean(m.from), to: clean(m.to), note: clean(m.note) })).filter(m => m.from || m.to) : [],
          boundary: String(s.boundary || '').trim(),
          signature: clean(s.signature).slice(0, 100),
          use_cases: String(s.use_cases || '').trim(),
          reason: clean(s.reason).slice(0, 160)
        }));
      }
    } catch (e) { console.warn('diagnoseStructures fallback:', e.message); }
  }
  const picks = library.slice(0, 3).map((s, i) => ({
    id: s.id || '',
    title: s.title || `结构方案 ${i + 1}`,
    structure_type: s.type || 'analogy',
    source_domain: s.source_domain || '',
    target_domain: s.target_domain || '',
    mapping: Array.isArray(s.mapping) ? s.mapping : [],
    boundary: s.boundary || '',
    signature: s.signature || '',
    use_cases: '',
    reason: i === 0 ? '结构库里最接近的一条，可先复用。' : '备选结构，换一个角度。'
  }));
  if (picks.length) return picks;
  return [{
    title: '先给一个具体场景，再落到结论',
    structure_type: 'analogy',
    source_domain: '日常场景',
    target_domain: '技术/业务结论',
    mapping: [{ from: '日常动作', to: '技术流程', note: '先建立直觉' }, { from: '卡住的环节', to: '失败的接口', note: '再落到原因' }],
    boundary: '只用于建立直觉，不替代具体配置和事实。',
    signature: '先看懂，再下结论。',
    use_cases: '解释一个抽象机制',
    reason: '结构库为空时的最小可用结构。'
  }];
}

export async function checkDirection(direction) {
  const text = String(direction || '').trim();
  if (!text) throw new Error('先写一个方向');
  const local = [];
  if (/知道|了解|科普|讲清楚什么是/.test(text)) {
    local.push({ severity: 'warn', field: 'misconception', message: '“让他们知道”是知识缺口，不是误解。', suggestion: '改成“他们以为 X，但其实不是 X”。' });
  }
  if (/沙箱/.test(text) && !/监管|金融|技术|API|测试/.test(text)) {
    local.push({ severity: 'warn', field: 'domain', message: '“沙箱”有监管沙箱、技术沙箱、API 沙箱，意思不同。', suggestion: '明确是哪一种沙箱，否则结构会发散。' });
  }
  if (/一定|百分百|必然|保证/.test(text)) {
    local.push({ severity: 'warn', field: 'claim', message: '出现绝对化表述。', suggestion: '改成有条件的判断，避免承诺。' });
  }
  if (!/给|面向|受众|用户|企业|创作者|负责人|高管/.test(text)) {
    local.push({ severity: 'warn', field: 'audience', message: '没有明确受众。', suggestion: '补一句“给谁看”。' });
  }

  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文内容的方向质检编辑。检查用户写的“方向”是否能支撑一条准确的结构化内容。只输出 JSON。
结构：
{"status":"pass|warn|block","issues":[{"severity":"warn|block","field":"audience|misconception|conclusion|analogy|domain|claim","message":"具体问题","suggestion":"怎么改"}],"rewrite":"改写后的方向（保留用户原意，不改事实）"}
重点检查：
1. 受众是否具体；
2. “误解”是不是真的误解，而不是“不知道/科普”；
3. 结论是否具体、可验证；
4. 类比是否存在范畴错误（例如股票不是货币）；
5. 概念是否有歧义（例如沙箱指哪一种）；
6. 是否有绝对化承诺。
只指出确定的问题，不要为了挑错而挑错。如果没有问题，status=pass，issues=[]。`,
        `方向：${text}`
      );
      const p = extractJson(content);
      if (p && Array.isArray(p.issues)) {
        return {
          status: ['pass','warn','block'].includes(p.status) ? p.status : (p.issues.some(i => i.severity === 'block') ? 'block' : p.issues.length ? 'warn' : 'pass'),
          issues: p.issues.slice(0, 6).map(i => ({
            severity: i.severity === 'block' ? 'block' : 'warn',
            field: String(i.field || 'general'),
            message: clean(i.message).slice(0, 240),
            suggestion: clean(i.suggestion).slice(0, 240)
          })).filter(i => i.message),
          rewrite: clean(p.rewrite).slice(0, 500)
        };
      }
    } catch (e) { console.warn('checkDirection fallback:', e.message); }
  }
  return {
    status: local.some(i => i.severity === 'block') ? 'block' : local.length ? 'warn' : 'pass',
    issues: local,
    rewrite: ''
  };
}

export async function checkStructure(structure = {}) {
  const s = structure || {};
  const mapping = Array.isArray(s.mapping) ? s.mapping.filter(m => m && (m.from || m.to)) : [];
  const local = [];
  if (mapping.length < 2) local.push({ severity: 'warn', field: 'mapping', message: '映射少于 2 条，还不足以构成结构。', suggestion: '至少补到 2–3 条一一对应的 A → B。' });
  if (!String(s.boundary || '').trim()) local.push({ severity: 'warn', field: 'boundary', message: '没有写边界。', suggestion: '写清楚哪里不能硬套。' });
  if (!String(s.signature || '').trim()) local.push({ severity: 'warn', field: 'signature', message: '没有一句话签名。', suggestion: '把结构压成一句可复用的判断。' });
  if (!String(s.source_domain || '').trim() || !String(s.target_domain || '').trim()) local.push({ severity: 'warn', field: 'domain', message: '源域或目标域为空。', suggestion: '分别写清日常那边和技术/业务那边。' });
  const broken = mapping.filter(m => !m.from || !m.to);
  if (broken.length) local.push({ severity: 'block', field: 'mapping', message: `有 ${broken.length} 条映射缺少左边或右边。`, suggestion: '补全 A → B，不要只写一边。' });

  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文内容的结构体检编辑。检查一个“结构”是否成立。只输出 JSON。
结构：
{"status":"pass|warn|block","issues":[{"severity":"warn|block","field":"mapping|boundary|signature|domain|fact","message":"具体问题","suggestion":"怎么改"}]}
检查：
1. 映射是否一一对应，有没有把不同层级的东西硬配对；
2. 是否有范畴错误或事实错误；
3. 边界是否具体，能不能挡住错误引申；
4. 签名是否从结构里长出来，不是空口号；
5. 源域/目标域是否清楚。
只指出确定的问题，不要为了挑错而挑错。`,
        `结构：${JSON.stringify({
          title: s.title, structure_type: s.structure_type,
          source_domain: s.source_domain, target_domain: s.target_domain,
          mapping, boundary: s.boundary, signature: s.signature, use_cases: s.use_cases
        })}`
      );
      const p = extractJson(content);
      if (p && Array.isArray(p.issues)) {
        return {
          status: ['pass','warn','block'].includes(p.status) ? p.status : (p.issues.some(i => i.severity === 'block') ? 'block' : p.issues.length ? 'warn' : 'pass'),
          issues: p.issues.slice(0, 6).map(i => ({
            severity: i.severity === 'block' ? 'block' : 'warn',
            field: String(i.field || 'general'),
            message: clean(i.message).slice(0, 240),
            suggestion: clean(i.suggestion).slice(0, 240)
          })).filter(i => i.message)
        };
      }
    } catch (e) { console.warn('checkStructure fallback:', e.message); }
  }
  return { status: local.some(i => i.severity === 'block') ? 'block' : local.length ? 'warn' : 'pass', issues: local };
}

export async function draftQuoteCandidates(brief = {}, spec = {}, angle = null) {
  const s = spec || {};
  const p1 = s.page1 || {}, p2 = s.page2 || {};
  const sourceText = [
    brief.title, brief.topic,
    brief.structure_name,
    ...(p1.lines || []), p1.highlight, p2.conclusion_prefix, p2.conclusion_highlight, angle?.thesis
  ].filter(Boolean).join(' / ');
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文短视频的金句编辑。根据内容给 3 句适合结尾的金句候选。只输出 JSON。
结构：{"candidates":[{"line1":"","line2":"","highlight":"","note":""}]}
要求：每句控制在两行、每行不超过 12 个汉字；line2 必须包含 highlight；不要太鸡汤，不要绝对化；三句必须有明显差异。`,
        `内容：${sourceText}`
      );
      const p = extractJson(content);
      if (Array.isArray(p?.candidates) && p.candidates.length) {
        return p.candidates.slice(0, 3).map((q, i) => ({
          line1: clean(q.line1).slice(0, 24),
          line2: clean(q.line2).slice(0, 24),
          highlight: clean(q.highlight).slice(0, 12),
          note: clean(q.note).slice(0, 60)
        })).filter(q => q.line1 || q.line2);
      }
    } catch (e) { console.warn('draftQuote fallback:', e.message); }
  }
  const key = clean(p1.highlight || p2.conclusion_highlight || '固定入口');
  return [
    { line1: '不是工具不行，', line2: `是${key}不行。`, highlight: key, note: '地址不固定，信就寄不到。' },
    { line1: '先解决入口，', line2: '再谈自动化。', highlight: '入口', note: '入口不稳定，后面都是空谈。' },
    { line1: '真正卡住你的，', line2: '往往不是能力。', highlight: '能力', note: '是那个没人愿意先处理的边界。' }
  ];
}

export async function draftElementSvg(concept) {
  if (!llmConfigured()) throw new Error('LLM 未配置');
  const content = await callLLM(
    `你是品牌知识视频的图标设计师。生成一个“无色线性图标”，只输出 JSON。
结构：{"name":"中文名","tags":["中文标签","english-tag"],"svg":"<svg ...>"}
硬规则：
- viewBox="0 0 64 64"
- fill="none"
- stroke="currentColor"
- stroke-width="2"
- stroke-linecap="round"
- stroke-linejoin="round"
- 只允许 path/circle/rect/line/polyline/polygon/ellipse
- 最多 12 个图形
- 不允许 text/image/script/style/filter/gradient
- 不允许任何颜色值、渐变、阴影
- 几何化、简洁、在 64px 下可辨认
- 不要画品牌 Logo、人物脸、复杂插画`,
    `概念：${concept}`
  );
  const data = extractJson(content);
  if (!data?.svg) throw new Error('AI 没有返回 SVG');
  return {
    name: clean(data.name).slice(0, 20) || clean(concept).slice(0, 20),
    concept: clean(concept).slice(0, 80),
    tags: (Array.isArray(data.tags) ? data.tags : []).map(t => clean(t)).filter(Boolean).slice(0, 8),
    svg: String(data.svg)
  };
}

export async function testLLM() {
  const s = settingsForLLM();
  if (!s.baseUrl) throw new Error('先填 Base URL');
  const content = await callLLM(
    '你是一个连接测试助手。只回复 JSON：{"ok":true,"message":"连接成功"}。',
    '请确认连接。',
    { jsonMode: true }
  );
  return { ok: true, model: s.model, base_url: s.baseUrl, sample: String(content).slice(0, 200) };
}

function sourceLines(sources) {
  return (sources || []).slice(0, 6).map(s => `- ${s.title}: ${s.excerpt} (${s.url})`).join('\n');
}

function localAngles(brief, count = 3) {
  const domains = Array.isArray(brief.analogy_domains) ? brief.analogy_domains : jsonParse(brief.analogy_domains, []);
  const d1 = clean(domains[0], '寄信');
  const d2 = clean(domains[1], '助理');
  const include = String(brief.must_include || '').split('\n').map(clean).filter(Boolean);
  const key = include[0] || '固定入口';
  const topic = clean(brief.topic, brief.title);

  const base = [
    {
      title: `${d1}的规矩`,
      thesis: `平台不是不让你用，是它只认一个能被登记的固定入口。`,
      analogy_map: [
        { from: d1, to: '平台的审核规则' },
        { from: '固定地址', to: key },
        { from: d2, to: '稳定的执行环境' }
      ],
      hook: `把「${brief.title}」想成一次${d1}：地址不对，内容再好也到不了。`
    },
    {
      title: '换一个固定出口',
      thesis: `你不缺一个能干活的工具，你缺一个地址固定、能替你去对接平台的执行者。`,
      analogy_map: [
        { from: '你', to: 'NAS / 本地机器' },
        { from: d2, to: '云服务器' },
        { from: '跑腿', to: '调用平台 API' }
      ],
      hook: `不是工具不行，是它没有一个每天都不变的出口。`
    },
    {
      title: '被退回的那一次',
      thesis: `很多失败不是能力问题，而是投递问题：入口一变，平台就不认。`,
      analogy_map: [
        { from: '退信', to: '接口报错 / 审核失败' },
        { from: '地址变更', to: '动态公网 IP' },
        { from: '重新登记', to: '固定 EIP / 固定入口' }
      ],
      hook: `先别急着换工具：${topic.slice(0, 26)}。`
    }
  ];
  const extras = [
    {
      title: '平台先看入口',
      thesis: `平台先判断你是谁、从哪里来，再判断你发了什么。`,
      analogy_map: [
        { from: '门禁', to: '平台鉴权' },
        { from: '工牌', to: '固定公网 IP' },
        { from: '访客登记', to: 'IP 白名单' }
      ],
      hook: `内容过不了，有时候不是内容的问题，是门禁的问题。`
    },
    {
      title: '谁在替你值班',
      thesis: `自动化不是脚本跑起来，而是固定时间有一个稳定的执行者。`,
      analogy_map: [
        { from: '你', to: '手动发布' },
        { from: d2, to: '云服务器' },
        { from: '值班表', to: '定时任务' }
      ],
      hook: `白天能跑不算自动化，凌晨三点还能跑才算。`
    },
    {
      title: '省下来的时间',
      thesis: `不解决入口，省下来的时间会以另一种方式还回去。`,
      analogy_map: [
        { from: '省事', to: '少配一次' },
        { from: '返工', to: '地址变了重来' },
        { from: '稳定', to: '固定 EIP' }
      ],
      hook: `省下来的十分钟，可能变成每周一次的排查。`
    }
  ];
  return base.concat(extras).slice(0, Math.max(1, Math.min(6, count)));
}

export async function generateAngles(brief, sources, context = null) {
  const count = Math.max(1, Math.min(6, Number(brief.quantity) || 3));
  const ctxText = context ? contextPrompt(context) : '';
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文短视频的选题策划。只输出 JSON，不要解释。你要为一条 18 秒、三页大字、无解说的视频生成 ${count} 个角度卡。
每个角度卡字段：title（<=10 个汉字）、thesis（一句话，<=45 字）、hook（<=30 字）、analogy_map（3 项，每项 {from,to}）。
要求：角度之间必须有明显差异；优先复用【灵魂】里的信念和【可用类比】，可以引用知识片段中的事实（用 K1/K2 标注），不要编造知识库没有的事实。如果指定了“选定结构”，所有角度必须围绕该结构展开，不要换成别的比喻，也不要越过它的边界。`,
        `选题：${brief.title}
话题：${brief.topic}
受众：${brief.audience || '泛内容创作者'}
选定结构：${brief.structure_name || '未指定'}${brief.structure_type ? '（' + brief.structure_type + '）' : ''}
结构快照：${brief.structure_snapshot ? JSON.stringify(brief.structure_snapshot) : '无'}
指定类比方向：${brief.analogy_domains}
必须出现：${brief.must_include}
必须避免：${brief.must_avoid}
参考来源：
${sourceLines(sources)}

${ctxText}`
      );
      const parsed = extractJson(content);
      const list = Array.isArray(parsed) ? parsed : parsed?.angles;
      if (Array.isArray(list) && list.length) {
        return list.slice(0, count).map((a, i) => ({
          title: clean(a.title, `角度 ${i + 1}`).slice(0, 18),
          thesis: clean(a.thesis).slice(0, 90),
          hook: clean(a.hook).slice(0, 60),
          analogy_map: Array.isArray(a.analogy_map)
            ? a.analogy_map.slice(0, 4).map(m => ({ from: clean(m.from), to: clean(m.to) }))
            : []
        }));
      }
    } catch (e) {
      console.warn('LLM angles fallback:', e.message);
    }
  }
  return localAngles(brief, count);
}

const DEFAULT_SPEC = {
  brand: 'FIXED ADDRESS',
  meta: {
    p1_left: '01 / 类比', p1_right: 'THE ANALOGY',
    p2_left: '02 / 对照', p2_right: 'SURFACE VS. ROOT',
    p3_left: '03 / 声音', p3_right: 'MUSIC PAGE'
  },
  page1: {
    kicker: '先把问题',
    kicker_accent: '讲成一张门牌',
    lines: ['不是工具不行', '是入口', '没有被登记'],
    quote_line2: false,
    addr_label: '翻成一句话',
    highlight: '固定入口',
    highlight_latin: '',
    en: 'A FIXED ADDRESS FOR AUTOMATION',
    footnote: '地址不对，内容再好也到不了。',
    stamp_line1: '固定',
    stamp_line2: '入口'
  },
  page2: {
    kicker: '表面上是在选工具，',
    kicker_accent: '底层是在选入口',
    left_tag: '你的现状',
    left_thin: '',
    left_line1_rest: '看起来是',
    left_line2: '工具问题',
    left_stamp: '卡住',
    right_tag: '再往里看',
    right_prefix: '其实是',
    right_highlight: '地址问题',
    right_badge: '通了',
    conclusion_small: '所以',
    conclusion_prefix: '先解决',
    conclusion_highlight: '固定入口',
    footnote: '把类比讲清楚，结论自然就出来了。'
  },
  context: {
    title: '先把背景说清楚',
    subtitle: '为什么这件事现在会发生',
    note: '先把场景、角色和限制讲清楚，后面的对照才成立。',
    bottom: '背景不是铺垫，是判断的前提。'
  },
  objection: {
    title: '那是不是所有场景都适用？',
    subtitle: '反例 / 先把边界说清楚',
    note: '这条结构有边界；不适用的时候，要明确说不适用。',
    bottom: '先承认例外，再谈结论。'
  },
  evidence: {
    title: '先看一个具体场景',
    subtitle: '证据 / 不是观点',
    note: '把可验证的事实放在这里，不用形容词代替证据。',
    bottom: '能复现的，才叫证据。'
  },
  page3: {
    title: '先解决入口',
    subtitle: '所以，最后落到一句',
    note: '地址不固定，信就寄不到。',
    bottom: '地址固定，才能自动抵达。'
  },
  article: {
    title: '',
    digest: '',
    cover_text: '',
    series: { name: '固定地址 · 自动化发布', role: 'main', index: '01', total: '01' },
    lead: '',
    highlights: [],
    quote: '',
    opening: '',
    sections: [
      { heading: '先把问题讲成一张门牌', body: '' },
      { heading: '看起来是工具问题，其实是地址问题', body: '' },
      { heading: '今天就能做的检查', body: '' }
    ],
    cta: '',
    sources: []
  },
  music: 'pulse',
  music_reason: '默认强节奏 Pulse 120。',
  motion: {
    preset: 'flow',
    transition: { mode: 'slide', duration: 0.90 },
    envelope: { type: 'slideX', start: 0.82, duration: 2.35, fromX: -300, toX: 0, fromRot: -7, toRot: 0, ease: 'outCubic' }
  }
};

function splitLines(text, count = 3, maxChars = 0) {
  const parts = String(text || '')
    .split(/[，。；：！？、\n]/)
    .map(clean)
    .filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (!maxChars || part.length <= maxChars) out.push(part);
    else {
      for (let i = 0; i < part.length; i += maxChars) out.push(part.slice(i, i + maxChars));
    }
    if (out.length >= count) break;
  }
  const result = out.slice(0, count);
  while (result.length < count) result.push('');
  return result;
}

function localSpec(brief, angle, sources = []) {
  const include = String(brief.must_include || '').split('\n').map(clean).filter(Boolean);
  const key = include[0] || '固定入口';
  const thesisParts = splitLines(angle?.thesis || brief.topic, 3, 9);
  const spec = JSON.parse(JSON.stringify(DEFAULT_SPEC));

  spec.page1.kicker = clean(angle?.title, '先看一个类比');
  spec.page1.kicker_accent = '';
  spec.page1.lines = thesisParts.filter(Boolean).slice(0, 3);
  while (spec.page1.lines.length < 2) spec.page1.lines.push('先看一个类比');
  spec.page1.highlight = key;
  spec.page1.highlight_latin = '';
  spec.page1.footnote = clean(brief.cta, '把类比讲清楚，结论自然就出来了。').slice(0, 30);
  spec.page1.stamp_line1 = '固定';
  spec.page1.stamp_line2 = '入口';

  spec.page2.kicker = '表面上是在选工具，';
  spec.page2.kicker_accent = '底层是在选入口';
  const struct = brief.structure_snapshot || {};
  const structMap = Array.isArray(struct.mapping) && struct.mapping.length ? struct.mapping : (angle?.analogy_map || []);
  const leftIdea = clean(structMap[0]?.from || angle?.title || '结构的一边').slice(0, 10);
  const rightIdea = clean(structMap[0]?.to || key).slice(0, 12);
  spec.page2.left_tag = clean(struct.source_domain || '结构的一边').slice(0, 12);
  spec.page2.left_thin = '';
  spec.page2.left_line1_rest = '看起来是';
  spec.page2.left_line2 = leftIdea;
  spec.page2.left_stamp = clean(struct.structure_type === 'misconception' ? '误判' : '卡住');
  spec.page2.right_tag = clean(struct.target_domain || '目标域').slice(0, 12);
  spec.page2.right_prefix = '其实是';
  spec.page2.right_highlight = rightIdea;
  spec.page2.right_badge = '通了';
  spec.page2.conclusion_small = '所以';
  spec.page2.conclusion_prefix = '先解决';
  spec.page2.conclusion_highlight = clean(structMap[1]?.to || struct.signature || key).slice(0, 12);
  spec.page2.footnote = clean(angle?.thesis || brief.topic).slice(0, 70);
  spec.context.title = clean(brief.topic || angle?.title || '先把背景说清楚').slice(0, 18);
  spec.context.subtitle = '为什么这件事现在会发生';
  spec.context.note = clean(angle?.thesis || brief.audience || '先把场景、角色和限制讲清楚。').slice(0, 100);
  spec.context.bottom = '背景不是铺垫，是判断的前提。';
  spec.objection.title = clean(brief.must_avoid || '那是不是所有场景都适用？').slice(0, 24);
  spec.objection.subtitle = '反例 / 先把边界说清楚';
  spec.objection.note = clean(struct.boundary || '这条结构有边界；不适用的时候，要明确说不适用。').slice(0, 100);
  spec.objection.bottom = '先承认例外，再谈结论。';
  spec.evidence.title = clean(brief.must_include || angle?.title || '先看一个具体场景').slice(0, 18);
  spec.evidence.subtitle = '证据 / 不是观点';
  spec.evidence.note = clean(angle?.thesis || brief.topic || '把可验证的事实放在这里。').slice(0, 100);
  spec.evidence.bottom = '能复现的，才叫证据。';
  spec.page3.title = clean(angle?.title || '先解决入口').slice(0, 14);
  spec.page3.subtitle = '所以，最后落到一句';
  spec.page3.note = clean(angle?.thesis || brief.topic || '地址不固定，信就寄不到。').slice(0, 80);
  spec.page3.bottom = clean(brief.cta, '地址固定，才能自动抵达。').slice(0, 26);

  const p1Text = (spec.page1.lines || []).join('，');
  const p2Text = `${spec.page2.left_tag}：${spec.page2.left_line1_rest}${spec.page2.left_line2}。${spec.page2.right_tag}：${spec.page2.right_prefix}${spec.page2.right_highlight}。${spec.page2.conclusion_small}${spec.page2.conclusion_prefix}${spec.page2.conclusion_highlight}。`;
  const checks = include.length ? include.map((x, i) => `${i + 1}. ${x}`).join('\n') : '1. 平台有没有固定入口？\n2. 失败时有没有回执？\n3. 有没有人在固定时间值守？';
  spec.article = {
    title: brief.title,
    digest: (spec.page1.footnote || angle?.thesis || brief.topic).slice(0, 90),
    cover_text: (spec.page1.highlight || key).slice(0, 12),
    opening: `${p1Text}。${spec.page1.footnote || ''}`,
    sections: [
      { heading: spec.page1.kicker || '先看一个类比', body: `${p1Text}。\n\n${angle?.thesis || brief.topic}` },
      { heading: `${spec.page2.kicker || ''}${spec.page2.kicker_accent || ''}`.trim() || '对照着看', body: p2Text },
      { heading: '今天就能做的检查', body: checks }
    ],
    cta: clean(brief.cta, '关注，领取部署清单。'),
    sources: (sources || []).slice(0, 4).map(s => ({ title: s.title || s.url || '', url: s.url || '' }))
  };
  spec.article.series = { name: '固定地址 · 自动化发布', role: 'main', index: '01', total: '01' };
  spec.article.lead = `${p1Text}。${spec.page1.highlight ? `这个地址，叫${spec.page1.highlight}。` : ''}`;
  spec.article.highlights = [spec.page1.highlight, key].filter(Boolean).slice(0, 3);
  spec.article.quote = clean(angle?.hook).slice(0, 60);
  const music = pickMusicFromLibrary([brief.topic, angle?.thesis, include.join(' ')], listMusic());
  spec.music = music.track;
  spec.music_reason = music.reason;
  return spec;
}

function shortHeading(value, max = 18) {
  const text = clean(value);
  if (text.length <= max) return text;
  const parts = text.split(/[：:，,。；;]/).map(clean).filter(Boolean);
  const good = parts.find(p => p.length >= 6 && p.length <= max) || parts[0] || text;
  return good.length > max ? good.slice(0, max) : good;
}

function normalizeSpec(spec, brief, angle) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SPEC));
  const out = { ...base, ...spec };
  out.meta = { ...base.meta, ...(spec.meta || {}) };
  out.page1 = { ...base.page1, ...(spec.page1 || {}) };
  out.page1.highlight = String(out.page1.highlight || '')
    .split(/[；;，,。]/).map(clean).filter(Boolean)[0]?.slice(0, 12) || '';
  out.page2 = { ...base.page2, ...(spec.page2 || {}) };
  out.page_count = Number(brief.page_count) || 3;
  out.page_plan = Array.isArray(brief.page_plan) ? brief.page_plan : [];
  out.theme = brief.theme || 'archive';
  out.template_id = brief.template_id || '';
  out.context = { ...base.context, ...(spec.context || {}) };
  out.objection = { ...base.objection, ...(spec.objection || {}) };
  out.evidence = { ...base.evidence, ...(spec.evidence || {}) };
  out.context.title = shortHeading(out.context.title, 18);
  out.objection.title = shortHeading(out.objection.title, 24);
  out.evidence.title = shortHeading(out.evidence.title, 18);
  out.page3 = { ...base.page3, ...(spec.page3 || {}) };
  out.structure_type = brief.structure_type || 'analogy';
  const fieldParts = String(brief.must_include || '').split(/[；;\n]/).map(clean).filter(Boolean);
  const noteParts = String(out.evidence.note || out.page3.note || '').split(/[；;。]/).map(clean).filter(Boolean);
  const uniqueParts = [...new Set([...fieldParts, ...noteParts])].slice(0, 5);
  out.structure_fields = spec.structure_fields || {
    causal: uniqueParts.slice(0, 3),
    checklist: uniqueParts.slice(0, 5),
    boundary: [uniqueParts[0] || '', uniqueParts[1] || ''],
    misconception: [uniqueParts[0] || '', uniqueParts[1] || '']
  };
  if (/只有音乐|没有解说|BGM ONLY/i.test(String(out.page3.note || ''))) {
    out.page3.title = clean(angle?.title || out.page2.conclusion_highlight || '先解决入口').slice(0, 14);
    out.page3.subtitle = '所以，最后落到一句';
    out.page3.note = clean(angle?.thesis || brief.topic || '地址不固定，信就寄不到。').slice(0, 80);
    out.page3.bottom = clean(brief.cta || '地址固定，才能自动抵达。').slice(0, 26);
  }
  out.article = { ...base.article, ...(spec.article || {}) };
  out.article.series = { ...base.article.series, ...(out.article.series || {}) };
  out.article.highlights = Array.isArray(out.article.highlights) ? out.article.highlights.map(x => clean(x)).filter(Boolean).slice(0, 6) : [];
  out.article.lead = String(out.article.lead || '');
  out.article.quote = String(out.article.quote || '');
  out.motion = {
    ...base.motion,
    ...(spec.motion || {}),
    transition: { ...base.motion.transition, ...(spec.motion?.transition || {}) },
    envelope: { ...base.motion.envelope, ...(spec.motion?.envelope || {}) }
  };
  const validMusic = new Set(['pulse', 'minimal', 'none', ...listMusic().map(t => t.id)]);
  out.music = validMusic.has(out.music) ? out.music : 'pulse';
  out.music_reason = String(out.music_reason || base.music_reason);
  out.article.sections = Array.isArray(out.article.sections)
    ? out.article.sections.slice(0, 5).map(s => ({ heading: clean(s.heading), body: String(s.body || '').trim() }))
    : base.article.sections;
  while (out.article.sections.length < 3) out.article.sections.push({ heading: '', body: '' });
  out.article.sources = Array.isArray(out.article.sources) ? out.article.sources.slice(0, 6) : [];
  out.page1.lines = Array.isArray(out.page1.lines) ? out.page1.lines.map(x => clean(x)).filter(Boolean).slice(0, 4) : base.page1.lines;
  if (out.page1.lines.length < 2) out.page1.lines = base.page1.lines;
  out.page1.headline = clean(spec.page1?.headline || out.page1.lines.join(''));
  out.page1.emphasis = Array.isArray(spec.page1?.emphasis)
    ? spec.page1.emphasis.map(clean).filter(Boolean)
    : [out.page1.highlight].filter(Boolean);
  out.page1.max_lines = Math.max(2, Math.min(4, Number(spec.page1?.max_lines) || out.page1.lines.length || 3));
  out.page1.quote_line2 = Boolean(out.page1.quote_line2);
  out.page2.left_line1_rest = clean(out.page2.left_line1_rest, '');
  out.page2.left_line2 = clean(out.page2.left_line2, '');
  out.page2.right_prefix = clean(out.page2.right_prefix, '');
  out.page2.right_highlight = clean(out.page2.right_highlight, '');
  out.page2.conclusion_prefix = clean(out.page2.conclusion_prefix, '');
  out.page2.conclusion_highlight = clean(out.page2.conclusion_highlight, '');
  out.page2.footnote = String(out.page2.footnote || '').replace(/<(?!\/?b\b|\/?br\b)[^>]*>/gi, '');
  out.page3.note = String(out.page3.note || '').replace(/<(?!\/?b\b|\/?br\b)[^>]*>/gi, '');
  out.page1.footnote = stripTags(out.page1.footnote);
  out.page2.kicker = clean(out.page2.kicker, '');
  out.page2.kicker_accent = clean(out.page2.kicker_accent, '');
  out.page1.kicker = clean(out.page1.kicker, '');
  out.page1.kicker_accent = clean(out.page1.kicker_accent, '');
  out.brand = clean(out.brand, 'FIXED ADDRESS');
  if (!out.page2.conclusion_highlight) out.page2.conclusion_highlight = clean(angle?.title, '固定入口').slice(0, 12);
  if (!out.page2.right_highlight) out.page2.right_highlight = '地址问题';
  return out;
}

export async function generateCover(brief = {}, spec = {}) {
  if (!llmConfigured()) throw new Error('LLM 未配置，无法生成封面');
  const p1 = spec.page1 || {};
  const oldText = [...(p1.lines || []), p1.highlight].filter(Boolean).join(' / ');
  const system = `你是中文短视频封面编辑。只做一件事：把选题写成两段式封面。
要求：
1. lead：一句现状/铺垫，8–16 个汉字，陈述语气，不带句号。
2. punch：一句转折/地址，5–10 个汉字，必须能独立成立，不能以“的/了/是/和/与/及/或/而/但/却/就/都/也/还/很/更/最”开头。
3. punch 不能和 lead 重复，不能是 lead 的尾句，不能出现残句或词中间断裂。
4. 不要复述原标题，不要解释，只输出 JSON：{"lead":"","punch":""}。`;
  const user = `选题：${clean(brief.title)}
话题：${clean(brief.topic)}
结构：${clean(brief.structure_name || brief.structure_type)}
原 P1：${oldText}
请重写为两段式封面，不要从原 P1 直接拆行。`;
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callLLM(system, user + (lastError ? `\n上一次失败：${lastError}` : ''));
    const obj = extractJson(raw) || {};
    const lead = clean(obj.lead).replace(/[。！？；].*$/, '').trim();
    const punch = clean(obj.punch).replace(/[。！？；].*$/, '').trim();
    const issues = [];
    if (lead.length < 8 || lead.length > 16) issues.push('lead 长度必须 8–16');
    if (punch.length < 5 || punch.length > 10) issues.push('punch 长度必须 5–10');
    if (/^[的了着和与及或而但却就都也还很更最]/.test(punch)) issues.push('punch 不能以功能词开头');
    if (lead === punch || lead.includes(punch) || punch.includes(lead)) issues.push('lead/punch 重复');
    if (/[。！？；]$/.test(lead) || /[。！？；]$/.test(punch)) issues.push('不能带句号');
    if (!issues.length) return { lead, punch };
    lastError = issues.join('；');
  }
  throw new Error(`封面生成不合规：${lastError}`);
}

export async function generateLiteSpec(brief = {}, angle = {}) {
  if (!llmConfigured()) throw new Error('LLM 未配置');
  const system = `你是中文短视频编剧。一次输出一条完整内容，只输出 JSON，不要解释。
JSON 结构：
{
 "page1":{"kicker":"","lines":["","",""],"highlight":"","cover":{"lead":"","punch":""}},
 "page2":{"kicker":"","left_tag":"","left_thin":"","left_line1_rest":"","left_line2":"","left_stamp":"","right_tag":"","right_prefix":"","right_highlight":"","right_badge":"","conclusion_small":"","conclusion_prefix":"","conclusion_highlight":"","footnote":""},
 "context":{"title":"","scene":"","roles":"","constraint":"","bottom":""},
 "evidence":{"title":"","note":"","highlight":"","bottom":""},
 "objection":{"title":"","note":"","bottom":""},
 "quote":{"line1":"","line2":"","highlight":"","note":""}
}
要求：
1. cover.lead 8–16 字，cover.punch 5–10 字；punch 不以的/了/是/和/与开头。
2. context.scene / roles / constraint 各 8–16 字，必须具体。
3. P2 左右两侧是同一层级：left_line1_rest 和 right_highlight 都是 4–8 字；不要一个是“看起来是”、另一个才是主句。
4. evidence.note 用 2–3 个短句，写真实场景；evidence.highlight 是其中一个关键短语。
5. 每页只讲一个意思；不要出现“背景/证据/反例/金句/模板/结构”等结构词。
6. 不编造事实；不写空话。`;
  const user = `选题：${clean(brief.title)}
话题：${clean(brief.topic)}
页数：${Number(brief.page_count) || 5}
主题：${clean(brief.theme)}
结构：${clean(brief.structure_name || brief.structure_type)}
必含：${clean(brief.must_include)}
避免：${clean(brief.must_avoid)}`;
  let last = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callLLM(system, user + (last ? `\n上次错误：${last}` : ''));
    const parsed = extractJson(raw);
    if (parsed?.page1 && parsed?.page2) {
      const spec = normalizeSpec(parsed, brief, angle || { title: brief.title, thesis: brief.topic, analogy_map: [] });
      spec.page1.cover = {
        lead: clean(parsed.page1.cover?.lead || ''),
        punch: clean(parsed.page1.cover?.punch || '')
      };
      if (spec.page1.cover.lead && spec.page1.cover.punch) {
        spec.page1.lines = [spec.page1.cover.lead, spec.page1.cover.punch];
        spec.page1.highlight = spec.page1.cover.punch;
      } else {
        const p1Text = (spec.page1.lines || []).join('');
        if (!spec.page1.highlight || !p1Text.includes(spec.page1.highlight)) {
          spec.page1.highlight = (spec.page1.lines || []).slice(-1)[0] || '';
        }
      }
      spec.context = { ...(spec.context || {}), ...(parsed.context || {}), title: clean(parsed.context?.title || brief.title) };
      spec.evidence = { ...(spec.evidence || {}), ...(parsed.evidence || {}) };
      spec.objection = { ...(spec.objection || {}), ...(parsed.objection || {}) };
      spec.quote = { ...(spec.quote || {}), ...(parsed.quote || {}) };
      spec.page_count = Number(brief.page_count) || 5;
      spec.theme = brief.theme || 'archive';
      spec.content_schema_version = 3;
      return spec;
    }
    last = 'JSON 结构不完整';
  }
  throw new Error('Lite 生成失败');
}

export async function generateContext(brief = {}, spec = {}) {
  if (!llmConfigured()) throw new Error('LLM 未配置，无法生成背景页');
  const p1 = spec.page1 || {};
  const p2 = spec.page2 || {};
  const system = `你是中文短视频的背景页编辑。只生成三个字段，不写模板说明。
返回 JSON：{"scene":"","roles":"","constraint":""}
要求：
1. scene：谁、在什么情况下，8–16 个汉字。
2. roles：A 是什么，B 是什么，8–16 个汉字；必须压短，例如“检索，不是生成”“AI 写稿，人签字”，不要写全称和解释。
3. constraint：哪里不能硬套，8–16 个汉字。
4. 三句都必须具体，不能出现“背景”“模板”“结构”“先把……说清楚”等空话。
5. 不能是残句，不能以“的/了/是/和/与”开头。`;
  const user = `选题：${clean(brief.title)}
话题：${clean(brief.topic)}
结构：${clean(brief.structure_name || brief.structure_type)}
封面：${clean(p1.cover?.lead)} / ${clean(p1.cover?.punch)}
P2：${clean(p2.left_line1_rest)} / ${clean(p2.right_highlight)} / ${clean(p2.conclusion_highlight)}
请给这一条写背景页三字段。`;
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await callLLM(system, user + (lastError ? `\n上次失败：${lastError}` : ''));
    const obj = extractJson(raw) || {};
    const out = {
      scene: clean(obj.scene).replace(/[。！？；].*$/, '').trim(),
      roles: clean(obj.roles).replace(/[。！？；].*$/, '').trim(),
      constraint: clean(obj.constraint).replace(/[。！？；].*$/, '').trim()
    };
    const issues = [];
    for (const [key, value] of Object.entries(out)) {
      if (value.length < 8 || value.length > 16) issues.push(`${key} 长度必须 8–16`);
      if (/^(的|了|是|和|与)/.test(value)) issues.push(`${key} 不能以功能词开头`);
      if (/背景|模板|结构|先把.*说清楚/.test(value)) issues.push(`${key} 含模板空话`);
    }
    if (!issues.length) return out;
    lastError = issues.join('；');
  }
  throw new Error(`背景页生成不合规：${lastError}`);
}

export async function generateSpec(brief, angle, sources, context = null) {
  const ctxText = context ? contextPrompt(context) : '';
  if (llmConfigured()) {
    try {
      const content = await callLLM(
        `你是中文短视频编剧，同时产出同一选题的公众号图文。只输出 JSON，不要解释。
结构必须完全如下：
{
 "brand":"FIXED ADDRESS",
 "meta":{"p1_left":"01 / 邮局","p1_right":"THE POST OFFICE","p2_left":"02 / 对照","p2_right":"HOME VS. CLOUD","p3_left":"03 / 声音","p3_right":"MUSIC PAGE"},
 "page1":{"kicker":"","kicker_accent":"","lines":["","",""],"quote_line2":false,"addr_label":"这个地址，叫","highlight":"","highlight_latin":"","en":"","footnote":"","stamp_line1":"固定","stamp_line2":"入口"},
 "page2":{"kicker":"","kicker_accent":"","left_tag":"","left_thin":"","left_line1_rest":"","left_line2":"","left_stamp":"","right_tag":"","right_prefix":"","right_highlight":"","right_badge":"","conclusion_small":"","conclusion_prefix":"","conclusion_highlight":"","footnote":""},
 "page3":{"title":"FIXED ADDRESS","subtitle":"","note":"只有音乐，<b>没有解说</b>。","bottom":""},
 "article":{"title":"","digest":"","cover_text":"","series":{"name":"","role":"main","index":"01","total":"01"},"lead":"","highlights":[""],"quote":"","opening":"","sections":[{"heading":"","body":""},{"heading":"","body":""},{"heading":"","body":""}],"cta":"","sources":[]},
 "music":"pulse"
}
要求：每页文字极少；page1 每行 <= 8 个汉字；page2 每行 <= 9 个汉字；highlight 是关键词；可以保留 <b> 和 <br>。
article 是公众号图文：title <= 30 字；digest <= 80 字；cover_text <= 10 字；lead 是一句可被 highlight 的核心判断（<=40 字）；highlights 是 1–3 个要加荧光底的词；quote 是一句可转发的冷判断；opening <= 120 字；3 个小节，每节 body 150–300 字；cta 一句话；sources 只放真实来源 {title,url}。
必须遵守【灵魂】的信念/语感，优先复用【可用类比】的映射和边界；只使用【知识库片段】里的事实，不要编造；用 K1/K2 标注依据。`,
        `选题：${brief.title}
话题：${brief.topic}
受众：${brief.audience || ''}
选定结构：${brief.structure_name || '未指定'}${brief.structure_type ? '（' + brief.structure_type + '）' : ''}
结构快照：${brief.structure_snapshot ? JSON.stringify(brief.structure_snapshot) : '无'}
角度：${angle.title}
论点：${angle.thesis}
类比映射：${JSON.stringify(angle.analogy_map || [])}
必须出现：${brief.must_include}
必须避免：${brief.must_avoid}
参考来源：
${sourceLines(sources)}

${ctxText}`
      );
      const parsed = extractJson(content);
      if (parsed && parsed.page1 && parsed.page2) {
        const normalized = normalizeSpec(parsed, brief, angle);
        if (!normalized.article?.title) {
          const fallback = normalizeSpec(localSpec(brief, angle, sources), brief, angle);
          normalized.article = fallback.article;
        }
        try {
          normalized.page1.cover = await generateCover(brief, normalized);
        } catch (e) {
          normalized.cover_error = e.message;
        }
        normalized.content_schema_version = 3;
        return normalized;
      }
    } catch (e) {
      console.warn('LLM spec fallback:', e.message);
    }
  }
  return normalizeSpec(localSpec(brief, angle, sources), brief, angle);
}

export function blankSpec(brief, angle) {
  return normalizeSpec(localSpec(brief, angle), brief, angle);
}

export async function draftAutoScript(title, structureType = 'causal') {
  if (!llmConfigured()) return `${title}。`;
  const system = '你是短视频口播撰稿人。把主题写成 3–5 句、30–60 秒、口语化、有观点、结尾留钩子的口播稿。只返回 JSON：{"script":"..."}';
  const user = `主题：${title}\n结构：${structureType}`;
  try {
    const content = await callLLM(system, user, { jsonMode: true });
    const parsed = extractJson(content);
    return parsed?.script || `${title}。`;
  } catch (e) {
    console.warn('draftAutoScript fallback:', e.message);
    return `${title}。`;
  }
}

// 课件一键编排：主题 → 4–5 页 storyboard（title / flow / bullet / quote + 旁白）
export async function draftCoursewareStoryboard(topic, style = 'industrial') {
  const text = clean(topic);
  if (!text) throw new Error('先写一个主题');
  if (!llmConfigured()) throw new Error('LLM 未配置，无法一键编排');
  const system = `你是中文课件编导。把用户给的主题做成一个 4–5 页的竖屏课件。只输出 JSON，不要解释。结构：
{"title":"总标题","slides":[
 {"kind":"title","text":"主标题","body":"副标题","narration":"旁白一句话"},
 {"kind":"flow","text":"流程页标题","nodes":["步骤1","步骤2","步骤3"],"narration":"旁白一句话"},
 {"kind":"bullet","text":"要点页标题","bullets":["要点1","要点2"],"narration":"旁白一句话"},
 {"kind":"quote","text":"金句主句","body":"金句副句","narration":"旁白一句话"}]}
要求：第 1 页必须是 title，最后一页必须是 quote，中间用 flow / bullet；每页 narration 一句自然口语（≤40 字）；flow 节点 2–4 个（每个 ≤12 字）；bullet 1–5 条（每条 ≤20 字）；禁止出现「最」「第一」「保证」「百分百」「国家级」等违规词。`;
  const content = await callLLM(system, `主题：${text}\n风格：${style}`);
  const parsed = extractJson(content);
  if (!parsed || !Array.isArray(parsed.slides) || !parsed.slides.length) throw new Error('AI 编排失败：返回内容不是有效 JSON');
  return parsed;
}

// 文案分镜：一段展示思路 + 素材清单 → 镜头列表（含文案 + 用哪张图 + 圈哪里 + 加什么效果）
export async function composeCourseware({ script, screenshots }) {
  const text = clean(script);
  if (!text) throw new Error('先写一段展示思路');
  if (!llmConfigured()) throw new Error('LLM 未配置，无法文案分镜');
  const shotList = (screenshots || []).map((s, i) => `[${i}] ${s.description || '（无描述）'}`).join('\n');
  const directorManual = readDirectorManual();
  const system = `你是一个会讲人话的短视频编导，像跟朋友聊天，不是播音员。

${directorManual ? `【导演手册（必须遵守）】\n${directorManual}\n` : ''}

【文案怎么说才像人】
- 口语、短句、有停顿感；一句话一个意思，每句 ≤40 字。
- 不用书面语（"首先/其次/最后/综上所述"），不堆术语。
- 开头一句抓住人，结尾一句收住。
- 示范：
  生硬："本视频将介绍公众号发布的流程。"
  自然："发公众号，其实就四步。"
  生硬："首先，点击通过按钮进行审批确认。"
  自然："先点通过——对，就这个按钮。"

【怎么当导演（每页选画面 + 效果）】
- title：开场，用 reveal.typewriter（by:"line"）或 fade。
- screenshot：讲操作，用 motion.zoom + annotationAnim.draw + emphasis.pulse；target 写要圈的具体目标。
- video：讲「看这段演示」，用 shot 指定视频片段；一般配 reveal.stagger 或 fade。
- flow：讲步骤，用 reveal.stagger。
- bullet：讲要点，用 reveal.stagger。
- quote：收尾，用 reveal.fade + texture.lightSweep。
- 一页最多 2–3 个效果，别全堆。
- 颜色：强调色只用于这页唯一要强调的元素；正文用正文色。
- 标注一页只用一种（circle / underline / highlight / arrow / bubble）。
- 流程：纵向节点 2–4 个 + 箭头连线，讲一步出现一步（stagger）。

【输出 JSON，不要解释】
{"title":"总标题","slides":[
 {"kind":"title","text":"主标题","body":"副标题","narration":"旁白","effects":{"reveal":{"type":"typewriter","by":"line"}}},
 {"kind":"screenshot","text":"这页标题","shot":0,"target":"要圈的具体目标","narration":"旁白","effects":{"motion":{"type":"zoom"},"annotationAnim":{"type":"draw"},"emphasis":{"type":"pulse","amount":0.06,"times":2}}},
 {"kind":"flow","text":"流程标题","nodes":["步骤1","步骤2"],"narration":"旁白","effects":{"reveal":{"type":"stagger","staggerMs":150}}},
 {"kind":"bullet","text":"要点标题","bullets":["…","…"],"narration":"旁白","effects":{"reveal":{"type":"stagger","staggerMs":200}}},
 {"kind":"quote","text":"金句","body":"副句","narration":"旁白","effects":{"reveal":{"type":"fade"},"texture":{"type":"lightSweep"}}}]}
硬性要求：第 1 页 title、最后一页 quote，中间 2–4 页；**如果素材清单不为空，中间至少 1 页必须是 screenshot 或 video（用 shot 指定素材编号）**，不能全用 flow/bullet；screenshot 必须给 shot（编号）和 target（具体目标）；narration 必须像人说话；禁止「最」「第一」「保证」「百分百」「国家级」。`;
  const user = `展示思路：${text}\n\n素材清单：\n${shotList || '（没有截图）'}`;
  const content = await callLLM(system, user);
  const parsed = extractJson(content);
  if (!parsed || !Array.isArray(parsed.slides) || !parsed.slides.length) throw new Error('文案分镜失败：返回内容不是有效 JSON');
  return parsed;
}



