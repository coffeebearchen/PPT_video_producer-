# 交给 Codex 的交接说明 + 指令（直接粘贴）

## 0. 你在做什么

接手一个已跑通 MVP 的视频生成平台，把 VibeMotion 引擎的「元素框架 + 模板系统」做成成品级。当前能自动出片，但画面信息密度和设计感还没达到交付包 `03_成品视频\代表作\` 那 6 条的档位。

## 1. 代码在哪

```text
平台代码：D:\AI数字资产\studio
引擎源码：D:\AI数字资产\studio\engines\vibemotion\renderer
原交付包（只读，别改）：\\192.168.1.2\ShareGef\自动生成视频remotion_video\
```

## 2. 先读这几份（顺序）

```text
1. D:\AI数字资产\studio\AGENTS.md                    （平台视觉铁律）
2. D:\AI数字资产\studio\docs\ELEMENT-FRAMEWORK-SPEC.md （元素框架 + 模板系统指令）
3. D:\AI数字资产\studio\docs\VIBEMOTION-INTEGRATION.md （接入与回滚说明）
4. D:\AI数字资产\studio\lib\element-catalog.mjs       （元素目录 + 配色 + 字体 + 模板）
5. D:\AI数字资产\studio\lib\vibemotion.mjs           （DSL 生成器 + 渲染）
6. 引擎组件：engines\vibemotion\renderer\src\components\ 和 engine\
```

## 3. 环境

```powershell
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npm ci --no-audit --no-fund
```

```text
Node 20+（本机 v24 验证过）
首次渲染会下载 Chrome Headless Shell（约 131MB）
timeline_dsl.json 是编译期 import，改完必须重渲
```

## 4. 现状（已完成）

```text
自动生成：可用
任务队列 / 进度 / 取消 / 重试：可用
自动合规闸门：可用
Copilot 大屏：可用
元素画廊：39 个元素
模板：3 套配色 + 2 字体 + 3 预设模板，已接进 DSL
```

## 5. 要 Codex 修的（按优先级）

### P0 设计感（核心）
```text
现在一屏信息密度不够，像 PPT。
目标：每屏 8–20 个视觉元素，每 2–4 秒一次变化。
把 39 个元素真正用起来，不要一条片全是流程图。
```

### P1 标注层 + 质感层进主渲染
```text
现在标注类（圈/下划线/高亮/箭头/编号气泡）和质感层
（颗粒/粒子/扫光/暗角/斜纹）只在画廊预览，
没进 Video.tsx / SceneDecor。
要搬进去，并按模板 density 档位开关。
```

### P2 封面自动生成
```text
每条视频自动出：
cover.png（1080×1920）
cover_3x4.png（1080×1440）
与正片同字体同配色同线条。
```

### P3 字体分开调
```text
heading 用 ZCOOL KuaiLe，body 用 LXGW WenKai，
分别精调，不是整片换一个字体。
```

## 6. 硬性约束（不能违反）

```text
1. 不许用 AI 生图替代代码画元素（React + SVG + Rough.js）
2. 不许用系统字体
3. 不许一屏只有标题 + 一行字
4. 不许所有场景等长、硬切
5. 不许省略封面
6. 不许改交付包原件 W:\...\ 下的任何文件
7. 平台视觉铁律以 AGENTS.md 为准
```

## 7. 验收方式

```text
每改一版：
1. 用 ffmpeg 抽 6–10 帧拼 contact sheet 给我看
2. 我看了像不像，才继续
3. 不许在没抽帧图前说“做好了”
```

## 8. 回滚

```text
git tag：
  v2.3.1-rollback
  v2.5.0-autogen-mvp
  v2.6.2-mock-tts
  v2.7.0-rich-dsl
```

## 9. 交给 Codex 的实际方式（二选一）

```text
A. 打包 zip：
   D:\AI数字资产\studio（排除 node_modules、data\media、backups、releases）
   + engines\vibemotion\renderer 源码（不含 node_modules）

B. 直接给它本机路径 + 共享盘只读路径
```

不要给 Codex：`.env`、`data\studio.db`、`data\media\*`、`backups\`、`releases\`。
