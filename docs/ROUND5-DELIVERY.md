# ROUND5 可选头像模拟口型

已实现本地简单版：代码绘制的默认头像 + 基于真实配音 PCM 能量的嘴部开合。默认关闭，不接外部付费服务，不复制参考人物，不使用 AI 生图。这是音量驱动的模拟口型，不是逐字、音素或语义口型。

## 产物

目录：`engines/vibemotion/renderer/out/round5/`。

- `avatar.mp4`：12秒竖屏口播样片，1080×1920 / 30fps / H.264 + AAC。
- `contact-sheet.png`：8帧，覆盖张嘴、闭嘴、场景切换与片尾。
- `mouth-detail.png`：同8帧的头像放大图，便于检查开合。
- `project.json`：独立样片数据，未覆盖平台当前 timeline_dsl.json。
- `audio-analysis.json`：360帧音频能量统计。
- `validation.json`：静音闭嘴、能量重算一致性、预留区、媒体格式和解码检查。
- `avatar-off.png`：显式关闭开关后的静帧。
- `avatar-browser.png`：未提供预计算能量文件、直接在浏览器分析音频的静帧。

音频与能量轨在 `public/audio/round5/narration.wav` 和 `energy.json`。样片采用已验收样片A前两句旁白，截在第二句后的停顿，补齐12秒，不裁断第三句。未重新调用TTS。

## 新增与修改

- `src/avatar/energy.ts`：对每帧 PCM 计算 RMS，做噪声门、音量归一化与开合平滑。静音直接闭嘴，按音频时钟查询，不使用随机数或墙钟。
- `src/avatar/AvatarOverlay.tsx`：默认 SVG 卡通头像、独立 Mouth 绘制、上传头像叠加嘴部、轻微音量驱动点头、可选位置、开关与资源加载。能量轨与嘴部渲染分离，为未来精确口型适配保留边界；未接任何精确口型服务。
- `src/avatar/AvatarDemo.tsx`：12秒独立验收样片。
- `src/graphics/GraphicScene.tsx`：启用头像时预留底部小窗，缩短旁侧重点句；居中小窗占用该重点句行；避免与原插画和流线重叠。未开启头像时保持原布局。
- `src/Video.tsx`、`src/types.ts`：根级 DSL avatar 字段。旧组件未预留小窗时明确报错，避免悄悄遮住内容。
- `src/Root.tsx`：注册 Round5Avatar，保留既有入口。
- `scripts/build-avatar-demo.mjs`：构建演示配音、能量 JSON 和项目数据。
- `scripts/verify-avatar-demo.mjs`：检查音频能量及媒体并用ffmpeg抽帧。

## DSL 开启

根级字段缺省或 `false` 时关闭：

```json
{"avatar": false}
```

最简单的开启方式：

```json
{"avatar": true}
```

需要 `audioTracks.masterVoiceover.src` 指向实际配音文件；若未提供能量轨，浏览器使用本地 OfflineAudioContext 解码并计算能量。不会用虚构波形替代缺失音频；资源错误会中止渲染并报错。

预计算轨适合重复渲染：

```json
{
  "avatar": {
    "enabled": true,
    "energySrc": "audio/round5/energy.json",
    "position": "bottom-right",
    "offsetMs": 0
  }
}
```

`position` 支持 `bottom-right` 或 `center`。两者使用图解下方预留行；center 表示该行水平居中，不覆盖中间主图解。当前布局验证范围是1080×1920；其他画幅需要重新预留头像位置。

当前自动避让适用于三风格 GraphicScene / GraphicVideo。原 DSL 场景使用 `componentName: "GraphicScene"` 时会自动传入预留位置。旧黑板/其他组件未预留区域时会报错；本轮不宣称已适配所有旧模板。

## 上传头像

将已授权头像放入 `public/`，配置相对路径，例如：

```json
{
  "avatar": {
    "enabled": true,
    "src": "uploads/my-avatar.png",
    "position": "bottom-right",
    "mouth": {"x": 0.5, "y": 0.67, "width": 0.16, "maskColor": "#E8C39B"}
  }
}
```

mouth 坐标为显示窗口的0–1归一化值；src按160×130窗口 cover 显示，需要根据显示结果手工校准。maskColor 用于覆盖原嘴部，可选且需与头像颜色匹配。不做自动人脸定位，也不保证任意照片无痕；真实用户头像的效果需要另行验收。

## 命令

```powershell
cd D:\AI数字资产\studio
node scripts/build-avatar-demo.mjs
cd engines\vibemotion\renderer
npx remotion render src/index.ts Round5Avatar out\round5\avatar.mp4 --codec=h264 --overwrite
cd D:\AI数字资产\studio
node scripts/verify-avatar-demo.mjs
```

三风格入口也支持输入 props `{"avatar":true}`。平台表单、上传和任务字段接线由DSH完成，本轮未操作4310、数据库、部署或远程推送。

## 验证范围

已检查：真实音频的RMS能量重算一致；静音与全静音输入闭嘴；样片有非零开合；默认预留窗位于中间80%；不与图解、重点句、来源、字幕或末屏提示重叠；360帧、H.264/AAC和全片解码。结果见 validation.json。

类型检查仍有原先三个错误：Diagram.tsx的hub分支、index.ts的FontFaceSet.add、Video.tsx当前默认DSL配色结构。未改默认DSL或数据库来消除这些错误。新增头像组件未报告类型错误。

未验证：逐字精确口型（不属于本轮）、真实用户上传头像校准效果、其他画幅和旧黑板模板头像布局、平台端完整上传/任务闭环、人工完整听审。
