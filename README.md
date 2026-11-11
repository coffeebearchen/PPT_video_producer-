# 固定地址 · 内容工作台 v0.87.0

## 当前冻结版本

- **v0.87.0 已冻结**：排版内核、五主题回归、对比度、转场补丁；快照在 `releases/v0.87.0/`，说明见 [RELEASE-v0.87.0.md](RELEASE-v0.87.0.md)。\n- **v0.86.1 已冻结**：安全区 / 转场补丁；快照在 `releases/v0.86.1/`，说明见 [RELEASE-v0.86.1.md](RELEASE-v0.86.1.md)。\n- **v0.86.0 已冻结**：批量新建、批量渲染、ZIP、结构专属页首版、相关性闸门；快照在 `releases/v0.86.0/`，说明见 [RELEASE-v0.86.0.md](RELEASE-v0.86.0.md)。
- **v0.85.1 已冻结**：文字主角、慢速元素、切入切出、至少一页无元素；快照在 `releases/v0.85.1/`，说明见 [RELEASE-v0.85.1.md](RELEASE-v0.85.1.md)。
- **v0.85 已冻结**：元素生态随机运动、灰阶背景、文字随机切入、3–6 页全片；快照在 `releases/v0.85/`，说明见 [RELEASE-v0.85.md](RELEASE-v0.85.md)。
- **v0.7.5 已冻结**：结构优先工作台、P3 结论迁移、金句候选、低清预览；快照在 `releases/v0.7.5/`，说明见 [RELEASE-v0.7.5.md](RELEASE-v0.7.5.md)。
- **v0.6.0 已冻结**：快照在 `releases/v0.6.0/`，说明见 [RELEASE-v0.6.0.md](RELEASE-v0.6.0.md)。这是结构优先改造前的基线。
- **v0.5.0 冻结**：快照在 `releases/v0.5.0/`，说明见 [RELEASE-v0.5.0.md](RELEASE-v0.5.0.md)。
- **操作者 SOP**：从建选题到发布、审批、备份和回退，见 [docs/operator-sop-v0.5.md](docs/operator-sop-v0.5.md)。
- **结构优先产品设计 v1**：信息架构、核心对象、VideoSpec、五个版式、路线图，见 [docs/product-design-structure-v1.md](docs/product-design-structure-v1.md)。

- **公众号图文 v1**：`wechat_article_v1`，已冻结。系列标签 / Lead / Highlight / 小节编号 / 引用 / CTA / 主条+次条呼应不再随视频或音乐改版。
- 视频动效：通用 `motion` 规范，当前模板信封从左侧滑入；后续对象可复用 `slideX / slideY / rotateIn / scaleIn / float`。完整规范见 [docs/motion-system-v1.md](docs/motion-system-v1.md)。
- 页面转场：横向推页 / 上翻页 / 下翻页；动效预设 Flow / Strong / 无动效。
- 音乐库：独立内容资产页面，支持上传 WAV/MP3/M4A/AAC、分类、标签、BPM、试听和 AI 选曲建议（1 个建议 + 最多 2 个备选，人工确认后写入选题）。
- AI 预填选题：新建选题时先写一句方向，AI 填标题/话题/受众/类比方向/边界/CTA，人工确认后创建。
- AI 整理类比：新建类比时先写随手记（或从 `knowledge/inbox` 读取），AI 整理成源域/目标域/映射/边界/签名，人工审核后保存；原文同时存库并写入 `knowledge/inbox/analogy-*.md`。
- 音乐：`pulse`（120 BPM，强节奏）与 `minimal`（80 BPM，极简）两轨，按关键词自动匹配，可在选题文案里改。
- 小红书：同一 9:16 成片 + 3:4 封面发布包。

自媒体内容平台：**Brief → 资料源 → 知识库 / 类比库 / 灵魂档案 → 角度卡 → 三页文案 → 预览/成片 → 素材库 → 审批 → 公众号/视频号发布任务**。

不是静态原型，所有页面和数据都在本地跑通。零 npm 依赖，只用 Node 24 内置的 `node:sqlite`、`fetch` 和系统里的 Chrome + ffmpeg。

## 课件式（Courseware）· 新增

把「PPT 式课件」做成竖屏视频：**真实截图 + 圈重点 + 推镜头 + 流程 + 旁白**。

### 三种用法

1. **一键生成**：给一个主题 → AI 排 5 页 → 出片
   ```http
   POST /api/courseware/auto { "topic": "如何自动发布公众号" }
   ```
2. **文案分镜**：一段话 + 截图/视频 → AI 拆镜头 + 找位置 + 选效果
   ```http
   POST /api/courseware/drafts/{id}/compose { "script": "先讲审批页点通过；再讲发布页点生成发布包" }
   ```
3. **手动编辑**：浏览器打开 `#/autogen` → 模式选「课件式」→ 加页/传素材/拖框/填旁白

### 页面类型

| kind | 用途 |
|---|---|
| `title` | 开场 |
| `screenshot` | 真实截图 + 高亮框 + 推镜头 |
| `video` | 真实视频片段（`trim` / `muted` / `fit`）|
| `flow` | 流程节点图 |
| `bullet` | 要点 |
| `quote` | 收尾金句 |

### 19 种效果（A–H）

镜头 `zoom/pan/follow` · 出现 `stagger/typewriter/fade` · 标注 `draw/arrow/bubblePop` · 强调 `pulse/magnifier` · 转场 `fade/slide/push/wipe` · 声音 `bgm/sfx` · 结构 `hook/progress/chapter` · 质感 `grain/gradient/lightSweep/tilt`

完整调用说明：`engines/vibemotion/renderer/src/courseware/CALLING.md`、`VIDEO-CALLING.md`、`BRAND-CALLING.md`。

### 品牌 + AI 标识（白标/合规）

```json
{ "brand": { "text": "固定地址", "show": true }, "aiLabel": { "text": "AI 生成", "show": true } }
```

### 素材与 AI 找位置

- 本主题素材：`data/media/courseware/{taskId}/`（图/视频/音频，按任务隔离）
- 上传：`POST /api/courseware/drafts/{id}/assets`
- AI 找位置：`POST /api/courseware/drafts/{id}/assets/{aid}/detect { "description": "第一行的通过按钮" }`

### 实现位置

| 模块 | 文件 |
|---|---|
| 渲染器 | `engines/vibemotion/renderer/src/courseware/` |
| 编译 | `lib/courseware-compile.mjs` |
| 分镜（LLM+VLM）| `lib/courseware-compose.mjs` |
| 视觉找位置 | `lib/courseware-detect.mjs` |
| 渲染封装 | `lib/courseware-render.mjs` |
| 项目/素材 | `lib/courseware-project.mjs` |
| API | `server.mjs`（`/api/courseware/*`）|

## 快速开始

```powershell
cd 'D:\AI数字资产\studio'
node server.mjs
```

也可以直接双击 `start.cmd`，它会启动服务并打开浏览器。

打开：<http://127.0.0.1:4310>

首次启动会自动：

1. 创建 `data/studio.db`（SQLite）；
2. 从 `seed-assets/` 复制演示视频、封面、三页预览；
3. 写入 2 条演示选题 + 1 条完整成片；
4. 扫描 `..\knowledge`，写入知识库、3 个类比和默认灵魂档案。

如果 4310 被占用：

```powershell
$env:PORT=4320
node server.mjs
```

默认知识目录是 `D:\AI数字资产\knowledge`。换目录：

```powershell
$env:KNOWLEDGE_DIR='E:\my-knowledge'
node server.mjs
```

## 演示成片

平台自己渲染的第二条示例（NAS 自动化发布的三个边界）：

- [demo-nas-18s.mp4](out/demo-nas-18s.mp4)
- [demo-nas-cover.png](out/demo-nas-cover.png)

## 界面

- [总览](out/screenshots/dashboard.png)
- [审批台](out/screenshots/review.png)
- [发布队列](out/screenshots/publish.png)
- [素材库](out/screenshots/library.png)
- [知识库](out/screenshots/knowledge.png)
- [类比库](out/screenshots/analogies.png)
- [灵魂档案](out/screenshots/soul.png)
- [设置](out/screenshots/settings.png)
- [公众号图文预览](out/screenshots/review-article.png)

## 现在能做什么

| 模块 | 能力 |
|---|---|
| 总览 | 待审 / 渲染中 / 待发布 / 本周成片；待处理队列；最近内容；操作记录 |
| 选题 | 新建 Brief（话题、类比方向、数量、受众、禁区、渠道、CTA）；状态筛选 |
| 资料源 | 贴 URL 自动抓标题和正文；也可以直接粘贴正文；抓取失败会标红 |
| 知识库 | 扫描 `..\knowledge` 下的 Markdown/TXT；切块、关键词检索、查看引用；每条资料可删 |
| 类比库 | 源域 → 目标域的映射、边界、一句话签名；可增删改 |
| 灵魂档案 | 信念、禁用表达、语感规则、一句话签名、黄金样例；进入生成上下文 |
| 角度卡 | 按 Brief 里的「候选角度数量」生成 1–6 个角度；点选一个；可换一批 |
| 三页文案 | 页面 1/2/3 全部字段可编辑；同一份 Spec 里还有「公众号图文」：标题、摘要、封面字、开头、3 个小节、CTA |
| 公众号图文 | 文章不是视频字幕复制：3 段正文 + 来源 + CTA；审批台可预览；`draft/add` 用这篇文章 |
| 渲染 | 先生成 3 帧预览；再渲染 18 秒 1080×1920 成片；进度轮询 |
| 素材库 | 每条成片绑定 Spec、版本、hash、封面、预览、状态 |
| 审批 | 播放器 + 三页预览 + 来源 + 5 项清单 + 批注；通过/退回 |
| 发布 | 视频号发布包（MP4 + 封面 + metadata + README）；公众号任务；dry-run；标记已发布回填链接 |
| 设置 | 公众号 AppID/Secret、作者、dry-run、自动提交；AI 写作接口；出口 IP 查询 |

## 目录

```text
studio/
  server.mjs               # HTTP API + 静态服务 + 渲染队列
  lib/db.mjs               # SQLite schema、seed、事件
  lib/knowledge.mjs        # 知识库切块/检索、类比库、灵魂档案、生成上下文
  lib/generator.mjs        # 本地角度/文案脚手架 + 可选 LLM
  lib/wechat.mjs           # 公众号 stable_token / thumb / draft / freepublish
  renderer/template.html   # 三页视频模板（复用固定地址成片）
  renderer/render.mjs      # Chrome 逐帧 + ffmpeg
  public/                  # 工作台 UI（无框架）
  seed-assets/             # 首次启动复制的演示素材
  data/                    # 运行时数据（DB / 视频 / 发布包）
```

知识目录在上一级：

```text
D:\AI数字资产\
  knowledge/               # 你的文章、脚本、笔记（.md / .txt）
    inbox/                 # 随手先丢这里
    _template-类比.md
    _template-信念.md
    _template-禁用词.md
  studio/                  # 工作台
```

## 知识库 / 类比库 / 灵魂档案

### 知识库

1. 把文章、脚本、笔记导出成 `.md` 或 `.txt`，放进 `D:\AI数字资产\knowledge`（或 `inbox/`）。
2. 打开「知识库」→「扫描目录」。
3. 平台按段落切块，建立关键词索引；生成时检索最相关的 5–8 段。
4. 生成出来的文案会在 Spec 的 `_meta.knowledge` 里留下引用，审批台能看到“用了哪几段”。

当前是关键词检索，不是向量检索；中文按 2–4 字 n-gram 匹配。等资料量大了，再接 embedding / 向量库。

### 类比库

不是“想一个好比喻”，而是：

```text
源域 → 目标域
每一行：A | B | 说明
边界：哪里不能硬套
签名：你反复出现的那一句
```

这三个种子类比：邮局寄信、助理替你跑腿、被退回的那封信。

### 灵魂档案

- 信念：你真正相信、愿意反复讲的结论；
- 禁用表达：出现就提示；
- 语感规则：先场景后结论、短句、反转、冷判断；
- 一句话签名；
- 黄金样例：标题 / 文案 / 为什么好。

这些会进入角度和文案生成的上下文。没有配置 LLM 时，本地脚手架会带上这些约束，但不会自动写出高质量成片；配置 LLM 后效果明显更好。

## 公众号配置

1. 确认是**认证的企业主体服务号**。个人主体 / 未认证账号的草稿、发布接口会被回收。
2. 公众号后台配置 **API IP 白名单**，填云服务器的固定 EIP。
3. 打开「设置」，填 AppID / AppSecret，先保持 **Dry-run 开启**。
4. 点「测试公众号连接」：能拿到 access_token 才说明凭据 + IP 白名单至少有一项通了。
5. 审批通过后，在发布页创建公众号任务 → 点「创建草稿」。
6. 只创建草稿：不勾「自动提交发布」；要直接提交：勾上，并关闭 Dry-run。

正式发布链路：

```text
stable_token
  → material/add_material?type=thumb（封面压到 64KB 内）
  → draft/add（标题 / 作者 / 摘要 / 正文 / thumb_media_id）
  → freepublish/submit（可选）
```

注意：

- 公众号视频素材官方限制 **MP4 ≤10MB**；当前成片约 4–5MB。
- 视频嵌入公众号正文需要真实账号再做一次兼容性验证；当前草稿是图文 + 视频号引导，不强行塞视频 iframe。
- `freepublish` 是“发布到公众号内容”，不是“群发推送给所有粉丝”。群发是另一套接口和配额。

## 视频号

官方 API 目录目前没有“发布视频”接口（截至 2026-11-03）。所以平台做的是：

1. 审批通过后生成 `data/publish-kits/<renderId>-<channel>/`；
2. 里面有 `video.mp4`、`cover.png`、`metadata.json`、`README.txt`；
3. 运营在视频号助手 1 分钟上传；
4. 回平台点「标记已发布」，填链接和外部 ID。

不要在没有评估的情况下把浏览器自动化当成官方能力；UI 改版和账号风控都会影响。

## AI 写作（可选）

不配置也能用：本地脚手架会从角度论点拆出三页文案，可以在 UI 里改。

要更好的文案，在「设置 → AI 写作」填：

- Base URL：例如 `https://api.deepseek.com` 或本机 `http://127.0.0.1:11434/v1`
- Model：例如 `deepseek-chat`、`qwen2.5:7b`
- API Key：远程模型必填；本机 localhost 可留空

保存后点「测试模型连接」。接口按 OpenAI 兼容的 `/chat/completions` 调用；不支持 `response_format` 的服务会自动重试一次。失败会回退到本地脚手架。

## 数据与备份

- 数据库：`data/studio.db`
- 视频 / 封面 / 预览：`data/media/`
- 发布包：`data/publish-kits/`
- 渲染输入：`data/render-input/`

备份整个 `data/` 目录即可。不要把 `data/` 提交到公开仓库；`.gitignore` 已排除。

重置演示数据：

```powershell
# 停掉 server 后
Remove-Item 'data\studio.db*' -Force
Remove-Item 'data\media\*' -Recurse -Force
Remove-Item 'data\publish-kits\*' -Recurse -Force
node server.mjs
```

## 渲染

```powershell
node renderer/render.mjs --spec data\tmp-spec.json --out data\test-render --mode preview
node renderer/render.mjs --spec data\tmp-spec.json --out data\test-render --mode full
```

- 预览：3 张 PNG，几秒。
- 成片：540 帧 + ffmpeg，当前机器约 2–5 分钟。
- 依赖：Chrome（默认 `C:\Program Files\Google\Chrome\Application\chrome.exe`，可用 `CHROME_PATH` 覆盖）、ffmpeg 在 PATH。
- 渲染队列是单并发；跑多条会排队。

## 部署到云服务器

1. 装 Node 24、Chrome、ffmpeg。
2. 绑定固定 EIP。
3. 启动：

```powershell
$env:HOST='0.0.0.0'
$env:PORT='4310'
node server.mjs
```

4. 用 Caddy / Nginx 反代到 4310，配 HTTPS。
5. 把 EIP 填进公众号 API IP 白名单。
6. **先加登录/鉴权再暴露到公网**；当前 v0.2 还没有账号体系。

## 已知限制（v0.2）

- 只有一个模板：`three_page_postal_v1`（邮政类比）。换类比方向可以改文案，但视觉仍是邮政语言。
- 知识库目前是关键词 + 中文 n-gram，不是向量检索；只支持 `.md` / `.txt`，PDF/Word 还没接。
- 引用是“生成上下文级”（这条文案用了哪几段），还不是逐句 claim 级绑定；下一步做 claim → source_id 的强制校验。
- 公众号图文已经能生成/编辑/预览，但 **2.35:1 头条封面还没做**；当前草稿会借用 9:16 视频封面，正式发之前要补一张横版封面。
- 知识库/类比/灵魂的种子是我们的演示内容，不是你的真实语料；要用你的 10 条类比和 5 条信念替换。
- 本地角度/文案是脚手架，不保证每一条都达到成片质量；配置 LLM 后，知识库/类比/灵魂会真正进入生成上下文。
- 公众号真实发布未联调（没有 AppID/Secret）；dry-run 和错误处理已实现。
- 视频号没有官方发布 API，保留人工最后一步。
- 单用户本地版：没有登录 / 多角色权限 / 多租户。部署到公网前必须加鉴权。
- 渲染队列在内存里；服务重启会丢失“排队中”的任务（已渲染文件仍在）。




