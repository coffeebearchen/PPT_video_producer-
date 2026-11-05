export const MUSIC_TRACKS = {
  pulse: {
    id: 'pulse',
    label: 'Pulse 120',
    bpm: 120,
    file: 'music-pulse.wav',
    tags: ['自动化', '发布', '效率', '工具', '服务器', '增长', '系统'],
    note: '强拍、低频、短促，适合科技/效率类。'
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal 80',
    bpm: 80,
    file: 'bgm.wav',
    tags: ['原理', '哲学', '冷静', '分析', '故事', '人物'],
    note: '极简、留白，适合解释和叙事。'
  },
  none: { id: 'none', label: '无音乐', bpm: 0, file: '', tags: [], note: '静音。' }
};

const PULSE_WORDS = /自动化|发布|效率|工具|服务器|云|系统|增长|转化|流量|矩阵|批量|工作流|API|部署/;
const MINIMAL_WORDS = /原理|哲学|冷静|分析|故事|人物|失败|经验|思考|长期|品牌/;

export function pickMusic(...texts) {
  const text = texts.filter(Boolean).join(' ');
  if (MINIMAL_WORDS.test(text) && !PULSE_WORDS.test(text)) {
    return { track: 'minimal', reason: '检测到叙事/原理类词汇，选 Minimal 80。' };
  }
  if (PULSE_WORDS.test(text)) {
    return { track: 'pulse', reason: '检测到自动化/效率类词汇，选 Pulse 120。' };
  }
  return { track: 'pulse', reason: '默认强节奏 Pulse 120。' };
}

export function pickMusicFromLibrary(texts, tracks = []) {
  const text = texts.filter(Boolean).join(' ');
  let best = null;
  for (const t of tracks) {
    if (!t || t.id === 'none') continue;
    const tags = [...(t.tags || []), t.category || ''].filter(Boolean);
    const score = tags.reduce((n, tag) => n + (tag && text.includes(String(tag)) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { track: t.id, score, name: t.name || t.label || t.id };
  }
  if (best) return { track: best.track, reason: `匹配音乐标签「${best.name}」，自动选曲。` };
  return pickMusic(...texts);
}

export function resolveMusic(spec) {
  const raw = spec?.music;
  const track = typeof raw === 'string' ? raw : (raw?.track || 'pulse');
  if (track === 'auto') return pickMusic(spec?.page1?.highlight, spec?.page1?.kicker, spec?.page2?.kicker);
  return { track: MUSIC_TRACKS[track] ? track : 'pulse', reason: '手动选择。' };
}
