# 样片 A 交付记录

主题：让一个想法变成可靠结果。手绘黑板、1080×1920、30fps。项目时长 49.333 秒，10 个不等长场景。旁白沿用升级指令第 10 节原稿，按 10 个语段生成。

## 文件

所有产物在 `engines/vibemotion/renderer/out/`：

- `sampleA.mp4`：H.264 / AAC 正片。
- `cover.png`：1080×1920 封面。
- `cover_3x4.png`：1080×1440 重新排版封面。
- `contact-sheet.png`：每个场景中间帧，共 10 帧。
- `sampleA-project/timeline_dsl.json`：可编辑项目分镜副本；编译输入在 `src/data/timeline_dsl.json`。
- `sampleA-project/sampleA.srt`：独立字幕。
- `sampleA-project/narration.txt`：原旁白。
- `sampleA-project/audio-alignment.json`：按实际句音频时长排列的开始点。
- `sampleA-project/validation.json`：格式、时间轴和抽帧验证结果，由验证脚本在渲染后写入。

配音与分句资源：`engines/vibemotion/renderer/public/audio/sampleA/`。采用本机已安装 Microsoft Huihui Desktop，通过 Windows SAPI 生成，没有调用付费服务或更改平台 TTS。按句测量时长，不声称逐词强制对齐。

## 代码作用

- `src/components/ChalkBoard.tsx`：可由数据切换的黑板图解；支持循环、分支、对比、记录卡、示意柱图、阶梯图和总结圈注。以帧为依据驱动路径绘制、当前节点点亮；固定种子手绘框。
- `src/components/ChalkCover.tsx`：使用同字体配色，竖版与 3:4 独立布局。
- `src/engine/registry.tsx`、`src/types.ts`：注册新组件类型。
- `src/Root.tsx`：登记两种封面 Still，保留 VibeMotion 正片入口。
- `src/engine/SubtitleTrack.tsx`：字幕移入 80% 安全区，36px、居中。
- `src/Video.tsx`：修正末屏提示的文字颜色；字体和装饰层开关维持原实现。
- `scripts/sample-a-voice.ps1`：本地逐句旁白生成。
- `scripts/build-sample-a.mjs`：读取实际音频长度，生成 DSL、SRT、音效事件、镜头事件和合成旁白。
- `scripts/verify-sample-a.mjs`：检查时间轴与视频格式，ffmpeg 全片解码并抽 10 帧，写验证记录。

当前可编辑输入为 JSON 项目数据，修改标题、标签、说明、图表数值、场景时间和事件后重新渲染。该样片编排是规则数据，不宣称可以自动理解任意输入稿件。图表示意数据明确标注。

## Windows 命令

在项目根目录重新生成旁白与分镜：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sample-a-voice.ps1
node scripts/build-sample-a.mjs
```

直接渲染，不经过 4310：

```powershell
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npx remotion render src/index.ts VibeMotion out\sampleA.mp4 --codec=h264 --overwrite
npx remotion still src/index.ts SampleACover out\cover.png --overwrite
npx remotion still src/index.ts SampleACover3x4 out\cover_3x4.png --overwrite
cd D:\AI数字资产\studio
node scripts/verify-sample-a.mjs
```

原平台启动命令仍为 `node server.mjs`；本轮未运行启动命令，4310 已有服务无需重复启动。

## 验证范围

媒体与时间轴结果以 `validation.json` 为准。新建脚本语法检查通过。TypeScript 全项目检查仍有两个错误：未修改的 `Diagram.tsx:275` 分支比较与 `index.ts:13` 的 FontFaceSet.add 类型声明；Remotion 实际渲染可执行。

未验收：用户对视觉风格的最终认可、人工完整听审、逐词配音对齐、平台队列集成回归、4/5/6 页与 5 主题通用模板发布闸门。当前交付只覆盖指定样片；未部署、未推送、未操作数据库与 W 盘。

渲染前的 DSL 与配色备份在项目根目录 `backups/sampleA-before/`。
