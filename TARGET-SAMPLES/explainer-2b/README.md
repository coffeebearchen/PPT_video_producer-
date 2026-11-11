# 讲解式编排离线样片

主稿为「怎样把项目文件交接清楚」，配音实测 58.1 秒，生成 10 个不等长场景及 10 条句级字幕。另一主题「怎样让家里的东西更容易归位」生成 8 个场景，配音实测 43.033 秒。两者用不同输入和实际时间码编排，第二主题提供语义封面验证。

`src/explainer/compile.ts` 导出 `resolveNarration`、`splitNarration`、`selectRelation`、`compileExplainer`。空稿或仅由标题回填的稿件会调用注入的写稿函数。外部适配器应先得到正文，再导入音频和匹配的句级时间码，最后调用编排器。模块使用顺序、对照、分支、因果、清单、循环和要点七种规则，未提供数字时生成文字关系图。超过 12 句时合并相邻场景并保留句级图解状态。

`src/explainer/index.tsx` 是独立渲染入口。输入为 `{timeline, audit}`，导出正片和两种尺寸的语义封面。正片直接使用项目中的标题、图解和字幕。封面根据输入标题和开场要点独立排版。

## 重建与渲染

在 `studio` 根目录生成本地逐句音频和实测时间码。已生成的输入可直接复用。

```powershell
& .\TARGET-SAMPLES\explainer-2b\record-sample.ps1
& .\TARGET-SAMPLES\explainer-2b\record-sample.ps1 -InputName secondary-script.json -OutputName out/secondary
node TARGET-SAMPLES/explainer-2b/build-sample.mjs
$fonts = 'TARGET-SAMPLES/explainer-2b/out/public/fonts'
New-Item -ItemType Directory -Force -Path $fonts | Out-Null
Copy-Item -LiteralPath 'engines/vibemotion/renderer/public/fonts/LXGWWenKai-Regular.ttf','engines/vibemotion/renderer/public/fonts/ZCOOLKuaiLe-Regular.ttf' -Destination $fonts
```

从 `engines\vibemotion\renderer` 渲染。

```powershell
$sampleOut = '../../../TARGET-SAMPLES/explainer-2b/out'
npx remotion render src/explainer/index.tsx Explainer2B "$sampleOut/explainer-2b.mp4" --codec=h264 --overwrite "--public-dir=$sampleOut/public" "--props=$sampleOut/project.json"
npx remotion still src/explainer/index.tsx Explainer2BCover "$sampleOut/cover.png" --overwrite "--public-dir=$sampleOut/public" "--props=$sampleOut/project.json"
npx remotion still src/explainer/index.tsx Explainer2BCover3x4 "$sampleOut/cover_3x4.png" --overwrite "--public-dir=$sampleOut/public" "--props=$sampleOut/project.json"
```

`out/compiler-check.json` 记录空稿、标题回填、错误时间码、场景合并和第二主题的检查结果。`out/validation.json` 记录媒体、封面和版式检查。`verify-sample.mjs` 使用 FFmpeg 抽各场景中间帧，拼成 `contact-sheet.png`。重建完整验收记录时，渲染加 `--log=verbose` 并按该脚本列出的文件名保存日志。

本交付覆盖离线编排和渲染。平台侧应在任务版本、配音来源与句级时间码落实后接入，由 DSH 负责服务端适配。关系规则目前覆盖明确中文连接词，复杂语义需要人工检查或由上游提供结构化分镜。
