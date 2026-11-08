// 蚁小二平台表单约束快照。
// 来源：Apifox taskSets/v2 表单定义（2026-11-08）。
// 这是文档快照，不是真实账号 schema；真实字段仍须用 yxer schema fields 复核。

export const SCHEMAS = {
  'xiaohongshu:imageText': {
    platform: '小红书',
    publishType: 'imageText',
    required: ['description', 'images', 'visibleType'],
    limits: { description: 1000, topics: 5 },
    fields: {
      title: { type: 'string', required: false },
      description: { type: 'string', required: true, max: 1000, html: true },
      images: { type: 'array', required: true, min: 1 },
      visibleType: { type: 'number', required: true, enum: [0, 1, 3] },
      scheduledTime: { type: 'number', required: false },
      location: { type: 'object', required: false },
      music: { type: 'object', required: false }
    }
  },
  'wechat_channels:video': {
    platform: '视频号',
    publishType: 'video',
    required: ['createType'],
    limits: { description: 1000 },
    fields: {
      short_title: { type: 'string', required: false },
      description: { type: 'string', required: true, max: 1000, html: true },
      horizontalCover: { type: 'object', required: false },
      createType: { type: 'number', required: true, enum: [1, 2] },
      pubType: { type: 'number', required: false, enum: [0, 1] },
      scheduledTime: { type: 'number', required: false }
    }
  },
  'wechat_article:article': {
    platform: '微信公众号',
    publishType: 'article',
    required: ['pubType', 'notifySubscribers', 'articles'],
    fields: {
      pubType: { type: 'number', required: true, enum: [0, 1] },
      notifySubscribers: { type: 'number', required: true, enum: [0, 1] },
      articles: {
        type: 'array',
        required: true,
        min: 1,
        itemRequired: ['title', 'content', 'cover', 'createType'],
        itemLimits: { title: 64, digest: 129, authorName: 8 }
      },
      scheduledTime: { type: 'number', required: false }
    }
  },
  'douyin:video': {
    platform: '抖音',
    publishType: 'video',
    required: ['horizontalCover'],
    fields: {
      title: { type: 'string', required: false },
      description: { type: 'string', required: false },
      horizontalCover: { type: 'object', required: true },
      statement: { type: 'number', required: false, enum: [3, 4, 5, 6] },
      scheduledTime: { type: 'number', required: false },
      allow_save: { type: 'number', required: false, enum: [0, 1] }
    }
  }
};
