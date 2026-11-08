# 蚁小二接入工作计划与方案书

版本：v0.1  
日期：2026-11-08  
范围：把蚁小二作为发布 provider，接入副账号矩阵。  
前置：当前账号组版本先冻结。

---

## 一、目标

```text
主号：直连官方 API / 人工发布
副号：蚁小二 provider
一条内容：content_id + 多平台变体
```

不把蚁小二做成渠道，也不做成账号组。

```text
platform     内容发到哪里：公众号 / 视频号 / 小红书 / 抖音
provider     怎么发：direct / manual / yixiaoer
channel      一个平台账号 + 一个 provider
```

---

## 二、范围

### 做

```text
账号组 / 渠道 / provider 数据模型
content_id / variant_id
四平台字段映射
蚁小二账号列表
素材上传
任务创建
状态轮询
platform_ref 回写
字段校验与缺失阻止
一个测试账号的端到端验证
```

### 不做

```text
36 条全量重发
自动通过
批量相似内容
绕过平台审核
把蚁小二平台树复制进本系统
```

---

## 三、冻结与分支

### 第 0 步：冻结当前版本

```text
提交当前账号组改动
打 tag v2.3.0
备份 data/studio.db
生成 releases/v2.3.0.zip
推送 main + tag
```

### 第 1 步：开分支

```text
feature/yixiaoer-distribution
```

蚁小二分支使用独立 data 目录，避免污染主库。

### 回滚

```text
代码：git checkout v2.3.0
数据：恢复 v2.3.0 的 studio.db 备份
```

---

## 四、数据模型

先加字段，不重写数据库。

```text
briefs.content_id
specs.content_id
renders.content_id

publications.content_id
publications.variant_id
publications.template_version
publications.provider
publications.provider_account_id
publications.provider_task_id
publications.platform_ref
publications.ai_label_status
```

渠道增加：

```text
wechat_accounts.provider
wechat_accounts.platform
wechat_accounts.provider_account_id
```

### 关系

```text
content_id
  ├─ variant 小红书 imageText
  ├─ variant 视频号 video
  ├─ variant 公众号 article
  └─ variant 抖音 video
```

一个变体对应：

```text
一个 spec
一个 render
一个 publication
一个 platform_ref
```

---

## 五、Adapter 结构

新增：

```text
lib/publishers/yixiaoer.mjs
lib/publishers/mapping-*.mjs
```

接口：

```js
listAccounts()
upload(file)
getSchema(platform, type)
validate(payload)
createTask(payload)
poll(taskId)
```

原则：

```text
核心内容模型不感知平台字段
平台差异放在 mapping 配置
必填缺失时停止
```

---

## 六、字段映射

四个 profile：

```text
xiaohongshu.imageText
wechat_channels.video
wechat_article.article
douyin.video
```

详见：

```text
docs/YIXIAOER-MAPPINGS.md
```

发布流程：

```text
variant + account
→ buildPayload
→ schema 对照
→ validate
→ dry-run
→ createTask
→ poll
→ platform_ref
```

---

## 七、UI 调整

### 账号组页

```text
渠道矩阵：
  公众号主号  直连
  视频号主号  人工
  小红书副号  蚁小二
  抖音副号    蚁小二
```

### 内容详情

```text
content_id
  ├─ 平台版本
  ├─ 字段检查
  ├─ 发布方式
  └─ platform_ref
```

### 发布方式页

```text
蚁小二 API Key
Base URL
cloud / local
账号映射
Schema / Dry-run
```

---

## 八、阶段

### P0 冻结

```text
commit / tag / backup / release
```

### P1 数据主线

```text
content_id / variant_id / provider 字段
```

### P2 Adapter 骨架

```text
mock 数据
listAccounts / upload / createTask / poll
```

### P3 四张映射表

```text
小红书 / 视频号 / 公众号 / 抖音
```

### P4 真实测试

```text
一个测试账号
一个平台
一条内容
dry-run
正式发布
回执
```

### P5 接入 UI

```text
渠道矩阵
内容变体
字段检查
```

### P6 合并与冻结

```text
测试通过
合并 main
打 tag
```

---

## 九、验收标准

```text
content_id 贯穿母稿到发布
四个平台变体都有独立 payload
必填字段缺失时阻止发布
dry-run 通过
真实账号能发布一条
platform_ref 能回写
失败有明确原因
主库不受测试影响
```

---

## 十、风险

```text
蚁小二 schema 变化
视频号是否支持自动发布
公众号订阅号权限不足
平台审核拦截
同质内容判重
账号授权过期
cloud/local 通道差异
```

处理：

```text
schema 缓存 + validate
单账号测试
失败进入人工队列
不承诺 100% 无人
```

---

## 十一、需要准备

```text
蚁小二企业 API Key
正式 base URL
一个已授权测试账号
小红书 imageText schema
视频号 video schema
公众号 article schema
抖音 video schema
```

---

## 十二、结论

```text
先冻结 v2.3.0
再在 feature/yixiaoer-distribution 上做
先字段映射
再单条测试
不先做批量
```
