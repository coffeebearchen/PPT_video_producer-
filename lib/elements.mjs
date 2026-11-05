import { MOTION_POLICY, clampElementSpeed } from './motion-policy.mjs';

// Colorless SVG element grammar.
// Every icon uses currentColor, no fill, no gradients, no text, 64x64 grid.
// Themes decide color; motion metadata decides movement.

const svg = (body) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ELEMENTS = [
  {
    id: 'boundary',
    name: '边界',
    tags: ['boundary', 'scope', 'sandbox', '范围', '边界', '沙箱'],
    roles: ['background', 'accent'],
    motion: ['fade', 'breathe'],
    svg: svg('<path d="M12 20V12h8M44 12h8v8M52 44v8h-8M20 52h-8v-8" stroke-dasharray="3 5"/><rect x="20" y="20" width="24" height="24" rx="2" opacity=".45"/>')
  },
  {
    id: 'container',
    name: '容器',
    tags: ['container', 'box', 'drawer', 'archive', '容器', '盒子', '仓库', '服务器', '云', '存储', '收藏', '书堆', '资料'],
    roles: ['accent', 'corner'],
    motion: ['drop', 'fade'],
    svg: svg('<path d="M10 24h44v28H10z"/><path d="M10 24l6-10h32l6 10"/><path d="M26 34h12"/>')
  },
  {
    id: 'path',
    name: '路径',
    tags: ['path', 'route', 'flow', 'delivery', '路径', '路线', '流动', '地址', '寄', '邮局', '知识库', '检索', '目录', '资料'],
    roles: ['accent', 'background'],
    motion: ['draw', 'slide'],
    svg: svg('<path d="M10 46c10 0 10-28 22-28s12 20 22 20"/><path d="M47 31l7 7 7-7" transform="translate(-7)"/>')
  },
  {
    id: 'gate',
    name: '关卡',
    tags: ['gate', 'entry', 'door', 'checkpoint', '入口', '关卡', '门', '地址', '固定', '登记'],
    roles: ['accent', 'corner'],
    motion: ['drop', 'fade'],
    svg: svg('<path d="M18 52V28a14 14 0 0 1 28 0v24"/><path d="M26 52V30a6 6 0 0 1 12 0v22"/><path d="M10 52h44"/>')
  },
  {
    id: 'contrast',
    name: '对照',
    tags: ['contrast', 'compare', 'split', '对照', '对比', '左右'],
    roles: ['background', 'accent'],
    motion: ['slide', 'fade'],
    svg: svg('<rect x="10" y="16" width="18" height="32" rx="2"/><rect x="36" y="16" width="18" height="32" rx="2" stroke-dasharray="4 4"/><path d="M28 32h8"/><path d="M31 27l5 5-5 5"/>')
  },
  {
    id: 'layers',
    name: '分层',
    tags: ['layers', 'stack', 'hierarchy', 'level', '分层', '层级', '堆叠'],
    roles: ['accent', 'corner'],
    motion: ['drop', 'fade'],
    svg: svg('<path d="M32 10l22 11-22 11L10 21z"/><path d="M10 31l22 11 22-11"/><path d="M10 41l22 11 22-11"/>')
  },
  {
    id: 'network',
    name: '网络',
    tags: ['network', 'node', 'system', 'network', '网络', '节点', '系统'],
    roles: ['background', 'accent'],
    motion: ['pulse', 'breathe'],
    svg: svg('<circle cx="32" cy="14" r="5"/><circle cx="14" cy="46" r="5"/><circle cx="50" cy="46" r="5"/><path d="M29 18L17 41M35 18l12 23M19 46h26"/>')
  },
  {
    id: 'signal',
    name: '信号',
    tags: ['signal', 'wave', 'pulse', 'feedback', '信号', '波形', '反馈'],
    roles: ['accent', 'background'],
    motion: ['pulse', 'breathe'],
    svg: svg('<path d="M8 34h8l5-14 7 28 6-22 5 12h8l4-8 6 8"/>')
  },
  {
    id: 'time',
    name: '时间',
    tags: ['time', 'clock', 'calendar', 'temporary', '时间', '时钟', '临时'],
    roles: ['accent', 'corner'],
    motion: ['breathe', 'fade'],
    svg: svg('<circle cx="32" cy="32" r="22"/><path d="M32 18v15l10 6"/><path d="M10 32h4M50 32h4"/>')
  },
  {
    id: 'scale',
    name: '天平',
    tags: ['scale', 'balance', 'tradeoff', 'cost', '天平', '权衡', '成本'],
    roles: ['accent', 'corner'],
    motion: ['breathe', 'drop'],
    svg: svg('<path d="M32 10v42M20 52h24"/><path d="M14 26h36"/><path d="M14 26l-5 12h10zM50 26l-5 12h10z"/><circle cx="32" cy="10" r="3"/>')
  },
  {
    id: 'stage',
    name: '舞台',
    tags: ['stage', 'presentation', 'show', 'temporary', '舞台', '展台', '临时'],
    roles: ['background', 'accent'],
    motion: ['slide', 'breathe'],
    svg: svg('<path d="M10 50h44"/><path d="M18 50V26h28v24"/><path d="M18 26l-6 10h40l-6-10"/><path d="M26 50V38h12v12"/>')
  },
  {
    id: 'mirror',
    name: '镜像',
    tags: ['mirror', 'reflection', 'copy', 'mirror', '镜像', '映射', '反射', '对照', '比较'],
    roles: ['accent', 'corner'],
    motion: ['fade', 'slide'],
    svg: svg('<path d="M24 12h16v40H24z"/><path d="M42 18h8v28h-8" stroke-dasharray="4 4"/><path d="M16 32h4M14 26l-4 6 4 6"/>')
  },
  { id: 'calendar', name: '日历', tags: ['calendar', '日历', '时间', '计划', '排期'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<rect x="8" y="12" width="48" height="44" rx="3"/><path d="M8 24h48M20 8v8M44 8v8"/><path d="M18 34h6M30 34h6M42 34h6M18 44h6M30 44h6M42 44h6"/>') },
  { id: 'database', name: '数据库', tags: ['database', '数据库', '存储', '表', '记录'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<ellipse cx="32" cy="14" rx="22" ry="8"/><path d="M10 14v18c0 4 10 8 22 8s22-4 22-8V14M10 32v18c0 4 10 8 22 8s22-4 22-8V32"/>') },
  { id: 'cloud', name: '云', tags: ['cloud', '云', '服务器', '托管', '在线'], roles: ['accent'], motion: ['slide', 'pulse'], svg: svg('<path d="M18 48h30a10 10 0 0 0 0-20 16 16 0 0 0-31-3 12 12 0 0 0 1 23z"/>') },
  { id: 'lock', name: '锁', tags: ['lock', '锁', '权限', '安全', '边界'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<rect x="14" y="28" width="36" height="28" rx="4"/><path d="M22 28V20a10 10 0 0 1 20 0v8"/><circle cx="32" cy="42" r="3"/><path d="M32 45v5"/>') },
  { id: 'key', name: '钥匙', tags: ['key', '钥匙', '权限', '入口', '访问'], roles: ['accent'], motion: ['draw', 'rotate'], svg: svg('<circle cx="20" cy="20" r="10"/><path d="M27 27l25 25M44 44l6-6M50 50l6-6"/>') },
  { id: 'search', name: '检索', tags: ['search', '检索', '搜索', '查找', '目录'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<circle cx="28" cy="28" r="16"/><path d="M40 40l14 14"/>') },
  { id: 'file', name: '文件', tags: ['file', '文件', '资料', '文档', '初稿'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<path d="M16 8h24l10 10v38H16z"/><path d="M40 8v12h10M24 30h18M24 38h18M24 46h12"/>') },
  { id: 'folder', name: '文件夹', tags: ['folder', '文件夹', '收藏', '资料', '归档'], roles: ['accent'], motion: ['slide', 'pulse'], svg: svg('<path d="M8 18h18l6 7h24v27H8z"/><path d="M8 25h48"/>') },
  { id: 'table', name: '表格', tags: ['table', '表格', '对比', '清单', '行列'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<rect x="8" y="12" width="48" height="40"/><path d="M8 25h48M8 38h48M24 12v40M40 12v40"/>') },
  { id: 'chart', name: '趋势', tags: ['chart', '趋势', '数据', '增长', '判断'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<path d="M10 52V12M10 52h44"/><path d="M16 42l12-12 10 6 14-18"/>') },
  { id: 'filter', name: '过滤', tags: ['filter', '过滤', '筛选', '边界', '判断'], roles: ['accent'], motion: ['draw', 'rotate'], svg: svg('<path d="M8 12h48L36 32v20l-8-4V32z"/>') },
  { id: 'link', name: '连接', tags: ['link', '连接', '引用', '关系', '路径'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<path d="M26 38l12-12"/><path d="M20 44l-4 4a10 10 0 0 1-14-14l10-10a10 10 0 0 1 14 0"/><path d="M44 20l4-4a10 10 0 0 1 14 14L52 40a10 10 0 0 1-14 0"/>') },
  { id: 'clock', name: '时钟', tags: ['clock', '时钟', '时间', '周期', '持续'], roles: ['accent'], motion: ['rotate', 'draw'], svg: svg('<circle cx="32" cy="32" r="24"/><path d="M32 16v18l12 8"/>') },
  { id: 'user', name: '人', tags: ['user', '人', '用户', '责任', '签字'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<circle cx="32" cy="20" r="10"/><path d="M12 56c2-12 10-18 20-18s18 6 20 18"/>') },
  { id: 'team', name: '团队', tags: ['team', '团队', '协作', '多人', '组织'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<circle cx="24" cy="22" r="8"/><circle cx="44" cy="24" r="7"/><path d="M8 54c1-10 7-15 16-15s15 5 16 15M38 54c1-8 5-12 12-12 5 0 9 3 10 8"/>') },
  { id: 'shield', name: '盾牌', tags: ['shield', '盾牌', '保护', '安全', '边界'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<path d="M32 8l22 8v14c0 14-10 22-22 26C20 52 10 44 10 30V16z"/><path d="M22 32l7 7 13-15"/>') },
  { id: 'warning', name: '警告', tags: ['warning', '警告', '风险', '失败', '问题'], roles: ['accent'], motion: ['pulse', 'draw'], svg: svg('<path d="M32 8L58 54H6z"/><path d="M32 24v14M32 46v2"/>') },
  { id: 'check', name: '勾选', tags: ['check', '勾选', '通过', '验收', '完成'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<path d="M10 34l14 14 30-34"/>') },
  { id: 'cross', name: '叉', tags: ['cross', '叉', '失败', '禁止', '错误'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<path d="M14 14l36 36M50 14L14 50"/>') },
  { id: 'branch', name: '分支', tags: ['branch', '分支', '选择', '路径', '条件'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<circle cx="16" cy="16" r="5"/><circle cx="16" cy="48" r="5"/><circle cx="48" cy="32" r="5"/><path d="M21 16h10c8 0 8 16 16 16M21 48h10c8 0 8-16 16-16"/>') },
  { id: 'server', name: '服务器', tags: ['server', '服务器', '机器', '部署', '运行'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<rect x="10" y="10" width="44" height="14" rx="2"/><rect x="10" y="30" width="44" height="14" rx="2"/><path d="M18 17h6M18 37h6M44 17h3M44 37h3"/>') },
  { id: 'api', name: '接口', tags: ['api', '接口', '调用', '连接', '工具'], roles: ['accent'], motion: ['draw', 'pulse'], svg: svg('<path d="M22 20l-10 12 10 12M42 20l10 12-10 12M36 14l-8 36"/>') },
  { id: 'prompt', name: '提示词', tags: ['prompt', '提示词', '输入', '任务', '指令'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<rect x="8" y="14" width="48" height="32" rx="4"/><path d="M16 24h20M16 32h12M26 54l6-8 6 8"/>') },
  { id: 'model', name: '模型', tags: ['model', '模型', '大脑', 'AI', '能力'], roles: ['accent'], motion: ['pulse', 'draw'], svg: svg('<circle cx="20" cy="22" r="7"/><circle cx="44" cy="22" r="7"/><circle cx="32" cy="42" r="7"/><path d="M25 26l5 10M39 26l-5 10M25 20h14"/>') },
  { id: 'token', name: 'Token', tags: ['token', 'Token', '计量', '成本', '调用'], roles: ['accent'], motion: ['slide', 'pulse'], svg: svg('<circle cx="32" cy="32" r="20"/><path d="M32 18v28M24 24h12a6 6 0 0 1 0 12H24M24 36h14"/>') },
  { id: 'cost', name: '成本', tags: ['cost', '成本', '价格', '投入', '预算'], roles: ['accent'], motion: ['draw', 'slide'], svg: svg('<path d="M8 52h48M14 52V34h8v18M28 52V22h8v30M42 52V12h8v40"/>') },
  { id: 'speed', name: '速度', tags: ['speed', '速度', '效率', '时间', '快慢'], roles: ['accent'], motion: ['slide', 'pulse'], svg: svg('<path d="M10 44a24 24 0 0 1 44 0"/><path d="M32 44l12-14"/><circle cx="32" cy="44" r="3"/>') },
  { id: 'backup', name: '备份', tags: ['backup', '备份', '恢复', '版本', '安全'], roles: ['accent'], motion: ['rotate', 'draw'], svg: svg('<path d="M12 24a22 22 0 1 1 2 20"/><path d="M12 12v12h12"/>') }
];

// Expand the core grammar into a broad, controlled library of 100+ assets.
// Variants change rotation / scale / dash rhythm, never color or semantics.
const variantVariants = [
  { suffix: 'a', rotate: 0, scale: 1, dash: '' },
  { suffix: 'b', rotate: 8, scale: .86, dash: '' },
  { suffix: 'c', rotate: -8, scale: 1.12, dash: '' },
  { suffix: 'd', rotate: 0, scale: .72, dash: ' stroke-dasharray="5 5"' },
  { suffix: 'e', rotate: 15, scale: .94, dash: '' },
  { suffix: 'f', rotate: -15, scale: .8, dash: ' stroke-dasharray="2 6"' },
  { suffix: 'g', rotate: 0, scale: 1.2, dash: '' },
  { suffix: 'h', rotate: 25, scale: .68, dash: '' }
];
for (const base of ELEMENTS.slice(0, 12)) {
  const inner = base.svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  for (const v of variantVariants) {
    ELEMENTS.push({
      ...base,
      id: `${base.id}-${v.suffix}`,
      name: `${base.name} ${v.suffix.toUpperCase()}`,
      tags: [...(base.tags || []), 'variant', v.suffix],
      svg: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="rotate(${v.rotate} 32 32) scale(${v.scale})"${v.dash}>${inner}</g></svg>`
    });
  }
}

export function listElements() {
  return ELEMENTS.map(({ svg, ...meta }) => ({ ...meta, svg }));
}

export function getElement(id) {
  return ELEMENTS.find(e => e.id === id) || null;
}

const PAGE_PLANS = {
  3: ['hook', 'contrast', 'quote'],
  4: ['hook', 'context', 'contrast', 'quote'],
  5: ['hook', 'context', 'contrast', 'evidence', 'quote'],
  6: ['hook', 'context', 'objection', 'contrast', 'evidence', 'quote']
};

const PAGE_SLOTS = {
  context: 'left-middle',
  contrast: 'right-middle',
  evidence: 'left-bottom',
  objection: 'center-back'
};

const ELEMENT_MOTION = {
  boundary: 'breathe', container: 'drop', path: 'slide', gate: 'rise',
  contrast: 'sway', layers: 'stack', network: 'pulse', signal: 'pulse',
  time: 'rotate', scale: 'balance', stage: 'rise', mirror: 'flip'
};

const ROLE_DEFAULTS = {
  hook: ['boundary', 'gate', 'container'],
  context: ['time', 'layers', 'network'],
  contrast: ['contrast', 'scale', 'mirror'],
  evidence: ['signal', 'network', 'path'],
  objection: ['scale', 'gate', 'boundary']
};

export function selectElements(spec = {}, brief = {}, extra = []) {
  const allPool = [...ELEMENTS, ...(Array.isArray(extra) ? extra : [])];
  // Editorial Red is a clean poster language; do not put postal / box props
  // back into it through the random element layer.
  const editorialBlocked = new Set(['container', 'stage', 'mail', 'envelope']);
  const pool = spec.theme === 'editorial'
    ? allPool.filter(el => !editorialBlocked.has(String(el.id).split('-')[0]))
    : allPool;
  const count = Number(spec.page_count) || 3;
  const plan = PAGE_PLANS[count] || PAGE_PLANS[3];
  const struct = brief.structure_snapshot || {};
  const text = [
    brief.title, brief.topic,
    struct.name, struct.source_domain, struct.target_domain,
    struct.signature,
    ...(struct.mapping || []).flatMap(m => [m.from, m.to]),
    spec.page1?.highlight,
    spec.page2?.right_highlight,
    spec.page2?.conclusion_highlight
  ].filter(Boolean).join(' ').toLowerCase();

  const motionPool = ['drop', 'rise', 'slide', 'sway', 'orbit', 'pulse', 'flip', 'draw', 'rotate'];
  const palettes = {
    archive: ['#101112', '#3E3F3A', '#6F6B61', '#B8B2A5'],
    terminal: ['#F2EBDD', '#BDB8AC', '#7E776B', '#3A3B36'],
    editorial: ['#F6F1E7', '#D6CFC1', '#8E8678', '#4A443B']
  };
  const colors = palettes[spec.theme] || palettes.archive;
  const result = [];
  const usablePages = plan.map((role, i) => ({ role, i })).filter(x => x.role !== 'quote');
  // Reading rhythm: at least one page breathes with no moving element.
  const emptyPage = usablePages[Math.floor(Math.random() * usablePages.length)]?.i;
  // At least one page may carry a three-element ensemble, but never the empty page.
  const threeCandidates = usablePages.filter(x => x.i !== emptyPage);
  const threePage = threeCandidates[Math.floor(Math.random() * Math.max(1, threeCandidates.length))]?.i;

  for (const { role, i } of usablePages) {
    let desired;
    if (i === emptyPage) desired = 0;
    else if (i === threePage) desired = 3;
    else {
      // Mostly 1–2, sometimes zero. Reading first, motion second.
      const roll = Math.random();
      desired = roll < .28 ? 0 : (roll < .78 ? 1 : 2);
    }
    if (!desired) continue;
    const scored = pool.map(el => {
      const hits = (el.tags || []).filter(t => text.includes(String(t).toLowerCase())).length;
      const roleBoost = (ROLE_DEFAULTS[role] || []).includes(el.id) ? 2 : 0;
      return { el, score: hits * 2 + roleBoost + Math.random() * 1.5 };
    }).sort((a, b) => b.score - a.score);

    const picked = [];
    const pickedBase = new Set();
    for (const { el } of scored) {
      if (picked.length >= desired) break;
      const baseId = String(el.id).split('-')[0];
      if (pickedBase.has(baseId)) continue;
      pickedBase.add(baseId);
      picked.push(el);
    }
    // If the library is tiny, fill with a still-unused base element.
    while (picked.length < desired && pool.length) {
      const fallback = pool.find(el => !pickedBase.has(String(el.id).split('-')[0]));
      if (!fallback) break;
      pickedBase.add(String(fallback.id).split('-')[0]);
      picked.push(fallback);
    }

    const speedBands = desired >= 3
      ? MOTION_POLICY.threeBand
      : (desired === 2 ? MOTION_POLICY.twoBand : [MOTION_POLICY.soloRange[0] + Math.random() * (MOTION_POLICY.soloRange[1] - MOTION_POLICY.soloRange[0])]);
    for (let k = 0; k < picked.length; k++) {
      const best = picked[k];
      const motion = motionPool[Math.floor(Math.random() * motionPool.length)];
      const size = 260 + Math.floor(Math.random() * 620);
      result.push({
        element_id: best.id,
        name: best.name,
        svg: best.svg,
        page: i + 1,
        role,
        slot: 'full-page',
        color: colors[Math.floor(Math.random() * colors.length)],
        motion,
        opacity: 0.16 + Math.random() * 0.16,
        size,
        speed: clampElementSpeed(speedBands[k % speedBands.length]),
        direction: Math.random() < .5 ? -1 : 1
      });
    }
  }
  return result;
}

export function validateGeneratedSvg(raw) {
  const svg = String(raw || '').trim();
  if (!/^<svg[\s>]/i.test(svg)) return { ok: false, error: '不是 SVG' };
  if (svg.length > 8000) return { ok: false, error: 'SVG 太大' };
  if (!/viewBox\s*=\s*["']0 0 64 64["']/i.test(svg)) return { ok: false, error: 'viewBox 必须是 0 0 64 64' };
  if (!/stroke\s*=\s*["']currentColor["']/i.test(svg)) return { ok: false, error: 'stroke 必须是 currentColor' };
  if (/<(text|image|script|style|filter|linearGradient|radialGradient|foreignObject|iframe)\b/i.test(svg)) {
    return { ok: false, error: 'SVG 含禁止标签' };
  }
  if (/\son[a-z]+\s*=/i.test(svg)) return { ok: false, error: 'SVG 含事件属性' };
  if (/(href|src)\s*=\s*["']https?:/i.test(svg)) return { ok: false, error: 'SVG 含外部引用' };
  if (/fill\s*=\s*["'](?!none|transparent)[^"']+["']/i.test(svg)) return { ok: false, error: 'SVG 不允许填充色' };
  const shapes = (svg.match(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/gi) || []).length;
  if (shapes === 0 || shapes > 16) return { ok: false, error: '图形数量不合理' };
  return { ok: true, svg };
}

export const ELEMENT_SPEC = {
  viewBox: '0 0 64 64',
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 2,
  maxPaths: 12,
  forbidden: ['text', 'image', 'filter', 'script', 'linearGradient', 'radialGradient'],
  themeColors: ['--element-ink', '--element-accent']
};

