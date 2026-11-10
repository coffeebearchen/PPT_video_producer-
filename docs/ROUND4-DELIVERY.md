# 三种风格与图形库交付

## 参考与范围

已查看 `reference-style/industrial/` 中全部 7 张图片。这些是从用户指定的 `W:\渲染动画\动画片页面风格\绿色橙色工业风` 只读复制的副本，W 盘原件未修改。另查看项目 `reference-video/style-images/` 全部 28 张图。

只提取视频讲解区域的版式。未复制手机状态栏、平台操作、账号、关注、评论、商品、音量浮层或参考人物。截图未作为视频背景；参考文字和数字未作为样片事实。

实际参考呈现两种工业页面：近黑底的灰白文字、低饱和橄榄绿标签、橙色说明和细线分区；浅灰底的青绿关系图、深灰标题和独立来源区。本轮工业样片采用前者，简洁风采用浅底。

## 当前产物

目录 `engines/vibemotion/renderer/out/round4/`：

- `industrial.mp4`：严谨工业风。
- `clean.mp4`：简洁风格，少量现有插画。
- `dynamic.mp4`：活泼动感风，线条按关系逐步展开，最终停稳。
- `industrial-contact-sheet.png` / `clean-contact-sheet.png` / `dynamic-contact-sheet.png`：各 10 帧。
- `contact-sheet.png`：工业风 10 帧副本。
- `three-styles.png`：同一时刻三种风格并排，左工业、中简洁、右动感。
- `graphics-gallery.png`：45 项代码图形总览。
- `project.json`：三种风格共用的 28.767 秒、8 场景项目内容。
- `graphics-catalog.json`：风格配置、组件目录、参数说明和预览入口。
- `validation.json`：媒体检查和抽帧记录。

逐项 PNG：`engines/vibemotion/renderer/public/gallery/round4/`，每项 800×650，共 45 张。可作为中台元素选择缩略图和周边图片资源使用。它们由 React/SVG 实渲染画廊逐项导出，没有使用 AI 生图。

## 新组件与控制参数

`src/graphics/GraphicLibrary.tsx`：

| 组件 | 内容 | 主要 props |
| --- | --- | --- |
| ProcessDiagram | 流程、泳道、因果链、循环、分支、树、矩阵、金字塔、中心辐射、层级、漏斗，共11种 | kind / labels / progress / active / style |
| Shape | 三角、圆、方、菱形、六边形、多边形、箭头、括号、齿轮、星形、旗帜、标签角，共12种 | kind / color / fill / size |
| AdvancedChart | 雷达、散点、仪表、漏斗、热力、进度环，共6种 | kind / values / labels / points / progress / active / style |
| Ornament | 流动线、轨迹、粒子流、光束、波纹、点阵、斜纹、几何纹样、角标，共9种 | kind / progress / enabled / style |
| Icon | 人物、金额、计时、警告、对勾、时钟、齿轮，共7种 | kind / color / size |

图表数据值域在本轮实现中为 0–100，散点 `points` 的 x/y 也为 0–100。漏斗宽度跟随数值，仪表和进度环数值随 progress 增长；所有示意数据有来源说明。现有柱图、折线、阶梯图组件继续保留。

流程短标签数量：循环最多6项；树/中心辐射最多5项；分支3项；其他版式最多4项。每种图解由标签、数据和进度控制，不代表已实现任意复杂图自动排版。

`styles.ts` 提供三组配色、字体、边框与圆角。`GraphicScene.tsx` 提供安全区内的标题、主图解、重点句、来源与字幕分区。`GraphicGallery.tsx` 与 `catalog.ts` 负责目录预览。`Root.tsx` 注册独立的三种样片入口，保留原 VibeMotion 和样片 A 入口。

## 给 DSH 的接入约定

不需要改数据库或平台启动逻辑。公开清单是 `public/graphics-catalog.json`，包含 `stylePresets`（palette tokens / density / motion / decor / fonts）和45个组件入口。

原 DSL 可使用：

```json
{
  "projectMeta": {"style": "industrial"},
  "scenes": [{
    "componentName": "GraphicScene",
    "initialProps": {
      "family": "chart",
      "kind": "radar",
      "title": "先确定比较的标准",
      "claim": "使用同一组维度比较方案",
      "labels": ["清晰度", "可检查", "可重复", "可回退", "可继续"],
      "values": [65, 82, 54, 91, 72],
      "source": "来源：自制演示；数值为示意",
      "progress": 1,
      "active": 0,
      "decor": true,
      "hideDecor": true
    }
  }]
}
```

这是字段片段，须合并到具有完整时间范围的既有 DSL。`initialProps.style` 可覆盖 `projectMeta.style`。`stateSteps` 的 propPatches 可驱动 progress（0→1）和 active。原 Video 末屏提示仍生效。直接调用 GraphicScene 或使用本轮独立 GraphicVideo 时，可传 `final: true`。

DSH 尚需完成中台下拉、任务 style 字段传递、生成器选图和编辑入口。本轮提供渲染侧能力及预览资源，未把前端按钮或队列接入报告为完成。

## 命令

```powershell
cd D:\AI数字资产\studio
node scripts/build-round4.mjs
cd engines\vibemotion\renderer
npx remotion render src/index.ts Round4Industrial out\round4\industrial.mp4 --codec=h264 --overwrite
npx remotion render src/index.ts Round4Clean out\round4\clean.mp4 --codec=h264 --overwrite
npx remotion render src/index.ts Round4Dynamic out\round4\dynamic.mp4 --codec=h264 --overwrite
npx remotion still src/index.ts GraphicsGallery out\round4\graphics-gallery.png --overwrite
cd D:\AI数字资产\studio
node scripts/export-round4.mjs
```

## 验证与限制

已实渲染三条1080×1920 / 30fps / H.264 + AAC样片，每条约28.78秒，ffmpeg全片解码通过。逐项PNG、目录JSON与10帧抽帧由导出脚本生成；最终状态看 validation.json。

三条样片使用同一内容、旁白、字幕和场景时间。本轮旁白来自已验收样片A的前六句，不复用参考作者声音。图表均为示意值，不是真实业务统计。

全项目 TypeScript 检查当前存在三个错误：Diagram.tsx 分支比较、index.ts FontFaceSet.add 类型声明、Video.tsx 读取的默认 DSL 配色结构不匹配。未修改默认 DSL 来消除错误，本轮新组件可由 Remotion 实际渲染。

未验证：中台 style 字段完整业务闭环、任意稿件自动编排、4/5/6页和5主题通用模板发布门槛、人工完整听审。当前交付是供用户视觉验收的三风格样片和组件扩充。4310服务、数据库、W盘原件、部署和远程仓库均未操作。
