# 架构审查回应（2026-11-08）

来源：外部 AI 对当前工作台的评审。这里记录哪些成立、哪些需要修正，以及下一步优先级。

## 一、需要修正的事实

```text
外部评审说当前模板是 1000_image_post_v3
实际当前模板是 Hybrid PageFrame v2.2
1080×1920 / 4–6 页 / 20–28 秒
```

```text
外部评审说“只有两个品牌账号组”
当前实际有两个账号组：
固定地址（公众号 + 视频号）
个人公众号组（只有公众号）
```

```text
外部评审说“内容是本地文件”
实际核心数据在 SQLite：data/studio.db
发布包和媒体在本地目录
```

## 二、成立且重要的判断

1. 已有的是“素材态 / 槽位态”，缺“内容实例态”。
   - 模板 ID、渠道 ID、账号组 ID 是槽位。
   - 缺 `content_id` 贯穿母稿 → 变体 → 发布对象。
2. 缺发布回执映射。
   - 缺 `platform_ref`：公众号 media_id/msgid、视频号链接、小红书 note id。
3. 缺效果回流。
   - 有发布记录，但没有按 content_id 聚合阅读/互动/转化。
4. 配置作用域不清。
   - 模板、知识库、结构库、灵魂档案目前是全局的。
   - 两个品牌会串调性。
5. 设置页职责过载。
   - 凭据、模型 Key、模板、排版、发布、部署混在一页。
6. 状态语义不完整。
   - “测试”没有持久化为 tested_at / test_status。
7. 版本没有绑定内容。
   - 系统版本、模板版本、文章排版版本没有写进发布包元数据。
8. 审批队列必须保持全局可见。
   - 当前角标已经做到，不能沉掉。

## 三、需要保留的判断

```text
账号组 = 品牌，这个抽象正确
素材库 / 音乐库 / 知识库 / 结构库 / 模板库 / 元素库 / 灵魂档案，资产层已经存在
不要为了“平台化”先重写整个系统
自用阶段优先 content_id + platform_ref
```

## 四、配置作用域建议

不要把所有资产都复制到每个品牌，应该分层：

```text
全局
  模型 Key
  渲染链
  发布适配器
  IP / dry-run 策略
  音乐版权库
  通用元素库

账号组
  默认模板
  视觉主题
  灵魂档案
  结构偏好
  知识库集合
  默认渠道

内容
  content_id
  选中的 template_version
  渠道变体
  platform_ref
  审批 / AI 标识
```

知识库和结构库采用：

```text
全局资产 + 账号组绑定/覆盖
```

不是每个品牌复制一份。

## 五、最小数据模型

```text
briefs.content_id
specs.content_id
renders.content_id
publications.content_id
publications.platform_ref
publications.template_version
publications.ai_label_status
```

可选：

```text
content_items
  content_id
  group_id
  brief_id
  title
  created_at
```

先做字段，不必马上建新表。

## 六、优先级

### P0

```text
content_id
template_version
platform_ref
```

### P1

```text
账号组作用域：模板 / 灵魂 / 知识库 / 结构库
设置页拆分
测试状态持久化
```

### P2

```text
效果回流 CSV
按 content_id 聚合
AI 标识强制校验
权限 / 审计
多租户
```

## 七、结论

```text
外部评审的“资产层缺失”说法不准确
准确说法是“素材态已有，实例态缺失”
```

```text
最值得先做的不是权限，不是多租户
是 content_id + template_version + platform_ref
```
