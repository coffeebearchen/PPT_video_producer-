import { buildVariantPayload, AI_TEXT } from '../lib/publishers/mapping.mjs';

const media = { key: 'oss/test', width: 1080, height: 1440, size: 120000, format: 'jpg' };
const cover = { key: 'oss/cover', width: 1080, height: 1440, size: 80000, format: 'jpg' };
const base = { title: '测试标题', body: '第一段\n第二段', tags: ['AI', '效率'], aiLabel: true, schedule: 1760000000000 };

const cases = [
  ['xiaohongshu', 'imageText', { ...base, images: [media] }, true],
  ['wechat_channels', 'video', { ...base, cover, video: media }, true],
  ['wechat_article', 'article', { ...base, cover }, true],
  ['douyin', 'video', { ...base, cover, video: media }, true],
  ['xiaohongshu', 'imageText', { ...base, images: [] }, false],
  ['wechat_article', 'article', { ...base }, false]
];

let failed = 0;
for (const [platform, type, variant, expected] of cases) {
  const r = buildVariantPayload(platform, type, variant);
  const pass = r.ok === expected;
  if (!pass) failed++;
  console.log(JSON.stringify({ platform, type, ok: r.ok, expected, pass, errors: r.errors, payload: r.payload }));
}
if (failed) process.exit(1);
console.log(JSON.stringify({ ok: true, cases: cases.length, aiText: AI_TEXT }));
