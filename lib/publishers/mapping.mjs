// 蚁小二平台字段映射：先做纯函数，不联网。
// 真实发布前仍必须用 yxer schema fields / validate / dry-run 复核。

import { SCHEMAS } from './schemas.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const AI_TEXT = '本内容由 AI 辅助生成。';

export function bodyToHtml(body) {
  const lines = String(body || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
  return lines.map(x => `<p>${esc(x)}</p>`).join('');
}

export function tagsToTopic(tags = []) {
  return (Array.isArray(tags) ? tags : []).filter(Boolean).map(t => `<topic text="${esc(t)}">#${esc(t)}</topic>`).join(' ');
}

export function withAiText(html, aiLabel) {
  if (!aiLabel) return html;
  if (String(html).includes(AI_TEXT)) return html;
  return `${html}<p>${AI_TEXT}</p>`;
}

export function buildXiaohongshuImageText(v) {
  const html = withAiText(bodyToHtml(v.body), v.aiLabel);
  const topics = tagsToTopic(v.tags);
  return {
    formType: 'task',
    title: v.title || undefined,
    description: topics ? `${html}<p>${topics}</p>` : html,
    images: v.images || [],
    visibleType: 0,
    ...(v.schedule ? { scheduledTime: Number(v.schedule) } : {})
  };
}

export function buildWechatChannelsVideo(v) {
  return {
    formType: 'task',
    short_title: v.title || undefined,
    description: withAiText(bodyToHtml(v.body), v.aiLabel),
    horizontalCover: v.cover || undefined,
    createType: v.mode === 'draft' ? 1 : 2,
    pubType: v.mode === 'draft' ? 0 : 1,
    ...(v.schedule ? { scheduledTime: Number(v.schedule) } : {})
  };
}

export function buildWechatArticle(v) {
  return {
    formType: 'task',
    pubType: v.mode === 'draft' ? 0 : 1,
    notifySubscribers: 0,
    articles: [{
      title: v.title || '',
      content: withAiText(bodyToHtml(v.body), v.aiLabel),
      digest: String(v.body || '').replace(/\s+/g, ' ').slice(0, 120),
      cover: v.cover || undefined,
      createType: 0,
      authorName: v.author || undefined
    }],
    ...(v.schedule ? { scheduledTime: Number(v.schedule) } : {})
  };
}

export function buildDouyinVideo(v) {
  return {
    formType: 'task',
    title: v.title || undefined,
    description: bodyToHtml(v.body),
    horizontalCover: v.cover || undefined,
    ...(v.aiLabel ? { statement: 3 } : {}),
    allow_save: 0,
    ...(v.schedule ? { scheduledTime: Number(v.schedule) } : {})
  };
}

export const PROFILES = {
  'xiaohongshu:imageText': { name: '小红书图文', build: buildXiaohongshuImageText, required: ['description', 'images'] },
  'wechat_channels:video': { name: '视频号视频', build: buildWechatChannelsVideo, required: ['description', 'createType'] },
  'wechat_article:article': { name: '公众号文章', build: buildWechatArticle, required: ['articles'] },
  'douyin:video': { name: '抖音视频', build: buildDouyinVideo, required: ['horizontalCover'] }
};

export function buildVariantPayload(platform, publishType, variant) {
  const profile = PROFILES[`${platform}:${publishType}`];
  if (!profile) return { ok: false, errors: [`不支持的平台类型: ${platform}/${publishType}`], payload: null };
  const form = profile.build(variant || {});
  const errors = [];
  for (const key of profile.required) {
    const val = form[key];
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) errors.push(`缺少必填字段: ${key}`);
  }
  if (platform === 'wechat_article' && form.articles?.[0]) {
    for (const key of ['title', 'content', 'cover', 'createType']) {
      const val = form.articles[0][key];
      if (val === undefined || val === null || val === '' ) errors.push(`缺少文章必填字段: ${key}`);
    }
  }
  const schema = SCHEMAS[`${platform}:${publishType}`];
  if (schema) {
    for (const [key, rule] of Object.entries(schema.fields || {})) {
      const val = form[key];
      if (rule.required && (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length))) {
        if (!errors.some(x => x.includes(key))) errors.push(`缺少必填字段: ${key}`);
      }
      if (val !== undefined && rule.enum && !rule.enum.includes(val)) errors.push(`${key} 不在允许值: ${rule.enum.join('/')}`);
      if (typeof val === 'string' && rule.max && val.length > rule.max) errors.push(`${key} 超过 ${rule.max} 字`);
    }
    if (platform === 'xiaohongshu') {
      const topics = String(form.description || '').match(/<topic\b/g) || [];
      if (topics.length > 5) errors.push('小红书话题超过 5 个');
    }
    if (platform === 'wechat_article' && form.articles?.[0]) {
      const a = form.articles[0];
      if (a.title && a.title.length > 64) errors.push('公众号标题超过 64 字');
      if (a.digest && a.digest.length > 129) errors.push('公众号摘要超过 129 字');
      if (a.authorName && a.authorName.length > 8) errors.push('公众号作者超过 8 字');
    }
  }
  return { ok: errors.length === 0, errors, payload: form, profile: profile.name, schema: schema || null };
}
