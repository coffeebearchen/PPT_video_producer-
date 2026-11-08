import { buildVariantPayload, AI_TEXT } from '../lib/publishers/mapping.mjs';
import { buildTaskPayload } from '../lib/publishers/yixiaoer.mjs';
import { SCHEMAS } from '../lib/publishers/schemas.mjs';

const media = { key: 'oss/xhs-1', width: 1080, height: 1440, size: 120000, format: 'jpg' };
const cover = { key: 'oss/cover', width: 1080, height: 1440, size: 80000, format: 'jpg' };
const base = { title: 'RAG 不是知识库', body: '第一段\n第二段', tags: ['AI', '知识库'], aiLabel: true };

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  if (!ok) console.error('FAIL', name, detail);
};

const xhs = buildVariantPayload('xiaohongshu', 'imageText', { ...base, images: [media] });
check('小红书预检通过', xhs.ok, JSON.stringify(xhs.errors));
check('小红书 AI 文本', String(xhs.payload?.description || '').includes(AI_TEXT));
check('小红书话题标签', String(xhs.payload?.description || '').includes('<topic'));
check('小红书 visibleType', xhs.payload?.visibleType === 0);

const xhsTask = buildTaskPayload({
  platform: '小红书',
  publishType: 'imageText',
  accountId: 'xhs_acct_001',
  contentId: 'content_test',
  templateVersion: 'v2.2',
  form: xhs.payload
});
check('任务 platforms', xhsTask.platforms?.[0] === '小红书');
check('任务 publishType', xhsTask.publishType === 'imageText');
check('任务 accountId', xhsTask.publishArgs?.accountForms?.[0]?.platformAccountId === 'xhs_acct_001');

const video = buildVariantPayload('wechat_channels', 'video', { ...base, cover });
check('视频号预检通过', video.ok, JSON.stringify(video.errors));
check('视频号 AI 文本', String(video.payload?.description || '').includes(AI_TEXT));
check('视频号 createType 直接发布', video.payload?.createType === 2);

const article = buildVariantPayload('wechat_article', 'article', { ...base, cover });
check('公众号预检通过', article.ok, JSON.stringify(article.errors));
check('公众号不群发', article.payload?.notifySubscribers === 0);

const douyin = buildVariantPayload('douyin', 'video', { ...base, cover });
check('抖音预检通过', douyin.ok, JSON.stringify(douyin.errors));
check('抖音 AI 声明', douyin.payload?.statement === 3);

const broken = buildVariantPayload('xiaohongshu', 'imageText', { ...base, images: [] });
check('缺图阻止', broken.ok === false && broken.errors.some(x => x.includes('images')));

const longBody = buildVariantPayload('xiaohongshu', 'imageText', { ...base, body: '长'.repeat(1001), images: [media] });
check('超长正文阻止', longBody.ok === false);

check('schema 数量', Object.keys(SCHEMAS).length === 4);

const passed = checks.filter(x => x.ok).length;
console.log(JSON.stringify({ ok: passed === checks.length, passed, total: checks.length, checks }));
process.exit(passed === checks.length ? 0 : 1);
