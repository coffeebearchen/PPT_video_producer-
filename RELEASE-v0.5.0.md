# RELEASE v0.5.0 — 冻结基线

冻结时间：2026-11-03（Asia/Shanghai）
状态：**冻结，不再直接修改**
用途：作为后续 v0.6 开发的回退基线。

## 1. 这一版能做什么

```text
选题 → 角度 → 文案 → 视频渲染 → 审批 → 发布包 / 公众号草稿
```

已包含：

- 新建选题、角度卡、三页视频文案、公众号图文；
- 三页视频模板 `three_page_postal_v1`；
- 通用运动库：`flow / strong / none`，逐元素 `motion.elements`；
- 转场：横向推页、上翻页、下翻页；
- 音乐库：内置 Pulse 120 / Minimal 80，支持上传、分类、标签、自动匹配；
- 审批：视频、公众号图文、来源、合规检查；
- 发布：视频号发布包、小红书发布包、公众号草稿/发布；
- 发布台账：`publications` 记录渠道、状态、链接、回执；
- AI 预填：新建选题、类比库、灵魂档案；
- 类比库：随手记 / inbox 读取 → AI 整理 → 人工保存；
- 公众号排版 `wechat_article_v1` 已冻结。

## 2. 这一版不包含什么

- 固定 3 页，不是 3–6 页动态页数；
- 只有一套三页模板，没有多模板；
- 没有视频抽帧视觉预检；
- 没有金句结尾页；
- 没有“形容词/一段话 → 3 个动态备选”；
- 没有播放/点赞/关注等效果报表，只有发布台账；
- 没有多用户、定时发布、批量生产；
- 没有自动审批，所有发布仍需人工确认。

## 3. 冻结范围

纳入快照：

```text
server.mjs
package.json
public/
lib/
renderer/
scripts/
docs/
seed-assets/
README.md
start.cmd
.env.example
.gitignore
RELEASE-v0.5.0.md
```

不纳入快照：

```text
.env                  # 含密钥，绝对不进入版本
data/                  # 运行数据，单独备份
node_modules/          # 依赖，可重装
out/                   # 截图、临时评审产物
releases/              # 快照自身
backups/               # 数据库备份
new-brief/             # 空目录/临时目录
```

## 4. 冻结文件位置

```text
快照目录：releases/v0.5.0/
压缩包：releases/v0.5.0.zip
数据库备份：backups/v0.5.0/studio.db
音乐库备份：backups/v0.5.0/music-library.json（如存在）
校验清单：releases/v0.5.0/MANIFEST.sha256
```

## 5. 如何回退

### 方式 A：直接运行快照

```powershell
cd D:\AI数字资产\studio\releases\v0.5.0
npm install
Copy-Item ..\..\..\backups\v0.5.0\studio.db ..\..\..\data\studio.db
npm start
```

注意：不要覆盖当前 `data`，除非确认要回到 v0.5 的数据状态。更安全的做法是先把当前 `data` 备份，再恢复。

### 方式 B：从 zip 解压

```powershell
Expand-Archive releases\v0.5.0.zip -DestinationPath releases\restore-v0.5.0
cd releases\restore-v0.5.0
npm install
npm start
```

### 方式 C：只回退某个文件

从 `releases/v0.5.0/` 复制对应文件回 `studio/`，不要整目录覆盖 `data/`。

## 6. 冻结后的规则

1. `releases/v0.5.0/` 只读，不再改；
2. 新功能在 `studio/` 的 v0.6 开发线上做；
3. 每次大改前先备份 `data/studio.db`；
4. 改完跑 `npm run smoke:v0.5`；
5. 如果 v0.6 失败，按上面的方式回退；
6. `.env` 不进入任何快照、压缩包、git。

## 7. 已知风险

- 渲染依赖本机 Chrome 和 ffmpeg，换机器需要重新验证；
- 公众号发布依赖真实服务号、固定公网 IP、IP 白名单；
- 视频号/小红书没有官方发布 API，仍是人工上传；
- 数据库备份包含公众号/模型凭据，备份文件要按敏感文件保管；
- 当前没有自动化视觉预检，版式问题主要靠人看。

## 8. 下一版 v0.6 计划

按顺序：

1. 视频抽帧预检：关键帧 + 确定性检查 + qwen3-vl-plus；
2. 3–6 页多页模板，默认 4 页；
3. 金句结尾页，先做 3 种样式；
4. 动态备选：形容词/一段话 → 3 个版本，人选一个；
5. 发布台账导出 + 效果回填报表。

## 9. 冻结口令

```text
v0.5.0-frozen-2026-11-03
```
