# 蚁小二四平台字段映射表

版本：v0.1  
日期：2026-11-08  
依据：蚁小二开放 API 文档中的 `taskSets/v2` 平台表单定义。  
注意：这是文档映射，不是真实账号验证。上线前必须用 `yxer schema fields` + `validate` + `dry-run` 复核。

---

## 一、统一内容模型

```text
content_id
variant_id
platform
title
body
images[]
video
cover
tags[]
ai_label
schedule
```

不把平台字段塞进母稿。

---

## 二、总表

| 统一字段 | 小红书 imageText | 视频号 video | 公众号 article | 抖音 video |
|---|---|---|---|---|
| title | `title` 可选 | `short_title` 可选 | `articles[].title` 必填 | `title` 可选 |
| body | `description` 必填 | `description` 必填 | `articles[].content` 必填 | `description` 可选 |
| images | `images[]` 必填 | - | 正文 HTML 内嵌 | - |
| video | - | `video` | - | `video` |
| cover | `coverKey` | `coverKey` / `horizontalCover` | `articles[].cover` | `horizontalCover` |
| tags | 写进 `description` 的 topic | 写进 `description` 的 topic | 可不用 | 写进 `description` 的 topic |
| ai_label | 无独立字段 | 无独立字段 | 无独立字段 | `statement=3` |
| schedule | `scheduledTime` | `scheduledTime` | `scheduledTime` | `scheduledTime` |

---

## 三、小红书 imageText

### 目标表单

```text
publishType = imageText
platforms = ["小红书"]
```

### 映射

| 目标字段 | 来源 | 必填 | 转换 / 规则 | 缺失处理 |
|---|---|---|---|---|
| `title` | `variant.title` | 否 | 纯文本，长度按 validate | 省略 |
| `description` | `variant.body` | 是 | 转 HTML `<p>`，最多 1000 字，最多 5 个话题 | 阻止 |
| `images` | `variant.images` | 是 | 上传后对象：`width/height/size/format/path` | 阻止 |
| `visibleType` | 固定 | 是 | `0` 公开，`1` 私密 | 默认 `0` |
| `scheduledTime` | `schedule` | 否 | 时间戳，按 schema 校验 | 立即发布 |
| `location` | 无 | 否 | 不传 | 省略 |
| `music` | 无 | 否 | 不传 | 省略 |
| `collection` | 无 | 否 | 不传 | 省略 |
| `group` | 无 | 否 | 不传 | 省略 |

### AI 标识

```text
小红书表单没有独立 AI declaration 字段
不能假装已经声明
需要人工确认平台是否提供声明入口
```

### 注意

```text
description 支持 HTML + topic 标签
话题最多 5 个
图片数量 / 比例不在字段定义里
必须用 validate 检查
```

---

## 四、视频号 video

### 目标表单

```text
publishType = video
platforms = ["视频号"]
```

### 映射

| 目标字段 | 来源 | 必填 | 转换 / 规则 | 缺失处理 |
|---|---|---|---|---|
| `short_title` | `variant.title` | 否 | 短标题，按 validate | 省略 |
| `description` | `variant.body` | 是 | 转 HTML `<p>`，最多 1000 字 | 阻止 |
| `horizontalCover` | `variant.cover` | 否 | 上传后对象 | 用 `coverKey` 兜底 |
| `scheduledTime` | `schedule` | 否 | 时间戳 | 立即发布 |
| `createType` | 发布模式 | 是 | `1` 草稿，`2` 直接发布 | 默认 `1` |
| `pubType` | 发布模式 | 否 | `0` 草稿，`1` 直接发布 | 与 createType 一致 |
| `location` | 无 | 否 | 不传 | 省略 |
| `collection` | 无 | 否 | 不传 | 省略 |
| `activity` | 无 | 否 | 不传 | 省略 |

### AI 标识

```text
视频号表单没有独立 AI declaration 字段
需要平台侧人工确认
```

### 注意

```text
文档 required 只有 createType
但 description 的说明写“必填”
按更严格处理：description 为空则阻止
```

---

## 五、公众号 article

### 目标表单

```text
publishType = article
platforms = ["微信公众号"]
```

### 映射

| 目标字段 | 来源 | 必填 | 转换 / 规则 | 缺失处理 |
|---|---|---|---|---|
| `pubType` | 发布模式 | 是 | `0` 草稿，`1` 直接发布 | 默认 `0` |
| `notifySubscribers` | 策略 | 是 | `0` 不群发，`1` 群发 | 默认 `0` |
| `articles` | 变体 | 是 | 文章数组，至少 1 篇 | 阻止 |
| `articles[].title` | `variant.title` | 是 | 纯文本，最多 64 字 | 阻止 |
| `articles[].content` | `variant.body` | 是 | HTML 字符串 | 阻止 |
| `articles[].cover` | `variant.cover` | 是 | 上传后的 cover 对象 | 阻止 |
| `articles[].digest` | `variant.body` | 否 | 纯文本，最多 129 字 | 自动截取 |
| `articles[].createType` | 策略 | 是 | `0` 不申明，`1` 原创 | 默认 `0` |
| `articles[].authorName` | `account.author` | 否 | 原创时必填，最多 8 字 | 省略 |
| `scheduledTime` | `schedule` | 否 | 时间戳 | 立即发布 |

### AI 标识

```text
公众号文章表单没有独立 AI declaration 字段
不能在没有依据时写“AI 生成”
需要人工确认平台声明位置
```

### 注意

```text
notifySubscribers=1 是群发，风险高
默认必须为 0
不要自动群发
```

---

## 六、抖音 video

### 目标表单

```text
publishType = video
platforms = ["抖音"]
```

### 映射

| 目标字段 | 来源 | 必填 | 转换 / 规则 | 缺失处理 |
|---|---|---|---|---|
| `title` | `variant.title` | 否 | 纯文本，按 validate | 省略 |
| `description` | `variant.body` | 否 | 可含话题 | 省略 |
| `horizontalCover` | `variant.cover` | 是 | 上传后的 cover 对象 | 阻止 |
| `statement` | `ai_label` | 否 | AI 生成映射为 `3`；其他按平台枚举 | 省略 |
| `scheduledTime` | `schedule` | 否 | 时间戳 | 立即发布 |
| `location` | 无 | 否 | 不传 | 省略 |
| `allow_save` | 策略 | 否 | `0` 不允许，`1` 允许 | 默认 `0` |
| `shoppingCart` | 无 | 否 | 不传 | 省略 |
| `music` | 无 | 否 | 不传 | 省略 |

### AI 标识

```text
抖音 statement = 3 表示内容由 AI 生成
这是我们四张表里唯一有明确 AI 声明枚举的
```

---

## 七、必填缺失处理

```text
缺 title        → 阻止（公众号） / 省略（其他）
缺 body         → 阻止（小红书/视频号/公众号）
缺 images       → 阻止（小红书）
缺 video        → 阻止（视频号/抖音）
缺 cover        → 阻止（公众号/抖音）
账号未授权      → 阻止
schema 不通过   → 阻止
dry-run 失败    → 阻止
```

禁止：

```text
用空字符串糊过去
用默认封面糊过去
用同一条 payload 发所有平台
```

---

## 八、转换函数

### body → HTML

```js
const html = String(body).split('\n').filter(Boolean)
  .map(line => `<p>${escapeHtml(line)}</p>`).join('');
```

### tags → topic

```js
const topicHtml = tags.map(t =>
  `<topic text="${escapeHtml(t)}">#${escapeHtml(t)}</topic>`
).join(' ');
```

### AI 声明

```js
const statement = aiLabel ? 3 : undefined; // 仅抖音
```

### schedule

```js
const scheduledTime = new Date(schedule).getTime(); // 以 schema 单位为准
```

---

## 九、必须先验证的未知项

```text
小红书 title 最大长度
小红书图片数量 / 比例
视频号 short_title 长度
视频号 description 是否强制必填
公众号 articles 最大数量
抖音 statement 枚举完整值
scheduledTime 是秒还是毫秒
```

处理：

```text
yxer schema fields <平台> <类型>
yxer validate <平台> <类型> payload.json
yxer publish ... --dry-run
```

---

## 十、结论

```text
四张映射表不是最终代码
是 adapter 的契约
```

```text
能映射的映射
不能映射的显式标记
必填缺失就阻止
dry-run 通过才发布
```
