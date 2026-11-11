const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  route: { name: 'dashboard' },
  dashboard: null,
  briefs: [],
  briefFilter: 'all',
  brief: null,
  library: [],
  libraryFilter: 'all',
  structureFilter: 'all',
  musicLibrary: [],
  musicFilter: 'all',
  musicQuery: '',
  musicAudio: null,
  knowledge: null,
  analogies: [],
  soul: null,
  settings: null,
  selectedStructure: null,
  structureOptions: [],
  createSelected: null,
  createOptions: [],
  createRewrite: '',
  quoteCandidates: [],
  templatePreset: null,
  elementCandidate: null,
  batchPoll: null,
  pollTimers: [],
  toastTimer: null
};

const STATUS_LABELS = {
  draft: '草稿',
  angles_ready: '角度已生成',
  script_ready: '文案就绪',
  preview_queued: '预览排队',
  preview_rendering: '预览中',
  preview_ready: '预览就绪',
  render_queued: '渲染排队',
  rendering: '渲染中',
  rendered: '已渲染',
  stale: '文案已改',
  canceled: '已取消',
  in_review: '待审批',
  approved: '已通过',
  changes_requested: '待修改',
  rejected: '已拒绝',
  failed: '失败',
  scheduled: '已排期',
  ready_for_manual: '待人工发布',
  draft_created: '草稿已建',
  dry_run: 'Dry-run',
  publishing: '发布中',
  published: '已发布'
};
const STATUS_ORDER = ['draft', 'angles_ready', 'script_ready', 'preview_ready', 'rendered', 'in_review', 'approved', 'scheduled', 'ready_for_manual', 'published'];

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const media = (p) => p ? ('/' + String(p).replace(/^\/+/, '')) : '';
const statusLabel = (s) => STATUS_LABELS[s] || s || '—';
const statusChip = (s) => `<span class="status status-${esc(s)}">${esc(statusLabel(s))}</span>`;
const engineLabel = (e) => e === 'vibemotion' ? 'VibeMotion' : '模板';
const modeLabel = (m) => (m === 'fixed' ? '固定页式' : (m === 'manual' ? '人工' : '讲解式'));
const libStatusChip = (r) => r.engine === 'vibemotion' ? statusChip(r.status) : statusChip(r.brief_status);
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
const fmtDay = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};
const truncate = (s, n = 80) => {
  const v = String(s || '').replace(/\s+/g, ' ').trim();
  return v.length > n ? v.slice(0, n) + '…' : v;
};
const hlText = (text, words = []) => {
  let s = esc(text);
  for (const w of [...words].filter(Boolean).sort((a, b) => b.length - a.length)) {
    const e = esc(w);
    s = s.split(e).join(`<span class="article-hl">${e}</span>`);
  }
  return s;
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || `请求失败 ${res.status}`);
  return data;
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) });
const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body || {}) });
const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body || {}) });

function toast(message, type = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.className = 'toast show ' + (type === 'error' ? 'error' : '');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { el.className = 'toast'; }, 3600);
}

function clearPolls() {
  state.pollTimers.forEach(t => clearInterval(t));
  state.pollTimers = [];
}

function openModal({ title, subtitle = '', body, foot = '', wide = false, onMount }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal"></div>
    <div class="modal" style="${wide ? 'width:min(980px,calc(100vw - 40px))' : ''}">
      <div class="modal-head">
        <div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
      </div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
  requestAnimationFrame(() => root.classList.add('open'));
  const first = root.querySelector('input, textarea, select, button');
  if (first) setTimeout(() => first.focus(), 80);
  if (onMount) onMount(root);
}
function closeModal() {
  const root = $('#modal-root');
  root.classList.remove('open');
  setTimeout(() => { root.innerHTML = ''; }, 220);
}

function setCrumb(text) { $('#crumb').textContent = text; }
function setNav(name) {
  $$('.nav a[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
}

async function refreshBadges() {
  try {
    const d = await api('/api/dashboard');
    state.dashboard = d;
    const reviewBadge = $('#nav-review-badge');
    reviewBadge.textContent = d.counts.pending_review || 0;
    reviewBadge.hidden = !d.counts.pending_review;
    const pubBadge = $('#nav-publish-badge');
    pubBadge.textContent = d.counts.ready_publish || 0;
    pubBadge.hidden = !d.counts.ready_publish;
  } catch {}
}

async function refreshWechatStatus() {
  try {
    const s = await api('/api/settings');
    state.settings = s;
    const el = $('#wechat-status');
    const groups = s.account_groups || [];
    const configured = (s.wechat_accounts || []).filter(a => a.secret_set).length;
    const def = groups.find(g => g.is_default) || groups[0];
    el.className = 'top-status' + (configured ? ' ok' : '');
    el.innerHTML = `<i></i> ${groups.length ? `${groups.length} 个账号组${def ? ' · ' + esc(def.name) : ''}` : '账号未配置'}`;
  } catch {}
}

function placeholderCover(title = '') {
  const letter = (title || 'FA').trim().slice(0, 1);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#111"/><text x="50%" y="52%" fill="#D9FF57" font-family="sans-serif" font-size="120" font-weight="900" text-anchor="middle">${letter}</text></svg>`)}`;
}

function coverImg(path, title = '', cls = '') {
  return `<img class="${cls}" src="${path ? esc(media(path)) : placeholderCover(title)}" alt="" loading="lazy" onerror="this.src='${placeholderCover(title)}'">`;
}

// ---------- router ----------
function parseRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (!parts.length) return { name: 'workbench' };
  if (parts[0] === 'workbench') return { name: 'workbench' };
  if ((parts[0] === 'brief' || parts[0] === 'briefs') && parts[1]) return { name: 'brief', id: parts[1] };
  if (parts[0] === 'briefs' || parts[0] === 'brief') return { name: 'briefs' };
  if (parts[0] === 'create') return { name: 'create' };
  if (parts[0] === 'library') return { name: 'library' };
  if (parts[0] === 'assets') return { name: 'assets' };
  if (parts[0] === 'voices') return { name: 'voices' };
  if (parts[0] === 'music') return { name: 'music' };
  if (parts[0] === 'templates') return { name: 'templates' };
  if (parts[0] === 'elements') return { name: 'elements' };
  if (parts[0] === 'review' && parts[1]) return { name: 'review-detail', id: parts[1] };
  if (parts[0] === 'review') return { name: 'review' };
  if (parts[0] === 'publish') return { name: 'publish' };
  if (parts[0] === 'wechat') return { name: 'wechat', id: parts[1] || '' };
  if (parts[0] === 'channels') return { name: 'channels' };
  if (parts[0] === 'batch') return { name: 'batch' };
  if (parts[0] === 'autogen') return { name: 'autogen' };
  if (parts[0] === 'knowledge') return { name: 'knowledge' };
  if (parts[0] === 'analogies') return { name: 'analogies' };
  if (parts[0] === 'soul') return { name: 'soul' };
  if (parts[0] === 'settings') return { name: 'settings' };
  return { name: 'dashboard' };
}

async function route() {
  clearPolls();
  state.route = parseRoute();
  refreshBadges();
  try {
    if (state.route.name === 'dashboard') return await renderDashboard();
    if (state.route.name === 'create') return await renderCreate();
    if (state.route.name === 'briefs') return await renderBriefs();
    if (state.route.name === 'brief') return await renderBrief(state.route.id);
    if (state.route.name === 'library') return await renderLibrary();
    if (state.route.name === 'assets') return await renderAssets();
    if (state.route.name === 'voices') return await renderVoices();
    if (state.route.name === 'music') return await renderMusic();
    if (state.route.name === 'templates') return await renderTemplates();
    if (state.route.name === 'elements') return await renderElements();
    if (state.route.name === 'review') return await renderReviewList();
    if (state.route.name === 'review-detail') return await renderReviewDetail(state.route.id);
    if (state.route.name === 'publish') return await renderPublish();
    if (state.route.name === 'wechat') return await renderAccountGroupWorkspace(state.route.id);
    if (state.route.name === 'channels') return await renderChannels();
    if (state.route.name === 'batch') return await renderBatch();
    if (state.route.name === 'workbench') return await renderWorkbench();
    if (state.route.name === 'autogen') return await renderAutogen();
    if (state.route.name === 'knowledge') return await renderKnowledge();
    if (state.route.name === 'analogies') return await renderAnalogies();
    if (state.route.name === 'soul') return await renderSoul();
    if (state.route.name === 'settings') return await renderSettings();
  } catch (e) {
    $('#view').innerHTML = `<div class="empty"><h3>页面加载失败</h3><p>${esc(e.message)}</p><button class="btn" data-action="reload">重试</button></div>`;
  }
}

function navigate(path) {
  if (location.hash === '#' + path) route();
  else location.hash = path;
}
window.addEventListener('hashchange', route);

// ---------- dashboard ----------
async function renderDashboard() {
  setNav('dashboard'); setCrumb('工作台 / 总览');
  const d = await api('/api/dashboard');
  state.dashboard = d;
  const pending = d.recent.filter(b => ['in_review', 'script_ready', 'angles_ready'].includes(b.status));
  const queue = d.queue || [];
  const reviewBadge = $('#nav-review-badge');
  reviewBadge.textContent = d.counts.pending_review || 0;
  reviewBadge.hidden = !d.counts.pending_review;
  const pubBadge = $('#nav-publish-badge');
  pubBadge.textContent = d.counts.ready_publish || 0;
  pubBadge.hidden = !d.counts.ready_publish;

  $('#view').innerHTML = `
    <section class="hero">
      <div>
        <div class="hero-tag"><i></i> CONTENT FACTORY / 固定地址</div>
        <h1>把一条内容，做成<br><em>可审批的工业品。</em></h1>
        <p>选题 → 资料 → 角度 → 文案 → 成片 → 审批 → 发布。每一步都有版本，每一次发布都有回执。</p>
      </div>
      <div class="hero-side">
        <strong>${String(d.counts.week_renders).padStart(2, '0')}</strong>
        <span>本周成片</span>
      </div>
    </section>

    <div class="stats-grid">
      <div class="stat hot"><div class="stat-label">待审批</div><div class="stat-value">${d.counts.pending_review}</div><div class="stat-foot">审批通过后才能发布</div></div>
      <div class="stat blue"><div class="stat-label">渲染中</div><div class="stat-value">${d.counts.rendering}</div><div class="stat-foot">预览 / 成片队列</div></div>
      <div class="stat ok"><div class="stat-label">待发布</div><div class="stat-value">${d.counts.ready_publish}</div><div class="stat-foot">公众号 / 视频号</div></div>
      <div class="stat"><div class="stat-label">全部选题</div><div class="stat-value">${d.counts.briefs}</div><div class="stat-foot">${d.counts.approved} 条已通过</div></div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-head">
          <div><h2 class="section-title">今天要处理</h2><p class="section-sub">优先看这些，别让内容停在半路。</p></div>
          <button class="btn btn-sm" data-action="new-brief">新建</button>
        </div>
        <div class="card-body">
          ${pending.length ? `<div class="task-list">${pending.map(taskRow).join('')}</div>` : `<div class="empty"><div class="empty-icon">✓</div><h3>今天没有待处理</h3><p>新建一个选题，或者去素材库看看已经通过的内容。</p><button class="btn btn-sm" data-action="new-brief">新建选题</button></div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div><h2 class="section-title">发布队列</h2><p class="section-sub">审批通过后，公众号自动 / 视频号人工。</p></div>
          <a class="btn btn-sm" href="#/publish">查看</a>
        </div>
        <div class="card-body">
          ${queue.length ? `<div class="queue-list">${queue.map(q => `
            <div class="queue-row">
              <i class="queue-dot ${['published'].includes(q.status) ? '' : 'ready'}"></i>
              <div class="queue-main"><div class="queue-title">${esc(q.title)}</div><div class="queue-meta">${q.channel === 'wechat_channels' ? '视频号 · 人工确认' : '公众号 · 图文'} · ${esc(statusLabel(q.status))}</div></div>
              <a class="btn btn-sm" href="#/publish">处理</a>
            </div>`).join('')}</div>` : `<div class="empty"><div class="empty-icon">→</div><h3>队列是空的</h3><p>审批通过后，这里会出现公众号草稿和视频号发布任务。</p><a class="btn btn-sm" href="#/review">去审批</a></div>`}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div><h2 class="section-title">最近内容</h2><p class="section-sub">所有选题与它们的最新状态。</p></div>
        <a class="btn btn-sm" href="#/briefs">全部选题</a>
      </div>
      <div class="card-body table-wrap">
        <table>
          <thead><tr><th>内容</th><th>状态</th><th>最近更新</th><th></th></tr></thead>
          <tbody>${d.recent.map(b => `
            <tr>
              <td><div class="table-title">${esc(b.title)}</div><div class="table-sub">${esc(b.topic)}</div></td>
              <td>${statusChip(b.status)}</td>
              <td class="muted">${fmtDate(b.updated_at)}</td>
              <td class="right"><a class="btn btn-sm" href="#/brief/${encodeURIComponent(b.id)}">打开</a></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="card mt-16">
      <div class="card-head"><div><h2 class="section-title">操作记录</h2><p class="section-sub">最近发生的状态变化。</p></div></div>
      <div class="card-body activity">
        ${(d.activity || []).length ? d.activity.map(a => `
          <div class="activity-row"><div class="activity-time">${fmtDate(a.created_at)}</div><div class="activity-text">${esc(a.action)} ${a.detail ? '· ' + esc(a.detail) : ''}</div></div>`).join('') : '<div class="muted tiny">暂无记录</div>'}
      </div>
    </div>`;
}

function taskRow(b) {
  const cover = b.latest_render?.cover_path;
  const href = b.status === 'in_review' && b.latest_render ? `#/review/${b.latest_render.id}` : `#/brief/${b.id}`;
  const action = b.status === 'in_review' ? '去审批' : '继续';
  return `<div class="task-row">
    ${coverImg(cover, b.title, 'task-cover')}
    <div class="task-main"><div class="task-title">${esc(b.title)}</div><div class="task-meta">${statusLabel(b.status)} · ${esc(b.analogy_domains.join(' / ') || '未指定类比')}</div></div>
    <div class="task-actions"><a class="btn btn-sm ${b.status === 'in_review' ? 'btn-primary' : ''}" href="${href}">${action}</a></div>
  </div>`;
}

// ---------- create / structure first ----------
function renderCreateOptions() {
  const box = $('#create-options');
  if (!box) return;
  const opts = state.createOptions || [];
  const count = $('#create-count');
  if (count) count.textContent = `${opts.length} 个方案`;
  box.innerHTML = opts.length ? opts.map((s, i) => `
    <div class="structure-option ${state.createSelected === s ? 'selected' : ''}" data-action="create-select-structure" data-index="${i}">
      <div class="structure-option-head"><span class="tag">${esc(structureTypeLabel(s.structure_type))}</span><strong>${esc(s.title)}</strong></div>
      <div class="tiny">${esc(s.source_domain || '源域')} → ${esc(s.target_domain || '目标域')} · ${(s.mapping || []).length} 条映射</div>
      <p>${esc(s.reason || s.signature || '')}</p>
      <div class="structure-option-actions">
        <button class="btn btn-sm" data-action="create-save-structure" data-index="${i}">${s.id ? '已在结构库' : '存入结构库'}</button>
      </div>
    </div>`).join('') : `<div class="note-box">还没有诊断。写一个方向，点「诊断结构」；也可以不选结构直接创建。</div>`;
  renderCreateSelected();
}

function renderCreateSelected() {
  const box = $('#create-selected');
  if (!box) return;
  const s = state.createSelected;
  if (!s) {
    box.innerHTML = `<div class="empty" style="padding:22px 0"><h3>还没有选结构</h3><p>选一个结构后，生成角度会围绕它展开。</p></div>`;
    return;
  }
  box.innerHTML = `<div class="create-lock">
    <div class="flex"><span class="tag dark">${esc(structureTypeLabel(s.structure_type))}</span><strong>${esc(s.title)}</strong></div>
    <div class="tiny mt-8">${esc(s.source_domain || '')} → ${esc(s.target_domain || '')}</div>
    <div class="create-map">${(s.mapping || []).slice(0, 4).map(m => `<div><span>${esc(m.from)}</span><i>→</i><span>${esc(m.to)}</span></div>`).join('')}</div>
    ${s.boundary ? `<div class="note-box mt-12"><strong>边界：</strong>${esc(s.boundary)}</div>` : ''}
    ${s.signature ? `<div class="create-sig">“${esc(s.signature)}”</div>` : ''}
    <div class="flex mt-12"><button class="btn btn-sm" data-action="check-create-structure">结构体检</button><button class="btn btn-sm" data-action="create-clear-structure">换结构</button></div>
    <div id="create-structure-check" class="mt-12"></div>
  </div>`;
}

async function autoDraftBriefForStructure() {
  const s = state.createSelected;
  const form = $('#create-brief-form');
  if (!s || !form) return;
  const titleEl = form.elements.title;
  const topicEl = form.elements.topic;
  if ((titleEl?.value || '').trim() || (topicEl?.value || '').trim()) return;
  const direction = String($('#create-direction')?.value || '').trim();
  if (!direction) return;
  const status = $('#create-status');
  if (status) status.textContent = '结构已选，AI 正在起草任务书…';
  try {
    const { draft } = await post('/api/ai/brief-draft', { direction });
    const set = (name, value) => { const el = form.elements[name]; if (el) el.value = value ?? ''; };
    set('title', draft.title); set('topic', draft.topic); set('audience', draft.audience);
    set('analogy_domains', (draft.analogy_domains || []).join('，'));
    set('must_include', draft.must_include); set('must_avoid', draft.must_avoid);
    set('tone', draft.tone); set('cta', draft.cta);
    if (status) status.textContent = 'AI 已起草任务书；你只需确认或改一两个词。';
  } catch (err) {
    if (status) status.textContent = `AI 起草失败，可手动填写：${err.message}`;
  }
}

async function checkCreateDirection() {
  const direction = String($('#create-direction')?.value || '').trim();
  if (!direction) return toast('先写一个方向', 'error');
  const btn = $('#create-check');
  const box = $('#create-check-result');
  if (btn) { btn.disabled = true; btn.textContent = '检查中…'; }
  if (box) box.innerHTML = `<div class="loading-inline"><span class="spinner"></span> 正在检查受众、误解、结论和类比…</div>`;
  try {
    const r = await post('/api/ai/direction-check', { direction });
    state.createRewrite = r.rewrite || '';
    const label = r.status === 'pass' ? '方向可用' : r.status === 'block' ? '有硬伤' : '需要修一下';
    if (box) {
      box.innerHTML = `<div class="direction-check ${r.status}">
        <div class="direction-check-head"><strong>${label}</strong><span class="tiny">${r.issues.length} 个问题</span></div>
        ${r.issues.length ? `<div class="preflight-issues">${r.issues.map(i => `<div class="issue-row ${i.severity === 'block' ? 'critical' : ''}"><span class="issue-sev">${i.severity === 'block' ? '硬伤' : '建议'}</span><div><strong>${esc(i.message)}</strong>${i.suggestion ? `<p>${esc(i.suggestion)}</p>` : ''}</div></div>`).join('')}</div>` : `<div class="note-box">没有问题，可以继续诊断结构。</div>`}
        ${r.rewrite ? `<div class="direction-rewrite"><div class="tiny">建议改成：</div><p>${esc(r.rewrite)}</p><button class="btn btn-sm" data-action="create-apply-rewrite">应用这段改写</button></div>` : ''}
      </div>`;
    }
  } catch (err) {
    if (box) box.innerHTML = `<div class="note-box red">${esc(err.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '检查方向'; }
  }
}

async function diagnoseCreate() {
  const direction = String($('#create-direction')?.value || '').trim();
  if (!direction) return toast('先写一个方向', 'error');
  const btn = $('#create-diagnose');
  const status = $('#create-status');
  if (btn) { btn.disabled = true; btn.textContent = '诊断中…'; }
  if (status) status.textContent = '正在从结构库里找映射，并给出备选…';
  try {
    const r = await post('/api/ai/structure-diagnosis', { direction });
    state.createOptions = r.structures || [];
    state.createSelected = null;
    renderCreateOptions();
    if (status) status.textContent = `给出 ${state.createOptions.length} 个结构方案；选一个再创建。`;
  } catch (err) {
    if (status) status.textContent = err.message;
    toast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '诊断结构'; }
  }
}

async function saveCreateStructure(index) {
  const s = (state.createOptions || [])[Number(index)];
  if (!s) return;
  if (s.id) return toast('这个结构已经在结构库里');
  try {
    const created = await post('/api/analogies', {
      title: s.title, structure_type: s.structure_type,
      source_domain: s.source_domain, target_domain: s.target_domain,
      mapping: s.mapping || [], boundary: s.boundary || '',
      signature: s.signature || '', use_cases: s.use_cases || '',
      conclusions: '', tags: [], raw_note: ''
    });
    s.id = created.id;
    s.usage_count = created.usage_count || 0;
    renderCreateOptions();
    toast('已存入结构库');
  } catch (err) { toast(err.message, 'error'); }
}

async function checkCreateStructure() {
  const s = state.createSelected;
  if (!s) return toast('先选一个结构', 'error');
  const box = $('#create-structure-check');
  const btn = document.querySelector('[data-action="check-create-structure"]');
  if (btn) { btn.disabled = true; btn.textContent = '体检中…'; }
  if (box) box.innerHTML = `<div class="loading-inline"><span class="spinner"></span> 正在检查映射、边界和签名…</div>`;
  try {
    const r = await post('/api/ai/structure-check', { structure: s });
    const label = r.status === 'pass' ? '结构可用' : r.status === 'block' ? '有硬伤' : '建议修一下';
    if (box) {
      box.innerHTML = `<div class="direction-check ${r.status}">
        <div class="direction-check-head"><strong>${label}</strong><span class="tiny">${r.issues.length} 个问题</span></div>
        ${r.issues.length ? `<div class="preflight-issues">${r.issues.map(i => `<div class="issue-row ${i.severity === 'block' ? 'critical' : ''}"><span class="issue-sev">${i.severity === 'block' ? '硬伤' : '建议'}</span><div><strong>${esc(i.message)}</strong>${i.suggestion ? `<p>${esc(i.suggestion)}</p>` : ''}</div></div>`).join('')}</div>` : `<div class="note-box">映射、边界和签名都通过了。</div>`}
      </div>`;
    }
  } catch (err) {
    if (box) box.innerHTML = `<div class="note-box red">${esc(err.message)}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '结构体检'; }
  }
}

async function fillCreateBrief() {
  const direction = String($('#create-direction')?.value || '').trim();
  if (!direction) return toast('先写一个方向', 'error');
  const form = $('#create-brief-form');
  const btn = $('#create-ai-fill');
  const status = $('#create-status');
  if (btn) { btn.disabled = true; btn.textContent = 'AI 填写中…'; }
  try {
    const { draft } = await post('/api/ai/brief-draft', { direction });
    const set = (name, value) => { const el = form?.elements?.[name]; if (el) el.value = value ?? ''; };
    set('title', draft.title); set('topic', draft.topic); set('audience', draft.audience);
    set('analogy_domains', (draft.analogy_domains || []).join('，'));
    set('must_include', draft.must_include); set('must_avoid', draft.must_avoid);
    set('tone', draft.tone); set('cta', draft.cta); set('quantity', draft.quantity || 3);
    const wanted = new Set(draft.channels || []);
    form?.querySelectorAll('input[name="channels"]').forEach(cb => { cb.checked = wanted.has(cb.value); });
    if (status) status.textContent = 'AI 已填任务书；确认后再创建。';
  } catch (err) {
    if (status) status.textContent = err.message;
    toast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'AI 预填任务书'; }
  }
}

async function renderCreate() {
  setNav('create'); setCrumb('工作台 / 创作台');
  const selected = state.createSelected;
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">CREATE / 创作台</p><h1 class="page-title">先选结构，<br>再写内容。</h1><p class="page-sub">同一个话题，用不同结构讲，会长成完全不同的视频。AI 给结构方案，你选一个解释世界的方式。</p></div>
      <div class="head-actions"><a class="btn" href="#/autogen">用 AI 自动生成</a><span class="tag lime">决策 1 / 4 · 选结构</span></div>
    </div>
    <div class="create-grid">
      <div class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">1. 给一个方向</h2><p class="section-sub">不用写标题，先写清楚：给谁看、打破什么误解、落到什么结论。</p></div></div>
          <div class="card-body">
            <textarea id="create-direction" rows="3" placeholder="例如：解释为什么自动化发布要放云服务器，用邮局寄信做类比，给已经买 NAS 的内容创作者看。"></textarea>
            <div class="flex mt-12"><button class="btn btn-sm" data-action="create-check-direction" id="create-check">检查方向</button><button class="btn btn-primary btn-sm" data-action="create-diagnose" id="create-diagnose">诊断结构</button><button class="btn btn-sm" data-action="create-ai-fill" id="create-ai-fill">AI 预填任务书</button><span class="tiny" id="create-status">先检查方向，再诊断结构；也可以直接填写任务书。</span></div>
            <div id="create-check-result" class="mt-12"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">2. 选择一个结构</h2><p class="section-sub">AI 不自动决定；你选的是解释方式，不是句子。</p></div><span class="tag" id="create-count">${state.createOptions.length} 个方案</span></div>
          <div class="card-body"><div id="create-options" class="structure-options"></div></div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">3. 补全任务书</h2><p class="section-sub">结构定了，再补标题、受众、边界和 CTA。</p></div></div>
          <div class="card-body">
            <form id="create-brief-form"><div class="form-grid">
              <div class="field full"><label>页面结构</label><div class="page-choice">${[3,4,5,6].map(n => `<label><input type="radio" name="page_count" value="${n}" ${n === 4 ? 'checked' : ''}><span><b>${n} 页</b><small>${n === 3 ? '钩子 / 对照 / 金句' : n === 4 ? '钩子 / 背景 / 对照 / 金句' : n === 5 ? '钩子 / 背景 / 对照 / 证据 / 金句' : '钩子 / 背景 / 反例 / 对照 / 证据 / 金句'}</small></span></label>`).join('')}</div><span class="tiny" id="page-plan-hint">默认 4 页，金句固定为最后一页。</span></div>
              <div class="field full"><label>视觉主题</label><div class="theme-choice">${[
                ['archive','Archive Paper','暖纸 / 红章'],
                ['terminal','Terminal Black','黑底 / 荧光'],
                ['editorial','Editorial Red','红底 / 海报'],
                ['noir','Noir Yellow','黑底 / 黄字'],
                ['earth','Earth Green','墨绿 / 橙褐']
              ].map(([id,name,desc]) => `<label><input type="radio" name="theme" value="${id}" ${id === 'archive' ? 'checked' : ''}><span class="theme-chip ${id}"><b>${name}</b><small>${desc}</small></span></label>`).join('')}</div></div>
              <div class="field full"><label>标题</label><input name="title" required placeholder="例如：为什么自动化发布必须放在云服务器"></div>
              <div class="field full"><label>话题 / 要讲清楚什么</label><textarea name="topic" required rows="3" placeholder="给谁看、要打破什么误解、最后落到什么结论。"></textarea></div>
              <div class="field"><label>受众</label><input name="audience" placeholder="例如：已经买了 NAS 的内容创作者"></div>
              <div class="field"><label>候选角度数量</label><input name="quantity" type="number" min="1" max="6" value="3"></div>
              <div class="field full"><label>类比方向（可选）</label><input name="analogy_domains" placeholder="留空则使用结构的源域/目标域"></div>
              <div class="field"><label>必须出现</label><textarea name="must_include" rows="3"></textarea></div>
              <div class="field"><label>必须避免</label><textarea name="must_avoid" rows="3"></textarea></div>
              <div class="field"><label>语气</label><input name="tone" placeholder="冷静、具体、少术语"></div>
              <div class="field"><label>CTA</label><input name="cta" placeholder="关注，领取部署清单"></div>
              <div class="field full"><label>发布渠道</label><div class="flex"><label class="check-row"><input type="checkbox" name="channels" value="wechat_channels" checked> 视频号</label><label class="check-row"><input type="checkbox" name="channels" value="wechat_article"> 公众号</label></div></div>
            </div><div class="flex mt-16"><button class="btn btn-primary" type="submit">创建并生成角度</button><span class="tiny">创建后会进入 Brief，结构会锁定在这条内容上。</span></div></form>
          </div>
        </div>
      </div>
      <aside class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">当前结构</h2><p class="section-sub">这条内容只用一个结构。</p></div></div>
          <div class="card-body" id="create-selected"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">决策提示</h2></div></div>
          <div class="card-body"><div class="create-steps">
            <p class="on"><b>1</b> 选结构 <span>你</span></p>
            <p><b>2</b> 选角度 <span>你</span></p>
            <p><b>3</b> 审片 <span>你</span></p>
            <p><b>4</b> 发布 <span>你</span></p>
          </div><p class="tiny mt-12">AI 负责诊断、生成、建议；代码负责版式、渲染、预检。你只在关键节点做决定。</p></div>
        </div>
      </aside>
    </div>`;
  const pageHint = $('#page-plan-hint');
  const planLabels = {
    3: '钩子 / 对照 / 金句',
    4: '钩子 / 背景 / 对照 / 金句',
    5: '钩子 / 背景 / 对照 / 证据 / 金句',
    6: '钩子 / 背景 / 反例 / 对照 / 证据 / 金句'
  };
  if (state.templatePreset) {
    const pc = document.querySelector(`#create-brief-form input[name="page_count"][value="${state.templatePreset.pages}"]`);
    if (pc) pc.checked = true;
    const th = document.querySelector(`#create-brief-form input[name="theme"][value="${state.templatePreset.theme}"]`);
    if (th) th.checked = true;
    if (pageHint) pageHint.textContent = `已套用「${state.templatePreset.name}」；可改页数/主题，再生成。`;
  }
  document.querySelectorAll('#create-brief-form input[name="page_count"]').forEach(input => {
    input.addEventListener('change', () => {
      if (pageHint) pageHint.textContent = `金句固定为最后一页：${planLabels[input.value]}`;
    });
  });
  renderCreateOptions();
}

// ---------- briefs ----------
async function renderBriefs() {
  setNav('briefs'); setCrumb('工作台 / 选题');
  const list = await api('/api/briefs?status=' + encodeURIComponent(state.briefFilter));
  state.briefs = list;
  const filters = [
    ['all', '全部'], ['draft', '草稿'], ['angles_ready', '角度'], ['script_ready', '文案'],
    ['in_review', '待审'], ['approved', '已通过'], ['published', '已发布']
  ];
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">BRIEFS / 选题</p><h1 class="page-title">先定角度，再动画面。</h1><p class="page-sub">给一个话题、一个类比方向和数量。系统先出角度卡，你选完再生成文案与视频。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="new-brief">+ 新建选题</button></div>
    </div>
    <div class="filter-tabs">${filters.map(([k, label]) => `<button class="${state.briefFilter === k ? 'active' : ''}" data-filter-brief="${k}">${label}</button>`).join('')}</div>
    <div class="card">
      <div class="card-body table-wrap">
        ${list.length ? `<table>
          <thead><tr><th>选题</th><th>类比方向</th><th>状态</th><th>更新时间</th><th></th></tr></thead>
          <tbody>${list.map(b => `
            <tr>
              <td><a class="table-title" href="#/brief/${encodeURIComponent(b.id)}">${esc(b.title)}</a><div class="table-sub">${esc(b.topic)}</div></td>
              <td><div class="tag-row">${(b.analogy_domains || []).map(d => `<span class="tag">${esc(d)}</span>`).join('') || '<span class="muted tiny">未指定</span>'}</div></td>
              <td>${statusChip(b.status)}</td>
              <td class="muted nowrap">${fmtDate(b.updated_at)}</td>
              <td class="right"><a class="btn btn-sm" href="#/brief/${encodeURIComponent(b.id)}">打开</a></td>
            </tr>`).join('')}</tbody>
        </table>` : `<div class="empty"><div class="empty-icon">＋</div><h3>这个筛选下还没有选题</h3><p>新建一个选题，先让系统出 3 张角度卡。</p><button class="btn btn-sm" data-action="new-brief">新建选题</button></div>`}
      </div>
    </div>`;
}

// ---------- brief detail ----------
async function renderBrief(id) {
  setNav('briefs'); setCrumb('工作台 / 选题 / 详情');
  const data = await api('/api/briefs/' + encodeURIComponent(id));
  state.brief = data;
  const { brief, sources, angles, latest_spec: spec, latest_render: render, publications } = data;
  const selected = angles.find(a => a.selected);
  const canApprove = render && ['rendered', 'approved'].includes(render.status);
  const isApproved = ['approved', 'scheduled', 'published'].includes(brief.status);

  $('#view').innerHTML = `
    <div class="detail-head">
      <div>
        <a class="back" href="#/briefs"><svg><use href="#i-arrow"></use></svg> 返回选题</a>
        <h1 class="detail-title">${esc(brief.title)}</h1>
        <p class="detail-sub">${esc(brief.topic)}</p>
        <div class="flex mt-12">${statusChip(brief.status)}${(() => { const g = (state.settings?.account_groups || []).find(x => x.id === brief.group_id); const a = (state.settings?.wechat_accounts || []).find(x => x.id === brief.account_id); return g ? `<span class="wx-badge" style="--wx:${esc(g.color || '#C73520')}">● ${esc(g.name)}${a ? ' · ' + esc(a.name) : ''}</span><button class="btn btn-sm" data-action="change-brief-account" data-id="${esc(brief.id)}">更换</button>` : '<span class="tag">未分配账号组</span><button class="btn btn-sm" data-action="change-brief-account" data-id="${esc(brief.id)}">分配</button>'; })()}<span class="tiny">更新于 ${fmtDate(brief.updated_at)}</span></div>
      </div>
      <div class="head-actions">
        ${!angles.length ? `<button class="btn btn-primary" data-action="generate-angles" data-id="${esc(brief.id)}"><svg><use href="#i-spark"></use></svg>生成 ${brief.quantity || 3} 个角度</button>` : ''}
        ${angles.length && spec ? `<button class="btn" data-action="generate-spec" data-id="${esc(brief.id)}">重新生成文案</button>` : ''}
        ${angles.length && !spec ? `<button class="btn btn-primary" data-action="generate-spec" data-id="${esc(brief.id)}">生成三页文案</button>` : ''}
        ${brief.structure_name && !spec ? `<button class="btn btn-lime" data-action="auto-pipeline" data-id="${esc(brief.id)}">一键生成候选</button>` : ''}
        ${canApprove ? `<a class="btn ${isApproved ? '' : 'btn-lime'}" href="#/review/${encodeURIComponent(render.id)}">${isApproved ? '查看审批' : '去审批'}</a>` : ''}
      </div>
    </div>

    ${brief.structure_name ? `<div class="brief-structure"><span class="tag dark">结构已锁定</span><strong>${esc(brief.structure_name)}</strong><span class="tag">${esc(structureTypeLabel(brief.structure_type))}</span><span class="tiny">后面生成角度和文案都会围绕这个结构展开。</span><a class="btn btn-sm" href="#/analogies">查看结构库</a></div>` : ''}

    <div class="detail-grid">
      <div class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">Brief</h2><p class="section-sub">这条内容的任务书。</p></div></div>
          <div class="card-body">
            <dl class="kv-grid">
              ${brief.structure_name ? `<dt>结构</dt><dd><strong>${esc(brief.structure_name)}</strong> · ${esc(structureTypeLabel(brief.structure_type))}</dd>` : ''}
              <dt>页面结构</dt><dd>${brief.page_count || 3} 页 · ${(brief.page_plan || []).join(' / ')}</dd>
              <dt>视觉主题</dt><dd>${esc(({ archive: 'Archive Paper', terminal: 'Terminal Black', editorial: 'Editorial Red', noir: 'Noir Yellow', earth: 'Earth Green' })[brief.theme] || 'Archive Paper')}</dd>
              ${brief.template_id ? `<dt>模板预设</dt><dd>${esc(brief.template_id)}</dd>` : ''}
              <dt>受众</dt><dd>${esc(brief.audience || '—')}</dd>
              <dt>类比方向</dt><dd><div class="tag-row">${brief.analogy_domains.map(d => `<span class="tag">${esc(d)}</span>`).join('') || '—'}</div></dd>
              <dt>必须出现</dt><dd>${esc(brief.must_include || '—').replaceAll('\n', '<br>')}</dd>
              <dt>必须避免</dt><dd>${esc(brief.must_avoid || '—').replaceAll('\n', '<br>')}</dd>
              <dt>渠道</dt><dd>${brief.channels.map(c => `<span class="tag">${c === 'wechat_article' ? '公众号' : c === 'wechat_channels' ? '视频号' : esc(c)}</span>`).join(' ')}</dd>
              <dt>CTA</dt><dd>${esc(brief.cta || '—')}</dd>
              <dt>截止</dt><dd>${fmtDate(brief.deadline)}</dd>
            </dl>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div><h2 class="section-title">资料源</h2><p class="section-sub">每个 claim 都要有出处；没有出处的结论不进脚本。</p></div>
            <button class="btn btn-sm" data-action="toggle-source">+ 加资料</button>
          </div>
          <div class="card-body">
            <form id="source-form" class="hidden" data-brief="${esc(brief.id)}">
              <div class="form-grid">
                <div class="field"><label>URL</label><input name="url" placeholder="https://developers.weixin.qq.com/..."></div>
                <div class="field"><label>标题（可选）</label><input name="title" placeholder="官方文档 / 文章标题"></div>
                <div class="field full"><label>或直接粘贴正文</label><textarea name="text" placeholder="粘贴关键段落，系统会存为来源摘要"></textarea></div>
              </div>
              <div class="flex mt-12"><button class="btn btn-primary btn-sm" type="submit">保存资料</button><span class="tiny">保存后会出现在角度与文案的上下文里。</span></div>
            </form>
            <div class="source-list mt-12">
              ${sources.length ? sources.map(s => `
                <div class="source-row">
                  <div class="source-icon"><svg><use href="#i-file"></use></svg></div>
                  <div class="source-main">
                    <div class="source-title">${esc(s.title || s.url || '未命名资料')}</div>
                    <div class="source-excerpt">${esc(s.excerpt)}</div>
                    ${s.url ? `<a class="source-url" href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.url)}</a>` : ''}
                  </div>
                  <span class="source-status ${s.status === 'error' ? 'error' : ''}">${s.status === 'error' ? '抓取失败' : '已读'}</span>
                </div>`).join('') : `<div class="empty"><h3>还没有资料源</h3><p>至少放一条官方来源或一手资料，再生成角度。</p></div>`}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div><h2 class="section-title">角度卡</h2><p class="section-sub">先选一个角度。不要一次渲染 10 条废片。</p></div>
            <div class="card-actions">${brief.structure_name ? `<span class="tag lime">结构 · ${esc(brief.structure_name)}</span>` : ''}${angles.length ? `<button class="btn btn-sm" data-action="generate-angles" data-id="${esc(brief.id)}">换一批</button>` : ''}</div>
          </div>
          <div class="card-body">
            ${angles.length ? `<div class="angle-grid">${angles.map((a, i) => `
              <div class="angle-card ${a.selected ? 'selected' : ''}" data-action="select-angle" data-id="${esc(a.id)}">
                <div class="angle-index">0${i + 1} / ${a.selected ? '已选' : '选择这个'}</div>
                <h3>${esc(a.title)}</h3>
                <p>${esc(a.thesis)}</p>
                <div class="angle-map">${(a.analogy_map || []).map(m => `<span class="angle-pair">${esc(m.from)} → ${esc(m.to)}</span>`).join('')}</div>
                <div class="hook">${esc(a.hook)}</div>
              </div>`).join('')}</div>` : `<div class="empty"><div class="empty-icon"><svg><use href="#i-spark"></use></svg></div><h3>还没有角度</h3><p>系统会根据话题、类比方向和资料源，先出 ${brief.quantity || 3} 张角度卡。</p><button class="btn btn-primary btn-sm" data-action="generate-angles" data-id="${esc(brief.id)}">生成角度</button></div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div><h2 class="section-title">三页文案</h2><p class="section-sub">每页只放一句人话；Highlight 是观众要记住的词。</p></div>
            <div class="card-actions">${spec ? `<span class="tiny">v${spec.version}${spec.spec_json?._meta?.knowledge?.length ? ` · 引用 ${spec.spec_json._meta.knowledge.length} 条知识` : ' · 未绑定知识'}</span><button class="btn btn-sm" data-action="theme-previews" data-spec="${esc(spec.id)}">三主题预览</button><button class="btn btn-sm" data-action="gen-quote-candidates" data-spec="${esc(spec.id)}">AI 金句候选</button>` : ''}</div>
          </div>
          <div class="card-body">
            ${spec ? renderSpecEditor(spec) : `<div class="empty"><div class="empty-icon">✎</div><h3>还没有文案</h3><p>选一个角度，生成一版可编辑的三页文案。</p><button class="btn btn-primary btn-sm" data-action="generate-spec" data-id="${esc(brief.id)}" ${!selected ? 'disabled' : ''}>生成文案</button></div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">渲染</h2><p class="section-sub">先预览 3–4 帧；4 页版本 20 秒，3 页 + 金句 21 秒，否则 18 秒。</p></div></div>
          <div class="card-body">
            <div id="render-panel">${renderPanel(render, spec)}</div>
          </div>
        </div>
      </div>

      <aside class="detail-side">
        ${brief.structure_name ? `<div class="card structure-pinned">
          <div class="card-head"><div><h2 class="section-title">当前结构</h2><p class="section-sub">这条内容只用一个结构。</p></div><span class="tag lime">已锁定</span></div>
          <div class="card-body">
            <div class="analogy-domains"><span>${esc(brief.structure_snapshot?.source_domain || '源域')}</span><i>→</i><span>${esc(brief.structure_snapshot?.target_domain || '目标域')}</span></div>
            <strong class="structure-pinned-title">${esc(brief.structure_name)}</strong>
            <div class="analogy-mapping">${(brief.structure_snapshot?.mapping || []).slice(0, 5).map(m => `<div class="analogy-map-row"><span>${esc(m.from)}</span><i>→</i><span>${esc(m.to)}</span>${m.note ? `<small>${esc(m.note)}</small>` : ''}</div>`).join('')}</div>
            ${brief.structure_snapshot?.boundary ? `<div class="note-box mt-12"><strong>边界：</strong>${esc(brief.structure_snapshot.boundary)}</div>` : ''}
            ${brief.structure_snapshot?.signature ? `<div class="analogy-signature mt-12">“${esc(brief.structure_snapshot.signature)}”</div>` : ''}
            <a class="btn btn-sm mt-12" href="#/analogies">查看结构库</a>
          </div>
        </div>` : ''}
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">流程</h2></div></div>
          <div class="card-body">${timeline(brief, angles, spec, render, publications)}</div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">下一步</h2></div></div>
          <div class="card-body">
            ${nextStep(brief, angles, spec, render)}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">发布</h2></div></div>
          <div class="card-body">
            ${publications.length ? publications.map(p => `<div class="between" style="padding:8px 0;border-top:1px solid var(--line)"><span class="channel-badge ${p.channel}">${p.channel === 'wechat_channels' ? '视频号' : (p.channel === 'xiaohongshu' ? '小红书' : '公众号')}</span>${statusChip(p.status)}</div>`).join('') : `<p class="tiny mb-0">审批通过后，这里会出现公众号草稿和视频号发布任务。</p>`}
          </div>
        </div>
      </aside>
    </div>`;
}

function renderSpecEditor(spec) {
  const s = spec.spec_json || {};
  const p1 = s.page1 || {}, p2 = s.page2 || {}, p3 = s.page3 || {};
  const q = s.quote || {};
  const st = s.structure_type || 'analogy';
  const sf = s.structure_fields || {};
  const structureLabel = ({ analogy: '类比', contrast: '对照', causal: '因果', misconception: '误区', boundary: '边界', checklist: '清单' })[st] || st;
  const sfInput = (name, label, value) => `<div class="field"><label>${esc(label)}</label><input name="${name}" value="${esc(value || '')}"></div>`;
  const sfSection = st === 'analogy' || st === 'contrast' ? '' : `<details class="spec-section" open>
      <summary>结构专属字段 · ${esc(structureLabel)}</summary>
      <div class="spec-grid">
        ${st === 'causal' ? [0, 1, 2].map(i => sfInput(`sf_causal_${i}`, `链路 ${i + 1}`, sf.causal?.[i])).join('') : ''}
        ${st === 'checklist' ? [0, 1, 2, 3, 4].map(i => sfInput(`sf_checklist_${i}`, `检查项 ${i + 1}`, sf.checklist?.[i])).join('') : ''}
        ${st === 'boundary' ? sfInput('sf_boundary_0', '适用', sf.boundary?.[0]) + sfInput('sf_boundary_1', '不适用', sf.boundary?.[1]) : ''}
        ${st === 'misconception' ? sfInput('sf_misconception_0', '误解', sf.misconception?.[0]) + sfInput('sf_misconception_1', '纠正', sf.misconception?.[1]) : ''}
      </div>
    </details>`;
  const a = s.article || {};
  const isFour = Number(s.page_count) === 4;
  const isEvidence = [5, 6].includes(Number(s.page_count));
  const sec = Array.isArray(a.sections) ? a.sections : [];
  const line = (i) => (p1.lines || [])[i] || '';
  return `<form id="spec-form" data-spec="${esc(spec.id)}">
    <div class="spec-summary">
      <div><span>P1</span><strong>${esc((p1.lines || []).filter(Boolean).join(' / ') || '未填写')}</strong></div>
      <div><span>P2</span><strong>${esc([p2.left_line1_rest, p2.left_line2, p2.right_prefix, p2.right_highlight].filter(Boolean).join(' / ') || '未填写')}</strong></div>
      <div><span>${isFour ? '背景' : isEvidence ? '证据' : 'P3'}</span><strong>${esc(String(p3.note || p3.bottom || '未填写').replace(/<[^>]*>/g, ''))}</strong></div>
      <div><span>元素</span><strong>${(s.elements || []).length ? esc(s.elements.map(e => e.name).join(' / ')) : '未匹配'}</strong></div>
      <div><span>金句</span><strong>${q.line1 ? esc(q.line1 + q.line2) : '未设置（可选）'}</strong></div>
      <div class="spec-summary-actions"><button class="btn btn-sm" type="button" data-action="gen-quote-candidates" data-spec="${esc(spec.id)}">AI 金句候选</button></div>
    </div>
    <details class="spec-edit"><summary>展开手动修改</summary>
    <details class="spec-section" open>
      <summary>第 1 页 · 大字 + Highlight</summary>
      <div class="spec-grid">
        <div class="field"><label>Kicker</label><input name="p1_kicker" value="${esc(p1.kicker)}"></div>
        <div class="field"><label>Kicker 强调</label><input name="p1_kicker_accent" value="${esc(p1.kicker_accent)}"></div>
        <div class="field"><label>行 1</label><input name="p1_l1" value="${esc(line(0))}"></div>
        <div class="field"><label>行 2（大字）</label><input name="p1_l2" value="${esc(line(1))}"></div>
        <div class="field"><label>行 3</label><input name="p1_l3" value="${esc(line(2))}"></div>
        <div class="field"><label>地址引导</label><input name="p1_addr" value="${esc(p1.addr_label)}"></div>
        <div class="field"><label>Highlight 主词</label><input name="p1_highlight" value="${esc(p1.highlight)}"></div>
        <div class="field"><label>Highlight 拉丁词</label><input name="p1_latin" value="${esc(p1.highlight_latin)}"></div>
        <div class="field wide"><label>英文副标</label><input name="p1_en" value="${esc(p1.en)}"></div>
        <div class="field full"><label>脚注</label><input name="p1_footnote" value="${esc(p1.footnote)}"></div>
        <div class="field"><label>邮票上行</label><input name="p1_stamp1" value="${esc(p1.stamp_line1)}"></div>
        <div class="field"><label>邮票下行</label><input name="p1_stamp2" value="${esc(p1.stamp_line2)}"></div>
        <div class="field"><label class="check-row"><input type="checkbox" name="p1_quote" ${p1.quote_line2 ? 'checked' : ''}> 第 2 行加引号</label></div>
      </div>
    </details>
    <details class="spec-section" open>
      <summary>第 2 页 · 对照 + 结论</summary>
      <div class="spec-grid">
        <div class="field"><label>Kicker</label><input name="p2_kicker" value="${esc(p2.kicker)}"></div>
        <div class="field"><label>Kicker 强调</label><input name="p2_kicker_accent" value="${esc(p2.kicker_accent)}"></div>
        <div class="field"><label>左侧标签</label><input name="p2_left_tag" value="${esc(p2.left_tag)}"></div>
        <div class="field"><label>左侧 Thin</label><input name="p2_left_thin" value="${esc(p2.left_thin)}"></div>
        <div class="field"><label>左侧第一行后缀</label><input name="p2_left_rest" value="${esc(p2.left_line1_rest)}"></div>
        <div class="field"><label>左侧第二行</label><input name="p2_left_line2" value="${esc(p2.left_line2)}"></div>
        <div class="field"><label>左侧印章</label><input name="p2_left_stamp" value="${esc(p2.left_stamp)}"></div>
        <div class="field"><label>右侧标签</label><input name="p2_right_tag" value="${esc(p2.right_tag)}"></div>
        <div class="field"><label>右侧前缀</label><input name="p2_right_prefix" value="${esc(p2.right_prefix)}"></div>
        <div class="field"><label>右侧 Highlight</label><input name="p2_right_highlight" value="${esc(p2.right_highlight)}"></div>
        <div class="field"><label>右侧徽标</label><input name="p2_right_badge" value="${esc(p2.right_badge)}"></div>
        <div class="field"><label>结论小字</label><input name="p2_conclusion_small" value="${esc(p2.conclusion_small)}"></div>
        <div class="field"><label>结论前缀</label><input name="p2_conclusion_prefix" value="${esc(p2.conclusion_prefix)}"></div>
        <div class="field"><label>结论 Highlight</label><input name="p2_conclusion_highlight" value="${esc(p2.conclusion_highlight)}"></div>
        <div class="field full"><label>脚注（允许 &lt;b&gt; / &lt;br&gt;）</label><textarea name="p2_footnote">${esc(p2.footnote)}</textarea></div>
      </div>
    </details>
    ${sfSection}
    <details class="spec-section">
      <summary>第 3 页 · ${isFour ? '背景' : isEvidence ? '证据' : '结论'}</summary>
      <div class="spec-grid">
        <div class="field"><label>${isFour ? '背景标题' : isEvidence ? '证据标题' : '结论标题'}</label><input name="p3_title" value="${esc(p3.title)}"></div>
        <div class="field"><label>${isFour ? '背景引导' : isEvidence ? '证据引导' : '结论引导'}</label><input name="p3_subtitle" value="${esc(p3.subtitle)}"></div>
        <div class="field full"><label>${isFour ? '背景说明' : isEvidence ? '证据说明' : '结论说明'}（允许 &lt;b&gt; / &lt;br&gt;）</label><input name="p3_note" value="${esc(p3.note)}"></div>
        <div class="field full"><label>底部 CTA</label><input name="p3_bottom" value="${esc(p3.bottom)}"></div>
      </div>
    </details>
    <details class="spec-section">
      <summary>金句结尾页（可选）</summary>
      <div class="spec-grid">
        <div class="field full"><label>第一行</label><input name="quote_line1" value="${esc(q.line1 || '')}" placeholder="留空 = 不追加第 4 页，保持 18 秒"></div>
        <div class="field"><label>第二行</label><input name="quote_line2" value="${esc(q.line2 || '')}" placeholder="例如：是地址不行。"></div>
        <div class="field"><label>第二行高亮词</label><input name="quote_highlight" value="${esc(q.highlight || '')}" placeholder="例如：地址"></div>
        <div class="field full"><label>补充说明（允许 &lt;b&gt; / &lt;br&gt;）</label><input name="quote_note" value="${esc(q.note || '')}" placeholder="地址不固定，信就寄不到。"></div>
        <div class="field full"><label>底部 CTA</label><input name="quote_cta" value="${esc(q.cta || '关注 · 领取部署清单<br>把内容送到对的地方')}"></div>
        <div class="field full"><button class="btn btn-sm" type="button" data-action="gen-quote-candidates" data-spec="${esc(spec.id)}">AI 给 3 句金句候选</button><span class="tiny" id="quote-candidate-status">AI 只给候选，你选一句；不会自动覆盖。</span><div id="quote-candidates"></div></div>
        <div class="field full"><span class="tiny">填写第一行后，视频会追加第 4 页金句页，总时长 21 秒；留空则保持 18 秒。</span></div>
      </div>
    </details>
    <details class="spec-section">
      <summary>视频音乐</summary>
      <div class="spec-grid">
        <div class="field"><label>动效</label><select name="motion_preset">
          <option value="flow" ${(s.motion?.preset || 'flow') === 'flow' ? 'selected' : ''}>Flow · 流动</option>
          <option value="strong" ${s.motion?.preset === 'strong' ? 'selected' : ''}>Strong · 强动效</option>
          <option value="none" ${s.motion?.preset === 'none' ? 'selected' : ''}>无动效</option>
        </select></div>
        <div class="field"><label>转场</label><select name="transition_mode">
          <option value="slide" ${(s.motion?.transition?.mode || 'slide') === 'slide' ? 'selected' : ''}>横向推页</option>
          <option value="wipe_up" ${s.motion?.transition?.mode === 'wipe_up' ? 'selected' : ''}>上翻页</option>
          <option value="wipe_down" ${s.motion?.transition?.mode === 'wipe_down' ? 'selected' : ''}>下翻页</option>
        </select></div>
        <div class="field"><label>BGM</label><select name="music">
          <option value="pulse" ${s.music === 'pulse' ? 'selected' : ''}>Pulse 120 · 强节奏</option>
          <option value="minimal" ${s.music === 'minimal' ? 'selected' : ''}>Minimal 80 · 极简</option>
          ${(state.musicLibrary || []).filter(t => !['pulse', 'minimal', 'none'].includes(t.id)).map(t => `<option value="${esc(t.id)}" ${s.music === t.id ? 'selected' : ''}>${esc(t.name)} · ${esc(t.category)}</option>`).join('')}
          <option value="none" ${s.music === 'none' ? 'selected' : ''}>无音乐</option>
        </select></div>
        <div class="field wide"><label>自动选曲依据</label><input value="${esc(s.music_reason || '')}" disabled></div>
        <div class="field full"><label>高级：逐元素运动 JSON（AI 指令标准）</label><textarea name="motion_elements_json" rows="6" placeholder='{"p1-kicker":{"type":"slideY","fromY":30,"toY":0,"start":-0.8,"duration":0.6,"fade":true}}'>${esc(JSON.stringify(s.motion?.elements || {}, null, 2))}</textarea><span class="tiny">留空则使用预设；只允许注册过的元素 ID。</span></div>
      </div>
    </details>
    <details class="spec-section">
      <summary>公众号 · 图文</summary>
      <div class="spec-grid">
        <div class="field wide"><label>文章标题</label><input name="article_title" value="${esc(a.title)}" placeholder="例如：为什么自动化发布，必须住进云里"></div>
        <div class="field"><label>封面大字</label><input name="article_cover_text" value="${esc(a.cover_text)}" placeholder="6–10 个字"></div>
        <div class="field full"><label>摘要 Digest</label><input name="article_digest" value="${esc(a.digest)}" placeholder="一句话，别重复标题"></div>
        <div class="field"><label>系列名</label><input name="article_series_name" value="${esc(a.series?.name || '固定地址 · 自动化发布')}"></div>
        <div class="field"><label>序号（01 / 02）</label><input name="article_series_index" value="${esc(a.series?.index || '01')}"></div>
        <div class="field full"><label>核心句 Lead（会做 Highlight）</label><input name="article_lead" value="${esc(a.lead)}" placeholder="微信只给登记过地址的人寄信。这个地址，叫固定公网 IP。"></div>
        <div class="field full"><label>Highlight 词（逗号分隔）</label><input name="article_highlights" value="${esc((a.highlights || []).join(', '))}" placeholder="登记过地址, 固定公网 IP"></div>
        <div class="field full"><label>可转发的 Quote</label><input name="article_quote" value="${esc(a.quote)}" placeholder="不是工具不行，是地址不行。"></div>
        <div class="field full"><label>开头 Opening</label><textarea name="article_opening" rows="3">${esc(a.opening)}</textarea></div>
        <div class="field"><label>小节 1 标题</label><input name="article_s1h" value="${esc(sec[0]?.heading || '')}"></div>
        <div class="field full"><label>小节 1 正文</label><textarea name="article_s1b" rows="4">${esc(sec[0]?.body || '')}</textarea></div>
        <div class="field"><label>小节 2 标题</label><input name="article_s2h" value="${esc(sec[1]?.heading || '')}"></div>
        <div class="field full"><label>小节 2 正文</label><textarea name="article_s2b" rows="4">${esc(sec[1]?.body || '')}</textarea></div>
        <div class="field"><label>小节 3 标题</label><input name="article_s3h" value="${esc(sec[2]?.heading || '')}"></div>
        <div class="field full"><label>小节 3 正文</label><textarea name="article_s3b" rows="4">${esc(sec[2]?.body || '')}</textarea></div>
        <div class="field full"><label>文末 CTA</label><input name="article_cta" value="${esc(a.cta)}"></div>
      </div>
    </details>
    </details>
    <div class="flex mt-16">
      <button class="btn btn-primary btn-sm" type="submit">保存文案</button>
      <button class="btn btn-sm" type="button" data-action="preview" data-spec="${esc(spec.id)}">生成预览帧</button>
      <button class="btn btn-sm" type="button" data-action="render" data-spec="${esc(spec.id)}">渲染成片</button>
      <span class="tiny">保存后，旧成片会标记为“文案已改”。</span>
    </div>
  </form>`;
}

async function generateQuoteCandidates(specId) {
  const status = $('#quote-candidate-status');
  const box = $('#quote-candidates');
  if (box) box.innerHTML = `<div class="loading-inline"><span class="spinner"></span> 正在生成 3 句候选…</div>`;
  try {
    const r = await post('/api/ai/quote-candidates', { spec_id: specId });
    state.quoteCandidates = r.candidates || [];
    if (!state.quoteCandidates.length) throw new Error('没有生成候选，请重试');
    openModal({
      title: '选择金句',
      subtitle: 'AI 给候选，你选一句；选完自动填入，不会覆盖其他文案。',
      wide: true,
      body: `<div class="quote-candidate-list">${state.quoteCandidates.map((q, i) => `<div class="quote-candidate" data-action="select-quote-candidate" data-index="${i}">
        <span class="tag">候选 ${i + 1}</span>
        <strong>${esc(q.line1)}<br>${esc(q.line2)}</strong>
        ${q.note ? `<p>${esc(q.note)}</p>` : ''}
      </div>`).join('')}</div>`,
      foot: `<button class="btn" data-action="close-modal">取消</button>`
    });
    if (status) status.textContent = `给了 ${state.quoteCandidates.length} 句候选，已弹出选择框。`;
  } catch (err) {
    if (box) box.innerHTML = `<div class="note-box red">${esc(err.message)}</div>`;
    toast(err.message, 'error');
  }
}

function selectQuoteCandidate(index) {
  const q = (state.quoteCandidates || [])[Number(index)];
  const form = $('#spec-form');
  if (!q || !form) return;
  const set = (name, value) => { const el = form.elements[name]; if (el) el.value = value ?? ''; };
  set('quote_line1', q.line1);
  set('quote_line2', q.line2);
  set('quote_highlight', q.highlight);
  set('quote_note', q.note);
  closeModal();
  toast('已填入金句，保存后生效');
}

function renderPanel(render, spec) {
  if (!render) {
    return `<div class="empty"><div class="empty-icon"><svg><use href="#i-play"></use></svg></div><h3>还没有渲染</h3><p>先生成预览，确认排版后再渲染成片。</p>${spec ? `<button class="btn btn-primary btn-sm" data-action="preview" data-spec="${esc(spec.id)}">生成预览帧</button>` : ''}</div>`;
  }
  const previews = render.preview_paths || [];
  const isRunning = ['preview_queued', 'preview_rendering', 'render_queued', 'rendering'].includes(render.status);
  const isStale = render.status === 'stale';
  return `
    <div class="render-head">
      <div class="flex">${statusChip(render.status)}<span class="tiny">${render.duration || 18}s · 1080×1920</span></div>
      <div class="card-actions">
        ${spec ? `<button class="btn btn-sm" data-action="preview" data-spec="${esc(spec.id)}">重新预览</button>` : ''}
        ${spec ? `<button class="btn btn-sm btn-primary" data-action="render" data-spec="${esc(spec.id)}">${render.video_path ? '重新渲染' : '渲染成片'}</button>` : ''}
      </div>
    </div>
    ${isStale ? `<div class="render-error">文案已修改，当前成片是旧版本。重新渲染后再审批。</div>` : ''}
    ${isRunning ? `<div class="mt-12"><div class="progress"><i id="render-progress-bar" style="width:${render.progress || 0}%"></i></div><div class="progress-label"><span id="render-progress-label">${statusLabel(render.status)}</span><span>${render.progress || 0}%</span></div><div class="loading-inline mt-12"><span class="spinner"></span> 正在渲染，页面可以继续开着。<button class="btn btn-sm ml-12" data-action="cancel-render" data-id="${esc(render.id)}">停止</button></div></div>` : ''}
    ${render.video_path && render.status !== 'stale' ? `<div class="video-frame mt-12"><video controls preload="metadata" poster="${esc(media(render.cover_path))}" src="${esc(media(render.video_path))}"></video></div>` : ''}
    ${previews.length ? `<div class="preview-strip mt-12">${previews.map((p, i) => {
      const themeMatch = String(p).match(/preview-theme-([a-z]+)\.png/);
      const label = themeMatch ? ({ archive: 'Archive', terminal: 'Terminal', editorial: 'Editorial', noir: 'Noir', earth: 'Earth' }[themeMatch[1]] || themeMatch[1]) : `P${i + 1}`;
      return `<div class="preview-frame" data-action="open-image" data-src="${esc(media(p))}"><img src="${esc(media(p))}" alt="预览 ${label}"><span>${esc(label)}</span>${themeMatch ? `<button class="btn btn-sm theme-choose" data-action="choose-theme" data-spec="${esc(spec.id)}" data-theme="${esc(themeMatch[1])}">用这个</button>` : ''}</div>`;
    }).join('')}</div>` : ''}
    ${(render.layout_issues || []).length ? `<div class="note-box red mt-12"><strong>排版体检：${render.layout_issues.length} 处可能出界。</strong><div class="preflight-issues mt-8">${render.layout_issues.map(i => `<div class="issue-row critical"><span class="issue-sev">出界</span><div><strong>${esc(i.id)} · ${esc(i.text || '')}</strong><p>${esc(i.reason || '')}</p></div></div>`).join('')}</div><p class="tiny mt-8">先改文案或缩短 Highlight，再重新预览；出界不阻止全片渲染，但建议先修。</p></div>` : ''}
    ${render.error ? `<div class="render-error">${esc(render.error)}</div>` : ''}
    ${render.sha256 ? `<div class="render-note">SHA256 · <span class="mono">${esc(render.sha256.slice(0, 24))}…</span></div>` : ''}`;
}

function timeline(brief, angles, spec, render, pubs) {
  const steps = [
    ['选题', true, '任务书已建立'],
    ['角度', angles.length > 0, angles.length ? `${angles.length} 个角度` : '等待生成'],
    ['文案', Boolean(spec), spec ? `v${spec.version}` : '等待生成'],
    ['成片', render?.status === 'rendered', render ? statusLabel(render.status) : '等待渲染'],
    ['审批', ['approved', 'scheduled', 'published'].includes(brief.status), ['approved', 'scheduled', 'published'].includes(brief.status) ? '已通过' : '等待审批'],
    ['发布', pubs.length > 0, pubs.length ? `${pubs.length} 个任务` : '未创建']
  ];
  const nextIdx = steps.findIndex(s => !s[1]);
  return `<div class="timeline">${steps.map(([label, done, meta], i) => `
    <div class="timeline-item ${done ? 'done' : ''} ${i === nextIdx ? 'active' : ''}">
      <div class="timeline-rail"><i class="timeline-dot"></i>${i < steps.length - 1 ? '<i class="timeline-line"></i>' : ''}</div>
      <div class="timeline-text"><strong>${label}</strong><span>${esc(meta)}</span></div>
    </div>`).join('')}</div>`;
}

function nextStep(brief, angles, spec, render) {
  if (!angles.length) return `<p class="tiny">先生成角度卡，再选一个角度。</p><button class="btn btn-primary btn-sm" data-action="generate-angles" data-id="${esc(brief.id)}">生成角度</button>`;
  if (!spec) return `<p class="tiny">角度已选好，下一步生成三页文案。</p><button class="btn btn-primary btn-sm" data-action="generate-spec" data-id="${esc(brief.id)}">生成文案</button>`;
  if (!render || !render.video_path) return `<p class="tiny">文案可编辑，先生成预览帧确认排版。</p><button class="btn btn-primary btn-sm" data-action="preview" data-spec="${esc(spec.id)}">生成预览</button>`;
  if (render.status === 'rendered') return `<p class="tiny">成片已就绪，去审批台检查事实、合规和渠道信息。</p><a class="btn btn-primary btn-sm" href="#/review/${esc(render.id)}">去审批</a>`;
  if (['approved', 'scheduled', 'published'].includes(brief.status)) return `<p class="tiny">已通过。去发布页创建公众号草稿或视频号发布包。</p><a class="btn btn-primary btn-sm" href="#/publish">去发布</a>`;
  return `<p class="tiny">当前状态：${esc(statusLabel(render.status))}。</p>`;
}

// ---------- library ----------
async function renderLibrary() {
  setNav('library'); setCrumb('工作台 / 成片库');
  const list = await api('/api/library');
  state.library = list;
  const filters = [['all', '全部'], ['rendered', '已渲染'], ['in_review', '待审'], ['approved', '已通过'], ['published', '已发布'], ['stale', '需重渲']];
  const filtered = state.libraryFilter === 'all' ? list : list.filter(r => {
    if (state.libraryFilter === 'in_review') return r.status === 'rendered' || r.status === 'in_review';
    if (state.libraryFilter === 'published') return ['published', 'scheduled', 'ready_for_manual'].includes(r.status);
    return r.status === state.libraryFilter;
  });
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">LIBRARY / 成片库</p><h1 class="page-title">每条成片，都有版本和回执。</h1><p class="page-sub">不是网盘文件夹。每条视频绑定 Spec、来源、审批记录和发布任务。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="new-brief">+ 新建选题</button></div>
    </div>
    <div class="filter-tabs">${filters.map(([k, l]) => `<button class="${state.libraryFilter === k ? 'active' : ''}" data-filter-library="${k}">${l}</button>`).join('')}</div>
    ${filtered.length ? `<div class="library-grid">${filtered.map(r => {
      const isVibe = r.engine === 'vibemotion';
      const foot = isVibe
        ? `<a class="btn btn-sm" href="${esc(r.media_video)}" target="_blank" rel="noreferrer">播放</a>${r.review_state === 'approved' ? '' : `<button class="btn btn-sm ${r.review_state ? '' : 'btn-primary'}" data-action="vtask-review" data-id="${esc(r.id)}" data-decision="approved">通过</button><button class="btn btn-sm" data-action="vtask-review" data-id="${esc(r.id)}" data-decision="changes_requested">退回</button>`}`
        : `<a class="btn btn-sm" href="#/brief/${esc(r.brief_id)}">详情</a>${r.video_path ? `<a class="btn btn-sm ${r.status === 'rendered' ? 'btn-primary' : ''}" href="#/review/${esc(r.id)}">${r.status === 'rendered' ? '审看' : '打开'}</a>` : ''}`;
      return `
      <div class="card content-card">
        <div class="content-cover">
          ${coverImg(r.media_cover, r.brief_title)}
          <span class="cover-status">${libStatusChip(r)}</span>
          <span class="duration">${r.duration || 18}s · ${isVibe ? modeLabel(r.mode) : 'v' + r.spec_version}</span>
        </div>
        <div class="content-body">
          <div class="content-title">${esc(r.brief_title)}</div>
          <div class="content-desc">${esc(truncate(r.brief_topic || '', 64))}${isVibe ? `<span class="tag">${esc(engineLabel(r.engine))} · ${esc(modeLabel(r.mode))}</span>` : ''}</div>
          <div class="content-meta"><span>${fmtDate(r.updated_at)}</span><span>${r.video_path ? 'MP4' : '无成片'}</span></div>
          <div class="content-foot">${foot}</div>
        </div>
      </div>`;
    }).join('')}</div>` : `<div class="empty"><div class="empty-icon"><svg><use href="#i-library"></use></svg></div><h3>这个筛选下还没有内容</h3><p>从选题开始，先生成一条 18 秒的三页视频。</p><button class="btn btn-primary btn-sm" data-action="new-brief">新建选题</button></div>`}`;
}

// ---------- review list ----------
async function renderReviewList() {
  setNav('review'); setCrumb('工作台 / 审批');
  const list = await api('/api/library');
  const pending = list.filter(r => r.status === 'rendered');
  const approved = list.filter(r => r.status === 'approved');
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">REVIEW / 审批</p><h1 class="page-title">先看事实，再看画面。</h1><p class="page-sub">审批绑定成片 hash。任何文案修改都会生成新版本，旧审批自动失效。</p></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><div><h2 class="section-title">待审批 <span class="muted tiny">${pending.length}</span></h2><p class="section-sub">已渲染、等待你拍板。</p></div></div>
        <div class="card-body">
          ${pending.length ? `<div class="task-list">${pending.map(r => `
            <div class="task-row">
              ${coverImg(r.media_cover, r.brief_title, 'task-cover')}
              <div class="task-main"><div class="task-title">${esc(r.brief_title)}</div><div class="task-meta">${r.engine === 'vibemotion' ? modeLabel(r.mode) : 'v' + r.spec_version} · ${fmtDate(r.updated_at)}</div></div>
              <div class="task-actions">${r.engine === 'vibemotion'
                ? `<button class="btn btn-sm btn-primary" data-action="vtask-review" data-id="${esc(r.id)}" data-decision="approved">通过</button><button class="btn btn-sm" data-action="vtask-review" data-id="${esc(r.id)}" data-decision="changes_requested">退回</button>`
                : `<a class="btn btn-sm btn-primary" href="#/review/${esc(r.id)}">审看</a>`}</div>
            </div>`).join('')}</div>` : `<div class="empty"><div class="empty-icon">✓</div><h3>没有待审内容</h3><p>去选题里生成一条新视频，渲染完成后会出现在这里。</p><a class="btn btn-sm" href="#/briefs">去选题</a></div>`}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2 class="section-title">最近通过 <span class="muted tiny">${approved.length}</span></h2><p class="section-sub">可以创建发布任务。</p></div></div>
        <div class="card-body">
          ${approved.length ? `<div class="task-list">${approved.slice(0, 6).map(r => `
            <div class="task-row">
              ${coverImg(r.media_cover, r.brief_title, 'task-cover')}
              <div class="task-main"><div class="task-title">${esc(r.brief_title)}</div><div class="task-meta">已通过 · ${fmtDate(r.updated_at)}</div></div>
              <div class="task-actions"><a class="btn btn-sm" href="#/publish">发布</a></div>
            </div>`).join('')}</div>` : `<div class="empty"><h3>还没有通过的成片</h3><p>审批通过后会出现在这里。</p></div>`}
        </div>
      </div>
    </div>`;
}

// ---------- review detail ----------
function preflightCard(render) {
  const p = render.preflight;
  if (!p && !render.preflight_status) {
    return `<div class="card preflight-card">
      <div class="card-head"><div><h2 class="section-title">机器预检</h2><p class="section-sub">抽关键帧检查静态错位；视觉问题只警告，不替你通过。</p></div><span class="tag">未预检</span></div>
      <div class="card-body"><div class="note-box">旧成片没有预检记录。可以现在跑一次，不会自动改任何配置。</div><button class="btn btn-sm mt-12" data-action="preflight" data-id="${esc(render.id)}">运行机器预检</button></div>
    </div>`;
  }
  if (render.preflight_status === 'running') {
    return `<div class="card preflight-card">
      <div class="card-head"><div><h2 class="section-title">机器预检</h2><p class="section-sub">正在抽帧并检查画面。</p></div><span class="tag">检查中</span></div>
      <div class="card-body"><div class="loading-inline"><span class="spinner"></span> 正在抽 9 帧并让视觉模型看画面，约 30–60 秒。</div></div>
    </div>`;
  }
  if (!p) return '';
  const status = p.status || 'warn';
  const label = status === 'pass' ? '通过' : status === 'block' ? '有硬错误' : '有警告';
  const tone = status === 'pass' ? 'lime' : status === 'block' ? 'red' : '';
  const issues = p.issues || [];
  const frames = p.frames || [];
  return `<div class="card preflight-card">
    <div class="card-head"><div><h2 class="section-title">机器预检</h2><p class="section-sub">机器看静态错位；动态节奏和最终判断仍由人负责。</p></div><span class="tag ${tone}">${label}</span></div>
    <div class="card-body">
      ${frames.length ? `<div class="preflight-frames">${frames.map(f => `<div class="preflight-frame" data-action="open-image" data-src="${esc(media(f.path))}"><img src="${esc(media(f.path))}" alt="${esc(f.label)}"><span>${f.time}s</span></div>`).join('')}</div>` : ''}
      <div class="preflight-tech">
        <span>${p.technical?.width || '—'}×${p.technical?.height || '—'}</span>
        <span>${p.technical?.duration ? Number(p.technical.duration).toFixed(1) + 's' : '—'}</span>
        <span>${p.technical?.audio ? '有音轨' : '无音轨'}</span>
        <span>${p.vision?.status === 'done' ? '视觉已检查' : p.vision?.status === 'skipped' ? '视觉未检查' : '视觉失败'}</span>
      </div>
      ${issues.length ? `<div class="preflight-issues">${issues.map(x => `<div class="issue-row ${x.severity === 'critical' ? 'critical' : ''}"><span class="issue-sev">${x.severity === 'critical' ? '硬错误' : '警告'}</span><div><strong>${x.frame ? `第 ${x.frame} 帧 · ` : ''}${esc(x.message)}</strong>${x.suggest ? `<p>${esc(x.suggest)}</p>` : ''}</div></div>`).join('')}</div>` : `<div class="note-box"><strong>没有发现明显静态问题。</strong> 仍然需要完整看一遍动态效果。</div>`}
      <div class="flex mt-12"><button class="btn btn-sm" data-action="preflight" data-id="${esc(render.id)}">重新预检</button><span class="tiny">视觉问题只警告，不阻止人工通过；技术硬错误会标红。</span></div>
    </div>
  </div>`;
}

async function renderReviewDetail(id) {
  setNav('review'); setCrumb('工作台 / 审批 / 审看');
  const data = await api('/api/renders/' + encodeURIComponent(id));
  const { render, brief, spec, review, publications, banned_hits: bannedHits = [] } = data;
  const checks = [
    ['facts', '事实有出处', '每个关键结论都能在资料源里找到'],
    ['platform', '平台规则已核对', '公众号 / 视频号的限制没有被夸大'],
    ['compliance', '无绝对化 / 违规表述', '没有“保证”“一定”“百分百”这类承诺'],
    ['assets', '音乐 / 字体可商用', '当前模板使用合成 BGM + OFL 字体'],
    ['metadata', '标题 / 封面 / 描述齐全', '发布包里的元数据可以直接用']
  ];
  if (brief.structure_name) {
    checks.unshift(['structure', '结构未越界', `围绕「${brief.structure_name}」展开，没有中途换比喻`]);
  }
  const isApproved = Boolean(review && review.decision === 'approved');
  const specJson = spec?.spec_json || {};
  const meta = specJson._meta || {};
  const knowledgeRefs = meta.knowledge || [];
  const analogyRefs = meta.analogies || [];
  const article = specJson.article || {};
  const secondaryArticle = article.secondary || {};
  $('#view').innerHTML = `
    <div class="detail-head">
      <div>
        <a class="back" href="#/review"><svg><use href="#i-arrow"></use></svg> 返回审批</a>
        <h1 class="detail-title">${esc(brief.title)}</h1>
        <p class="detail-sub">${esc(brief.topic)}</p>
        <div class="flex mt-12">${statusChip(render.status)}${statusChip(brief.status)}<span class="tiny">SHA256 ${esc((render.sha256 || '').slice(0, 16))}…</span></div>
      </div>
      <div class="head-actions">
        <a class="btn" href="#/brief/${esc(brief.id)}">查看选题</a>
        ${isApproved ? `<a class="btn btn-primary" href="#/publish">去发布</a>` : ''}
      </div>
    </div>

    <div class="review-grid">
      <div class="review-left">
        <div class="review-video">
          ${render.video_path ? `<video controls preload="metadata" poster="${esc(media(render.cover_path))}" src="${esc(media(render.video_path))}"></video>` : `<div class="no-video">还没有成片</div>`}
        </div>
        ${(render.preview_paths || []).length ? `<div class="review-thumbs">${render.preview_paths.map((p, i) => `<img src="${esc(media(p))}" data-action="open-image" data-src="${esc(media(p))}" alt="第 ${i + 1} 页">`).join('')}</div>` : ''}
        <div class="review-meta mt-16">${(brief.channels || []).map(c => `<span class="channel-badge ${c}">${c === 'wechat_article' ? '公众号' : '视频号'}</span>`).join('')}<span class="tag">${render.duration || 18}s · 1080×1920</span><span class="tag">v${spec?.version || 1}</span></div>
        ${bannedHits.length ? `<div class="note-box red mt-12"><strong>命中禁用表达：</strong>${bannedHits.map(esc).join('、')}。建议退回修改，或确认这是有意保留。</div>` : ''}
        <div class="review-quote">${esc(specJson.page1?.footnote || '')}</div>
      </div>

      <div class="stack">
        ${preflightCard(render)}
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">审批清单</h2><p class="section-sub">全部勾选后才能通过。审批记录会绑定当前成片 hash。</p></div></div>
          <div class="card-body">
            <div class="checklist">
              ${checks.map(([k, t, d]) => `<label class="check-item"><input type="checkbox" data-check="${k}"><div>${t}<small>${d}</small></div></label>`).join('')}
            </div>
            <div class="field mt-12"><label>批注（退回时写清楚要改什么）</label><textarea id="review-comment" placeholder="例如：第 2 页结论不够具体，补一句“NAS 替代不了”。"></textarea></div>
            <div class="review-actions">
              <button class="btn btn-danger" data-action="review-return" data-id="${esc(render.id)}" ${isApproved ? 'disabled' : ''}>退回修改</button>
              <button class="btn btn-primary" data-action="review-approve" data-id="${esc(render.id)}" ${isApproved ? 'disabled' : ''}>${isApproved ? '已通过' : '通过'}</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">来源</h2><p class="section-sub">审片时顺手核对，不用切后台。</p></div></div>
          <div class="card-body">
            ${(brief.sources || []).length ? brief.sources.map(s => `<div class="source-row"><div class="source-main"><div class="source-title">${esc(s.title)}</div><div class="source-excerpt">${esc(s.excerpt)}</div></div></div>`).join('') : '<p class="tiny">这条选题没有资料源。</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">知识库引用</h2><p class="section-sub">生成这条文案时实际用了哪些片段。</p></div></div>
          <div class="card-body">
            ${knowledgeRefs.length ? `<div class="knowledge-results">${knowledgeRefs.map((k, i) => `<div class="knowledge-result"><div class="knowledge-result-head"><span class="tag lime">K${i + 1}</span><strong>${esc(k.title)}</strong></div><p>${esc(k.snippet || '')}</p></div>`).join('')}</div>` : `<div class="note-box red"><strong>这一版没有绑定知识库引用。</strong> 可能是旧版本，或者生成时知识库为空。审批前建议重新生成文案，或人工确认来源。</div>`}
            ${analogyRefs.length ? `<div class="divider"></div><div class="tiny">使用的类比</div><div class="tag-row mt-12">${analogyRefs.map(a => `<span class="tag">${esc(a.title)}</span>`).join('')}</div>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">公众号图文</h2><p class="section-sub">群发前先看这一版，不是视频字幕的复制。</p></div></div>
          <div class="card-body">
            ${article.title ? `<div class="article-preview">
              ${article.series?.name ? `<div class="article-series">${esc(article.series.name)} / ${esc(article.series.index || '01')}${article.series.total ? ` OF ${esc(article.series.total)}` : ''}</div>` : ''}
              <h3>${esc(article.title)}</h3>
              <p class="article-digest">${esc(article.digest || '')}</p>
              ${article.lead ? `<div class="article-lead">${hlText(article.lead, article.highlights || [])}</div>` : ''}
              <p class="article-opening">${esc(article.opening || '')}</p>
              ${(article.sections || []).map((s, i) => `<div class="article-section"><h4><span>0${i + 1}</span>${esc(s.heading || '')}</h4><p>${esc(s.body || '').replaceAll('\n', '<br>')}</p></div>`).join('')}
              ${article.quote ? `<blockquote class="article-quote">${hlText(article.quote, article.highlights || [])}</blockquote>` : ''}
              ${article.cta ? `<p class="article-cta">${esc(article.cta)}</p>` : ''}
              ${secondaryArticle.title ? `<div class="article-secondary-preview">
                <div class="article-series">${esc(secondaryArticle.series?.name || '配套清单')} / ${esc(secondaryArticle.series?.index || '02')}</div>
                <h4>${esc(secondaryArticle.title)}</h4>
                <p>${esc(secondaryArticle.digest || '')}</p>
                ${secondaryArticle.companion_note ? `<p class="tiny">${esc(secondaryArticle.companion_note)}</p>` : ''}
              </div>` : ''}
            </div>` : `<div class="note-box red"><strong>这一版没有公众号图文。</strong> 旧版本或生成时未包含文章；重新生成文案，或先在文案编辑器里补上。</div>`}
          </div>
        </div>

        ${review ? `<div class="card"><div class="card-head"><div><h2 class="section-title">审批记录</h2></div></div><div class="card-body"><div class="flex">${statusChip(review.decision)}<span class="tiny">${fmtDate(review.created_at)} · ${esc(review.reviewer)}</span></div>${review.comment ? `<p class="tiny mt-12">${esc(review.comment)}</p>` : ''}</div></div>` : ''}

        ${isApproved ? `<div class="card"><div class="card-head"><div><h2 class="section-title">发布</h2><p class="section-sub">已通过，可以创建发布任务。</p></div></div><div class="card-body"><div class="grid-2" style="grid-template-columns:repeat(3,1fr)"><button class="btn btn-primary" data-action="create-kit" data-render="${esc(render.id)}" data-channel="wechat_channels">视频号发布包</button><button class="btn" data-action="create-kit" data-render="${esc(render.id)}" data-channel="wechat_article">公众号任务</button><button class="btn" data-action="create-kit" data-render="${esc(render.id)}" data-channel="xiaohongshu">小红书任务</button></div></div></div>` : ''}
      </div>
    </div>`;
}

// ---------- publish ----------
async function renderPublish() {
  setNav('publish'); setCrumb('工作台 / 发布');
  const s = state.settings || await api('/api/settings');
  state.settings = s;
  const acctMap = Object.fromEntries((s.wechat_accounts || []).map(a => [a.id, a]));
  const accountBadge = (p) => p.channel === 'wechat_article' && p.account_id && acctMap[p.account_id]
    ? `<span class="wx-badge" style="--wx:${esc(acctMap[p.account_id].color || '#C73520')}">● ${esc(acctMap[p.account_id].name)}</span>`
    : '';
  const [library, queue] = await Promise.all([api('/api/library'), api('/api/publish/queue')]);
  const approved = library.filter(r => r.status === 'approved');
  const existingIds = new Set(queue.map(q => q.render_id));
  const todo = approved.filter(r => r.engine !== 'vibemotion' && !existingIds.has(r.id));
  const pendingQueue = queue.filter(q => !['published'].includes(q.status));
  const doneQueue = queue.filter(q => q.status === 'published');
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">PUBLISH / 发布</p><h1 class="page-title">公众号自动，视频号最后一下。</h1><p class="page-sub">公众号走官方 API 草稿/发布；视频号生成发布包，运营确认后回填链接。每个任务都有幂等键和回执。</p></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><div><h2 class="section-title">待创建任务 <span class="muted tiny">${todo.length}</span></h2><p class="section-sub">已通过审批，还没选渠道。</p></div></div>
        <div class="card-body">
          ${todo.length ? `<div class="pub-list">${todo.map(r => `
            <div class="pub-row">
              ${coverImg(r.cover_path, r.brief_title, 'pub-cover')}
              <div class="pub-main"><div class="pub-title">${esc(r.brief_title)}</div><div class="pub-meta"><span>v${r.spec_version}</span><span>${fmtDate(r.updated_at)}</span></div></div>
              <div class="pub-actions"><button class="btn btn-sm btn-primary" data-action="create-kit" data-render="${esc(r.id)}" data-channel="wechat_channels">视频号包</button><button class="btn btn-sm" data-action="create-kit" data-render="${esc(r.id)}" data-channel="xiaohongshu">小红书包</button><button class="btn btn-sm" data-action="create-kit" data-render="${esc(r.id)}" data-channel="wechat_article">公众号</button></div>
            </div>`).join('')}</div>` : `<div class="empty"><div class="empty-icon">✓</div><h3>没有待创建任务</h3><p>审批通过一条成片后，这里会出现渠道按钮。</p><a class="btn btn-sm" href="#/review">去审批</a></div>`}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2 class="section-title">队列 <span class="muted tiny">${pendingQueue.length}</span></h2><p class="section-sub">公众号草稿 / 视频号人工发布。</p></div></div>
        <div class="card-body">
          ${pendingQueue.length ? `<div class="pub-list">${pendingQueue.map(p => p.engine === 'vibemotion' ? `
            <div class="pub-row">
              ${coverImg(p.media_cover, p.title, 'pub-cover')}
              <div class="pub-main"><div class="pub-title">${esc(p.title)}</div><div class="pub-meta"><span class="channel-badge ${esc(p.channel)}">${p.channel === 'wechat_channels' ? '视频号' : '公众号'}</span><span class="tag">VibeMotion</span>${statusChip(p.status)}<span>${fmtDate(p.updated_at || p.created_at)}</span></div></div>
              <div class="pub-actions"><a class="btn btn-sm" href="${esc(p.kit_video)}" target="_blank" rel="noreferrer">发布包</a></div>
            </div>` : `
            <div class="pub-row">
              ${coverImg(p.media_cover, p.title, 'pub-cover')}
              <div class="pub-main"><div class="pub-title">${esc(p.title)}</div><div class="pub-meta"><span class="channel-badge ${p.channel}">${p.channel === 'wechat_channels' ? '视频号' : (p.channel === 'xiaohongshu' ? '小红书' : '公众号')}</span>${accountBadge(p)}${statusChip(p.status)}<span>${fmtDate(p.scheduled_at || p.created_at)}</span></div></div>
              <div class="pub-actions">
                ${p.channel === 'wechat_article'
                  ? (['draft_created', 'publishing'].includes(p.status)
                    ? `<a class="btn btn-sm" href="https://mp.weixin.qq.com/" target="_blank" rel="noreferrer">打开后台</a><button class="btn btn-sm btn-primary" data-action="mark-published" data-id="${esc(p.id)}">标记已发布</button>`
                    : `<button class="btn btn-sm btn-primary" data-action="publish-wechat" data-id="${esc(p.id)}">${p.status === 'dry_run' ? '重新 Dry-run' : '创建草稿'}</button>`)
                  : `<button class="btn btn-sm btn-primary" data-action="mark-published" data-id="${esc(p.id)}">标记已发布</button>`}
                <a class="btn btn-sm" href="/kits/${esc(p.render_id)}-${esc(p.channel)}/video.mp4" target="_blank" rel="noreferrer">发布包</a>
              </div>
            </div>`).join('')}</div>` : `<div class="empty"><h3>队列是空的</h3><p>创建视频号发布包或公众号任务后，会出现在这里。</p></div>`}
        </div>
      </div>
    </div>

    <div class="card mt-16">
      <div class="card-head"><div><h2 class="section-title">已发布 <span class="muted tiny">${doneQueue.length}</span></h2><p class="section-sub">回执和链接都在这里。</p></div></div>
      <div class="card-body">
        ${doneQueue.length ? `<div class="pub-list">${doneQueue.map(p => p.engine === 'vibemotion' ? `
          <div class="pub-row">
            ${coverImg(p.cover_path, p.title, 'pub-cover')}
            <div class="pub-main"><div class="pub-title">${esc(p.title)}</div><div class="pub-meta"><span class="channel-badge ${esc(p.channel)}">${p.channel === 'wechat_channels' ? '视频号' : '公众号'}</span><span class="tag">VibeMotion</span>${statusChip('published')}<span>${fmtDate(p.updated_at || p.created_at)}</span></div></div>
            <div class="pub-actions">${statusChip('published')}</div>
          </div>` : `
          <div class="pub-row">
            ${coverImg(p.cover_path, p.title, 'pub-cover')}
            <div class="pub-main"><div class="pub-title">${esc(p.title)}</div><div class="pub-meta"><span class="channel-badge ${p.channel}">${p.channel === 'wechat_channels' ? '视频号' : (p.channel === 'xiaohongshu' ? '小红书' : '公众号')}</span>${accountBadge(p)}<span>${fmtDate(p.updated_at)}</span>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noreferrer">打开链接</a>` : ''}</div></div>
            <div class="pub-actions">${statusChip('published')}</div>
          </div>`).join('')}</div>` : '<p class="tiny mb-0">还没有已发布内容。</p>'}
      </div>
    </div>`;
}

// ---------- WeChat account workspace ----------
async function renderWechatWorkspace(accountId = '') {
  setNav('wechat'); setCrumb('工作台 / 账号');
  const settings = state.settings || await api('/api/settings');
  state.settings = settings;
  const accounts = settings.wechat_accounts || [];
  const current = accounts.find(a => a.id === accountId)
    || accounts.find(a => a.channel === 'wechat_article' && a.is_default)
    || accounts.find(a => a.channel === 'wechat_article')
    || accounts[0];
  if (!current) {
    $('#view').innerHTML = `<div class="page-head"><div><p class="eyebrow">ACCOUNT / 账号</p><h1 class="page-title">先添加一个渠道账号。</h1><p class="page-sub">公众号和视频号都可以有自己的独立内容空间。</p></div><div class="head-actions"><a class="btn btn-primary" href="#/settings">去设置添加</a></div></div>`;
    return;
  }
  const isVideo = current.channel === 'wechat_channels';
  const typeLabel = isVideo ? '视频号' : '公众号';
  const queue = await api('/api/publish/queue');
  const mine = queue.filter(p => p.channel === current.channel && p.account_id === current.id);
  const allBriefs = await api('/api/briefs');
  const myBriefs = allBriefs.filter(b => b.account_id === current.id);
  const drafts = mine.filter(p => ['scheduled', 'dry_run', 'draft_created'].includes(p.status) || (isVideo && p.status === 'ready_for_manual'));
  const publishing = mine.filter(p => p.status === 'publishing');
  const published = mine.filter(p => p.status === 'published');
  const label = (p) => p.status === 'ready_for_manual' ? '发布包' : p.status === 'draft_created' ? '草稿已建' : p.status === 'dry_run' ? 'Dry-run' : p.status === 'scheduled' ? '待创建' : p.status === 'publishing' ? '发布中' : '已发布';
  const row = (p, actions = '') => `
    <div class="wx-content-row">
      ${coverImg(p.cover_path, p.title, 'wx-content-cover')}
      <div class="wx-content-main">
        <div class="wx-content-title">${esc(p.title)}</div>
        <div class="wx-content-meta"><span class="wx-badge" style="--wx:${esc(current.color || '#C73520')}">● ${esc(current.name)}</span><span>${label(p)}</span><span>${fmtDate(p.updated_at || p.created_at)}</span></div>
      </div>
      <div class="wx-content-actions">${actions}</div>
    </div>`;
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">ACCOUNT / 账号</p><h1 class="page-title">一个账号，一个内容空间。</h1><p class="page-sub">选题、草稿、发布、已发布都按账号隔离；公众号和视频号各自独立。</p></div>
      <div class="head-actions"><button class="btn" data-action="add-wechat-account">+ 新增账号</button><a class="btn" href="#/settings">账号设置</a></div>
    </div>

    <div class="wx-switcher">
      ${accounts.map(a => `<button class="wx-switch ${a.id === current.id ? 'active' : ''}" type="button" data-action="switch-wechat-account" data-id="${esc(a.id)}"><span class="wx-dot" style="background:${esc(a.color || '#C73520')}"></span><strong>${esc(a.name)}</strong><small>${a.platform === 'xiaohongshu' ? '小红书' : a.platform === 'douyin' ? '抖音' : a.platform === 'wechat_channels' ? '视频号' : '公众号'}</small>${a.is_default ? '<small>默认</small>' : ''}</button>`).join('')}
    </div>

    <div class="wx-hero" style="--wx:${esc(current.color || '#C73520')}">
      <div class="wx-hero-mark"></div>
      <div class="wx-hero-main">
        <div class="wx-hero-kicker">当前${typeLabel}</div>
        <h2>${esc(current.name)}</h2>
        <div class="wx-hero-sub">${isVideo ? '视频号 · 人工发布空间' : `${esc(current.appid)} · ${current.secret_set ? 'Secret 已保存' : '未配置 Secret'}${current.dry_run ? ' · Dry-run' : ''}`}</div>
      </div>
      <div class="wx-hero-actions">
        ${isVideo ? `<a class="btn btn-sm" href="#/publish">发布包</a>` : `<button class="btn btn-sm" data-action="test-wechat" data-id="${esc(current.id)}">测试连接</button>`}
        <button class="btn btn-sm" data-action="edit-wechat-account" data-id="${esc(current.id)}">编辑账号</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat"><div class="stat-label">账号选题</div><div class="stat-value">${myBriefs.length}</div><div class="stat-foot">只属于这个${typeLabel}</div></div>
      <div class="stat"><div class="stat-label">草稿箱</div><div class="stat-value">${drafts.length}</div><div class="stat-foot">待创建 / 已建草稿</div></div>
      <div class="stat"><div class="stat-label">发布中</div><div class="stat-value">${publishing.length}</div><div class="stat-foot">已提交或等待回执</div></div>
      <div class="stat ok"><div class="stat-label">已发布</div><div class="stat-value">${published.length}</div><div class="stat-foot">这个账号的发布记录</div></div>
    </div>

    <div class="card mt-16">
      <div class="card-head"><div><h2 class="section-title">这个账号的选题 <span class="muted tiny">${myBriefs.length}</span></h2><p class="section-sub">选题、文案、成片都从这里进入，不会串到别的账号。</p></div><button class="btn btn-sm" data-action="new-brief-account" data-id="${esc(current.id)}">+ 新建选题</button></div>
      <div class="card-body">
        ${myBriefs.length ? `<div class="wx-brief-list">${myBriefs.map(b => `
          <a class="wx-brief-row" href="#/brief/${esc(b.id)}">
            <span class="wx-dot" style="background:${esc(current.color || '#C73520')}"></span>
            <span class="wx-brief-main"><strong>${esc(b.title)}</strong><small>${statusLabel(b.status)} · ${fmtDate(b.updated_at)}</small></span>
            <span class="wx-brief-go">打开 →</span>
          </a>`).join('')}</div>` : '<p class="tiny mb-0">这个账号还没有选题。点右上角新建，系统会自动绑定当前账号。</p>'}
      </div>
    </div>

    <div class="grid-2 mt-16">
      <div class="card">
        <div class="card-head"><div><h2 class="section-title">${isVideo ? '发布包' : '草稿箱'} <span class="muted tiny">${drafts.length}</span></h2><p class="section-sub">${isVideo ? '视频号没有官方发布 API，先生成发布包，再手动上传。' : '还没发出去的内容。创建草稿后仍留在这里。'}</p></div></div>
        <div class="card-body">
          ${drafts.length ? `<div class="wx-content-list">${drafts.map(p => row(p, isVideo
            ? `<a class="btn btn-sm" href="/kits/${esc(p.render_id)}-wechat_channels/video.mp4" target="_blank" rel="noreferrer">发布包</a><button class="btn btn-sm btn-primary" data-action="mark-published" data-id="${esc(p.id)}">标记已发布</button>`
            : (p.status === 'draft_created' ? `<a class="btn btn-sm" href="https://mp.weixin.qq.com/" target="_blank" rel="noreferrer">后台</a><button class="btn btn-sm btn-primary" data-action="mark-published" data-id="${esc(p.id)}">标记已发布</button>` : `<button class="btn btn-sm btn-primary" data-action="publish-wechat" data-id="${esc(p.id)}">${p.status === 'dry_run' ? '重新 Dry-run' : '创建草稿'}</button>`))).join('')}</div>` : `<p class="tiny mb-0">这个账号还没有${isVideo ? '发布包' : '草稿'}。</p>`}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2 class="section-title">已发布 <span class="muted tiny">${published.length}</span></h2><p class="section-sub">这个账号发出去的内容。</p></div></div>
        <div class="card-body">
          ${published.length ? `<div class="wx-content-list">${published.map(p => row(p, `${p.url ? `<a class="btn btn-sm" href="${esc(p.url)}" target="_blank" rel="noreferrer">打开链接</a>` : ''}`)).join('')}</div>` : '<p class="tiny mb-0">还没有发布记录。</p>'}
        </div>
      </div>
    </div>
  `;
}

async function renderAccountGroupWorkspace(groupId = '') {
  setNav('wechat'); setCrumb('工作台 / 账号');
  const settings = state.settings || await api('/api/settings');
  state.settings = settings;
  const groups = settings.account_groups || [];
  const accounts = settings.wechat_accounts || [];
  const current = groups.find(g => g.id === groupId)
    || groups.find(g => g.is_default)
    || groups[0];
  if (!current) {
    $('#view').innerHTML = `<div class="page-head"><div><p class="eyebrow">ACCOUNT / 账号</p><h1 class="page-title">先添加一个账号组。</h1><p class="page-sub">一个账号组 = 一个品牌，下面挂公众号和视频号。</p></div><div class="head-actions"><a class="btn btn-primary" href="#/settings">去设置添加</a></div></div>`;
    return;
  }
  const channels = current.channels?.length ? current.channels : accounts.filter(a => a.group_id === current.id);
  const typeName = (c) => c.platform === 'xiaohongshu' ? '小红书' : c.platform === 'douyin' ? '抖音' : c.platform === 'wechat_channels' ? '视频号' : '公众号';
  const channelIds = new Set(channels.map(c => c.id));
  const allBriefs = await api('/api/briefs');
  const myBriefs = allBriefs.filter(b => b.group_id === current.id || channelIds.has(b.account_id));
  const queue = await api('/api/publish/queue');
  const mine = queue.filter(p => channelIds.has(p.account_id));
  const pubChannel = (p) => channels.find(c => c.id === p.account_id) || accounts.find(c => c.id === p.account_id) || {};
  const articleDrafts = mine.filter(p => p.channel === 'wechat_article' && ['scheduled', 'dry_run', 'draft_created'].includes(p.status));
  const videoDrafts = mine.filter(p => p.channel === 'wechat_channels' && p.status === 'ready_for_manual');
  const published = mine.filter(p => p.status === 'published');
  const pubRow = (p, actions = '') => {
    const ch = pubChannel(p);
    const type = p.platform === 'xiaohongshu' ? '小红书' : p.platform === 'douyin' ? '抖音' : p.platform === 'wechat_channels' ? '视频号' : '公众号';
    return `<div class="wx-content-row">
      ${coverImg(p.cover_path, p.title, 'wx-content-cover')}
      <div class="wx-content-main">
        <div class="wx-content-title">${esc(p.title)}</div>
        <div class="wx-content-meta"><span class="wx-badge" style="--wx:${esc(ch.color || current.color || '#C73520')}">● ${esc(ch.name || type)}</span><span>${type}</span><span>${p.status === 'draft_created' ? '草稿已建' : p.status === 'dry_run' ? 'Dry-run' : p.status === 'ready_for_manual' ? '发布包' : p.status === 'publishing' ? '发布中' : p.status === 'scheduled' ? '待创建' : '已发布'}</span><span>${fmtDate(p.updated_at || p.created_at)}</span></div>
      </div><div class="wx-content-actions">${actions}</div>
    </div>`;
  };
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">ACCOUNT / 账号组</p><h1 class="page-title">一个品牌，一个内容空间。</h1><p class="page-sub">一个账号组下挂公众号和视频号；选题共用，发布渠道分开。</p></div>
      <div class="head-actions"><button class="btn" data-action="add-channel" data-group="${esc(current.id)}">+ 添加渠道</button><a class="btn" href="#/settings">账号设置</a></div>
    </div>
    <div class="wx-switcher">
      ${groups.map(g => `<button class="wx-switch ${g.id === current.id ? 'active' : ''}" type="button" data-action="switch-account-group" data-id="${esc(g.id)}"><span class="wx-dot" style="background:${esc(g.color || '#C73520')}"></span><strong>${esc(g.name)}</strong>${g.is_default ? '<small>默认</small>' : ''}<small>${(g.channels || []).length} 渠道</small></button>`).join('')}
    </div>
    <div class="wx-hero" style="--wx:${esc(current.color || '#C73520')}">
      <div class="wx-hero-mark"></div>
      <div class="wx-hero-main">
        <div class="wx-hero-kicker">当前账号组</div>
        <h2>${esc(current.name)}</h2>
        <div class="wx-hero-sub">${esc(current.description || '公众号 + 视频号')} · ${channels.length} 个渠道</div>
      </div>
      <div class="wx-hero-actions"><button class="btn btn-sm" data-action="edit-account-group" data-id="${esc(current.id)}">编辑账号组</button></div>
    </div>
    <div class="wx-channel-grid">
      ${channels.map(c => `<div class="wx-channel-card" style="--wx:${esc(c.color || current.color || '#C73520')}">
        <div class="wx-channel-top"><span class="wx-dot" style="background:${esc(c.color || current.color || '#C73520')}"></span><strong>${typeName(c)}</strong>${c.is_default ? '<span class="tag">默认</span>' : ''}</div>
        <div class="wx-channel-name">${esc(c.name)}</div>
        <div class="wx-channel-sub">${c.platform === 'wechat_article' ? `${esc(c.appid || '')} · ${c.secret_set ? 'Secret 已保存' : '未配置 Secret'}` : (c.provider === 'yixiaoer' ? '蚁小二 · ' + (c.provider_account_id || '未映射') : '人工发布')}</div>
        <div class="wx-channel-actions"><button class="btn btn-sm" data-action="edit-wechat-account" data-id="${esc(c.id)}">编辑</button>${c.platform === 'wechat_article' ? `<button class="btn btn-sm" data-action="test-wechat" data-id="${esc(c.id)}">测试</button>` : ''}</div>
      </div>`).join('') || '<div class="empty"><h3>这个账号组还没有渠道</h3><p>添加公众号或视频号。</p></div>'}
    </div>
    <div class="stats-grid">
      <div class="stat"><div class="stat-label">账号组选题</div><div class="stat-value">${myBriefs.length}</div><div class="stat-foot">这个品牌的全部内容</div></div>
      <div class="stat"><div class="stat-label">公众号草稿</div><div class="stat-value">${articleDrafts.length}</div><div class="stat-foot">待创建 / 已建草稿</div></div>
      <div class="stat"><div class="stat-label">视频号发布包</div><div class="stat-value">${videoDrafts.length}</div><div class="stat-foot">待人工上传</div></div>
      <div class="stat ok"><div class="stat-label">已发布</div><div class="stat-value">${published.length}</div><div class="stat-foot">两个渠道合计</div></div>
    </div>
    <div class="card mt-16">
      <div class="card-head"><div><h2 class="section-title">这个账号组的选题 <span class="muted tiny">${myBriefs.length}</span></h2><p class="section-sub">选题共用；公众号和视频号从这里分别生成发布任务。</p></div><button class="btn btn-sm" data-action="new-brief-group" data-group="${esc(current.id)}">+ 新建选题</button></div>
      <div class="card-body">${myBriefs.length ? `<div class="wx-brief-list">${myBriefs.map(b => `<a class="wx-brief-row" href="#/brief/${esc(b.id)}"><span class="wx-dot" style="background:${esc(current.color || '#C73520')}"></span><span class="wx-brief-main"><strong>${esc(b.title)}</strong><small>${statusLabel(b.status)} · ${fmtDate(b.updated_at)}</small></span><span class="wx-brief-go">打开 →</span></a>`).join('')}</div>` : '<p class="tiny mb-0">还没有选题。新建会自动归到这个账号组。</p>'}</div>
    </div>
    <div class="grid-2 mt-16">
      <div class="card"><div class="card-head"><div><h2 class="section-title">公众号草稿 <span class="muted tiny">${articleDrafts.length}</span></h2><p class="section-sub">公众号渠道的草稿任务。</p></div></div><div class="card-body">${articleDrafts.length ? `<div class="wx-content-list">${articleDrafts.map(p => pubRow(p, `<button class="btn btn-sm btn-primary" data-action="publish-wechat" data-id="${esc(p.id)}">${p.status === 'dry_run' ? '重新 Dry-run' : '创建草稿'}</button>`)).join('')}</div>` : '<p class="tiny mb-0">暂无公众号草稿。</p>'}</div></div>
      <div class="card"><div class="card-head"><div><h2 class="section-title">视频号发布包 <span class="muted tiny">${videoDrafts.length}</span></h2><p class="section-sub">视频号渠道的发布包。</p></div></div><div class="card-body">${videoDrafts.length ? `<div class="wx-content-list">${videoDrafts.map(p => pubRow(p, `<a class="btn btn-sm" href="/kits/${esc(p.render_id)}-wechat_channels/video.mp4" target="_blank" rel="noreferrer">发布包</a><button class="btn btn-sm btn-primary" data-action="mark-published" data-id="${esc(p.id)}">标记已发布</button>`)).join('')}</div>` : '<p class="tiny mb-0">暂无视频号发布包。</p>'}</div></div>
    </div>
    <div class="card mt-16"><div class="card-head"><div><h2 class="section-title">已发布 <span class="muted tiny">${published.length}</span></h2><p class="section-sub">这个账号组两个渠道的发布记录。</p></div></div><div class="card-body">${published.length ? `<div class="wx-content-list">${published.map(p => pubRow(p, p.url ? `<a class="btn btn-sm" href="${esc(p.url)}" target="_blank" rel="noreferrer">打开链接</a>` : '')).join('')}</div>` : '<p class="tiny mb-0">还没有发布记录。</p>'}</div></div>
  `;
}

// ---------- knowledge ----------
function autogenStatusChip(s) {
  const map = { queued: ['待生成', ''], pending_confirm: ['待确认', ''], running: ['生成中', 'lime'], done: ['已完成', 'lime'], failed: ['失败', 'red'], blocked: ['已拦截', 'red'], canceled: ['已取消', ''] };
  const [label, cls] = map[s] || [s, ''];
  return `<span class="status ${cls}">${label}</span>`;
}

function autogenTaskRow(t) {
  const mediaUrl = (p) => p ? `/media/${esc(p)}` : '';
  return `<div class="autogen-row" data-id="${esc(t.id)}">
    <div class="autogen-main">
      <div class="autogen-title">${esc(t.title || '未命名')}</div>
      <div class="autogen-meta"><span class="badge engine">VibeMotion</span><span>${esc(t.structure_type || 'causal')}</span><span>${Math.round((t.duration_ms||30000)/1000)}s</span>${autogenStatusChip(t.status)}</div>
      ${t.error ? `<div class="autogen-error">${esc(t.error)}</div>` : ''}
    </div>
    <div class="autogen-progress"><div class="progress"><i style="width:${t.progress || 0}%"></i></div><span>${t.progress || 0}%</span></div>
    <div class="autogen-actions">
      ${t.status === 'done' ? `<a class="btn btn-sm" href="${mediaUrl(t.video_path)}" target="_blank" rel="noreferrer">播放</a>` : ''}
      <button class="btn btn-sm" data-action="edit-video-task" data-id="${esc(t.id)}">编辑</button>
      ${['queued','running'].includes(t.status) ? `<button class="btn btn-sm" data-action="cancel-video-task" data-id="${esc(t.id)}">取消</button>` : ''}
      ${t.status === 'pending_confirm' ? `<button class="btn btn-sm btn-primary" data-action="confirm-video-task" data-id="${esc(t.id)}">确认并生成</button>` : ''}
      ${['failed','blocked','canceled'].includes(t.status) ? `<button class="btn btn-sm" data-action="retry-video-task" data-id="${esc(t.id)}">重试</button>` : ''}
    </div>
  </div>`;
}

const WB_TABS = [['todo', '待办'], ['doing', '生成中'], ['review', '待审批'], ['publish', '待发布'], ['done', '已完成'], ['error', '异常']];

function wbRow(r) {
  const kindLabel = r.kind === 'vtask' ? '引擎2 · VibeMotion' : r.kind === 'brief' ? '引擎1 · 模板' : '发布';
  const styleLabel = r.style ? { industrial: '工业', clean: '简洁', dynamic: '动感' }[r.style] || r.style : '';
  const mediaUrl = (p) => p ? `/media/${esc(p)}` : '';
  const link = r.kind === 'vtask' ? `#/autogen` : r.kind === 'brief' ? `#/brief/${esc(r.id)}` : `#/publish`;
  return `<div class="autogen-row">
    <div class="autogen-main">
      <div class="autogen-title"><a href="${link}">${esc(r.title || '未命名')}</a></div>
      <div class="autogen-meta"><span class="badge ${r.kind === 'vtask' ? 'engine' : ''}">${kindLabel}</span>${styleLabel ? `<span class="badge engine">${esc(styleLabel)}</span>` : ''}<span>${esc(r.brief_status || '')}</span></div>
    </div>
    <div class="autogen-actions">
      ${r.video_path ? `<a class="btn btn-sm" href="${mediaUrl(r.video_path)}" target="_blank" rel="noreferrer">播放</a>` : ''}
      ${r.kind === 'vtask' ? `<button class="btn btn-sm" data-action="edit-video-task" data-id="${esc(r.id)}">编辑</button>` : ''}
      ${r.kind === 'vtask' && r.brief_status === '待发布' ? `<button class="btn btn-sm btn-primary" data-action="open-vtask-publish" data-id="${esc(r.id)}">生成发布包</button>` : ''}
      ${r.kind === 'vtask' && r.brief_status !== '待发布' ? `<button class="btn btn-sm btn-primary" data-action="publish-video-task" data-id="${esc(r.id)}">准备发布</button>` : ''}
      <a class="btn btn-sm" href="${link}">前往</a>
    </div>
  </div>`;
}

async function renderWorkbench() {
  setNav('workbench'); setCrumb('工作台 / 工作台');
  const d = await api('/api/unified-queue');
  const rows = d.rows || [];
  const counts = d.counts || {};
  state.wbTab = state.wbTab || 'todo';
  const tab = state.wbTab;
  const filtered = rows.filter(r => r.bucket === tab);
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">WORKBENCH / 工作台</p><h1 class="page-title">所有内容，一个队列。</h1><p class="page-sub">选题、生成、审批、发布，都在这里；按状态点标签。</p></div>
      <div class="head-actions"><a class="btn btn-primary" href="#/autogen">+ 新建视频</a></div>
    </div>
    <div class="filter-tabs">${WB_TABS.map(([k, l]) => `<button class="${tab === k ? 'active' : ''}" data-action="wb-tab" data-tab="${k}">${l} <b>${counts[k] || 0}</b></button>`).join('')}</div>
    <div class="card mt-16"><div class="card-body">${filtered.length ? filtered.map(wbRow).join('') : '<div class="empty"><h3>暂无</h3></div>'}</div></div>
  `;
}

async function renderAutogen() {
  setNav('autogen'); setCrumb('工作台 / 视频工作台');
  const data = await api('/api/video-tasks');
  const tasks = data.tasks || [];
  const c = data.counts || {};
  const listHtml = tasks.length ? tasks.map(autogenTaskRow).join('') : '<div class="empty"><h3>还没有任务</h3><p>在下面填好题材，点「自动生成」。</p></div>';
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">WORKBENCH / 视频工作台</p><h1 class="page-title">一条视频，一个界面。</h1><p class="page-sub">默认全自动；需要时让 AI 帮写文案，人也能随时改。</p></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2 class="section-title">新建视频</h2><p class="section-sub">填好题材点生成，或先让 AI 帮你写文案。</p></div></div>
      <div class="card-body">
        <form id="workbench-form">
          <div class="form-grid">
            <div class="field full"><label>标题</label><input name="title" placeholder="例如：为什么 AI 会一本正经地胡说八道"></div>
            <div class="field full"><label>文案 / 口播稿</label><textarea name="script" id="workbench-script" rows="4" placeholder="留空可让 AI 自动写"></textarea></div>
            <div class="field full"><label>讲解风格</label>
              <div class="style-picker">
                ${['industrial','clean','dynamic'].map((s, i) => {
                  const name = s === 'industrial' ? '严谨工业风' : s === 'clean' ? '简洁风格' : '活泼动感风';
                  const desc = s === 'industrial' ? '深灰 · 细分隔线 · 数据' : s === 'clean' ? '浅底 · 留白 · 插画' : '流动 · 强节奏 · 高亮';
                  return `<label class="style-card ${i === 0 ? 'sel' : ''}"><input type="radio" name="style" value="${s}" ${i === 0 ? 'checked' : ''}><img src="/gallery/styles/${s}.png" alt="${name}"><span>${name}</span><small>${desc}</small></label>`;
                }).join('')}
              </div>
            </div>
            <div class="field"><label>结构</label><select name="structure_type"><option value="causal">因果 / 流程</option><option value="contrast">对照</option><option value="misconception">误区修正</option><option value="checklist">清单</option><option value="timeline">时间演进</option></select></div>
            <div class="field"><label>时长（秒）</label><input name="duration_sec" type="number" value="30" min="5" max="60"></div>
            <div class="field"><label>模式</label><select name="mode"><option value="auto">自动：直接出片</option><option value="manual">人工：先确认分镜</option></select></div>
            <div class="field"><label>批量</label><label class="check-row"><input type="checkbox" name="batch_styles"> 同文案出 3 种风格</label></div>
            <div class="field"><label>口播头像</label><label class="check-row"><input type="checkbox" name="avatar"> 加数字人口播（可选）</label></div>
          </div>
          <div class="flex mt-16" style="gap:10px">
            <button class="btn" type="button" data-action="ai-draft-script">✨ AI 写文案</button>
            <button class="btn btn-primary" type="submit">自动生成</button>
          </div>
        </form>
      </div>
    </div>
    <div class="stats-grid mt-16">
      <div class="stat"><div class="stat-label">待办</div><div class="stat-value">${c.todo || 0}</div><div class="stat-foot">等待生成</div></div>
      <div class="stat ok"><div class="stat-label">进行中</div><div class="stat-value">${c.doing || 0}</div><div class="stat-foot">正在渲染</div></div>
      <div class="stat blue"><div class="stat-label">已完成</div><div class="stat-value">${c.done || 0}</div><div class="stat-foot">可播放 / 可发布</div></div>
      <div class="stat"><div class="stat-label">异常</div><div class="stat-value">${c.blocked || 0}</div><div class="stat-foot">失败 / 拦截</div></div>
    </div>
    <div class="card mt-16">
      <div class="card-head"><div><h2 class="section-title">任务列表 <span class="muted tiny">${tasks.length}</span></h2><p class="section-sub">自动刷新；完成后直接播放。</p></div></div>
      <div class="card-body" id="autogen-list">${listHtml}</div>
    </div>
  `;
  const form = $('#workbench-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      title: fd.get('title'),
      script: fd.get('script'),
      structure_type: fd.get('structure_type'),
      style: fd.get('style') || 'industrial',
      duration_ms: (Number(fd.get('duration_sec')) || 30) * 1000,
      engine: 'vibemotion',
      mode: fd.get('mode') || 'auto',
      avatar: fd.get('avatar') ? true : false
    };
    if (!body.title && !body.script) { toast('至少填标题或文案', 'error'); return; }
    try {
      const styles = fd.get('batch_styles') ? ['industrial', 'clean', 'dynamic'] : [body.style];
      for (const st of styles) {
        await post('/api/video-tasks', { ...body, style: st, title: styles.length > 1 ? `${body.title} · ${st}` : body.title });
      }
      toast(styles.length > 1 ? `已批量生成 ${styles.length} 条` : '已开始自动生成'); renderAutogen();
    } catch (err) { toast(err.message, 'error'); }
  });
  const timer = setInterval(async () => {
    try {
      const d = await api('/api/video-tasks');
      const box = $('#autogen-list');
      if (box) box.innerHTML = (d.tasks || []).length ? (d.tasks || []).map(autogenTaskRow).join('') : '<div class="empty"><h3>还没有任务</h3></div>';
    } catch {}
  }, 3000);
  state.pollTimers.push(timer);
}

async function openEditVideoTask(id) {
  const t = await api(`/api/video-tasks/${id}`);
  openModal({
    title: '编辑视频',
    body: `<form id="edit-video-form">
      <div class="form-grid">
        <div class="field full"><label>标题</label><input name="title" value="${esc(t.title || '')}"></div>
        <div class="field full"><label>文案 / 口播稿</label><textarea name="script" rows="4">${esc(t.script || '')}</textarea></div>
        <div class="field"><label>讲解风格</label><select name="style"><option value="industrial" ${t.style==='industrial'?'selected':''}>严谨工业风</option><option value="clean" ${t.style==='clean'?'selected':''}>简洁风格</option><option value="dynamic" ${t.style==='dynamic'?'selected':''}>活泼动感风</option></select></div>
        <div class="field"><label>结构</label><select name="structure_type"><option value="causal" ${t.structure_type==='causal'?'selected':''}>因果 / 流程</option><option value="contrast" ${t.structure_type==='contrast'?'selected':''}>对照</option><option value="misconception" ${t.structure_type==='misconception'?'selected':''}>误区修正</option><option value="checklist" ${t.structure_type==='checklist'?'selected':''}>清单</option><option value="timeline" ${t.structure_type==='timeline'?'selected':''}>时间演进</option></select></div>
        <div class="field"><label>时长（秒）</label><input name="duration_sec" type="number" value="${Math.round((t.duration_ms||30000)/1000)}" min="5" max="60"></div>
      </div>
    </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="edit-video-form">保存并重新生成</button>`,
    onMount: () => {
      const form = $('#edit-video-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = {
          title: fd.get('title'), script: fd.get('script'), structure_type: fd.get('structure_type'), style: fd.get('style') || 'industrial',
          duration_ms: (Number(fd.get('duration_sec')) || 30) * 1000
        };
        try { await put(`/api/video-tasks/${encodeURIComponent(id)}`, body); toast('已保存，重新生成中'); closeModal(); renderAutogen(); }
        catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

async function openVtaskPublish(id) {
  const acc = await api('/api/wechat-accounts').catch(() => ({ accounts: [], default_id: '' }));
  const accounts = acc.accounts || [];
  const articleAccounts = accounts.filter(a => a.channel !== 'wechat_channels');
  const videoAccounts = accounts.filter(a => a.channel === 'wechat_channels');
  const opt = (list, label) => list.length
    ? `<div class="field"><label>${label}</label><select name="${label === '公众号账号' ? 'article_account' : 'video_account'}">${list.map(a => `<option value="${esc(a.id)}">${esc(a.name || a.id)}</option>`).join('')}</select></div>`
    : `<div class="field"><label>${label}</label><input disabled value="未配置"></div>`;
  openModal({
    title: '生成发布包',
    body: `<form id="vtask-publish-form">
      <div class="field"><label>发布渠道</label>
        <label class="check-row"><input type="radio" name="channel" value="wechat_channels" checked> 视频号（手动上传）</label>
        <label class="check-row"><input type="radio" name="channel" value="wechat_article"> 公众号（文章草稿）</label>
      </div>
      <div id="channel-account">${opt(videoAccounts, '视频号账号')}</div>
    </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="vtask-publish-form">生成发布包</button>`,
    onMount: () => {
      const form = $('#vtask-publish-form');
      const box = $('#channel-account');
      form?.querySelectorAll('input[name="channel"]').forEach(r => r.addEventListener('change', () => {
        box.innerHTML = r.value === 'wechat_article' ? opt(articleAccounts, '公众号账号') : opt(videoAccounts, '视频号账号');
      }));
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        try {
          const channel = fd.get('channel');
          if (channel === 'wechat_article') {
            const accountId = fd.get('article_account') || '';
            const r = await post(`/api/video-tasks/${encodeURIComponent(id)}/publish-wechat`, { account_id: accountId });
            toast(r.dry_run ? '公众号草稿（dry-run，未真调微信）' : '公众号草稿已创建');
          } else {
            const r = await post(`/api/video-tasks/${encodeURIComponent(id)}/publish`, { channel });
            toast('发布包已生成：' + r.kit);
          }
          closeModal(); renderWorkbench();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

function openAutogenNew() {
  openModal({
    title: '新建自动任务',
    subtitle: '输入题材，AI 自动走完整条管线。',
    body: `<form id="autogen-form">
      <div class="form-grid">
        <div class="field full"><label>标题</label><input name="title" placeholder="例如：为什么 AI 会一本正经地胡说八道" required></div>
        <div class="field full"><label>题材 / 口播稿</label><textarea name="script" rows="4" placeholder="给一句话或一段文案"></textarea></div>
        <div class="field"><label>结构</label><select name="structure_type"><option value="causal">因果 / 流程</option><option value="contrast">对照</option><option value="misconception">误区修正</option><option value="checklist">清单</option><option value="timeline">时间演进</option></select></div>
        <div class="field"><label>生成模式</label><select name="mode"><option value="auto">自动：直接出片</option><option value="manual">人工：先确认分镜</option></select></div>
        <div class="field"><label>时长（秒）</label><input name="duration_sec" type="number" value="30" min="5" max="60"></div>
      </div>
    </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="autogen-form">自动生成</button>`,
    onMount: () => {
      const form = $('#autogen-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const body = {
          title: fd.get('title'),
          script: fd.get('script'),
          structure_type: fd.get('structure_type'),
          duration_ms: (Number(fd.get('duration_sec')) || 30) * 1000,
          engine: 'vibemotion',
          mode: fd.get('mode') || 'auto'
        };
        try {
          const task = await post('/api/video-tasks', body);
          toast('任务已创建，开始自动生成'); closeModal(); renderAutogen();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

async function renderAssets(opts = {}) {
  setNav('assets'); setCrumb('工作台 / 图片素材');
  const q = opts.q || state.assetQ || '';
  const group = opts.group ?? state.assetGroup ?? '';
  const archived = opts.archived ?? state.assetArchived ?? false;
  state.assetQ = q; state.assetGroup = group; state.assetArchived = archived;
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (group) query.set('group', group);
  if (archived) query.set('archived', '1');
  const data = await api(`/api/media-assets?${query.toString()}`).catch(() => ({ assets: [], groups: [] }));
  const assets = data.assets || [];
  const groups = data.groups || [];
  const grid = assets.length ? assets.map(a => `
    <div class="asset-card">
      <div class="asset-thumb"><img src="/media/${esc(a.path)}" alt="${esc(a.name)}"></div>
      <div class="asset-meta"><span>${esc(a.name)}</span>${a.group_name ? `<span class="tag">${esc(a.group_name)}</span>` : ''}</div>
      <div class="asset-actions"><button class="btn btn-sm" data-action="archive-asset" data-id="${esc(a.id)}">${a.archived ? '恢复' : '归档'}</button><button class="btn btn-sm" data-action="delete-asset" data-id="${esc(a.id)}">删除</button></div>
    </div>`).join('') : '<div class="empty"><h3>没有图片</h3></div>';
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">ASSETS / 图片素材</p><h1 class="page-title">素材库：分组、标签、归档。</h1><p class="page-sub">常用靠前，旧的自动/手动归档，需要时能找回。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="open-asset-upload">+ 上传图片</button></div>
    </div>
    <div class="card mt-16"><div class="card-body">
      <div class="flex mb-12" style="gap:8px;flex-wrap:wrap">
        <input id="asset-search" placeholder="搜索名字 / 标签" value="${esc(q)}" style="max-width:260px">
        <button class="btn btn-sm" data-action="asset-search">搜索</button>
        <button class="btn btn-sm ${group === '' ? 'btn-primary' : ''}" data-action="asset-group" data-group="">全部</button>
        ${groups.map(g => `<button class="btn btn-sm ${group === g ? 'btn-primary' : ''}" data-action="asset-group" data-group="${esc(g)}">${esc(g)}</button>`).join('')}
        <button class="btn btn-sm ${archived ? 'btn-primary' : ''}" data-action="asset-archived-toggle">${archived ? '查看未归档' : '查看归档'}</button>
      </div>
      <div class="asset-grid">${grid}</div>
    </div></div>
  `;
}

function openAssetUpload() {
  openModal({
    title: '上传图片素材',
    body: `<form id="asset-upload-form">
      <div class="field"><label>名称</label><input name="name" placeholder="例如：封面配图"></div>
      <div class="field"><label>分组（可选）</label><input name="group_name" placeholder="例如：咖啡主题"></div>
      <div class="field"><label>标签（可选，逗号分隔）</label><input name="tags" placeholder="咖啡,温馨,暖色"></div>
      <div class="field"><label>图片文件</label><input name="file" type="file" accept="image/*" required></div>
    </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="asset-upload-form">上传</button>`,
    onMount: () => {
      const form = $('#asset-upload-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const file = fd.get('file');
        if (!file || !file.size) { toast('请选择图片', 'error'); return; }
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
        try {
          await post('/api/media-assets', { name: fd.get('name') || file.name, mime: file.type, data: dataUrl, group_name: fd.get('group_name'), tags: fd.get('tags') });
          toast('已上传'); closeModal(); renderAssets();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

async function renderVoices(opts = {}) {
  setNav('voices'); setCrumb('工作台 / 声音');
  const q = opts.q || state.voiceQ || '';
  const group = opts.group ?? state.voiceGroup ?? '';
  const archived = opts.archived ?? state.voiceArchived ?? false;
  state.voiceQ = q; state.voiceGroup = group; state.voiceArchived = archived;
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (group) query.set('group', group);
  if (archived) query.set('archived', '1');
  const data = await api(`/api/voice-assets?${query.toString()}`).catch(() => ({ assets: [], groups: [] }));
  const assets = data.assets || [];
  const groups = data.groups || [];
  const list = assets.length ? assets.map(a => `
    <div class="voice-row">
      <div class="voice-main"><div class="voice-name">${esc(a.name)}${a.group_name ? ` <span class="tag">${esc(a.group_name)}</span>` : ''}</div><audio controls src="/media/${esc(a.path)}" style="height:32px;margin-top:4px"></audio></div>
      <div class="flex" style="gap:6px"><button class="btn btn-sm" data-action="archive-voice" data-id="${esc(a.id)}">${a.archived ? '恢复' : '归档'}</button><button class="btn btn-sm" data-action="delete-voice" data-id="${esc(a.id)}">删除</button></div>
    </div>`).join('') : '<div class="empty"><h3>还没有声音样本</h3></div>';
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">VOICE / 声音</p><h1 class="page-title">声音样本：分组、归档。</h1><p class="page-sub">干净、无背景音乐，每段 10–30 秒，wav / mp3。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="open-voice-upload">+ 上传声音</button></div>
    </div>
    <div class="card mt-16"><div class="card-body">
      <div class="flex mb-12" style="gap:8px;flex-wrap:wrap">
        <input id="voice-search" placeholder="搜索名字 / 标签" value="${esc(q)}" style="max-width:220px">
        <button class="btn btn-sm" data-action="voice-search">搜索</button>
        <button class="btn btn-sm ${group === '' ? 'btn-primary' : ''}" data-action="voice-group" data-group="">全部</button>
        ${groups.map(g => `<button class="btn btn-sm ${group === g ? 'btn-primary' : ''}" data-action="voice-group" data-group="${esc(g)}">${esc(g)}</button>`).join('')}
        <button class="btn btn-sm ${archived ? 'btn-primary' : ''}" data-action="voice-archived-toggle">${archived ? '查看未归档' : '查看归档'}</button>
      </div>
      ${list}
    </div></div>
    <div class="note-box mt-12">克隆服务在「设置 → 视频引擎 / TTS」里填 API Key 和音色 ID；填好后，出片就用你的声音。</div>
  `;
}

function openVoiceUpload() {
  openModal({
    title: '上传声音样本',
    body: `<form id="voice-upload-form">
      <div class="field"><label>名称</label><input name="name" placeholder="例如：我的声音-1"></div>
      <div class="field"><label>分组（可选）</label><input name="group_name" placeholder="例如：主声音"></div>
      <div class="field"><label>标签（可选，逗号分隔）</label><input name="tags" placeholder="正常,严肃,温柔"></div>
      <div class="field"><label>音频文件（wav / mp3）</label><input name="file" type="file" accept="audio/*" required></div>
    </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="voice-upload-form">上传</button>`,
    onMount: () => {
      const form = $('#voice-upload-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const file = fd.get('file');
        if (!file || !file.size) { toast('请选择音频', 'error'); return; }
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
        try {
          await post('/api/voice-assets', { name: fd.get('name') || file.name, mime: file.type, data: dataUrl, group_name: fd.get('group_name'), tags: fd.get('tags') });
          toast('已上传'); closeModal(); renderVoices();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

async function renderChannels() {
  setNav('channels'); setCrumb('工作台 / 发布 / 渠道');
  const data = await api('/api/channels').catch(() => ({ channels: [] }));
  const channels = data.channels || [];
  const modeLabel = m => m === 'api' ? '官方/自动' : '手动';
  const typeLabel = t => ({ video: '视频', article: '图文', image: '图片' }[t] || t);
  const list = channels.length ? channels.map(c => `
    <div class="voice-row">
      <div class="voice-main">
        <div class="voice-name">${esc(c.name)} ${c.enabled ? '' : '<span class="tag">已停用</span>'}</div>
        <div class="autogen-meta"><span class="badge">${typeLabel(c.content_type)}</span><span class="badge">${modeLabel(c.publish_mode)}</span><span style="color:var(--muted);font-size:11px">${esc(c.note || '')}</span></div>
      </div>
      <div class="flex" style="gap:6px"><button class="btn btn-sm" data-action="toggle-channel" data-id="${esc(c.id)}">${c.enabled ? '停用' : '启用'}</button><button class="btn btn-sm" data-action="delete-channel" data-id="${esc(c.id)}">删除</button></div>
    </div>`).join('') : '<div class="empty"><h3>还没有渠道</h3></div>';
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">CHANNELS / 渠道</p><h1 class="page-title">发布渠道库。</h1><p class="page-sub">自己加渠道；平台按渠道生成标题/描述/标签/封面发布包，人手动发。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="open-channel-add">+ 加渠道</button></div>
    </div>
    <div class="card mt-16"><div class="card-body">${list}</div></div>
  `;
}

function openChannelAdd() {
  openModal({
    title: '加渠道',
    body: `<form id="channel-form">
      <div class="field"><label>渠道名</label><input name="name" placeholder="例如：小红书 / 知乎 / 西瓜视频" required></div>
      <div class="field"><label>内容形态</label><select name="content_type"><option value="video">视频</option><option value="article">图文</option><option value="image">图片</option></select></div>
      <div class="field"><label>发布方式</label><select name="publish_mode"><option value="manual">手动发布包（推荐）</option><option value="api">官方/自动 API</option></select></div>
      <div class="field"><label>说明（可选）</label><input name="note" placeholder="例如：封面图 + 标题≤20字 + 标签"></div>
    </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="channel-form">添加</button>`,
    onMount: () => {
      const form = $('#channel-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        try { await post('/api/channels', { name: fd.get('name'), content_type: fd.get('content_type'), publish_mode: fd.get('publish_mode'), note: fd.get('note') }); toast('已添加'); closeModal(); renderChannels(); }
        catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

async function renderKnowledge(q = '') {
  setNav('knowledge'); setCrumb('工作台 / 知识库');
  const data = await api('/api/knowledge');
  state.knowledge = data;
  const search = q ? await api('/api/knowledge/search?q=' + encodeURIComponent(q)) : null;
  const items = data.items || [];
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">KNOWLEDGE / 知识库</p><h1 class="page-title">先让它读你的东西，<br>再让它写。</h1><p class="page-sub">只索引 <span class="mono">${esc(data.dir)}</span> 下的 .md / .txt。每个结论都应该能回到这里。</p></div>
      <div class="head-actions"><button class="btn" data-action="scan-knowledge">扫描目录</button><button class="btn btn-primary" data-action="add-knowledge">+ 添加资料</button></div>
    </div>

    <div class="stats-grid">
      <div class="stat"><div class="stat-label">资料</div><div class="stat-value">${data.count}</div><div class="stat-foot">篇文章 / 笔记 / 脚本</div></div>
      <div class="stat ok"><div class="stat-label">切块</div><div class="stat-value">${data.chunks}</div><div class="stat-foot">检索时只取最相关片段</div></div>
      <div class="stat blue"><div class="stat-label">目录</div><div class="stat-value" style="font-size:18px;letter-spacing:0">knowledge/</div><div class="stat-foot">可配置 KNOWLEDGE_DIR</div></div>
      <div class="stat"><div class="stat-label">检索</div><div class="stat-value" style="font-size:18px;letter-spacing:0">关键词</div><div class="stat-foot">下一步接向量检索</div></div>
    </div>

    <div class="card">
      <div class="card-head"><div><h2 class="section-title">资料索引</h2><p class="section-sub">支持 Markdown / TXT；文件名、frontmatter、标签都会进入检索。</p></div></div>
      <div class="card-body">
        <form class="search-bar" id="knowledge-search-form">
          <input id="knowledge-search" placeholder="搜你的文章、脚本、笔记，例如：固定 IP、助理、投递" value="${esc(q)}">
          <button class="btn" type="submit">搜索</button>
          ${q ? '<button class="btn btn-ghost" type="button" data-action="clear-knowledge-search">清除</button>' : ''}
        </form>
        ${search ? `<div class="mt-16"><div class="tiny mb-0">「${esc(q)}」找到 ${search.results.length} 个相关片段</div><div class="knowledge-results">${search.results.map((r, i) => `<div class="knowledge-result" data-action="open-knowledge" data-id="${esc(r.item_id)}"><div class="knowledge-result-head"><span class="tag lime">K${i + 1}</span><strong>${esc(r.title)}</strong><span class="tiny">score ${r.score}</span></div><p>${esc(truncate(r.text, 220))}</p></div>`).join('') || '<p class="tiny">没有命中。换一个关键词，或者先扫描目录。</p>'}</div></div>` : ''}

        <div class="knowledge-list mt-16">
          ${items.length ? items.map(item => `
            <div class="knowledge-row">
              <div class="source-icon"><svg><use href="#i-book"></use></svg></div>
              <div class="knowledge-main" data-action="open-knowledge" data-id="${esc(item.id)}">
                <div class="knowledge-title">${esc(item.title)}</div>
                <div class="knowledge-meta"><span>${item.chunk_count} 个切块</span><span>${item.char_count} 字</span><span>${fmtDate(item.updated_at)}</span></div>
                <div class="tag-row mt-12">${(item.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="tiny">未打标签</span>'}</div>
              </div>
              <div class="knowledge-actions"><button class="btn btn-sm" data-action="open-knowledge" data-id="${esc(item.id)}">查看</button><button class="btn btn-sm btn-danger" data-action="delete-knowledge" data-id="${esc(item.id)}">删除</button></div>
            </div>`).join('') : `<div class="empty"><div class="empty-icon"><svg><use href="#i-book"></use></svg></div><h3>知识库还是空的</h3><p>把文章、脚本、笔记放进 <span class="mono">${esc(data.dir)}</span>，然后点「扫描目录」。</p><button class="btn btn-primary btn-sm" data-action="scan-knowledge">扫描目录</button></div>`}
        </div>
      </div>
    </div>`;
}

async function openKnowledgeItem(id) {
  try {
    const item = await api('/api/knowledge/' + encodeURIComponent(id));
    openModal({
      title: item.title,
      subtitle: `${item.char_count} 字 · ${item.chunks.length} 个切块${item.source_path ? ' · ' + item.source_path : ''}`,
      wide: true,
      body: `<div class="tag-row mb-0">${(item.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="knowledge-content mt-16">${esc(item.content)}</div>
        <div class="divider"></div>
        <div class="tiny">切块（检索时按相关性取用）</div>
        <div class="knowledge-chunks">${item.chunks.map((c, i) => `<div class="knowledge-chunk"><span class="mono tiny">#${i + 1}</span><p>${esc(c.text)}</p></div>`).join('')}</div>`,
      foot: `<button class="btn" data-action="close-modal">关闭</button>`
    });
  } catch (e) { toast(e.message, 'error'); }
}

function openKnowledgeForm() {
  openModal({
    title: '添加资料',
    subtitle: '手动粘贴一篇笔记/文章。也可以放进 knowledge 目录后扫描。',
    wide: true,
    body: `<form id="knowledge-form"><div class="form-grid">
      <div class="field"><label>标题</label><input name="title" placeholder="例如：我为什么不再用 NAS 做发布" autofocus></div>
      <div class="field"><label>标签（逗号分隔）</label><input name="tags" placeholder="自动化, NAS, 云服务器"></div>
      <div class="field full"><label>来源 URL（可选）</label><input name="url" placeholder="https://..."></div>
      <div class="field full"><label>正文</label><textarea name="content" rows="12" placeholder="粘贴全文。系统会自动切块、建立索引。"></textarea></div>
    </div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="knowledge-form">建立索引</button>`,
    onMount: () => {
      $('#knowledge-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await post('/api/knowledge', {
            title: fd.get('title'), content: fd.get('content'), url: fd.get('url'),
            tags: String(fd.get('tags') || '').split(/[,，]/).map(x => x.trim()).filter(Boolean)
          });
          closeModal(); toast('资料已索引'); route();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

// ---------- structures ----------
const STRUCTURE_TYPES = [
  ['analogy', '类比'], ['contrast', '对照'], ['causal', '因果'],
  ['misconception', '误区'], ['boundary', '边界'], ['checklist', '清单']
];
const structureTypeLabel = (t) => (STRUCTURE_TYPES.find(x => x[0] === t) || [, t || '类比'])[1];

async function renderAnalogies() {
  setNav('analogies'); setCrumb('工作台 / 结构库');
  const list = await api('/api/analogies');
  state.analogies = list;
  const filtered = state.structureFilter === 'all' ? list : list.filter(a => (a.structure_type || 'analogy') === state.structureFilter);
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">STRUCTURES / 结构库</p><h1 class="page-title">不是好句子，<br>是能复用的结构。</h1><p class="page-sub">每个结构写清楚：从什么映射到什么、哪里不能硬套、什么时候用、你的一句话签名。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="new-analogy">+ 新建结构</button></div>
    </div>
    <div class="music-tabs mb-12">
      <button class="chip ${state.structureFilter === 'all' ? 'on' : ''}" data-action="filter-structure" data-type="all">全部</button>
      ${STRUCTURE_TYPES.map(([v, l]) => `<button class="chip ${state.structureFilter === v ? 'on' : ''}" data-action="filter-structure" data-type="${v}">${l}</button>`).join('')}
    </div>
    ${filtered.length ? `<div class="analogy-grid">${filtered.map(a => `
      <div class="card analogy-card">
        <div class="card-head">
          <div><div class="eyebrow">${esc(structureTypeLabel(a.structure_type))} · ${a.usage_count || 0} 次使用</div><h2 class="analogy-title">${esc(a.title)}</h2><div class="tag-row mt-12">${(a.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
          <div class="card-actions"><button class="btn btn-sm" data-action="edit-analogy" data-id="${esc(a.id)}">编辑</button><button class="btn btn-sm btn-danger" data-action="delete-analogy" data-id="${esc(a.id)}">删除</button></div>
        </div>
        <div class="card-body">
          <div class="analogy-domains"><span>${esc(a.source_domain || '源域')}</span><i>→</i><span>${esc(a.target_domain || '目标域')}</span></div>
          <div class="analogy-mapping">${(a.mapping || []).map(m => `<div class="analogy-map-row"><span>${esc(m.from)}</span><i>→</i><span>${esc(m.to)}</span>${m.note ? `<small>${esc(m.note)}</small>` : ''}</div>`).join('')}</div>
          <div class="analogy-boundary"><strong>边界</strong><p>${esc(a.boundary || '未写')}</p></div>
          ${a.use_cases ? `<div class="analogy-boundary"><strong>适用场景</strong><p>${esc(a.use_cases)}</p></div>` : ''}
          <div class="analogy-signature">“${esc(a.signature || '')}”</div>
        </div>
      </div>`).join('')}</div>` : `<div class="empty"><div class="empty-icon"><svg><use href="#i-link"></use></svg></div><h3>${list.length ? '这个类型下还没有结构' : '还没有结构'}</h3><p>先建一个你最常用的结构，写清楚映射、边界和适用场景。</p><button class="btn btn-primary btn-sm" data-action="new-analogy">新建结构</button></div>`}`;
}

function mappingToText(mapping) {
  return (mapping || []).map(m => [m.from, m.to, m.note].filter(Boolean).join(' | ')).join('\n');
}
function textToMapping(text) {
  return String(text || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [from, to, note] = line.split('|').map(x => x.trim());
    return { from: from || '', to: to || '', note: note || '' };
  }).filter(m => m.from || m.to);
}

function openAnalogyForm(id = '') {
  const a = id ? (state.analogies || []).find(x => x.id === id) : null;
  openModal({
    title: a ? '编辑结构' : '新建结构',
    subtitle: '映射不是比喻；每一行写清楚 A → B，并标注哪里不能硬套。',
    wide: true,
    body: `<form id="analogy-form" data-id="${esc(id)}"><div class="form-grid">
      <div class="field full"><label>先随手写，AI 再整理成类比表格</label><textarea name="raw_note" id="analogy-raw-note" rows="5" placeholder="随便写：最近看到一个寄快递的流程，地址写错就退回……像不像公众号 API 只认固定 IP？">${esc(a?.raw_note || '')}</textarea><div class="flex mt-8"><select id="analogy-inbox-select" style="max-width:260px"><option value="">从知识库 inbox 读取…</option></select><button class="btn btn-sm" type="button" id="ai-fill-analogy">AI 整理类比</button><span class="tiny" id="ai-analogy-status">AI 只整理结构，事实和边界由你审核。</span></div></div>
      <div class="field"><label>标题</label><input name="title" value="${esc(a?.title || '')}" placeholder="例如：邮局寄信" autofocus></div>
      <div class="field"><label>结构类型</label><select name="structure_type">${STRUCTURE_TYPES.map(([v, l]) => `<option value="${v}" ${(a?.structure_type || 'analogy') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>标签（逗号分隔）</label><input name="tags" value="${esc((a?.tags || []).join(', '))}" placeholder="固定地址, 自动化发布"></div>
      <div class="field"><label>源域</label><input name="source_domain" value="${esc(a?.source_domain || '')}" placeholder="邮局、寄信、登记地址"></div>
      <div class="field"><label>目标域</label><input name="target_domain" value="${esc(a?.target_domain || '')}" placeholder="平台 API、IP 白名单"></div>
      <div class="field full"><label>映射（一行一条：A | B | 说明）</label><textarea name="mapping" rows="6" placeholder="寄信 | 调用平台接口 | 内容要送达&#10;登记地址 | IP 白名单 | 平台只认登记过的来源">${esc(mappingToText(a?.mapping || []))}</textarea></div>
      <div class="field full"><label>边界（哪里不能硬套）</label><textarea name="boundary" rows="3" placeholder="只适用于有明确投递/准入规则的平台；不适合推荐算法。">${esc(a?.boundary || '')}</textarea></div>
      <div class="field full"><label>适用场景</label><textarea name="use_cases" rows="2" placeholder="适合：解释平台准入、地址、白名单；不适合：推荐算法。">${esc(a?.use_cases || '')}</textarea></div>
      <div class="field"><label>一句话签名</label><input name="signature" value="${esc(a?.signature || '')}" placeholder="不是工具不行，是地址不行。"></div>
      <div class="field"><label>可用结论</label><textarea name="conclusions" rows="3" placeholder="一行一条">${esc(a?.conclusions || '')}</textarea></div>
    </div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="analogy-form">保存结构</button>`,
    onMount: () => {
      const inboxSelect = $('#analogy-inbox-select');
      api('/api/inbox').then(data => {
        if (!inboxSelect) return;
        for (const item of data.items || []) {
          const opt = document.createElement('option');
          opt.value = item.name;
          opt.textContent = item.name;
          opt.dataset.content = item.content || '';
          inboxSelect.appendChild(opt);
        }
        inboxSelect.addEventListener('change', () => {
          const opt = inboxSelect.selectedOptions[0];
          if (opt?.dataset.content) {
            const note = $('#analogy-raw-note');
            if (note) note.value = opt.dataset.content;
            toast('已从 inbox 读取，可让 AI 整理');
          }
        });
      }).catch(() => {});
      $('#ai-fill-analogy')?.addEventListener('click', async () => {
        const note = String($('#analogy-raw-note')?.value || '').trim();
        if (!note) return toast('先随手写一段', 'error');
        const btn = $('#ai-fill-analogy');
        const status = $('#ai-analogy-status');
        btn.disabled = true; btn.textContent = 'AI 整理中…';
        if (status) status.textContent = '正在整理映射、边界和签名…';
        try {
          const { draft } = await post('/api/ai/analogy-draft', { note });
          const form = $('#analogy-form');
          const set = (name, value) => { const el = form.elements[name]; if (el) el.value = value ?? ''; };
          set('title', draft.title);
          set('source_domain', draft.source_domain);
          set('target_domain', draft.target_domain);
          set('mapping', mappingToText(draft.mapping || []));
          set('boundary', draft.boundary);
          set('signature', draft.signature);
          set('conclusions', draft.conclusions);
          set('tags', (draft.tags || []).join(', '));
          if (status) status.textContent = draft.ai ? 'AI 已整理，请逐行审核映射和边界。' : '本地脚手架已填，请手动补充。';
          toast('AI 已整理，请审核');
        } catch (err) {
          if (status) status.textContent = err.message;
          toast(err.message, 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'AI 整理类比';
        }
      });
      $('#analogy-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
          title: fd.get('title'), source_domain: fd.get('source_domain'), target_domain: fd.get('target_domain'),
          structure_type: fd.get('structure_type'), use_cases: fd.get('use_cases'),
          raw_note: fd.get('raw_note'),
          mapping: textToMapping(fd.get('mapping')), boundary: fd.get('boundary'), signature: fd.get('signature'),
          conclusions: fd.get('conclusions'),
          tags: String(fd.get('tags') || '').split(/[,，]/).map(x => x.trim()).filter(Boolean)
        };
        try {
          if (id) await patch('/api/analogies/' + encodeURIComponent(id), payload);
          else await post('/api/analogies', payload);
          closeModal(); toast('结构已保存'); route();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

// ---------- soul ----------
function goldenToText(examples) {
  return (examples || []).map(g => `标题：${g.title || ''}\n文案：${g.text || ''}\n为什么好：${g.why || ''}`).join('\n---\n');
}
function textToGolden(text) {
  return String(text || '').split(/\n---\n/).map(block => {
    const out = { title: '', text: '', why: '' };
    for (const line of block.split('\n')) {
      const m = line.match(/^(标题|文案|为什么好)[:：]\s*(.*)$/);
      if (m) out[m[1] === '标题' ? 'title' : m[1] === '文案' ? 'text' : 'why'] = m[2].trim();
    }
    return out;
  }).filter(g => g.title || g.text);
}

async function renderSoul() {
  setNav('soul'); setCrumb('工作台 / 灵魂档案');
  const s = await api('/api/soul');
  state.soul = s;
  const lines = (arr) => (arr || []).join('\n');
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">SOUL / 灵魂档案</p><h1 class="page-title">把“像你”<br>写成可执行的约束。</h1><p class="page-sub">信念决定结论，语感决定句子，禁用词决定边界。生成角度和文案时会自动带上这些。</p></div>
      <div class="head-actions"><span class="tag lime">${(s.beliefs || []).length} 条信念</span><span class="tag">${(s.banned || []).length} 个禁用词</span><span class="tag">${(s.golden_examples || []).length} 条黄金样例</span></div>
    </div>

    <form id="soul-form">
      <div class="card mb-16">
        <div class="card-head"><div><h2 class="section-title">先给思路，AI 起草灵魂档案</h2><p class="section-sub">AI 只填表，保存前你逐项审核。</p></div></div>
        <div class="card-body">
          <textarea id="soul-direction" rows="3" placeholder="例如：我是一个讲自动化落地的技术作者，冷静、反鸡汤；喜欢先用邮局/门牌号做类比，再落到平台规则；讨厌“赋能、闭环、抓手”。"></textarea>
          <div class="flex mt-12"><button class="btn btn-sm" type="button" id="ai-fill-soul">AI 起草灵魂档案</button><span class="tiny" id="soul-ai-status">AI 会填信念、禁用词、语感、签名、黄金样例；你确认后才保存。</span></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div><h2 class="section-title">信念</h2><p class="section-sub">你真正相信、并且愿意反复讲的结论。一行一条。</p></div></div>
            <div class="card-body"><textarea name="beliefs" rows="8" class="soul-textarea" placeholder="平台只认固定入口。">${esc(lines(s.beliefs))}</textarea></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h2 class="section-title">语感规则</h2><p class="section-sub">句子怎么起、怎么翻、怎么落。</p></div></div>
            <div class="card-body"><textarea name="tone_rules" rows="7" class="soul-textarea" placeholder="先给具体日常物件，再翻到技术结论。">${esc(lines(s.tone_rules))}</textarea></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h2 class="section-title">一句话签名</h2><p class="section-sub">你反复出现的“那一句”。</p></div></div>
            <div class="card-body"><textarea name="signature_moves" rows="4" class="soul-textarea" placeholder="不是工具不行，是地址不行。">${esc(lines(s.signature_moves))}</textarea></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><div><h2 class="section-title">禁用表达</h2><p class="section-sub">出现这些词，生成时应该提示你。</p></div></div>
            <div class="card-body"><textarea name="banned" rows="12" class="soul-textarea" placeholder="赋能">${esc(lines(s.banned))}</textarea></div>
          </div>
          <div class="card">
            <div class="card-head"><div><h2 class="section-title">黄金样例</h2><p class="section-sub">每条用“标题 / 文案 / 为什么好”三段，用 --- 分隔。</p></div></div>
            <div class="card-body"><textarea name="golden_examples" rows="16" class="soul-textarea" placeholder="标题：固定地址&#10;文案：微信只给「登记过地址」的人寄信。&#10;为什么好：先把平台规则变成日常投递。">${esc(goldenToText(s.golden_examples))}</textarea></div>
          </div>
        </div>
      </div>
      <div class="soul-actions"><button class="btn btn-primary" type="submit">保存灵魂档案</button><span class="tiny">保存后，下一次生成角度/文案会使用这版。</span></div>
    </form>`;

  $('#ai-fill-soul')?.addEventListener('click', async () => {
    const direction = String($('#soul-direction')?.value || '').trim();
    if (!direction) return toast('先写一个思路', 'error');
    const btn = $('#ai-fill-soul');
    const status = $('#soul-ai-status');
    btn.disabled = true; btn.textContent = 'AI 起草中…';
    if (status) status.textContent = '正在写信念、规则和样例…';
    try {
      const { draft } = await post('/api/ai/soul-draft', { direction });
      const form = $('#soul-form');
      const set = (name, value) => { const el = form.elements[name]; if (el) el.value = value ?? ''; };
      set('beliefs', (draft.beliefs || []).join('\n'));
      set('banned', (draft.banned || []).join('\n'));
      set('tone_rules', (draft.tone_rules || []).join('\n'));
      set('signature_moves', (draft.signature_moves || []).join('\n'));
      set('golden_examples', goldenToText(draft.golden_examples || []));
      if (status) status.textContent = draft.ai ? 'AI 已起草，请逐项审核；确认后点“保存灵魂档案”。' : '本地脚手架已填，请补充。';
      toast('AI 已起草灵魂档案，请审核');
    } catch (err) {
      if (status) status.textContent = err.message;
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'AI 起草灵魂档案';
    }
  });
}


// ---------- template library ----------
async function renderTemplates() {
  setNav('templates'); setCrumb('工作台 / 内容资产 / 模板库');
  const data = await api('/api/templates');
  const themes = data.themes || [];
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">TEMPLATES / 模板库</p><h1 class="page-title">不是模板商店，<br>是品牌系列。</h1><p class="page-sub">每个主题可以复用；每个预设包含页数、转场、动效和音乐。选中后只改视觉，不改内容。</p></div>
      <div class="head-actions"><span class="tag lime">3 主题 · 6 预设</span></div>
    </div>
    <div class="template-stats"><div><b>${themes.length}</b><span>品牌主题</span></div><div><b>${data.templates?.length || 0}</b><span>模板预设</span></div><div><b>3–6</b><span>可复用页数</span></div></div>
    ${themes.map(theme => `<div class="template-family">
      <div class="template-family-head"><div><strong>${esc(theme.name)}</strong><span>${esc(theme.desc)}</span></div><span class="tag">${theme.presets.length} 个预设</span></div>
      <div class="template-presets">${theme.presets.map(p => `<div class="template-preset">
        <div class="template-thumb ${esc(theme.id)}"><span>${esc(theme.name.split(' ')[0].toUpperCase())}</span><b>${esc(p.pages)} 页</b></div>
        <div class="template-meta"><strong>${esc(p.name)}</strong><small>${p.pages} 页 · ${esc(p.transition)} · ${esc(p.motion)}</small><div class="tag-row mt-8">${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div><button class="btn btn-sm mt-8" data-action="use-template" data-id="${esc(p.id)}" data-theme="${esc(theme.id)}" data-pages="${p.pages}" data-name="${esc(p.name)}">使用这个预设</button></div>
      </div>`).join('')}</div>
    </div>`).join('')}`;
}

// ---------- element library ----------
async function renderElements() {
  setNav('elements'); setCrumb('工作台 / 内容资产 / 元素库');
  const data = await api('/api/elements');
  const elements = data.elements || [];
  const assets = await api('/api/element-assets').catch(() => ({ doodles: [], lotties: [] }));
  const doodles = assets.doodles || [];
  const lotties = assets.lotties || [];
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">ELEMENTS / 元素库</p><h1 class="page-title">不按物体分，<br>按视觉语法分。</h1><p class="page-sub">所有元素是无色 SVG。颜色由主题决定，运动由系统预设；人只选主题。</p></div>
      <div class="head-actions"><span class="tag lime">${elements.length} 个元素</span></div>
    </div>
    <div class="card"><div class="card-head"><div><h2 class="section-title">AI 补一个元素</h2><p class="section-sub">只生成无色 SVG；通过校验后入库，下次复用。</p></div></div><div class="card-body"><div class="flex gap-8"><input id="element-concept" placeholder="例如：沙箱围栏 / 审批闸门 / 对照天平" style="flex:1"><button class="btn btn-primary btn-sm" data-action="generate-element">AI 生成</button></div><p class="tiny mt-8">生成后不会直接进视频，先入库；匹配由系统决定。</p></div></div>
    <div class="template-stats"><div><b>${elements.length}</b><span>元素</span></div><div><b>${data.spec?.strokeWidth || 2}px</b><span>统一线宽</span></div><div><b>0</b><span>彩色资产</span></div></div>
    <div class="element-grid">${elements.map(e => `<div class="element-card">
      <div class="element-visual theme-preview-archive">${e.svg}</div>
      <div class="element-body"><div class="tag-row"><span class="tag">${esc(e.name)}</span><span class="tag">${esc(e.id)}</span></div><p class="tiny mt-8">${(e.tags || []).slice(0, 5).map(t => `#${esc(t)}`).join(' ')}</p><div class="tag-row mt-8">${(e.motion || []).map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div></div>
    </div>`).join('')}</div>
    <div class="card mt-16"><div class="card-head"><div><h2 class="section-title">手绘插画 / Lottie</h2><p class="section-sub">32 个 Open Doodles SVG + 9 个 Lottie，渲染时按文案关键词或随机抽取。</p></div></div><div class="card-body">
      <p class="tiny mb-8">手绘插画（SVG）</p>
      <div class="doodle-grid">${doodles.map(d => `<div class="doodle-card"><img src="/assets/${esc(d)}" alt="${esc(d)}"><span>${esc(d.replace(/^od_|\.svg$/g,''))}</span></div>`).join('')}</div>
      <p class="tiny mt-16 mb-8">Lottie 动画（JSON）</p>
      <div class="tag-row">${lotties.map(l => `<span class="tag">${esc(l.replace(/^lottie_|\.json$/g,''))}</span>`).join('')}</div>
    </div></div>
    <div class="note-box mt-16"><b>规则</b><br>64×64 · 单色 currentColor · 无填充 · 无渐变 · 无文字 · 主题负责颜色 · 元素不得进入文字安全区。</div>`;
}

// ---------- batch production ----------
async function renderBatch() {
  setNav('batch'); setCrumb('工作台 / 批量生产');
  const specs = await api('/api/batch/specs');
  const batches = await api('/api/batches');
  const active = batches.find(b => ['queued', 'running'].includes(b.status) || b.previewing);
  const items = Array.isArray(specs) ? specs : [];
  const briefBySpec = new Map(items.map(s => [s.spec_id, s.brief_id]));
  $('#view').innerHTML = `
    <div class="page-head"><div><p class="eyebrow">BATCH / 批量生产</p><h1 class="page-title">一次排队，<br>批量出片。</h1><p class="page-sub">选择已有文案，按顺序渲染；成片进入独立文件夹，完成后可整包下载。</p></div><div class="head-actions"><span class="tag lime">串行队列</span></div></div>
    <div class="card batch-create-card"><div class="card-head"><div><h2 class="section-title">批量新建</h2><p class="section-sub">每行：标题 | 话题 | 结构类型 | 主题 | 页数。留空用默认值。</p></div><span class="tag">AI 生成 + 排队</span></div><div class="card-body"><textarea id="batch-create-input" rows="4" placeholder="AI 搜索不是 AI 研究 | 快答案不等于可验证判断 | contrast | noir | 5
为什么用了 AI 还是慢 | 输入和验收没设计 | causal | earth | 5"></textarea><div class="flex mt-8"><button class="btn btn-primary btn-sm" data-action="start-batch-create">批量生成并排队</button><span class="tiny" id="batch-create-status">最多 10 条；会依次生成文案、金句、检查、渲染。</span></div></div></div>
    <div class="batch-grid">
      <div class="card"><div class="card-head"><div><h2 class="section-title">选择文案</h2><p class="section-sub">默认按最近更新排序；同一选题只取最新版本。</p></div><button class="btn btn-sm" data-action="select-all-batch">全选</button></div>
        <div class="card-body"><div class="batch-spec-list">${items.length ? items.map((s, i) => `<label class="batch-spec"><input type="checkbox" data-batch-spec="${esc(s.spec_id)}" ${i < 5 ? 'checked' : ''}><span><b>${esc(s.title)}</b><small>${s.page_count} 页 · ${esc(s.theme || 'archive')} · v${s.version}</small></span></label>`).join('') : '<p class="muted">还没有可渲染的文案。</p>'}</div>
        <div class="batch-start"><button class="btn btn-primary" data-action="start-batch">${active ? '加入渲染队列' : '开始批量渲染'}</button><span class="tiny">输出：data/batch-output/&lt;批次ID&gt;/</span></div></div>
      </div>
      <div class="card"><div class="card-head"><div><h2 class="section-title">批次记录</h2><p class="section-sub">队列会串行执行，避免同时抢 Chrome 和 ffmpeg。</p></div><button class="btn btn-sm" data-action="refresh-batches">刷新</button></div><div class="card-body">${batches.length ? batches.map(b => `<div class="batch-row"><div class="batch-row-head"><strong>${esc(b.id)}</strong><span class="tag ${b.status === 'done' ? 'lime' : ''}">${esc(b.status)}</span>${b.app_version ? `<span class="tag">v${esc(b.app_version)}</span>` : ''}</div><div class="batch-items">${(b.items || []).map(x => `<div><span>${esc(x.title)}</span>${x.preview_paths?.[0] ? `<a href="/${esc(x.preview_paths[0])}" target="_blank" rel="noopener"><img class="batch-preview" src="/${esc(x.preview_paths[0])}" alt="预览"></a>` : ''}${x.brief_id ? `<button class="btn btn-sm" data-action="batch-compare" data-brief="${esc(x.brief_id)}" data-spec="${esc(x.spec_id)}">对比</button>` : ''}${(x.review_status === 'changes_requested' || x.status === 'changes_requested') && (x.brief_id || briefBySpec.get(x.spec_id)) ? `<a class="tiny" href="#/brief/${esc(x.brief_id || briefBySpec.get(x.spec_id))}">去修改</a>` : ''}<span class="tag">${x.content_schema_version === 2 ? 'v2' : 'legacy'}</span><em>${esc(x.preview_status === 'ready' ? 'preview' : x.status)}</em></div>`).join('')}</div><div class="batch-row-foot"><span class="tiny">${esc(b.dir || '')}</span>${['queued', 'running'].includes(b.status) ? `<button class="btn btn-sm" data-action="cancel-batch" data-id="${esc(b.id)}">取消批次</button>` : ''}${!b.previewing && !['queued', 'running'].includes(b.status) ? `<button class="btn btn-sm" data-action="batch-preview" data-id="${esc(b.id)}">批量预览</button><button class="btn btn-sm" data-action="rerender-batch" data-id="${esc(b.id)}">重新渲染</button>` : ''}${b.status === 'done' ? `<button class="btn btn-sm" data-action="batch-review" data-id="${esc(b.id)}" data-decision="approved">批量通过</button><button class="btn btn-sm" data-action="batch-review" data-id="${esc(b.id)}" data-decision="changes_requested">批量退回</button>` : ''}${b.status === 'failed' || b.status === 'partial' ? `<button class="btn btn-sm" data-action="retry-batch" data-id="${esc(b.id)}">重试失败项</button>` : ''}${b.status !== 'queued' && b.status !== 'running' ? `<button class="btn btn-sm" data-action="delete-batch" data-id="${esc(b.id)}">删除批次</button>` : ''}${b.zip ? `<a class="btn btn-sm btn-primary" href="/${esc(b.zip)}" download>下载整包 ZIP</a>` : ''}</div></div>`).join('') : '<p class="muted">还没有批次。</p>'}</div></div>
    </div>`;
  if (active && !state.batchPoll) {
    state.batchPoll = setInterval(async () => {
      try {
        const list = await api('/api/batches');
        if (!list.some(b => ['queued', 'running'].includes(b.status) || b.previewing)) {
          clearInterval(state.batchPoll); state.batchPoll = null;
          if (location.hash.startsWith('#/batch')) route();
        }
      } catch {}
    }, 2500);
  }
}

async function openSpecCompare(briefId, specId) {
  try {
    const brief = await api(`/api/briefs/${briefId}`);
    const specs = [...(brief.specs || [])].sort((a, b) => Number(a.version) - Number(b.version));
    const current = specs.find(s => s.id === specId) || specs[specs.length - 1];
    const previous = specs.filter(s => Number(s.version) < Number(current.version)).pop() || current;
    const card = (title, s) => {
      const j = s.spec_json || {};
      return `<div class="compare-col"><span class="tag">${esc(title)} · v${esc(s.version)}</span>
        <h3>${esc(j.context?.title || '未填写')}</h3>
        <p>${(j.page1?.lines || []).map(x => esc(x)).join('<br>')}</p>
        <small>Highlight：${esc(j.page1?.highlight || '')}</small>
        <small>schema：${esc(String(j.content_schema_version || 'legacy'))}</small>
      </div>`;
    };
    openModal({
      title: '新旧版本对比', subtitle: brief.title,
      wide: true,
      body: `<div class="compare-grid">${card('旧版', previous)}${card('新版', current)}</div>`,
      foot: `<button class="btn" data-action="close-modal">关闭</button>`
    });
  } catch (err) { toast(err.message, 'error'); }
}

// ---------- music library ----------
const MUSIC_CATEGORIES = ['科技', '叙事', '轻快', '紧张', '其他'];

function musicCategoryOptions(selected = '其他') {
  return MUSIC_CATEGORIES.map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
}

function openMusicUpload() {
  openModal({
    title: '上传音乐',
    subtitle: '音乐是内容资产，不是设置项；分类和标签会参与 AI 选曲。',
    body: `<form id="music-upload-form"><div class="form-grid">
      <div class="field full"><label>音乐文件</label><input type="file" name="file" accept=".wav,.mp3,.m4a,.aac" required></div>
      <div class="field"><label>名称</label><input name="name" placeholder="例如：Pulse Tight 126"></div>
      <div class="field"><label>分类</label><select name="category">${musicCategoryOptions()}</select></div>
      <div class="field"><label>BPM</label><input name="bpm" type="number" min="40" max="220" placeholder="120"></div>
      <div class="field"><label>标签（逗号分隔）</label><input name="tags" placeholder="自动化, 发布, 效率"></div>
    </div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="music-upload-form">上传到音乐库</button>`,
    onMount: () => {
      $('#music-upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const file = fd.get('file');
        if (!file || !file.size) return toast('先选择一个音乐文件', 'error');
        try {
          const res = await fetch('/api/music/upload', {
            method: 'POST',
            headers: {
              'content-type': file.type || 'application/octet-stream',
              'x-filename': encodeURIComponent(file.name),
              'x-music-name': encodeURIComponent(String(fd.get('name') || file.name)),
              'x-music-category': encodeURIComponent(String(fd.get('category') || '其他')),
              'x-music-tags': encodeURIComponent(String(fd.get('tags') || '')),
              'x-music-bpm': String(fd.get('bpm') || '')
            },
            body: file
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || '上传失败');
          closeModal(); toast('音乐已加入库'); route();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

function openMusicEdit(id) {
  const t = (state.musicLibrary || []).find(x => x.id === id);
  if (!t || t.builtin) return;
  openModal({
    title: '编辑音乐信息',
    subtitle: '改分类、BPM、标签，AI 选曲会立即使用这些信息。',
    body: `<form id="music-edit-form"><div class="form-grid">
      <div class="field full"><label>名称</label><input name="name" value="${esc(t.name)}"></div>
      <div class="field"><label>分类</label><select name="category">${musicCategoryOptions(t.category)}</select></div>
      <div class="field"><label>BPM</label><input name="bpm" type="number" min="40" max="220" value="${Number(t.bpm) || ''}"></div>
      <div class="field full"><label>标签（逗号分隔）</label><input name="tags" value="${esc((t.tags || []).join(', '))}"></div>
    </div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="music-edit-form">保存修改</button>`,
    onMount: () => {
      $('#music-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await patch('/api/music/' + encodeURIComponent(id), {
            name: fd.get('name'), category: fd.get('category'),
            bpm: fd.get('bpm'), tags: fd.get('tags')
          });
          closeModal(); toast('音乐信息已更新'); route();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

function playMusic(id) {
  const t = (state.musicLibrary || []).find(x => x.id === id);
  if (!t) return;
  if (state.musicAudio) { state.musicAudio.pause(); state.musicAudio = null; }
  const audio = new Audio(`/api/music/${encodeURIComponent(id)}/audio`);
  state.musicAudio = audio;
  audio.play().then(() => toast(`试听：${t.name}`)).catch(() => toast('浏览器阻止了播放，再点一次', 'error'));
  audio.addEventListener('ended', () => { state.musicAudio = null; });
}

function musicRecoCard(t, isMain = false) {
  return `<div class="music-reco ${isMain ? 'main' : ''}">
    <div class="music-reco-head"><span class="tag ${isMain ? 'lime' : ''}">${isMain ? '建议' : '备选'}</span><strong>${esc(t.name)}</strong><span class="tiny">${esc(t.category)} · ${t.bpm || '—'} BPM</span></div>
    <div class="tiny">${(t.tags || []).map(x => `#${esc(x)}`).join(' ')}</div>
    <p>${esc((t.reasons || []).join('；'))}</p>
    <div class="flex mt-8"><button class="btn btn-sm" data-action="play-music" data-id="${esc(t.id)}">试听</button><button class="btn btn-sm btn-primary" data-action="choose-music" data-id="${esc(t.id)}">用这首</button></div>
  </div>`;
}

async function renderMusic() {
  setNav('music'); setCrumb('工作台 / 内容资产 / 音乐库');
  const lib = await api('/api/music');
  state.musicLibrary = lib.tracks || [];
  const briefs = await api('/api/briefs').catch(() => []);
  const tracks = state.musicLibrary;
  const q = state.musicQuery.trim().toLowerCase();
  const filtered = tracks.filter(t => {
    if (state.musicFilter !== 'all' && t.category !== state.musicFilter) return false;
    if (!q) return true;
    return [t.name, t.category, ...(t.tags || [])].join(' ').toLowerCase().includes(q);
  });
  const uploaded = tracks.filter(t => !t.builtin).length;
  const cats = MUSIC_CATEGORIES;
  const targets = briefs.filter(b => b.latest_spec?.id);
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">MUSIC / 音乐库</p><h1 class="page-title">音乐不是设置，是内容资产。</h1><p class="page-sub">分类、BPM、标签决定 AI 的选曲建议；最终用哪首，由人确认。</p></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="upload-music">+ 上传音乐</button></div>
    </div>
    <div class="music-stats">
      <div><strong>${tracks.length}</strong><span>全部曲目</span></div>
      <div><strong>${uploaded}</strong><span>已上传</span></div>
      <div><strong>${cats.length}</strong><span>分类</span></div>
      <div><strong>${tracks.filter(t => t.bpm).length}</strong><span>标注 BPM</span></div>
    </div>
    <div class="music-layout">
      <div class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">曲目</h2><p class="section-sub">按分类筛选，或搜索名称/标签。</p></div><span class="tag">${filtered.length} 首</span></div>
          <div class="card-body">
            <div class="music-toolbar">
              <input id="music-search" value="${esc(state.musicQuery)}" placeholder="搜索名称、标签、分类…">
              <div class="music-tabs">
                <button class="chip ${state.musicFilter === 'all' ? 'on' : ''}" data-action="filter-music" data-cat="all">全部</button>
                ${cats.map(c => `<button class="chip ${state.musicFilter === c ? 'on' : ''}" data-action="filter-music" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
              </div>
            </div>
            <div class="music-table">
              <div class="music-head"><span></span><span>曲目</span><span>分类</span><span>BPM</span><span>来源</span><span></span></div>
              ${filtered.length ? filtered.map(t => `<div class="music-track">
                <button class="music-play" data-action="play-music" data-id="${esc(t.id)}" title="试听">▶</button>
                <div class="music-name"><strong>${esc(t.name)}</strong><div class="music-tags">${(t.tags || []).map(x => `<span>#${esc(x)}</span>`).join('')}</div></div>
                <span class="music-cat">${esc(t.category || '其他')}</span>
                <span class="music-bpm">${t.bpm || '—'}</span>
                <span class="music-source">${t.builtin ? '内置' : '已上传'}</span>
                <div class="music-actions">${t.builtin ? '' : `<button class="btn btn-sm" data-action="edit-music" data-id="${esc(t.id)}">编辑</button><button class="btn btn-sm btn-danger" data-action="delete-music" data-id="${esc(t.id)}">删除</button>`}</div>
              </div>`).join('') : `<div class="empty"><h3>没有匹配的曲目</h3><p>换一个筛选，或上传一首新音乐。</p><button class="btn btn-sm" data-action="upload-music">上传音乐</button></div>`}
            </div>
          </div>
        </div>
      </div>
      <aside class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">AI 选曲建议</h2><p class="section-sub">先给 1 个建议，再给最多 2 个备选；用哪首由你确认。</p></div><span class="tag lime">人工确认</span></div>
          <div class="card-body">
            <div class="field"><label>这条内容讲什么</label><textarea id="music-brief" rows="3" placeholder="例如：给买 NAS 的人讲自动化发布，冷静、有推进感，不要太燃。"></textarea></div>
            <div class="field"><label>偏好分类</label><select id="music-pref"><option value="">自动</option>${musicCategoryOptions('')}</select></div>
            <div class="field"><label>应用到选题（可选）</label><select id="music-target"><option value="">只确认，不写入选题</option>${targets.map(b => `<option value="${esc(b.id)}" data-spec="${esc(b.latest_spec.id)}">${esc(b.title)}</option>`).join('')}</select></div>
            <button class="btn btn-primary btn-sm" data-action="recommend-music">生成选曲建议</button>
            <div id="music-reco" class="mt-12"><div class="note-box">AI 会按分类、BPM 和标签匹配，给出 1 个建议 + 2 个备选。不会自动改文案。</div></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">分类怎么用</h2></div></div>
          <div class="card-body"><div class="music-legend">
            <p><b>科技</b> 推进、干净、适合效率/工具。</p>
            <p><b>叙事</b> 慢、留白、适合观点/故事。</p>
            <p><b>轻快</b> 明亮、适合生活/清单。</p>
            <p><b>紧张</b> 冲突、适合误区/风险。</p>
          </div></div>
        </div>
      </aside>
    </div>`;
}

async function runMusicRecommend() {
  const text = String($('#music-brief')?.value || '').trim();
  const category = String($('#music-pref')?.value || '');
  const box = $('#music-reco');
  if (box) box.innerHTML = `<div class="loading-inline"><span class="spinner"></span> 正在匹配分类、BPM 和标签…</div>`;
  try {
    const r = await post('/api/music/recommend', { text, category });
    if (!r.recommended) {
      if (box) box.innerHTML = `<div class="note-box">音乐库还是空的，先上传一首。</div>`;
      return;
    }
    if (box) {
      const alts = r.alternatives || [];
      box.innerHTML = `${musicRecoCard(r.recommended, true)}
        ${alts.length ? `<div class="tiny mt-12">另外 ${alts.length} 个备选：</div>${alts.map(t => musicRecoCard(t, false)).join('')}` : ''}
        ${alts.length < 2 ? `<div class="note-box mt-12">音乐库目前只有 ${r.total} 首可用曲目，备选不足 2 首。上传更多曲目后，AI 会自动补齐。</div>` : ''}`;
    }
  } catch (err) {
    if (box) box.innerHTML = `<div class="note-box red">${esc(err.message)}</div>`;
  }
}

async function chooseMusic(id) {
  const t = (state.musicLibrary || []).find(x => x.id === id);
  if (!t) return;
  const target = $('#music-target');
  const briefId = target?.value || '';
  if (!briefId) {
    toast(`已确认：${t.name}。去选题的「视频音乐」里选这首。`);
    return;
  }
  try {
    const brief = await api('/api/briefs/' + encodeURIComponent(briefId));
    const specId = target.selectedOptions[0]?.dataset.spec;
    const spec = (brief.specs || []).find(s => s.id === specId) || brief.specs?.[0];
    if (!spec) throw new Error('这条选题还没有文案');
    const sj = spec.spec_json || {};
    sj.music = t.id;
    sj.music_reason = `音乐库人工确认：${t.name}（${t.category}${t.bpm ? ' · ' + t.bpm + ' BPM' : ''}）`;
    await patch('/api/specs/' + encodeURIComponent(spec.id), { spec: sj });
    toast(`已把「${t.name}」写入选题 BGM，重新渲染后生效`);
  } catch (err) { toast(err.message, 'error'); }
}

// ---------- settings ----------
async function renderSettings() {
  setNav('settings'); setCrumb('工作台 / 设置');
  const s = state.settings || await api('/api/settings');
  state.settings = s;
  const musicLib = await api('/api/music').catch(() => ({ tracks: [] }));
  state.musicLibrary = musicLib.tracks || [];
  const fontData = await api('/api/fonts').catch(() => ({ fonts: [] }));
  const fontList = fontData.fonts || [];
  const fontOpts = (cur) => fontList.map(f => `<option value="${esc(f)}" ${f === cur ? 'selected' : ''}>${esc(f)}</option>`).join('') || `<option value="${esc(cur)}">${esc(cur)}</option>`;
  $('#view').innerHTML = `
    <div class="page-head">
      <div><p class="eyebrow">SETTINGS / 设置</p><h1 class="page-title">把发布出口固定下来。</h1><p class="page-sub">公众号 API 需要认证服务号 + 固定公网 IP 白名单；视频号目前没有官方内容发布 API，走人工最后确认。</p></div>
    </div>
    <div class="settings-grid">
      <div class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">渠道账号（公众号 / 视频号）</h2><p class="section-sub">每个账号组是一个品牌，公众号和视频号挂在同一组下。</p></div><div class="flex"><button class="btn btn-sm" type="button" data-action="add-account-group">新增账号组</button><button class="btn btn-sm btn-primary" type="button" data-action="add-wechat-account">新增渠道</button></div></div>
          <div class="card-body">
            <div class="wx-group-list">
              ${(s.account_groups || []).map(g => `
                <div class="wx-group-block" style="--wx:${esc(g.color || '#C73520')}">
                  <div class="wx-group-head">
                    <span class="wx-dot" style="background:${esc(g.color || '#C73520')}"></span>
                    <div class="wx-group-main"><strong>${esc(g.name)}</strong><small>${esc(g.description || '公众号 + 视频号')}</small></div>
                    ${g.is_default ? '<span class="tag lime">默认账号组</span>' : `<button class="btn btn-sm" type="button" data-action="set-default-group" data-id="${esc(g.id)}">设为默认</button>`}
                    <button class="btn btn-sm" type="button" data-action="add-channel" data-group="${esc(g.id)}">+ 渠道</button>
                    <button class="btn btn-sm" type="button" data-action="edit-account-group" data-id="${esc(g.id)}">编辑</button>
                  </div>
                  <div class="wx-group-channels">
                    ${(g.channels || []).map(a => `
                      <div class="wx-account">
                        <span class="wx-dot" style="background:${esc(a.color || g.color || '#C73520')}"></span>
                        <div class="wx-main">
                          <div class="wx-title"><strong>${esc(a.name || '未命名')}</strong><span class="tag">${a.platform === 'xiaohongshu' ? '小红书' : a.platform === 'douyin' ? '抖音' : a.platform === 'wechat_channels' ? '视频号' : '公众号'}</span>${a.is_default ? '<span class="tag lime">默认</span>' : ''}</div>
                          <div class="wx-sub">${a.channel === 'wechat_channels' ? '人工发布空间' : esc(a.appid || '') + ' · ' + (a.secret_set ? 'Secret 已保存' : '未填 Secret')}${a.dry_run ? ' · Dry-run' : ''}</div>
                        </div>
                        <div class="wx-actions">
                          <button class="btn btn-sm" type="button" data-action="edit-wechat-account" data-id="${esc(a.id)}">编辑</button>
                          ${a.is_default ? '' : `<button class="btn btn-sm" type="button" data-action="set-default-account" data-id="${esc(a.id)}">设为默认</button>`}
                          ${a.channel === 'wechat_article' ? `<button class="btn btn-sm" type="button" data-action="test-wechat" data-id="${esc(a.id)}">测试</button>` : ''}
                          <button class="btn btn-sm danger" type="button" data-action="delete-wechat-account" data-id="${esc(a.id)}">删除</button>
                        </div>
                      </div>`).join('') || '<p class="tiny mb-0">这个账号组还没有渠道。</p>'}
                  </div>
                </div>`).join('') || '<p class="tiny mb-0">还没有账号组。</p>'}
            </div>
            <div class="divider"></div>
            <h3 class="section-title">AI 写作（可选）</h3>
            <p class="tiny mt-12">不配置也能用：系统会用本地脚手架生成可编辑文案。配置后，角度卡和三页文案会调用 OpenAI 兼容接口。远程模型需要 API Key；本机 localhost 的模型可以留空。</p>
            <form id="settings-form">
              <div class="form-grid mt-12">
                <div class="field"><label>Base URL</label><input name="llm_base_url" value="${esc(s.llm_base_url)}" placeholder="https://api.deepseek.com"></div>
                <div class="field"><label>Model</label><input name="llm_model" value="${esc(s.llm_model)}" placeholder="deepseek-chat"></div>
                <div class="field full"><label>API Key</label><input name="llm_api_key" type="password" value="" placeholder="${s.llm_api_key_set ? '已保存，留空不修改' : 'sk-...'}"></div>
              </div>
              <div class="flex mt-16"><button class="btn btn-primary" type="submit">保存设置</button><button class="btn" type="button" data-action="test-llm">测试模型连接</button><button class="btn" type="button" data-action="check-ip">查看出口 IP</button><span class="tiny" id="llm-status"></span><span class="tiny mono" id="egress-ip"></span></div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">蚁小二发布方式</h2><p class="section-sub">只给标记为“蚁小二”的渠道使用。主号仍走直连或人工。</p></div><span class="tag ${s.yixiaoer_api_key_set || s.yixiaoer_authorization_set ? 'lime' : ''}">${s.yixiaoer_api_key_set || s.yixiaoer_authorization_set ? '已配置' : '未配置'}</span></div>
          <div class="card-body">
            <form id="provider-form">
              <div class="form-grid">
                <div class="field"><label>BASE URL</label><input name="yixiaoer_base_url" value="${esc(s.yixiaoer_base_url || 'https://open-api.yixiaoer.cn')}"></div>
                <div class="field"><label>发布方式</label><select name="yixiaoer_publish_channel"><option value="cloud" ${(s.yixiaoer_publish_channel || 'cloud') === 'cloud' ? 'selected' : ''}>cloud · 云端</option><option value="local" ${s.yixiaoer_publish_channel === 'local' ? 'selected' : ''}>local · 本机</option></select></div>
                <div class="field full"><label>API KEY</label><input name="yixiaoer_api_key" type="password" value="" placeholder="${s.yixiaoer_api_key_set ? '已保存，留空不修改' : '只保存在本地数据库'}"></div>
                <div class="field full"><label>AUTHORIZATION</label><input name="yixiaoer_authorization" type="password" value="" placeholder="${s.yixiaoer_authorization_set ? '已保存，留空不修改' : '如果使用 authorization token 就填这里'}"></div>
              </div>
              <div class="flex mt-16"><button class="btn btn-primary" type="submit">保存发布方式</button><span class="tiny" id="provider-status">${s.yixiaoer_api_key_set || s.yixiaoer_authorization_set ? '凭证已保存在本地' : '还没有蚁小二凭证'}</span></div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">公众号排版</h2><p class="section-sub">当前版本已冻结，不再随视频/音乐改版。</p></div><span class="tag lime">${esc(s.article_style_version || 'wechat_article_v1')} · 已冻结</span></div>
          <div class="card-body"><p class="tiny mb-0">冻结内容：系列标签 / Lead / Highlight / 小节编号 / 引用 / CTA / 主条+次条呼应。后续只改视频动效与音乐，不改这套文章排版。</p></div>
        </div>

        <div class="card">
          <div class="card-head"><div><h2 class="section-title">音乐库</h2><p class="section-sub">音乐已作为独立内容资产移到「音乐库」菜单。</p></div><span class="tag">${state.musicLibrary.length} 轨</span></div>
          <div class="card-body"><p class="tiny mb-0">在音乐库里管理分类、BPM、标签、试听和 AI 选曲建议。这里只保留入口，不再重复维护。</p><a class="btn btn-sm mt-12" href="#/music">打开音乐库</a></div>
        </div>

      </div>

      <div class="stack">
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">视频引擎 / TTS</h2><p class="section-sub">自动生成模式使用 VibeMotion + 语音。</p></div><span class="tag lime">奶油纸 · 已锁定</span></div>
          <div class="card-body">
            <form id="engine-settings-form">
              <div class="form-grid">
                <div class="field"><label>标题字体</label><select name="font_heading">${fontOpts(s.font_heading || 'ZCOOL KuaiLe')}</select></div>
                <div class="field"><label>正文字体</label><select name="font_body">${fontOpts(s.font_body || 'LXGW WenKai')}</select></div>
                <div class="field"><label>渲染服务地址</label><input name="render_service_url" value="${esc(s.render_service_url || 'http://127.0.0.1:5001')}"></div>
                <div class="field"><label>默认引擎</label><select name="engine_default"><option value="vibemotion" ${(s.engine_default || 'vibemotion') === 'vibemotion' ? 'selected' : ''}>VibeMotion（讲解式 / 固定页式）</option><option value="template" ${s.engine_default === 'template' ? 'selected' : ''}>旧模板（4/5/6 页）</option></select></div>
                <div class="field"><label>默认生成模式</label><select name="engine_default_mode"><option value="auto" ${(s.engine_default_mode || 'auto') === 'auto' ? 'selected' : ''}>自动：直接出片</option><option value="manual" ${s.engine_default_mode === 'manual' ? 'selected' : ''}>人工：先确认分镜</option></select></div>
                <div class="field"><label>TTS 供应商</label><select name="tts_provider"><option value="none" ${(s.tts_provider || 'none') === 'none' ? 'selected' : ''}>暂未接入（字幕版）</option><option value="mock" ${s.tts_provider === 'mock' ? 'selected' : ''}>测试语音（静音）</option><option value="openai_compat" ${s.tts_provider === 'openai_compat' ? 'selected' : ''}>OpenAI 兼容</option><option value="volcano" ${s.tts_provider === 'volcano' ? 'selected' : ''}>火山引擎 · 声音克隆</option><option value="minimax" ${s.tts_provider === 'minimax' ? 'selected' : ''}>MiniMax</option><option value="iflytek" ${s.tts_provider === 'iflytek' ? 'selected' : ''}>讯飞</option><option value="siliconflow" ${s.tts_provider === 'siliconflow' ? 'selected' : ''}>硅基流动</option></select></div>
                <div class="field"><label>TTS Base URL</label><input name="tts_base_url" value="${esc(s.tts_base_url || '')}" placeholder="OpenAI 兼容时填"></div>
                <div class="field"><label>TTS Model</label><input name="tts_model" value="${esc(s.tts_model || '')}" placeholder="tts-1"></div>
                <div class="field"><label>声音 / 音色 ID（voice_type）</label><input name="tts_voice" value="${esc(s.tts_voice || '')}" placeholder="火山：你克隆后的 voice_type"></div>
                <div class="field"><label>火山引擎 AppID</label><input name="tts_appid" value="${esc(s.tts_appid || '')}" placeholder="火山引擎控制台的 AppID"></div>
                <div class="field"><label>TTS API Key</label><input name="tts_api_key" type="password" value="" placeholder="${s.tts_api_key_set ? '已保存，留空不修改' : '只保存在本地数据库'}"></div>
              </div>
              <div class="flex mt-16"><button class="btn btn-primary" type="submit">保存视频引擎设置</button></div>
            </form>
            <div class="note-box mt-12">声音克隆服务与 API 待配置；未配置时自动生成仍可用，只有字幕、无口播。</div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">当前模板</h2></div></div>
          <div class="card-body">
            <dl class="kv-grid">
              <dt>模板</dt><dd>Hybrid PageFrame · v2.2</dd>
              <dt>尺寸</dt><dd>1080 × 1920</dd>
              <dt>页数</dt><dd>4 / 5 / 6 页</dd>
              <dt>时长</dt><dd>20 / 24 / 28 秒 / 30fps</dd>
              <dt>视觉</dt><dd>旧背景 + 旧元素 + v2 文字排版</dd>
              <dt>渲染</dt><dd>HTML/CSS → Chrome → ffmpeg</dd>
            </dl>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h2 class="section-title">部署提示</h2></div></div>
          <div class="card-body">
            <div class="note-box"><strong>本地先用。</strong> 数据在 <span class="mono">studio/data</span>，视频在 <span class="mono">data/media</span>，发布包在 <span class="mono">data/publish-kits</span>。备份整个 <span class="mono">data</span> 目录即可。</div>
            <div class="note-box red mt-12"><strong>正式发布前：</strong> 先在公众号后台配置 IP 白名单，再用“测试公众号连接”验证 access_token。不要在没有 dry-run 的情况下直接点发布。</div>
          </div>
        </div>
      </div>

      <div class="card span-full">
        <div class="card-head"><div><h2 class="section-title">发布适配器</h2></div></div>
        <div class="card-body">
          <div class="setting-row"><div class="setting-copy"><strong>公众号 · 官方 API</strong><span>草稿 / 发布走官方接口。视频素材限制 MP4 ≤10MB；视频嵌入正文需要真实账号验证。</span></div><span class="tag lime">可自动</span></div>
          <div class="setting-row"><div class="setting-copy"><strong>视频号 · 发布包</strong><span>官方 API 目录目前没有视频发布接口。平台生成 MP4 + 封面 + 标题/描述/标签，运营在视频号助手 1 分钟上传。</span></div><span class="tag">人工确认</span></div>
          <div class="setting-row"><div class="setting-copy"><strong>小红书 · 发布包</strong><span>同一 9:16 成片 + 3:4 封面 + 标题/标签，平台生成发布包，运营在小红书后台手动发布。</span></div><span class="tag">人工确认</span></div>
          <div class="setting-row"><div class="setting-copy"><strong>固定公网 IP</strong><span>公众号 API 白名单只认固定出口。部署到云服务器后，把 EIP 填进公众号后台；NAS 的动态 IP 不适合做发布出口。</span></div><span class="tag">必需</span></div>
        </div>
      </div>
    </div>`;
}

function openWechatAccountModal(id = '', groupId = '') {
  const a = (state.settings?.wechat_accounts || []).find(x => x.id === id) || {};
  const group = groupId || a.group_id || (state.settings?.account_groups || [])[0]?.id || '';
  openModal({
    title: a.id ? '编辑渠道' : '新增渠道',
    subtitle: '渠道挂在账号组下面。一个账号组可以有公众号和视频号。',
    body: `
      <form id="wechat-account-form">
        <input type="hidden" name="id" value="${esc(a.id || '')}">
        <input type="hidden" name="group_id" value="${esc(group)}">
        <div class="form-grid">
          <div class="field"><label>所属账号组</label><input value="${esc((state.settings?.account_groups || []).find(g => g.id === group)?.name || '默认账号组')}" disabled></div>
          <div class="field"><label>平台</label><select name="platform"><option value="wechat_article" ${(a.platform || a.channel || 'wechat_article') === 'wechat_article' ? 'selected' : ''}>公众号</option><option value="wechat_channels" ${(a.platform || a.channel) === 'wechat_channels' ? 'selected' : ''}>视频号</option><option value="xiaohongshu" ${(a.platform || a.channel) === 'xiaohongshu' ? 'selected' : ''}>小红书</option><option value="douyin" ${(a.platform || a.channel) === 'douyin' ? 'selected' : ''}>抖音</option></select></div>
          <div class="field"><label>发布方式</label><select name="provider"><option value="direct" ${(a.provider || 'direct') === 'direct' ? 'selected' : ''}>直连 API</option><option value="manual" ${a.provider === 'manual' ? 'selected' : ''}>人工发布</option><option value="yixiaoer" ${a.provider === 'yixiaoer' ? 'selected' : ''}>蚁小二</option></select></div>
          <div class="field"><label>渠道名称（醒目）</label><input name="name" value="${esc(a.name || '')}" placeholder="例如：小红书副号 A" required></div>
          <div class="field"><label>标识颜色</label><input name="color" type="color" value="${esc(a.color || '#C73520')}"></div>
          <div class="field full"><label>蚁小二账号 ID <span class="tiny">（provider=蚁小二时填）</span></label><input name="provider_account_id" value="${esc(a.provider_account_id || '')}" placeholder="xhs_acct_001"></div>
          <div class="field full"><label>AppID <span class="tiny">（公众号必填，视频号可空）</span></label><input name="appid" value="${esc(a.appid || '')}" placeholder="wx..."></div>
          <div class="field full"><label>AppSecret</label><input name="secret" type="password" value="" placeholder="${a.secret_set ? '已保存，留空不修改' : '只保存在本地数据库'}"></div>
          <div class="field"><label>作者</label><input name="author" value="${esc(a.author || '')}" placeholder="固定地址"></div>
          <div class="field"><label>简介</label><input name="description" value="${esc(a.description || '')}" placeholder="这个渠道的主题范围"></div>
          <div class="field"><label>默认渠道</label><label class="switch"><input type="checkbox" name="is_default" ${a.is_default ? 'checked' : ''}><span class="tiny">同类型任务默认选中</span></label></div>
          <div class="field"><label>Dry-run</label><label class="switch"><input type="checkbox" name="dry_run" ${a.dry_run !== false ? 'checked' : ''}><span class="tiny">只模拟发布，不调用微信</span></label></div>
          <div class="field"><label>自动提交</label><label class="switch"><input type="checkbox" name="auto_submit" ${a.auto_submit ? 'checked' : ''}><span class="tiny">创建草稿后自动提交发布</span></label></div>
        </div>
      </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="wechat-account-form">保存</button>`,
    onMount: () => {
      const form = $('#wechat-account-form');
      const channelSelect = form?.querySelector('[name="platform"]');
      const syncCredentialFields = () => {
        const isArticle = channelSelect?.value === 'wechat_article';
        const appidField = form?.querySelector('[name="appid"]')?.closest('.field');
        const secretField = form?.querySelector('[name="secret"]')?.closest('.field');
        if (appidField) appidField.style.display = isArticle ? '' : 'none';
        if (secretField) secretField.style.display = isArticle ? '' : 'none';
      };
      channelSelect?.addEventListener('change', syncCredentialFields);
      syncCredentialFields();
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const id = fd.get('id');
        const body = {
          name: fd.get('name'), appid: fd.get('appid'), author: fd.get('author'),
          color: fd.get('color'), channel: fd.get('platform'), platform: fd.get('platform'),
          provider: fd.get('provider'), provider_account_id: fd.get('provider_account_id'),
          description: fd.get('description'), group_id: fd.get('group_id'),
          is_default: form.querySelector('[name="is_default"]').checked,
          dry_run: form.querySelector('[name="dry_run"]').checked,
          auto_submit: form.querySelector('[name="auto_submit"]').checked
        };
        if (fd.get('secret')) body.secret = fd.get('secret');
        try {
          if (id) await put(`/api/wechat-accounts/${encodeURIComponent(id)}`, body);
          else await post('/api/wechat-accounts', body);
          toast('渠道已保存');
          closeModal();
          await refreshWechatStatus();
          route();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }
  });
}

function openAccountGroupModal(id = '') {
  const g = (state.settings?.account_groups || []).find(x => x.id === id) || {};
  openModal({
    title: g.id ? '编辑账号组' : '新增账号组',
    subtitle: '一个账号组代表一个品牌，下面挂公众号和视频号。',
    body: `<form id="account-group-form"><input type="hidden" name="id" value="${esc(g.id || '')}"><div class="form-grid">
      <div class="field"><label>账号组名称</label><input name="name" value="${esc(g.name || '')}" placeholder="例如：固定地址" required></div>
      <div class="field"><label>标识颜色</label><input name="color" type="color" value="${esc(g.color || '#C73520')}"></div>
      <div class="field full"><label>简介</label><input name="description" value="${esc(g.description || '')}" placeholder="这个品牌的选题范围"></div>
      <div class="field"><label>默认账号组</label><label class="switch"><input type="checkbox" name="is_default" ${g.is_default ? 'checked' : ''}><span class="tiny">进入账号页默认打开</span></label></div>
    </div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="account-group-form">保存</button>`,
    onMount: () => {
      const form = $('#account-group-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const gid = fd.get('id');
        const body = { name: fd.get('name'), color: fd.get('color'), description: fd.get('description'), is_default: form.querySelector('[name="is_default"]').checked };
        try {
          if (gid) await put(`/api/account-groups/${encodeURIComponent(gid)}`, body);
          else await post('/api/account-groups', body);
          toast('账号组已保存'); closeModal(); await refreshWechatStatus(); route();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

// ---------- new brief modal ----------
function openNewBrief(accountId = '') {
  state.selectedStructure = null;
  state.structureOptions = [];
  state.newBriefAccountId = accountId;
  openModal({
    title: '新建选题',
    subtitle: '先给任务书，系统再出角度卡。',
    wide: true,
    body: `
      <form id="new-brief-form">
        <div class="form-grid">
          <div class="field full"><label>先给一个方向，再诊断结构</label><textarea name="direction" id="brief-direction" rows="2" placeholder="一句话方向，例如：解释为什么自动化发布要放云服务器，用邮局寄信做类比，给已经买 NAS 的人看。"></textarea><div class="flex mt-8"><button class="btn btn-sm" type="button" id="diagnose-structure">诊断结构</button><button class="btn btn-sm" type="button" id="ai-fill-brief">AI 预填表格</button><span class="tiny" id="ai-fill-status">先选结构，再填表；结构决定这条内容怎么讲。</span></div><div id="structure-options" class="mt-12"></div><div id="structure-selected" class="tiny mt-8"></div></div>
          <div class="field full"><label>标题</label><input name="title" required placeholder="例如：为什么自动化发布必须放在云服务器" autofocus></div>
          <div class="field full"><label>话题 / 要讲清楚什么</label><textarea name="topic" required placeholder="用一两句话说清楚：给谁看、要打破什么误解、最后落到什么结论。"></textarea></div>
          <div class="field"><label>受众</label><input name="audience" placeholder="例如：已经买了 NAS 的内容创作者"></div>
          <div class="field"><label>候选角度数量</label><input name="quantity" type="number" min="1" max="6" value="3"></div>
          <div class="field full"><label>类比方向（逗号或换行分隔）</label><input name="analogy_domains" placeholder="邮局寄信，公司前台/助理"></div>
          <div class="field"><label>必须出现</label><textarea name="must_include" placeholder="固定公网 IP&#10;NAS 替代不了"></textarea></div>
          <div class="field"><label>必须避免</label><textarea name="must_avoid" placeholder="绝对化承诺&#10;未证实的平台政策"></textarea></div>
          <div class="field"><label>语气</label><input name="tone" placeholder="冷静、类比、结论明确"></div>
          <div class="field"><label>CTA</label><input name="cta" placeholder="关注，领取部署清单"></div>
          <div class="field"><label>截止时间</label><input name="deadline" type="datetime-local"></div>
          <div class="field full"><label>发布渠道</label><div class="flex"><label class="check-row"><input type="checkbox" name="channels" value="wechat_channels" checked> 视频号</label><label class="check-row"><input type="checkbox" name="channels" value="wechat_article"> 公众号</label></div></div>
          <div class="field full"><label>主账号</label><select name="account_id">${(state.settings?.wechat_accounts || []).map(a => `<option value="${esc(a.id)}" ${(state.newBriefAccountId ? a.id === state.newBriefAccountId : (a.channel === 'wechat_channels' && a.is_default)) ? 'selected' : ''}>${a.platform === 'xiaohongshu' ? '小红书' : a.platform === 'douyin' ? '抖音' : a.platform === 'wechat_channels' ? '视频号' : '公众号'} · ${esc(a.name)}</option>`).join('')}</select><div class="tiny mt-8">一条内容只归一个主账号，避免发错空间。</div></div>
        </div>
      </form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="new-brief-form" id="create-brief-btn">创建并生成角度</button>`,
    onMount: () => {
      const form = $('#new-brief-form');
      let structureOptions = [];
      let selectedStructure = null;
      const optionsBox = $('#structure-options');
      const selectedBox = $('#structure-selected');
      const renderOptions = () => {
        if (!optionsBox) return;
        optionsBox.innerHTML = structureOptions.length ? structureOptions.map((s, i) => `
          <div class="structure-option ${selectedStructure === s ? 'selected' : ''}" data-index="${i}">
            <div class="structure-option-head"><span class="tag">${esc(structureTypeLabel(s.structure_type))}</span><strong>${esc(s.title)}</strong></div>
            <div class="tiny">${esc(s.source_domain || '源域')} → ${esc(s.target_domain || '目标域')} · ${(s.mapping || []).length} 条映射</div>
            <p>${esc(s.reason || s.signature || '')}</p>
          </div>`).join('') : '';
        if (selectedBox) selectedBox.textContent = selectedStructure ? `已选结构：${selectedStructure.title}` : '还没有选结构。可以先诊断，也可以不选直接创建。';
      };
      optionsBox?.addEventListener('click', (e) => {
        const card = e.target.closest('[data-index]');
        if (!card) return;
        selectedStructure = structureOptions[Number(card.dataset.index)] || null;
        state.selectedStructure = selectedStructure;
        renderOptions();
      });
      $('#diagnose-structure')?.addEventListener('click', async () => {
        const direction = String($('#brief-direction')?.value || '').trim();
        if (!direction) return toast('先写一个方向', 'error');
        const btn = $('#diagnose-structure');
        const status = $('#ai-fill-status');
        btn.disabled = true; btn.textContent = '诊断中…';
        if (status) status.textContent = '正在从结构库里找映射，并给出备选…';
        try {
          const r = await post('/api/ai/structure-diagnosis', { direction });
          structureOptions = r.structures || [];
          selectedStructure = null;
          state.structureOptions = structureOptions;
          renderOptions();
          if (status) status.textContent = `给出 ${structureOptions.length} 个结构方案，选一个再创建。`;
        } catch (err) {
          if (status) status.textContent = err.message;
          toast(err.message, 'error');
        } finally {
          btn.disabled = false; btn.textContent = '诊断结构';
        }
      });
      $('#ai-fill-brief')?.addEventListener('click', async () => {
        const direction = String($('#brief-direction')?.value || '').trim();
        if (!direction) return toast('先写一个方向', 'error');
        const btn = $('#ai-fill-brief');
        const status = $('#ai-fill-status');
        btn.disabled = true; btn.textContent = 'AI 填写中…';
        if (status) status.textContent = '正在生成任务书…';
        try {
          const { draft } = await post('/api/ai/brief-draft', { direction });
          const set = (name, value) => { const el = form.elements[name]; if (el) el.value = value ?? ''; };
          set('title', draft.title);
          set('topic', draft.topic);
          set('audience', draft.audience);
          set('analogy_domains', (draft.analogy_domains || []).join('，'));
          set('must_include', draft.must_include);
          set('must_avoid', draft.must_avoid);
          set('tone', draft.tone);
          set('cta', draft.cta);
          set('quantity', draft.quantity || 3);
          const wanted = new Set(draft.channels || []);
          form.querySelectorAll('input[name="channels"]').forEach(cb => { cb.checked = wanted.has(cb.value); });
          if (status) status.textContent = draft.ai ? 'AI 已填，确认/修改后点“创建并生成角度”。' : '本地脚手架已填，确认/修改后创建。';
          toast('AI 已填表，请确认');
        } catch (err) {
          if (status) status.textContent = err.message;
          toast(err.message, 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'AI 预填表格';
        }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('#create-brief-btn');
        btn.disabled = true; btn.textContent = '创建中…';
        const fd = new FormData(form);
        const channels = [...form.querySelectorAll('input[name="channels"]:checked')].map(x => x.value);
        let domains = String(fd.get('analogy_domains') || '').split(/[,，\n]/).map(x => x.trim()).filter(Boolean);
        if (!domains.length && selectedStructure) {
          domains = [selectedStructure.source_domain, selectedStructure.target_domain].filter(Boolean);
        }
        const body = {
          title: fd.get('title'),
          topic: fd.get('topic'),
          audience: fd.get('audience'),
          quantity: Number(fd.get('quantity')) || 3,
          analogy_domains: domains,
          structure_id: selectedStructure?.id || '',
          structure_name: selectedStructure?.title || '',
          structure_type: selectedStructure?.structure_type || '',
          structure_snapshot: selectedStructure || null,
          must_include: fd.get('must_include'),
          must_avoid: fd.get('must_avoid'),
          tone: fd.get('tone'),
          cta: fd.get('cta'),
          deadline: fd.get('deadline'),
          channels: channels.length ? channels : ['wechat_channels'],
          account_id: fd.get('account_id') || ''
        };
        try {
          const brief = await post('/api/briefs', body);
          await post(`/api/briefs/${brief.id}/angles`, {});
          closeModal();
          toast('选题已创建，角度卡已生成');
          navigate(`/brief/${brief.id}`);
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = '创建并生成角度';
        }
      });
    }
  });
}

// ---------- actions ----------
async function startRender(specId, mode) {
  try {
    const check = await post(`/api/specs/${specId}/check`, {});
    if (!check.ok) {
      openModal({
        title: '先补全文案',
        subtitle: '这些是明显缺字/缺页，不会进入渲染。',
        body: `<div class="preflight-issues">${(check.errors || []).map(i => `<div class="issue-row critical"><span class="issue-sev">缺</span><div><strong>${esc(i.field)}</strong><p>${esc(i.message)}</p></div></div>`).join('')}</div>`,
        foot: `<button class="btn" data-action="close-modal">知道了</button>`
      });
      return;
    }
    if ((check.warnings || []).length) toast(`文案检查：${check.warnings.length} 个提醒，先继续`, 'warn');
    const endpoint = mode === 'themes' ? 'theme-previews' : (mode === 'preview' ? 'preview' : 'render');
    const r = await post(`/api/specs/${specId}/${endpoint}`, {});
    toast(mode === 'themes' ? '三主题预览已排队' : (mode === 'preview' ? '预览已排队，几秒后出帧' : '成片已排队，约 3–5 分钟'));
    const panel = $('#render-panel');
    if (panel) panel.innerHTML = `<div class="progress"><i id="render-progress-bar" style="width:0%"></i></div><div class="progress-label"><span id="render-progress-label">排队中</span><span>0%</span></div><div class="loading-inline mt-12"><span class="spinner"></span> 正在准备渲染…</div>`;
    watchRender(r.id, mode);
  } catch (e) { toast(e.message, 'error'); }
}

function watchRender(renderId, mode) {
  const timer = setInterval(async () => {
    try {
      const data = await api('/api/renders/' + renderId);
      const r = data.render;
      const bar = $('#render-progress-bar');
      const label = $('#render-progress-label');
      if (bar) bar.style.width = `${r.progress || 0}%`;
      if (label) label.textContent = statusLabel(r.status);
      if (['preview_ready', 'rendered', 'failed'].includes(r.status)) {
        clearInterval(timer);
        state.pollTimers = state.pollTimers.filter(t => t !== timer);
        if (r.status === 'failed') {
          toast('渲染失败：' + (r.error || '未知错误'), 'error');
          route();
        } else {
          toast(mode === 'preview' ? '预览帧已生成' : '成片渲染完成');
          route();
        }
      }
    } catch (e) {
      clearInterval(timer);
      state.pollTimers = state.pollTimers.filter(t => t !== timer);
    }
  }, 2200);
  state.pollTimers.push(timer);
}

async function submitReview(id, decision) {
  const checks = [...document.querySelectorAll('[data-check]:checked')].map(x => x.dataset.check);
  if (decision === 'approved' && checks.length < 5) {
    toast('请先勾选全部 5 项审批清单', 'error');
    return;
  }
  const comment = $('#review-comment')?.value || '';
  try {
    await post(`/api/renders/${id}/review`, {
      decision,
      reviewer: state.settings?.operator_name || '主编',
      checklist: checks,
      comment
    });
    toast(decision === 'approved' ? '已通过，去发布页创建任务' : '已退回修改');
    navigate(decision === 'approved' ? '/publish' : '/briefs');
  } catch (e) { toast(e.message, 'error'); }
}

async function createKit(renderId, channel, accountId = '') {
  try {
    if ((channel === 'wechat_article' || channel === 'wechat_channels') && !accountId) {
      const s = state.settings || await api('/api/settings');
      state.settings = s;
      const accounts = (s.wechat_accounts || []).filter(a => a.channel === channel);
      if (accounts.length > 1) { openWechatAccountPicker(renderId, channel); return; }
      accountId = accounts[0]?.id || '';
    }
    const res = await post(`/api/renders/${renderId}/publish-kit`, { channel, account_id: accountId });
    toast(channel === 'wechat_channels' ? '视频号发布包已生成' : '公众号任务已创建');
    if (channel === 'wechat_channels') {
      openModal({
        title: '视频号发布包已生成',
        subtitle: '素材全自动，最后一步在视频号助手完成。',
        body: `<div class="note-box"><strong>下一步：</strong> 打开视频号助手，上传 video.mp4，封面用 cover.png，标题/描述/标签复制 metadata.json。发布完成后回到发布页点“标记已发布”。</div><div class="flex mt-16"><a class="btn btn-primary" href="/kits/${esc(renderId)}-${esc(channel)}/video.mp4" target="_blank" rel="noreferrer">打开 MP4</a><a class="btn" href="/kits/${esc(renderId)}-${esc(channel)}/cover.png" target="_blank" rel="noreferrer">打开封面</a><a class="btn" href="#/publish" data-action="close-modal">去发布页</a></div>`,
        foot: `<button class="btn" data-action="close-modal">关闭</button>`
      });
    } else {
      navigate('/publish');
    }
  } catch (e) { toast(e.message, 'error'); }
}

function openWechatAccountPicker(renderId, channel = 'wechat_article') {
  const accounts = (state.settings?.wechat_accounts || []).filter(a => a.channel === channel);
  openModal({
    title: channel === 'wechat_channels' ? '选择发布视频号' : '选择发布公众号',
    subtitle: '颜色和名字用于防止发错。确认后再生成发布任务。',
    body: `<div class="wx-pick-list">${accounts.map(a => `
      <button class="wx-pick" type="button" data-action="pick-account" data-render="${esc(renderId)}" data-channel="${esc(channel)}" data-id="${esc(a.id)}">
        <span class="wx-dot" style="background:${esc(a.color || '#C73520')}"></span>
        <span class="wx-pick-main"><strong>${esc(a.name)}</strong><small>${esc(a.appid || (a.channel === 'wechat_channels' ? '视频号' : ''))}${a.is_default ? ' · 默认' : ''}</small></span>
      </button>`).join('')}</div>`,
    foot: `<button class="btn" data-action="close-modal">取消</button>`
  });
}

function openBriefAccountModal(briefId) {
  const brief = state.brief?.brief || {};
  const accounts = state.settings?.wechat_accounts || [];
  openModal({
    title: '更换归属账号',
    subtitle: '内容会移动到目标账号空间；已有的同类发布任务也会一起转移。',
    body: `<form id="brief-account-form"><input type="hidden" name="brief_id" value="${esc(briefId)}"><div class="field"><label>目标账号</label><select name="account_id">${accounts.map(a => `<option value="${esc(a.id)}" ${brief.account_id === a.id ? 'selected' : ''}>${a.platform === 'xiaohongshu' ? '小红书' : a.platform === 'douyin' ? '抖音' : a.platform === 'wechat_channels' ? '视频号' : '公众号'} · ${esc(a.name)}</option>`).join('')}</select></div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="brief-account-form">确认更换</button>`
  });
}

function openMarkPublished(pubId) {
  openModal({
    title: '标记已发布',
    subtitle: '把视频号链接或公众号文章链接填回来，方便复盘。',
    body: `<form id="mark-pub-form"><div class="field"><label>发布链接</label><input name="url" placeholder="https://..." autofocus></div><div class="field mt-12"><label>外部 ID（可选）</label><input name="external_id" placeholder="视频号 / 公众号后台的 ID"></div></form>`,
    foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="mark-pub-form">标记已发布</button>`,
    onMount: () => {
      $('#mark-pub-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await post(`/api/publications/${pubId}/mark-published`, { url: fd.get('url'), external_id: fd.get('external_id') });
          closeModal(); toast('已标记发布'); route();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });
}

async function publishWechat(pubId) {
  try {
    const res = await post(`/api/publications/${pubId}/publish-wechat`, {});
    if (res.dry_run) {
      openModal({
        title: 'Dry-run 完成',
        subtitle: '没有调用微信接口。',
        body: `<div class="note-box">${esc(res.note || '')}</div><div class="mt-16">${(res.steps || []).map(s => `<div class="check-item"><div><strong>${esc(s.step)}</strong><small>${esc(s.detail || '')}</small></div></div>`).join('')}</div>`,
        foot: `<button class="btn" data-action="close-modal">关闭</button>`
      });
    } else {
      toast('公众号草稿已创建');
      route();
    }
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- global events ----------
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'music-search' && e.key === 'Enter') {
    state.musicQuery = e.target.value;
    renderMusic();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'music-search') {
    state.musicQuery = e.target.value;
    renderMusic();
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.name === 'style') {
    document.querySelectorAll('.style-card').forEach(c => c.classList.toggle('sel', c.querySelector('input') === e.target));
  }
});

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (el) {
    const action = el.dataset.action;
    if (action === 'new-brief') {
      e.preventDefault();
      const def = state.settings?.engine_default || 'vibemotion';
      navigate(def === 'template' ? '/create' : '/autogen');
      return;
    }
    if (action === 'edit-video-task') { e.preventDefault(); openEditVideoTask(el.dataset.id); return; }
    if (action === 'open-vtask-publish') { e.preventDefault(); openVtaskPublish(el.dataset.id); return; }
    if (action === 'publish-video-task') {
      e.preventDefault();
      try { await post(`/api/video-tasks/${encodeURIComponent(el.dataset.id)}/publish-ready`, {}); toast('已标记待发布'); renderWorkbench(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'wb-tab') { e.preventDefault(); state.wbTab = el.dataset.tab; renderWorkbench(); return; }
    if (action === 'ai-draft-script') {
      e.preventDefault();
      const title = document.querySelector('#workbench-form input[name="title"]')?.value || '';
      const structure = document.querySelector('#workbench-form select[name="structure_type"]')?.value || 'causal';
      if (!title) { toast('先填标题，再让 AI 写文案', 'error'); return; }
      const box = $('#workbench-script');
      if (box) box.value = 'AI 正在写…';
      try {
        const r = await post('/api/ai/draft-script', { title, structure_type: structure });
        if (box && r.script) box.value = r.script;
        toast('AI 文案已生成，可修改后生成');
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'open-autogen') { e.preventDefault(); openAutogenNew(); return; }
    if (action === 'open-asset-upload') { e.preventDefault(); openAssetUpload(); return; }
    if (action === 'archive-asset') {
      e.preventDefault();
      try { await post(`/api/media-assets/${encodeURIComponent(el.dataset.id)}/archive`, {}); renderAssets(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'asset-search') {
      e.preventDefault();
      const q = document.querySelector('#asset-search')?.value || '';
      renderAssets({ q }); return;
    }
    if (action === 'asset-group') {
      e.preventDefault();
      renderAssets({ group: el.dataset.group || '' }); return;
    }
    if (action === 'asset-archived-toggle') {
      e.preventDefault();
      renderAssets({ archived: !state.assetArchived }); return;
    }
    if (action === 'open-voice-upload') { e.preventDefault(); openVoiceUpload(); return; }
    if (action === 'open-channel-add') { e.preventDefault(); openChannelAdd(); return; }
    if (action === 'toggle-channel') {
      e.preventDefault();
      try { await post(`/api/channels/${encodeURIComponent(el.dataset.id)}/toggle`, {}); renderChannels(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'delete-channel') {
      e.preventDefault();
      if (!confirm('删除这个渠道？')) return;
      try { await post(`/api/channels/${encodeURIComponent(el.dataset.id)}/delete`, {}); toast('已删除'); renderChannels(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'archive-voice') {
      e.preventDefault();
      try { await post(`/api/voice-assets/${encodeURIComponent(el.dataset.id)}/archive`, {}); renderVoices(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'voice-search') {
      e.preventDefault();
      renderVoices({ q: document.querySelector('#voice-search')?.value || '' }); return;
    }
    if (action === 'voice-group') {
      e.preventDefault();
      renderVoices({ group: el.dataset.group || '' }); return;
    }
    if (action === 'voice-archived-toggle') {
      e.preventDefault();
      renderVoices({ archived: !state.voiceArchived }); return;
    }
    if (action === 'delete-voice') {
      e.preventDefault();
      if (!confirm('删除这段声音？')) return;
      try { await post(`/api/voice-assets/${encodeURIComponent(el.dataset.id)}/delete`, {}); toast('已删除'); renderVoices(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'delete-asset') {
      e.preventDefault();
      if (!confirm('删除这张素材？')) return;
      try { await post(`/api/media-assets/${encodeURIComponent(el.dataset.id)}/delete`, {}); toast('已删除'); renderAssets(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'cancel-video-task') {
      e.preventDefault();
      try { await post(`/api/video-tasks/${encodeURIComponent(el.dataset.id)}/cancel`, {}); toast('已取消'); renderAutogen(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'retry-video-task') {
      e.preventDefault();
      try { await post(`/api/video-tasks/${encodeURIComponent(el.dataset.id)}/retry`, {}); toast('已重新入队'); renderAutogen(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'confirm-video-task') {
      e.preventDefault();
      try { await post(`/api/video-tasks/${encodeURIComponent(el.dataset.id)}/confirm`, {}); toast('已确认，开始生成'); renderAutogen(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'vtask-review') {
      e.preventDefault();
      const decision = el.dataset.decision || 'approved';
      try { await post(`/api/video-tasks/${encodeURIComponent(el.dataset.id)}/review`, { decision }); toast(decision === 'changes_requested' ? '已退回' : '已通过'); route(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'new-brief-account') { e.preventDefault(); openNewBrief(el.dataset.id || ''); return; }
    if (action === 'filter-structure') {
      e.preventDefault();
      state.structureFilter = el.dataset.type || 'all';
      renderAnalogies();
      return;
    }
    if (action === 'create-check-direction') { e.preventDefault(); checkCreateDirection(); return; }
    if (action === 'check-create-structure') { e.preventDefault(); checkCreateStructure(); return; }
    if (action === 'create-apply-rewrite') {
      e.preventDefault();
      const d = $('#create-direction');
      if (d) d.value = state.createRewrite || d.value;
      const box = $('#create-check-result');
      if (box) box.innerHTML = `<div class="note-box">已应用改写。可以再检查一次，或直接诊断结构。</div>`;
      return;
    }
    if (action === 'create-diagnose') { e.preventDefault(); diagnoseCreate(); return; }
    if (action === 'create-ai-fill') { e.preventDefault(); fillCreateBrief(); return; }
    if (action === 'create-clear-structure') { e.preventDefault(); state.createSelected = null; renderCreateOptions(); return; }
    if (action === 'create-select-structure') {
      e.preventDefault();
      state.createSelected = state.createOptions[Number(el.dataset.index)] || null;
      renderCreateOptions();
      autoDraftBriefForStructure();
      return;
    }
    if (action === 'create-save-structure') {
      e.preventDefault();
      saveCreateStructure(el.dataset.index);
      return;
    }
    if (action === 'close-modal') { e.preventDefault(); closeModal(); return; }
    if (action === 'reload') { route(); return; }
    if (action === 'toggle-source') {
      e.preventDefault();
      $('#source-form')?.classList.toggle('hidden');
      return;
    }
    if (action === 'auto-pipeline') {
      e.preventDefault();
      el.disabled = true; el.innerHTML = '<span class="spinner"></span> 自动生成中…';
      try {
        await post(`/api/briefs/${el.dataset.id}/angles`, { regenerate: true });
        await post(`/api/briefs/${el.dataset.id}/spec`, {});
        toast('候选已生成：角度 + 文案');
        await route();
      } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'generate-angles') {
      e.preventDefault();
      el.disabled = true; el.innerHTML = '<span class="spinner"></span> 生成中…';
      try {
        await post(`/api/briefs/${el.dataset.id}/angles`, { regenerate: true });
        toast('角度已生成'); route();
      } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'generate-spec') {
      e.preventDefault();
      el.disabled = true; el.innerHTML = '<span class="spinner"></span> 生成中…';
      try {
        await post(`/api/briefs/${el.dataset.id}/spec`, {});
        toast('三页文案已生成'); route();
      } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'select-angle') {
      e.preventDefault();
      try { await post(`/api/angles/${el.dataset.id}/select`, {}); toast('已选择这个角度'); route(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'preview' || action === 'render') {
      e.preventDefault();
      startRender(el.dataset.spec, action);
      return;
    }
    if (action === 'generate-element') {
      e.preventDefault();
      const input = $('#element-concept');
      const concept = String(input?.value || '').trim();
      if (!concept) return toast('先写一个概念', 'error');
      el.disabled = true; el.innerHTML = '<span class="spinner"></span> 生成中…';
      try {
        const r = await post('/api/ai/element-draft', { concept });
        state.elementCandidate = r.element;
        openModal({
          title: '元素候选',
          subtitle: '无色 SVG；通过校验后才会入库。',
          body: `<div class="element-preview-modal"><div class="element-visual theme-preview-archive">${r.element.svg}</div><p class="tiny mt-8">${esc(r.element.name)} · ${(r.element.tags || []).map(t => '#' + esc(t)).join(' ')}</p></div>`,
          foot: `<button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-element">存入元素库</button>`
        });
      } catch (err) { toast(err.message, 'error'); }
      el.disabled = false; el.textContent = 'AI 生成';
      return;
    }
    if (action === 'save-element') {
      e.preventDefault();
      const c = state.elementCandidate;
      if (!c) return;
      try {
        await post('/api/elements', c);
        closeModal();
        toast('元素已入库');
        state.elementCandidate = null;
        await route();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'select-all-batch') {
      e.preventDefault();
      document.querySelectorAll('[data-batch-spec]').forEach(x => x.checked = true);
      return;
    }
    if (action === 'refresh-batches') { e.preventDefault(); route(); return; }
    if (action === 'rerender-batch') {
      e.preventDefault();
      if (!confirm('用当前模板重新渲染整个批次？旧 MP4 会被覆盖。')) return;
      const id = el.dataset.id;
      el.disabled = true;
      try { await post(`/api/batches/${id}/rerender`, {}); toast('批次已重新入队'); await route(); }
      catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'batch-compare') {
      e.preventDefault();
      openSpecCompare(el.dataset.brief, el.dataset.spec);
      return;
    }
    if (action === 'batch-preview') {
      e.preventDefault();
      const id = el.dataset.id;
      el.disabled = true;
      try { await post(`/api/batches/${id}/preview`, {}); toast('批量预览已开始'); await route(); }
      catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'batch-review') {
      e.preventDefault();
      const id = el.dataset.id;
      const decision = el.dataset.decision;
      if (decision === 'changes_requested' && !confirm('退回这个批次里的所有已渲染成片？')) return;
      el.disabled = true;
      try {
        const r = await post(`/api/batches/${id}/review`, { decision, reviewer: '批量审批', comment: decision === 'approved' ? '批量通过' : '批量退回' });
        toast(`已处理 ${r.reviewed} 条，跳过 ${r.skipped} 条`);
        await route();
      } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'cancel-batch') {
      e.preventDefault();
      const id = el.dataset.id;
      el.disabled = true;
      try { await post(`/api/batches/${id}/cancel`, {}); toast('批次已取消'); await route(); }
      catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'delete-batch') {
      e.preventDefault();
      if (!confirm('删除批次目录和 ZIP？不可恢复。')) return;
      const id = el.dataset.id;
      el.disabled = true;
      try { await api(`/api/batches/${id}`, { method: 'DELETE' }); toast('批次已删除'); await route(); }
      catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'retry-batch') {
      e.preventDefault();
      const id = el.dataset.id;
      el.disabled = true;
      try { await post(`/api/batches/${id}/retry`, {}); toast('已重试失败项'); await route(); }
      catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'start-batch-create') {
      e.preventDefault();
      const raw = String($('#batch-create-input')?.value || '').trim();
      const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 10);
      if (!lines.length) return toast('先写至少一行选题', 'error');
      const status = $('#batch-create-status');
      el.disabled = true; el.innerHTML = '<span class="spinner"></span> 批量生成中…';
      const specIds = [];
      const errors = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('|').map(x => x.trim());
        const [title, topic, structureType, theme, pages] = parts;
        if (!title || !topic) { errors.push(`第 ${i + 1} 行缺少标题或话题`); continue; }
        if (status) status.textContent = `正在生成 ${i + 1}/${lines.length}：${title.slice(0, 24)}`;
        try {
          const brief = await post('/api/briefs', {
            title, topic, audience: '需要重复使用 AI 的人', quantity: 3,
            page_count: Number(pages) || 5,
            theme: ['archive', 'terminal', 'editorial', 'noir', 'earth'].includes(theme) ? theme : 'archive',
            structure_type: ['analogy', 'contrast', 'causal', 'misconception', 'boundary', 'checklist'].includes(structureType) ? structureType : 'analogy',
            structure_name: '', structure_snapshot: null,
            must_include: '', must_avoid: '绝对化承诺；未验证事实',
            channels: ['wechat_channels'], cta: '关注固定地址'
          });
          const angleList = await post(`/api/briefs/${brief.id}/angles`, { regenerate: true });
          const angle = angleList.find(x => x.selected) || angleList[0];
          let spec = null;
          let check = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt && status) status.textContent = `第 ${i + 1} 条偏题，自动重写…`;
            spec = await post(`/api/briefs/${brief.id}/spec`, attempt ? { angle_id: angle?.id } : {});
            const quotes = await post('/api/ai/quote-candidates', { spec_id: spec.id });
            const latest = await api(`/api/briefs/${brief.id}`);
            const specJson = latest.latest_spec.spec_json;
            specJson.quote = quotes.candidates?.[0];
            await patch(`/api/specs/${spec.id}`, { spec: specJson });
            check = await post(`/api/specs/${spec.id}/check`, {});
            if (check.ok && (!check.relevance || check.relevance.ok)) break;
            spec = null;
          }
          if (!spec || !check) throw new Error('自动重写两次仍不通过');
          if (!check.ok) throw new Error((check.errors || []).map(x => x.message).join('；'));
          if (check.relevance && !check.relevance.ok) {
            throw new Error(`文案可能偏题（关键词命中 ${check.relevance.hits.length}/${check.relevance.words.length}），自动重写后仍拦截`);
          }
          specIds.push(spec.id);
        } catch (err) {
          errors.push(`第 ${i + 1} 行：${err.message}`);
        }
      }
      if (!specIds.length) {
        toast(errors[0] || '没有生成成功', 'error');
        el.disabled = false; el.textContent = '批量生成并排队';
        return;
      }
      const batch = await post('/api/batches', { spec_ids: specIds });
      toast(`批次已创建：${batch.id}，${specIds.length} 条${errors.length ? `，${errors.length} 行失败` : ''}`);
      await route();
      return;
    }
    if (action === 'start-batch') {
      e.preventDefault();
      const ids = [...document.querySelectorAll('[data-batch-spec]:checked')].map(x => x.dataset.batchSpec);
      if (!ids.length) return toast('先选择至少一条文案', 'error');
      el.disabled = true; el.innerHTML = '<span class="spinner"></span> 创建批次…';
      try {
        const b = await post('/api/batches', { spec_ids: ids });
        toast('批次已创建，开始排队');
        await route();
      } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'use-template') {
      e.preventDefault();
      state.templatePreset = {
        id: el.dataset.id,
        theme: el.dataset.theme,
        pages: Number(el.dataset.pages) || 4,
        name: el.dataset.name
      };
      navigate('/create');
      return;
    }
    if (action === 'choose-theme') {
      e.preventDefault(); e.stopPropagation();
      const spec = state.brief?.specs?.find(s => s.id === el.dataset.spec);
      if (!spec) return toast('找不到文案版本', 'error');
      const next = JSON.parse(JSON.stringify(spec.spec_json || {}));
      next.theme = el.dataset.theme;
      try {
        await patch(`/api/specs/${el.dataset.spec}`, { spec: next });
        toast('已切换到 ' + el.dataset.theme);
        await route();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'theme-previews') { e.preventDefault(); startRender(el.dataset.spec, 'themes'); return; }
    if (action === 'gen-quote-candidates') { e.preventDefault(); generateQuoteCandidates(el.dataset.spec); return; }
    if (action === 'select-quote-candidate') { e.preventDefault(); selectQuoteCandidate(el.dataset.index); return; }
    if (action === 'cancel-render') {
      e.preventDefault();
      if (!confirm('停止当前渲染？已经生成的帧会被丢弃。')) return;
      try {
        const r = await post(`/api/renders/${encodeURIComponent(el.dataset.id)}/cancel`, {});
        toast(r?.stale ? '任务已重置' : '已停止');
      } catch (err) {
        toast(err.message, 'error');
      }
      await route();
      return;
    }
    if (action === 'preflight') {
      e.preventDefault();
      const id = el.dataset.id;
      el.disabled = true; el.textContent = '预检中…';
      try {
        await post(`/api/renders/${encodeURIComponent(id)}/preflight`, {});
        toast('机器预检完成');
        await route();
      } catch (err) {
        toast(err.message, 'error');
        el.disabled = false; el.textContent = '重新预检';
      }
      return;
    }
    if (action === 'review-approve') { e.preventDefault(); submitReview(el.dataset.id, 'approved'); return; }
    if (action === 'review-return') { e.preventDefault(); submitReview(el.dataset.id, 'changes_requested'); return; }
    if (action === 'create-kit') { e.preventDefault(); createKit(el.dataset.render, el.dataset.channel); return; }
    if (action === 'pick-account') { e.preventDefault(); closeModal(); createKit(el.dataset.render, el.dataset.channel || 'wechat_article', el.dataset.id); return; }
    if (action === 'switch-wechat-account') { e.preventDefault(); navigate('/wechat/' + encodeURIComponent(el.dataset.id)); return; }
    if (action === 'mark-published') { e.preventDefault(); openMarkPublished(el.dataset.id); return; }
    if (action === 'publish-wechat') { e.preventDefault(); publishWechat(el.dataset.id); return; }
    if (action === 'add-wechat-account') { e.preventDefault(); openWechatAccountModal('', el.dataset.group || ''); return; }
    if (action === 'add-account-group') { e.preventDefault(); openAccountGroupModal(''); return; }
    if (action === 'edit-account-group') { e.preventDefault(); openAccountGroupModal(el.dataset.id); return; }
    if (action === 'switch-account-group') { e.preventDefault(); navigate('/wechat/' + encodeURIComponent(el.dataset.id)); return; }
    if (action === 'set-default-group') {
      e.preventDefault();
      try { await post(`/api/account-groups/${encodeURIComponent(el.dataset.id)}/default`, {}); toast('已设为默认账号组'); await refreshWechatStatus(); route(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'add-channel') { e.preventDefault(); openWechatAccountModal('', el.dataset.group || ''); return; }
    if (action === 'new-brief-group') {
      e.preventDefault();
      const g = (state.settings?.account_groups || []).find(x => x.id === el.dataset.group);
      const channel = (g?.channels || []).find(c => c.channel === 'wechat_article') || (g?.channels || [])[0];
      if (!channel) { toast('先给这个账号组添加公众号或视频号渠道', 'error'); return; }
      openNewBrief(channel.id);
      return;
    }
    if (action === 'change-brief-account') { e.preventDefault(); openBriefAccountModal(el.dataset.id); return; }
    if (action === 'edit-wechat-account') { e.preventDefault(); openWechatAccountModal(el.dataset.id); return; }
    if (action === 'set-default-account') {
      e.preventDefault();
      try {
        await post(`/api/wechat-accounts/${encodeURIComponent(el.dataset.id)}/default`, {});
        toast('已设为默认公众号'); await refreshWechatStatus(); route();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'delete-wechat-account') {
      e.preventDefault();
      if (!confirm('删除这个公众号账号？删除后相关发布任务的账号标记会保留为历史记录，但不会再调用。')) return;
      try {
        await api(`/api/wechat-accounts/${encodeURIComponent(el.dataset.id)}`, { method: 'DELETE' });
        toast('已删除'); await refreshWechatStatus(); route();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'test-wechat') {
      e.preventDefault();
      const status = $('#settings-status');
      if (status) status.textContent = '测试中…';
      try {
        const r = await post('/api/settings/test-wechat', { account_id: el.dataset.id || '' });
        if (status) status.textContent = `连接成功 · ${r.account?.name || ''} · token尾号 ${r.token_tail}`;
        toast(`公众号「${r.account?.name || ''}」连接成功`);
      } catch (err) {
        if (status) status.textContent = '失败：' + err.message;
        toast(err.message, 'error');
      }
      return;
    }
    if (action === 'test-llm') {
      e.preventDefault();
      const status = $('#llm-status');
      if (status) status.textContent = '模型测试中…';
      try {
        const r = await post('/api/settings/test-llm', {});
        if (status) status.textContent = `连接成功 · ${r.model}`;
        toast('模型连接成功');
      } catch (err) {
        if (status) status.textContent = '失败：' + err.message;
        toast(err.message, 'error');
      }
      return;
    }
    if (action === 'scan-knowledge') {
      e.preventDefault();
      el.disabled = true;
      try {
        const r = await post('/api/knowledge/scan', {});
        toast(`扫描完成：新增 ${r.added} 条，跳过 ${r.skipped} 条`);
        route();
      } catch (err) { toast(err.message, 'error'); el.disabled = false; }
      return;
    }
    if (action === 'add-knowledge') { e.preventDefault(); openKnowledgeForm(); return; }
    if (action === 'open-knowledge') { e.preventDefault(); openKnowledgeItem(el.dataset.id); return; }
    if (action === 'delete-knowledge') {
      e.preventDefault();
      if (!confirm('删除这条资料和它的所有切块？')) return;
      try { await api('/api/knowledge/' + encodeURIComponent(el.dataset.id), { method: 'DELETE' }); toast('已删除'); route(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'upload-music') { e.preventDefault(); openMusicUpload(); return; }
    if (action === 'edit-music') { e.preventDefault(); openMusicEdit(el.dataset.id); return; }
    if (action === 'play-music') { e.preventDefault(); playMusic(el.dataset.id); return; }
    if (action === 'filter-music') {
      e.preventDefault();
      state.musicFilter = el.dataset.cat || 'all';
      renderMusic();
      return;
    }
    if (action === 'recommend-music') {
      e.preventDefault();
      runMusicRecommend();
      return;
    }
    if (action === 'choose-music') {
      e.preventDefault();
      chooseMusic(el.dataset.id);
      return;
    }
    if (action === 'delete-music') {
      e.preventDefault();
      if (!confirm('从音乐库删除这条上传？')) return;
      try { await api('/api/music/' + encodeURIComponent(el.dataset.id), { method: 'DELETE' }); toast('已删除'); route(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'clear-knowledge-search') { e.preventDefault(); renderKnowledge(); return; }
    if (action === 'new-analogy') { e.preventDefault(); openAnalogyForm(); return; }
    if (action === 'edit-analogy') { e.preventDefault(); openAnalogyForm(el.dataset.id); return; }
    if (action === 'delete-analogy') {
      e.preventDefault();
      if (!confirm('删除这个类比？')) return;
      try { await api('/api/analogies/' + encodeURIComponent(el.dataset.id), { method: 'DELETE' }); toast('已删除'); route(); }
      catch (err) { toast(err.message, 'error'); }
      return;
    }
    if (action === 'check-ip') {
      e.preventDefault();
      const el = $('#egress-ip');
      if (el) el.textContent = '查询中…';
      try {
        const r = await api('/api/egress-ip');
        if (el) el.textContent = r.ip || '未知';
        toast('出口 IP：' + (r.ip || '未知'));
      } catch (err) {
        if (el) el.textContent = '查询失败';
        toast(err.message, 'error');
      }
      return;
    }
    if (action === 'open-image') {
      e.preventDefault();
      openModal({ title: '预览帧', body: `<img src="${esc(el.dataset.src)}" style="width:100%;border-radius:10px;border:1px solid var(--line)">`, foot: `<button class="btn" data-action="close-modal">关闭</button>`, wide: true });
      return;
    }
  }

  const filterBrief = e.target.closest('[data-filter-brief]');
  if (filterBrief) { state.briefFilter = filterBrief.dataset.filterBrief; renderBriefs(); return; }
  const filterLib = e.target.closest('[data-filter-library]');
  if (filterLib) { state.libraryFilter = filterLib.dataset.filterLibrary; renderLibrary(); return; }

  const link = e.target.closest('a[href^="#/"]');
  if (link) return; // native hash routing
});

document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form.id === 'knowledge-search-form') {
    e.preventDefault();
    const q = $('#knowledge-search')?.value.trim() || '';
    renderKnowledge(q);
    return;
  }
  if (form.id === 'soul-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const lines = (v) => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
    try {
      await put('/api/soul', {
        beliefs: lines(fd.get('beliefs')),
        banned: lines(fd.get('banned')),
        tone_rules: lines(fd.get('tone_rules')),
        signature_moves: lines(fd.get('signature_moves')),
        golden_examples: textToGolden(fd.get('golden_examples'))
      });
      toast('灵魂档案已保存');
      route();
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
  if (form.id === 'source-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '保存中…';
    try {
      await post(`/api/briefs/${form.dataset.brief}/sources`, {
        url: fd.get('url'), title: fd.get('title'), text: fd.get('text')
      });
      toast('资料已保存'); route();
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '保存资料'; }
    return;
  }
  if (form.id === 'create-brief-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const channels = [...form.querySelectorAll('input[name="channels"]:checked')].map(x => x.value);
    let domains = String(fd.get('analogy_domains') || '').split(/[,，\n]/).map(x => x.trim()).filter(Boolean);
    if (!domains.length && state.createSelected) {
      domains = [state.createSelected.source_domain, state.createSelected.target_domain].filter(Boolean);
    }
    const body = {
      title: fd.get('title'), topic: fd.get('topic'), audience: fd.get('audience'),
      quantity: Number(fd.get('quantity')) || 3, analogy_domains: domains,
      must_include: fd.get('must_include'), must_avoid: fd.get('must_avoid'),
      tone: fd.get('tone'), cta: fd.get('cta'), deadline: '',
      channels: channels.length ? channels : ['wechat_channels'],
      page_count: Number(fd.get('page_count')) || 4,
      theme: fd.get('theme') || 'archive',
      template_id: state.templatePreset?.id || '',
      structure_id: state.createSelected?.id || '',
      structure_name: state.createSelected?.title || '',
      structure_type: state.createSelected?.structure_type || '',
      structure_snapshot: state.createSelected || null
    };
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = '创建中…'; }
    try {
      const brief = await post('/api/briefs', body);
      await post(`/api/briefs/${brief.id}/angles`, {});
      state.createSelected = null; state.createOptions = [];
      toast('选题已创建，结构已锁定');
      navigate(`/brief/${brief.id}`);
    } catch (err) {
      toast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '创建并生成角度'; }
    }
    return;
  }

  if (form.id === 'spec-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const id = form.dataset.spec;
    try {
      const current = state.brief?.specs?.find(s => s.id === id)?.spec_json || {};
      const spec = JSON.parse(JSON.stringify(current));
      spec.page1 = spec.page1 || {}; spec.page2 = spec.page2 || {}; spec.page3 = spec.page3 || {};
      Object.assign(spec.page1, {
        kicker: fd.get('p1_kicker'), kicker_accent: fd.get('p1_kicker_accent'),
        lines: [fd.get('p1_l1'), fd.get('p1_l2'), fd.get('p1_l3')].map(x => String(x || '')),
        quote_line2: form.querySelector('[name="p1_quote"]').checked,
        addr_label: fd.get('p1_addr'), highlight: fd.get('p1_highlight'),
        highlight_latin: fd.get('p1_latin'), en: fd.get('p1_en'),
        footnote: fd.get('p1_footnote'), stamp_line1: fd.get('p1_stamp1'), stamp_line2: fd.get('p1_stamp2')
      });
      Object.assign(spec.page2, {
        kicker: fd.get('p2_kicker'), kicker_accent: fd.get('p2_kicker_accent'),
        left_tag: fd.get('p2_left_tag'), left_thin: fd.get('p2_left_thin'),
        left_line1_rest: fd.get('p2_left_rest'), left_line2: fd.get('p2_left_line2'),
        left_stamp: fd.get('p2_left_stamp'), right_tag: fd.get('p2_right_tag'),
        right_prefix: fd.get('p2_right_prefix'), right_highlight: fd.get('p2_right_highlight'),
        right_badge: fd.get('p2_right_badge'), conclusion_small: fd.get('p2_conclusion_small'),
        conclusion_prefix: fd.get('p2_conclusion_prefix'), conclusion_highlight: fd.get('p2_conclusion_highlight'),
        footnote: fd.get('p2_footnote')
      });
      Object.assign(spec.page3, {
        title: fd.get('p3_title'), subtitle: fd.get('p3_subtitle'),
        note: fd.get('p3_note'), bottom: fd.get('p3_bottom')
      });
      const st = spec.structure_type || 'analogy';
      const pick = (prefix, count) => Array.from({ length: count }, (_, i) => String(fd.get(`${prefix}_${i}`) || '').trim()).filter(Boolean);
      if (st === 'causal') spec.structure_fields = { ...(spec.structure_fields || {}), causal: pick('sf_causal', 3) };
      if (st === 'checklist') spec.structure_fields = { ...(spec.structure_fields || {}), checklist: pick('sf_checklist', 5) };
      if (st === 'boundary') spec.structure_fields = { ...(spec.structure_fields || {}), boundary: pick('sf_boundary', 2) };
      if (st === 'misconception') spec.structure_fields = { ...(spec.structure_fields || {}), misconception: pick('sf_misconception', 2) };
      const quoteLine1 = String(fd.get('quote_line1') || '').trim();
      if (quoteLine1) {
        spec.quote = {
          line1: quoteLine1,
          line2: String(fd.get('quote_line2') || ''),
          highlight: String(fd.get('quote_highlight') || ''),
          note: String(fd.get('quote_note') || ''),
          cta: String(fd.get('quote_cta') || '')
        };
      } else {
        delete spec.quote;
      }
      spec.article = spec.article || {};
      Object.assign(spec.article, {
        title: fd.get('article_title'), digest: fd.get('article_digest'),
        cover_text: fd.get('article_cover_text'), opening: fd.get('article_opening'),
        lead: fd.get('article_lead'), quote: fd.get('article_quote'),
        highlights: String(fd.get('article_highlights') || '').split(/[,，]/).map(x => x.trim()).filter(Boolean),
        cta: fd.get('article_cta')
      });
      spec.article.series = {
        ...(spec.article.series || {}),
        name: fd.get('article_series_name'), index: fd.get('article_series_index'),
        role: 'main'
      };
      spec.music = fd.get('music');
      const motionJson = String(fd.get('motion_elements_json') || '').trim();
      let motionElements = {};
      if (motionJson) {
        try { motionElements = JSON.parse(motionJson); }
        catch { toast('逐元素运动 JSON 格式不对', 'error'); return; }
      }
      spec.motion = {
        ...(spec.motion || {}),
        preset: fd.get('motion_preset') || 'flow',
        transition: { ...(spec.motion?.transition || {}), mode: fd.get('transition_mode') || 'slide' },
        elements: motionElements
      };
      spec.article.sections = [1, 2, 3].map(i => ({
        heading: String(fd.get(`article_s${i}h`) || ''),
        body: String(fd.get(`article_s${i}b`) || '')
      }));
      await patch(`/api/specs/${id}`, { spec });
      toast('文案已保存，旧成片标记为需重渲');
      route();
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
  if (form.id === 'music-upload-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const file = fd.get('file');
    if (!file || !file.size) return toast('先选择一个音乐文件', 'error');
    const status = $('#music-upload-status');
    if (status) status.textContent = '上传中…';
    try {
      const res = await fetch('/api/music/upload', {
        method: 'POST',
        headers: {
          'x-filename': encodeURIComponent(file.name),
          'x-music-name': encodeURIComponent(fd.get('name') || file.name),
          'x-music-category': encodeURIComponent(fd.get('category') || '其他'),
          'x-music-tags': encodeURIComponent(fd.get('tags') || ''),
          'x-music-bpm': String(fd.get('bpm') || '')
        },
        body: file
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      toast('已加入音乐库');
      route();
    } catch (err) {
      if (status) status.textContent = err.message;
      toast(err.message, 'error');
    }
    return;
  }
  if (form.id === 'brief-account-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get('brief_id');
    try {
      await put(`/api/briefs/${encodeURIComponent(id)}/account`, { account_id: fd.get('account_id') });
      toast('归属账号已更换'); closeModal(); route();
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
  if (form.id === 'provider-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      yixiaoer_base_url: fd.get('yixiaoer_base_url'),
      yixiaoer_publish_channel: fd.get('yixiaoer_publish_channel')
    };
    if (fd.get('yixiaoer_api_key')) body.yixiaoer_api_key = fd.get('yixiaoer_api_key');
    if (fd.get('yixiaoer_authorization')) body.yixiaoer_authorization = fd.get('yixiaoer_authorization');
    try {
      const s = await put('/api/settings', body);
      state.settings = s;
      toast('蚁小二发布方式已保存');
      route();
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
  if (form.id === 'engine-settings-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      render_service_url: fd.get('render_service_url'),
      engine_default: fd.get('engine_default'),
      engine_default_mode: fd.get('engine_default_mode'),
      tts_provider: fd.get('tts_provider'),
      tts_base_url: fd.get('tts_base_url'),
      tts_model: fd.get('tts_model'),
      tts_voice: fd.get('tts_voice'),
      tts_appid: fd.get('tts_appid'),
      font_heading: fd.get('font_heading'),
      font_body: fd.get('font_body')
    };
    if (fd.get('tts_api_key')) body.tts_api_key = fd.get('tts_api_key');
    try { await put('/api/settings', body); toast('视频引擎设置已保存'); route(); }
    catch (err) { toast(err.message, 'error'); }
    return;
  }
  if (form.id === 'settings-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      llm_base_url: fd.get('llm_base_url'),
      llm_model: fd.get('llm_model')
    };
    if (fd.get('llm_api_key')) body.llm_api_key = fd.get('llm_api_key');
    try {
      const s = await put('/api/settings', body);
      state.settings = s;
      toast('设置已保存'); refreshWechatStatus(); route();
    } catch (err) { toast(err.message, 'error'); }
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// boot
(async function boot() {
  await refreshWechatStatus();
  try { state.musicLibrary = (await api('/api/music')).tracks || []; } catch {}
  await route();
})();

