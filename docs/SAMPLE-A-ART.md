# 样片 A 艺术版

在第一版验收通过后增加现有素材与配色。保留 49.333 秒时间轴、10 个场景、旁白、字幕、音效和镜头事件。原视频、原抽帧与原项目数据保存在 `engines/vibemotion/renderer/out/accepted-v1/`。

## 产物

目录：`engines/vibemotion/renderer/out/`。

- `sampleA-art.mp4`：艺术版正片。
- `contact-sheet.png`：艺术版 10 帧，每个场景一帧。
- `comparison-sheet.png`：左侧验收版 10 帧，右侧艺术版同时间 10 帧。
- `comparison-cover-scene.png`：首屏大图对比，左旧右新。
- `sampleA-project/timeline_dsl.json`：当前可编辑项目数据。
- `sampleA-project/art-direction.json`：各场景插画选材与位置记录。
- `sampleA-project/art-validation.json`：生成后记录时长、媒体格式、安全区边界、每屏插画数量及时间轴对比。

## 改动

`ChalkBoard.tsx` 增加按数据定位的插画、圆角手绘框、标题重点色与下划线、柱图色块和斜纹叠加。沿用已有字体与黑板颗粒。卡片内插画与文字分区；记录页用标题下方留白；分支页用根节点旁留白；图表页使用绘图区的空白部分。

使用现有 Open Doodles 的思考、行动、阅读、失误、行走、坐姿和植物插画。`public/assets/sampleA-chalk/` 是重配色副本，原 SVG 保留。每屏 1–2 个插画素材，米白线稿加金色/青绿；问题页用橙红，结尾用浅绿。阶梯图页复用 `lottie_ripple.json` 的固定帧作为轻量线性图纹，不循环播放，避免引入额外运动节奏。

`scripts/style-sample-a.mjs` 从验收版 DSL 派生艺术版，仅更改视觉属性。`scripts/compare-sample-a-art.mjs` 检查时间轴、旁白、字幕和事件完全一致，验证素材边界与每屏数量，ffmpeg 抽相同时间的 10 帧并拼图。

## 重渲染

```powershell
cd D:\AI数字资产\studio
node scripts/style-sample-a.mjs
cd engines\vibemotion\renderer
npx remotion render src/index.ts VibeMotion out\sampleA-art.mp4 --codec=h264 --overwrite
cd D:\AI数字资产\studio
node scripts/compare-sample-a-art.mjs
```

脚本语法检查通过。TypeScript 全项目检查仍报此前已有的 Diagram.tsx 分支比较与 index.ts FontFaceSet.add 类型错误；本轮不修改这两个文件。视觉最终认可由用户查看对比图后确认。
