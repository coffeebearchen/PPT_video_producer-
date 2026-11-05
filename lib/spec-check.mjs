import { specFragmentIssues } from './fragment-check.mjs';

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function text(value) {
  return stripHtml(value);
}

export function checkSpecCoverage(spec = {}) {
  const errors = [];
  const warnings = [];
  const add = (field, message) => errors.push({ field, message });

  const p1 = spec.page1 || {};
  const p2 = spec.page2 || {};
  const quote = spec.quote || {};
  const count = Number(spec.page_count) || 3;

  const lines = (p1.lines || []).map(text).filter(Boolean);
  if (lines.length < 2) add('page1.lines', '第 1 页至少要有 2 行主文案');
  if (!text(p1.highlight)) add('page1.highlight', '第 1 页缺少 Highlight');
  if (!text(p2.left_line2)) add('page2.left_line2', '第 2 页左侧结论为空');
  if (!text(p2.right_highlight)) add('page2.right_highlight', '第 2 页右侧 Highlight 为空');
  if (!text(p2.conclusion_highlight)) add('page2.conclusion_highlight', '第 2 页结论为空');

  if (count >= 4) {
    if (!text(quote.line1) || !text(quote.line2)) add('quote', `${count} 页版本缺少最后一页金句`);
    const ctx = spec.context || spec.page3 || {};
    if (!text(ctx.title)) add('context.title', '背景页标题为空');
    if (!text(ctx.note)) add('context.note', '背景页说明为空');
  }
  if (count >= 5 && !text((spec.evidence || {}).title)) add('evidence.title', '证据页标题为空');
  if (count >= 6 && !text((spec.objection || {}).title)) add('objection.title', '反例页标题为空');

  if (text(p1.highlight).length > 12) warnings.push({ field: 'page1.highlight', message: '第 1 页 Highlight 超过 12 字，建议缩短' });
  const p1All = [text(p1.headline), ...lines].join('');
  if (text(p1.highlight) && p1All && !p1All.includes(text(p1.highlight))) {
    warnings.push({ field: 'page1.highlight', message: 'Highlight 不属于第 1 页主文案，可能是旧模板残留' });
  }
  if (lines.some(x => x.length <= 2)) {
    warnings.push({ field: 'page1.lines', message: '第 1 页有过短行，可能造成断句' });
  }
  const ctxTitle = text((spec.context || {}).title);
  if (ctxTitle.length > 18) {
    warnings.push({ field: 'context.title', message: '背景页标题超过 18 字，建议改成短语' });
  }
  if (lines.join('').length > 42) warnings.push({ field: 'page1.lines', message: '第 1 页主文案偏长，预览可能缩字或出界' });
  if (text(p2.conclusion_highlight).length > 12) warnings.push({ field: 'page2.conclusion_highlight', message: '结论 Highlight 超过 12 字，可能压缩' });
  if (text((spec.context || {}).title).length > 24) warnings.push({ field: 'context.title', message: '背景标题超过 24 字，可能出界' });
  const v3 = Number(spec.content_schema_version) >= 3;
  if (!text(p1.cover?.lead) || !text(p1.cover?.punch)) {
    const issue = { field: 'page1.cover', message: '第 1 页缺少 cover.lead / cover.punch，封面仍是旧结构' };
    if (v3) errors.push(issue); else warnings.push(issue);
  }
  for (const issue of specFragmentIssues(spec)) {
    const item = { field: 'fragment', message: issue };
    if (v3) errors.push(item); else warnings.push(item);
  }

  return { ok: errors.length === 0, errors, warnings, page_count: count };
}

// A light relevance gate for batch production. It does not try to be a
// semantic judge; it catches the common failure where the generated script
// never mentions the selected topic at all.
export function checkSpecRelevance(spec = {}, brief = {}) {
  const title = text(brief.title || spec.title || '');
  const topic = text(brief.topic || '');
  const haystack = JSON.stringify(spec || '').toLowerCase();
  const stop = new Set(['不是', '什么', '为什么', '怎么', '一个', '我们', '他们', '这个', '那个', '可以', '需要', '因为', '所以', '就是', '没有', '自己', '已经', '还是', '如果', '但是', '以及', '对于', '通过', '进行', '问题', '事情', '时候']);
  const source = (title + ' ' + topic).toLowerCase();
  const latin = source.match(/[a-z][a-z0-9_-]{1,}/g) || [];
  const cjk = source.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const bigrams = [];
  for (const seq of cjk) {
    for (let i = 0; i < seq.length - 1; i++) {
      const w = seq.slice(i, i + 2);
      if (!stop.has(w)) bigrams.push(w);
    }
  }
  const words = [...new Set([...latin, ...bigrams])].filter(x => x.length >= 2 && !stop.has(x)).slice(0, 30);
  const hits = words.filter(w => haystack.includes(w));
  const score = words.length ? hits.length / words.length : 1;
  return {
    ok: words.length === 0 || score >= 0.18,
    score: Number(score.toFixed(3)),
    hits,
    words: words.slice(0, 12),
    warning: score < 0.18 ? '文案与选题关键词重合度过低，可能偏题' : ''
  };
}
