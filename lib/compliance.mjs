const BANNED = ['保证', '百分百', '100%', '绝对', '最', '第一', '国家级', '免费送', '稳赚', '包治'];

export function checkCompliance(text = '') {
  const hits = BANNED.filter(w => String(text).includes(w));
  return { ok: hits.length === 0, hits };
}
