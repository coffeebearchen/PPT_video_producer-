const END_BAD = /[的]+$/;
const START_BAD = /^[的]/;
const PUNCT = /[，。；：！？、,.!?;:]/;

export function cleanText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function fragmentIssues(text, { min = 3 } = {}) {
  const s = cleanText(text);
  const issues = [];
  if (!s) return issues;
  if (s.length < min) issues.push('过短');
  if (END_BAD.test(s) && !PUNCT.test(s.slice(-1))) issues.push('以功能词结尾');
  if (START_BAD.test(s)) issues.push('以功能词开头');
  if (/^[的]/.test(s)) issues.push('以“的”开头');
  return issues;
}

export function lineBoundaryIssues(lines) {
  const list = (lines || []).map(cleanText).filter(Boolean);
  if (list.length < 2) return [];
  const joined = list.join('');
  let ends = new Set();
  try {
    const seg = new Intl.Segmenter('zh', { granularity: 'word' });
    let n = 0;
    for (const part of seg.segment(joined)) {
      n += part.segment.length;
      if (part.isWordLike) ends.add(n);
    }
  } catch { return []; }
  const issues = [];
  let n = 0;
  for (let i = 0; i < list.length - 1; i++) {
    n += list[i].length;
    if (!ends.has(n)) issues.push(`断在词中间：${list[i]} / ${list[i + 1]}`);
  }
  return issues;
}

export function specFragmentIssues(spec) {
  const issues = [];
  const add = (field, text, opts) => {
    for (const x of fragmentIssues(text, opts)) issues.push(`${field}：${x}（${cleanText(text)}）`);
  };
  const p1 = spec.page1 || {};
  const cover = p1.cover || {};
  if (cover.lead) add('cover.lead', cover.lead, { min: 6 });
  if (cover.punch) {
    add('cover.punch', cover.punch, { min: 4 });
    if (!cover.lead || cover.lead === cover.punch) issues.push('cover.lead 与 cover.punch 重复');
  }
  if (p1.lines) {
    for (const [i, line] of p1.lines.entries()) add(`page1.lines[${i}]`, line, { min: 3 });
    for (const x of lineBoundaryIssues(p1.lines)) issues.push(`page1：${x}`);
  }
  const p2 = spec.page2 || {};
  for (const key of ['right_highlight', 'conclusion_highlight']) {
    if (p2[key]) add(`page2.${key}`, p2[key], { min: 2 });
  }
  const p3 = spec.page3 || {};
  for (const key of ['title', 'subtitle']) {
    if (p3[key]) add(`page3.${key}`, p3[key], { min: 4 });
  }
  const p4 = spec.page4 || {};
  for (const key of ['line1', 'line2', 'highlight', 'kicker']) {
    if (p4[key]) add(`page4.${key}`, p4[key], { min: 3 });
  }
  if (spec.context?.title) add('context.title', spec.context.title, { min: 4 });
  if (spec.evidence?.title) add('evidence.title', spec.evidence.title, { min: 4 });
  return [...new Set(issues)];
}
