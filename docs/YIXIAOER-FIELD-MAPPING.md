# 蚁小二字段不对应：处理方案

## 原则

```text
不改我们的核心内容模型
在 provider adapter 里做映射
必填缺失就阻止发布
```

核心内容只保留：

```text
title
body
images
video
cover
tags
declaration / ai_label
schedule
```

平台差异不进入母稿。

## 字段不对应的五种情况

### 1. 名称不同

```text
我们：title
蚁小二：contentPublishForm.title / short_title
```

处理：字段映射。

### 2. 类型不同

```text
我们：tags 数组
平台：逗号字符串 / topic HTML
```

处理：transform。

### 3. 枚举不同

```text
我们：ai_label = true
平台：declaration = 1 / 3 / 4
```

处理：value map。

### 4. 必填但没数据

```text
平台要求 category / location / music
我们没有
```

处理：

```text
能给安全默认值就给
不能给就标记“需人工补充”
不自动发布
```

### 5. 平台不支持

```text
平台没有这个字段
```

处理：丢弃，不硬塞。

## 适配器接口

```js
buildPayload(variant, account, options) -> {
  payload,
  missing: [],
  warnings: []
}
```

## 映射配置

```json
{
  "platform": "小红书",
  "publishType": "imageText",
  "fields": {
    "title": {
      "from": "variant.title",
      "required": true,
      "max": 20
    },
    "description": {
      "from": "variant.body",
      "transform": "htmlToPlain",
      "required": true
    },
    "images": {
      "from": "variant.images",
      "required": true,
      "min": 1
    },
    "declaration": {
      "from": "variant.ai_label",
      "map": { "true": 1, "false": 0 }
    },
    "scheduledTime": {
      "from": "schedule.timestamp"
    }
  }
}
```

## 获取真实 schema

不要猜。

```text
yxer schema fields 小红书 imageText
yxer schema fields 视频号 video
yxer schema fields 微信公众号 article
```

或读取蚁小二 API 文档的平台表单定义。

缓存 schema，但要带版本和时间。

## 发布前校验

```text
buildPayload
→ validate
→ 必填缺失？
→ 是：阻止，提示补什么
→ 否：dry-run
→ 通过：publish
```

## 字段缺失的 UI

每个平台变体显示：

```text
字段检查
  ✓ 标题
  ✓ 正文
  ✓ 图片
  ! 声明
  ! 分类
```

提供：

```text
自动补默认值
手动填写
跳过该平台
```

## 不要做

```text
不要把所有平台字段塞进母稿
不要把必填字段留空硬发
不要用同一个 payload 发所有平台
不要猜平台枚举
```

## 结论

```text
字段不对应不是“改文案”
是“加一个平台映射层”
```

```text
能映射的自动映射
不能映射的显式暴露
必填缺失就停止
```
