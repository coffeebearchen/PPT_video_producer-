# HANDOFF-TO-CODEX.md

> 交接对象：本地 Codex（或其他开发者）。
> 原则：请先检查项目结构、启动方式、现有功能和问题，再修正。保留已有成果，不要直接重写整个项目。不删除文件、不重写项目、不部署、不向远程仓库推送。

---

## 1. 项目概况

```text
项目根目录：D:\AI数字资产\studio
项目用途：本地内容生产平台「固定地址」
        把选题 / 文案 / 语音自动变成竖屏短视频（1080×1920），
        并支持公众号草稿、视频号人工发布。
技术栈：
  前端  原生 HTML / CSS / JS（无框架） public/
  后端  Node.js 原生 HTTP           server.mjs
  数据库 SQLite（node:sqlite）      lib/db.mjs → data/studio.db
  渲染引擎 A  本地模板（HTML/CSS → Chrome Headless → ffmpeg）
  渲染引擎 B  VibeMotion（Remotion + React，TimelineDSL JSON 驱动）
```

## 2. 目录与素材位置

```text
server.mjs                        后端入口 + 全部 API 路由
public/                           前端（index.html / app.js / styles.css）
lib/                              核心逻辑
  db.mjs                          SQLite schema + migrations + helpers
  generator.mjs                   文案/角度/spec 生成（调用 deepseek-chat）
  vibemotion.mjs                  VibeMotion DSL 生成 + Remotion 渲染 + 封面
  element-catalog.mjs             元素目录 / 配色 / 字体 / 模板
  tts.mjs                         TTS 抽象（mock 已通，OpenAI 兼容已实现，其余未接）
  compliance.mjs                  自动合规闸门
  wechat.mjs                      公众号官方 API（draft/add、freepublish）
  publishers/                     发布包 / 蚁小二等
  templates.mjs / motion*.mjs     本地模板引擎
renderer/                         本地模板引擎（引擎 A）源码 + 字体/素材
engines/vibemotion/renderer/      引擎 B 源码（npm ci 后生成 node_modules，已 gitignore）
docs/                             所有设计稿、功能说明、交接文档
scripts/e2e-*.mjs                 UI/API 端到端自测脚本（CDP）
data/                             运行时数据（gitignore）：studio.db / media / 产物
```

## 3. 安装 / 启动 / 构建 / 测试

```powershell
# 1) 引擎 B 依赖（首次）
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npm ci --no-audit --no-fund

# 2) 启动平台
cd D:\AI数字资产\studio
node server.mjs

# 打开
http://127.0.0.1:4310
自动生成页：http://127.0.0.1:4310/#/autogen
```

```text
构建：无独立构建步骤（前端为原生静态文件）
测试：无单元测试框架
  - node --check server.mjs / lib/*.mjs / public/app.js  语法检查
  - scripts/e2e-accounts.mjs / e2e-groups.mjs / e2e-account-data.mjs  API/CDP 自测
首次渲染会下载 Chrome Headless Shell（约 131MB）。
timeline_dsl.json 是编译期 import，改完必须重渲，不能运行时换片。
```

## 4. 已完成功能

```text
自动生成：题材 → 结构 → 文案 → 语音(mock) → 分镜 → 渲染 → 成片
任务队列 / 进度 / 取消 / 重试
自动合规闸门（敏感词拦截）
Copilot 大屏（待办/进行中/已完成/异常）
元素画廊（39 个元素，含结构/数据/叙事/素材/标注/质感）
模板系统：3 配色 + 2 字体 + 3 预设模板，已接进 DSL
双引擎：本地模板（引擎 A）+ VibeMotion（引擎 B），共用菜单
公众号：官方 API 草稿 + freepublish；视频号：人工发布包
多账号组：账号组 → 公众号 / 视频号
```

## 5. 未完成功能

```text
真实 TTS / 声音克隆（接口与设置已就绪，缺 Key 与音色）
标注层 + 质感层只在画廊预览，未进主渲染链路
封面自动生成（当前手动）
字体 heading / body 分开精调
server 切换到独立渲染服务（vibemotion-service.mjs 已可启动，但 server 仍走 CLI）
Linux 服务器迁移
AI 文案自动生成（已接 draftAutoScript，但质量需调）
```

## 6. 已知问题

```text
1. 视频信息密度不够、像 PPT：一屏元素少、流程图表偏静态。
2. 首屏渲染下载 Chrome Headless Shell 会卡在 12% 一段时间（属正常，不是卡死）。
3. 进度在编码阶段停在 92%（封面生成阶段）。
4. 奶油纸配色是“机械替换”第一版，部分深/浅色可能还要精调。
5. 合规闸门是简单关键词（保证/百分百/最/第一/国家级…），误伤常见字（如“最”）。
```

## 7. 复现步骤

```text
1. 启动 server.mjs
2. 打开 http://127.0.0.1:4310/#/autogen
3. 新建自动任务（标题 + 文案 + 结构 + 时长）
4. 任务进入队列 → 渲染 → 完成后可播放
```

## 8. 模拟数据 vs 真实接口

```text
真实接口：
  LLM 文案生成 → https://api.deepseek.com（deepseek-chat）
  公众号 → 微信官方 API（draft/add、freepublish），需服务号权限
模拟/桩：
  TTS → 只有 mock 静音（OpenAI 兼容代码已写，未用真实 Key 验证）
  视频号 → 无官方内容发布 API，只出“人工发布包”
  语音时间戳 → 字符等比估算（无 WhisperX 真对齐）
```

## 9. 环境变量

```text
本项目凭据主要存数据库 settings 表（/api/settings 读写），不依赖 .env。

可选：
  VIBEMOTION_PORT  独立渲染服务端口，默认 5001

不写真实密钥。凭据通过设置页填写，存本地 SQLite：
  wechat_appid / wechat_secret
  llm_base_url / llm_model / llm_api_key
  tts_provider / tts_base_url / tts_model / tts_voice / tts_api_key
```

## 10. 重要文档

```text
AGENTS.md                          平台视觉铁律（必须遵守）
docs/ELEMENT-FRAMEWORK-SPEC.md     元素框架 + 模板系统正式指令
docs/VIBEMOTION-INTEGRATION.md     接入与回滚说明
docs/CODEX-HANDOFF.md              Codex 交接说明（可参考）
docs/ROLLBACK-SUMMARY-2026-11-10.md 状态与回滚点
docs/HOOK-SYSTEM.md / MOTION-MODEL.md / UPGRADE-MEMO.md
```

## 11. 最近修改 / 下一步建议

```text
最近修改：
  lib/element-catalog.mjs          元素目录 + 配色 + 字体 + 模板
  lib/vibemotion.mjs               模板驱动 sceneFlow + 动态 palette
  server.mjs                       元素目录 API + 模板字段
  docs/ELEMENT-FRAMEWORK-SPEC.md   框架指令

下一步建议先处理（按优先级）：
  P0 把目标样片 TARGET-SAMPLES 的分镜骨架用起来，提升信息密度与动效节奏
  P1 标注层 + 质感层搬进 Video.tsx / SceneDecor
  P2 封面自动生成 cover.png + cover_3x4.png
  P3 字体 heading/body 分开调
```

## 12. 实际执行过的测试及结果

```text
node --check server.mjs / lib/*.mjs / public/app.js   通过（无输出）
API 创建自动任务 → 渲染 → done                        通过
  验证：1080×1920 / 30fps / h264 + aac
人工模式 pending_confirm → confirm → done            通过
合规闸门 “保证百分百有效” → blocked                   通过
TTS mock → 语音轨 aac 进入视频                        通过
独立渲染服务 /health → ok                             通过
元素画廊 39 个 still 渲染                             通过

未验证：
  real TTS / 声音克隆
  Linux 服务器部署
  公众号真实草稿发送（需服务号 + 真实 AppID/Secret）
  scripts/e2e-*.mjs 在最新改动后是否全部通过（未重跑）
```

## 13. Git 状态

```text
分支：main
最新提交：fbbca29 docs: Codex handoff guide
未提交变更：无（working tree clean）
说明：本项目使用 Git，但没有需要保留的未提交文件。
      请勿向远程仓库推送。
```
