export const TEMPLATE_THEMES = [
  {
    id: 'archive',
    name: 'Archive Paper',
    desc: '暖纸 / 红章 / 冷静叙事',
    presets: [
      { id: 'archive-4', name: '档案纸 · 4 页 · 上翻页', pages: 4, transition: 'wipe_up', motion: 'flow', tags: ['轻动效', '叙事'] },
      { id: 'archive-5', name: '档案纸 · 5 页 · 横推', pages: 5, transition: 'slide', motion: 'flow', tags: ['标准', '解释'] }
    ]
  },
  {
    id: 'terminal',
    name: 'Terminal Black',
    desc: '黑底 / 荧光 / 强节奏',
    presets: [
      { id: 'terminal-4', name: '黑底荧光 · 4 页 · 硬切', pages: 4, transition: 'cut', motion: 'strong', tags: ['强动效', '科技'] },
      { id: 'terminal-6', name: '黑底荧光 · 6 页 · 上翻', pages: 6, transition: 'wipe_up', motion: 'strong', tags: ['强节奏', '复杂'] }
    ]
  },
  {
    id: 'editorial',
    name: 'Editorial Red',
    desc: '红底 / 海报 / 强观点',
    presets: [
      { id: 'editorial-4', name: '红底海报 · 4 页 · 横推', pages: 4, transition: 'slide', motion: 'strong', tags: ['强观点', '主推'] },
      { id: 'editorial-3', name: '红底海报 · 3 页 · 硬切', pages: 3, transition: 'cut', motion: 'strong', tags: ['短', '金句'] }
    ]
  },
  {
    id: 'noir',
    name: 'Noir Yellow',
    desc: '黑底 / 黄字 / 直线',
    presets: [
      { id: 'noir-6', name: '黑黄 · 6 页 · 上翻', pages: 6, transition: 'wipe_up', motion: 'flow', tags: ['克制', '观点'] },
      { id: 'noir-4', name: '黑黄 · 4 页 · 横推', pages: 4, transition: 'slide', motion: 'flow', tags: ['短', '锋利'] }
    ]
  },
  {
    id: 'earth',
    name: 'Earth Green',
    desc: '墨绿 / 橙色 / 褐色',
    presets: [
      { id: 'earth-5', name: '墨绿橙褐 · 5 页 · 上翻', pages: 5, transition: 'wipe_up', motion: 'flow', tags: ['自然', '解释'] },
      { id: 'earth-4', name: '墨绿橙褐 · 4 页 · 横推', pages: 4, transition: 'slide', motion: 'flow', tags: ['沉稳', '商业'] }
    ]
  }
];

export function listTemplates() {
  return TEMPLATE_THEMES.flatMap(theme => theme.presets.map(p => ({
    ...p, theme_id: theme.id, theme_name: theme.name, theme_desc: theme.desc
  })));
}

export function getTemplate(id) {
  return listTemplates().find(t => t.id === id) || null;
}

export function applyTemplatePreset(spec = {}, brief = {}) {
  const t = getTemplate(brief.template_id || spec.template_id);
  if (!t) return spec;
  spec.template_id = t.id;
  spec.page_count = t.pages;
  spec.theme = t.theme_id;
  spec.motion = {
    ...(spec.motion || {}),
    preset: t.motion,
    transition: { ...(spec.motion?.transition || {}), mode: t.transition, duration: 0.9 }
  };
  return spec;
}
