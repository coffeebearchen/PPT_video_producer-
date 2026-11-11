# 固定页式四页离线原型

样本取自 `data/regression/archive-4.json`。`sample.json` 保存四页可编辑字段、Archive 主题和 Pulse 120 音乐选择。原稿顺序是开场、语境、对照、收束，正片沿用旧四页的 20 秒时长。逐页对照的旧帧取自 `data/media/reg-archive-4/preview-1.png` 至 `preview-4.png`。

默认输入使用 `sample.json`。将它另存为 JSON 后，可以修改 `spec.page1`、`spec.context`、`spec.page2` 或 `spec.quote`，再把该文件交给 `--props`。旧稿的内部页标和原末页 CTA 保留在原稿文件中，原型画面采用项目规定的「有问题，评论区问」。

## Windows 渲染

在 `studio` 根目录准备隔离的素材目录。

```powershell
$phaseOut = 'TARGET-SAMPLES\fixed-pages-2a\out'
$phasePublic = Join-Path $phaseOut 'public'
New-Item -ItemType Directory -Force -Path (Join-Path $phasePublic 'fonts'), (Join-Path $phasePublic 'audio') | Out-Null
Copy-Item -LiteralPath 'engines/vibemotion/renderer/public/fonts/LXGWWenKai-Regular.ttf','engines/vibemotion/renderer/public/fonts/ZCOOLKuaiLe-Regular.ttf' -Destination (Join-Path $phasePublic 'fonts')
Copy-Item -LiteralPath 'renderer/assets/music-pulse.wav','renderer/assets/whoosh.wav' -Destination (Join-Path $phasePublic 'audio')
```

从 `engines\vibemotion\renderer` 运行独立合成入口。

```powershell
$phaseOut = '../../../TARGET-SAMPLES/fixed-pages-2a/out'
npx remotion render src/fixed-pages/index.tsx FixedPages2A "$phaseOut/fixed-pages-2a.mp4" --codec=h264 --overwrite "--public-dir=$phaseOut/public"
npx remotion still src/fixed-pages/index.tsx FixedPages2ACover "$phaseOut/cover.png" --overwrite "--public-dir=$phaseOut/public"
npx remotion render src/fixed-pages/index.tsx FixedPages2A "$phaseOut/preview" --frames=84,264,456,582 --image-format=png --overwrite "--public-dir=$phaseOut/public"
```

预检可通过 `--props` 文件启用 `"audit": true`。Remotion 在选定预览帧加载字体后核对文字实际尺寸、安全区、版式和末页 CTA，使用 `--log=verbose` 可读取 `FIXED_PAGE_AUDIT` 记录。10 秒验证片用 `"durationSeconds": 10`，四页按相同相对时序缩放。

2A 覆盖一条 Archive 四页稿。5/6 页及五主题组合的回归属于后续阶段。
