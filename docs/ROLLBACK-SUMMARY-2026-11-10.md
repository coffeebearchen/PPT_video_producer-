# 工作与代码总结 · 回滚基线

日期：2026-11-10
基线版本：v2.3.1
用途：在加入新的视频方法/工具之前，保留当前可回滚状态。

---

## 1. 系统一句话

固定地址内容生产系统：从选题 → 角度 → 文案 → 视频渲染 → 审批 → 发布包 → 公众号草稿/视频号人工发布。

本地运行：

```text
node server.mjs
http://127.0.0.1:4310
```

---

## 2. 主要模块

```text
server.mjs             HTTP API + 渲染队列 + 发布任务
lib/db.mjs             SQLite 结构与迁移、账号组/渠道/选题/发布
lib/generator.mjs      角度 / 文案 / Lite 生成
lib/spec-check.mjs     文案字段与断词检查
lib/motion.mjs         文字与页面运动预设
lib/motion-model.mjs   运动参数模型
lib/elements.mjs       旧版 SVG 元素库与选择
lib/wechat.mjs         公众号官方 API（草稿/发布/测试）
lib/preflight.mjs      成片预检
lib/templates.mjs      模板预设
renderer/render.mjs    旧版/混合版渲染器
renderer/v2/           PageFrame v2 渲染器
renderer/hybrid.css    混合版排版
public/                前端 Dashboard
scripts/               迁移、校验、生成、E2E 测试脚本
docs/                  设计与规则文档
```

---

## 3. 已完成功能

### 内容生产

```text
Brief → 角度卡 → 3–6 页文案
结构库 / 知识库 / 灵魂档案
Lite 单次生成 + 缓存
4 / 5 / 6 页视频
```

### 视频渲染

```text
1080 × 1920
20 / 24 / 28 秒
旧背景 + 旧矢量元素 + v2 文字排版
elementSpeed = 0.5
统一高亮切入
X / ✓
最后一页“有问题，评论区问”
```

### 账号与发布

```text
账号组（公众号 + 视频号）
多账号组 / 多渠道
选题绑定账号组
发布任务绑定渠道
公众号草稿（官方 API，需权限）
视频号发布包（人工上传）
批量队列 / 标记已发布
```

### 视觉与运动

```text
B1 / B2 / B3 系列色
旧元素库 + 运动目录
Motion Model 模块化
慢速背景 / 半速元素
```

### Dashboard

```text
左侧栏 / 右侧栏可滚动
账号组工作台
渠道嵌套显示
发布队列
审批 / 预检 / 发布包
```

---

## 4. 当前数据状态

```text
账号组：固定地址
  默认公众号
  默认视频号
选题：48 条
```

---

## 5. 已知边界 / 未完成

```text
视频号无官方内容发布 API，只能发布包 + 人工上传
公众号 API 需认证服务号权限
订阅号通常无自动草稿/发布权限
5/6 页 P4 高亮收尾待修
不做 36 条全量
真实微信发布未在生产环境验证
```

---

## 6. 回滚方式

```text
Git commit：8c48a97
Git tag：v2.3.1-rollback
Release：releases/v2.3.1-rollback.zip
DB backup：backups/rollback-2026-11-10/studio.db
```

---

## 7. 下一步计划

```text
加入新的视频方法 / 工具到平台
保留本基线
新功能走新分支/新版本
验证通过后再合并
```
