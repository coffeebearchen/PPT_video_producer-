# DynamicFlow

课件渲染器专用的第四种风格。共享 `graphics/styles.ts` 仍只有原来的三种风格；`courseware/styles.ts` 做适配。旧 Page / SlideVisual / Flow / VideoPage 算法保持不变。

## 使用

向现有 `src/courseware/index.tsx` 入口传入合法的 **resolved-props**，顶层设置 `"style": "dynamicflow"`。Composition ID 仍为 `Courseware`，封面仍为 `CoursewareCover`。

可直接渲染的最小输入：

```json
{
  "schemaVersion": "courseware/1",
  "taskId": "example",
  "renderId": "example",
  "draftRevision": 0,
  "title": "让思路一步步看得见",
  "style": "dynamicflow",
  "canvas": {"width": 1080, "height": 1920, "fps": 30},
  "publicRoot": "renderer/public",
  "stagingDir": "courseware/example/example",
  "totalFrames": 120,
  "totalDurationSeconds": 4,
  "slides": [{
    "id": "closing",
    "kind": "quote",
    "text": "让思路一步步看得见",
    "body": "先讲清楚，再往前走",
    "fromFrame": 0,
    "durationInFrames": 120
  }]
}
```

在 `engines/vibemotion/renderer` 目录执行（输入/输出使用绝对路径）：

```sh
npx --offline --no-install remotion render src/courseware/index.tsx Courseware /absolute/output.mp4 --props=/absolute/resolved-props.json --browser-executable=/usr/bin/chromium --concurrency=2
npx --offline --no-install remotion still src/courseware/index.tsx CoursewareCover /absolute/cover.png --props=/absolute/resolved-props.json --browser-executable=/usr/bin/chromium
```

浏览器路径按本机调整。素材仍放在 renderer/public 下对应的 stagingDir，沿用原路径校验、配音和字幕契约。

此次没有接入 server/lib/public 的风格选择和白名单。后端接入前直接传 resolved-props 渲染；只向现有 API 发送 style 并不能完成接入。

## 六种页型与效果

- title / quote：72px 标题、38px 说明；400ms 标题入场，600ms 下划线；quote 末页保留 CTA。
- flow：64px 标题、40px 节点；依数组顺序画框 500ms → 标签 200ms → outgoing 连线各 400ms → 下一节点。旧节点轮廓在 200ms 内退暗，文字保持亮度。边使用原路由几何，支持合法的非相邻边；复杂分叉布局不在首版范围。
- bullet：40px 文字，400ms 入场，200ms 项间隔。
- screenshot：复用现有 Screenshot 定位、标注、镜头。未显式设置镜头时，标题后用 800ms 推进至最高 1.35 倍，再做 600ms 标注。实际放大仍受目标完整可见限制；显式镜头/标注参数优先。
- video：直接复用 CoursewareVideo，保留 trim/muted/fit/loop 和显式镜头行为。

新风格的 title/quote/flow/bullet 使用自己的固定呈现节奏，`effects.reveal` 不覆盖这些专属动作；截图和视频的显式 effects 按原组件处理。可选 `effects.transition` 支持原四种类型，默认不加转场。全局音轨、字幕、品牌、AI 标签、进度条继续可用；hook/chapter/texture/tilt 不是专属文字/图解页的预设，使用时应留空。这里没有扩展新的 effects 字段，也没有声称支持语音词级同步。

所有动画由帧/fps 推导。Rough.js 路径有固定 seed；不运行 CSS keyframes、定时器或无种子随机数。短页没有足够时间构建并停留时显示完成态，不压缩成闪烁；封面始终是完成态。文案过长应缩写，不降低规范字号。

## 样片和检查

在仓库根目录运行：

```sh
node engines/vibemotion/renderer/src/courseware/dynamicflow-proof.mjs
```

要求 Node 24、已安装 renderer 锁定依赖、可用 Chromium。可以通过 `REMOTION_BROWSER_EXECUTABLE` 选择其他本机浏览器。

脚本自建本地截图和视频素材，不依赖 AI、TTS、云接口或用户样板。先渲染一段 flow 作为 screenshot/video 页的内容，再生成六页 28 秒无旁白演示。结果位于 `out/dynamicflow/`：

- `dynamicflow-demo.mp4`：1080×1920 / 30fps，六种页型。
- `cover.png`、六种页型 PNG、`relay-*.png`：封面和关键帧。
- `resolved-props.json`：可直接使用的完整输入。
- `industrial-smoke.mp4` / `clean-smoke.mp4` / `dynamic-smoke.mp4`：旧风格渲染 smoke，另有六页型静帧。
- `verification.json`：本次执行的检查记录。

自动检查包括课件依赖树 TypeScript、接力时序/短页/截图默认参数、新六页关键帧的现有布局审计和旧三风格渲染。不运行严格契约矩阵或像素对比。全仓 TypeScript 仍可能被非课件的既有问题阻挡；脚本会对课件依赖树的新错误直接失败。

上述生成物和 `public/courseware/dynamicflow/demo/` 素材沿用现有 ignore 规则，不提交二进制。
