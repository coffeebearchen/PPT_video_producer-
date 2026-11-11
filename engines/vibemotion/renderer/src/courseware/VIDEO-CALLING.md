# 课件视频页：调用说明（V15）

`video` 是课件内的一类页，和 title/screenshot/flow/bullet/quote 并存。它不是新模式，也不是新风格。本轮只新增渲染能力，不改服务端、前端、上传接口、数据库或4310。调用方要把下面字段写进**最终 resolved props**，仅上传MP4或仅存在于storyboard里不会自动变成视频页。

## 字段怎么传

把下面这页放进完整 resolved JSON 的 `slides`，其余根字段继续遵守现有契约：

```json
{
  "id": "clip",
  "kind": "video",
  "text": "看这段演示",
  "body": "跟着画面完成操作",
  "fromFrame": 0,
  "durationInFrames": 180,
  "asset": {
    "src": "courseware/my_task/my_render/assets/demo.mp4",
    "width": 1080,
    "height": 1920
  },
  "trim": {"startSeconds": 2, "endSeconds": 5},
  "muted": true,
  "fit": "contain",
  "caption": "观察演示中的操作。",
  "cues": [{"startSeconds": 0, "endSeconds": 3, "text": "观察演示中的操作。"}],
  "effects": {"reveal": {"type": "stagger", "staggerMs": 150}}
}
```

这是**页对象**，不能单独当作根props。根 `taskId=my_task`、`renderId=my_render`、`stagingDir=courseware/my_task/my_render` 必须相互对应；此页后接其它页时，顺序更新 `fromFrame`，根 `totalFrames` 等于各页长度之和，`totalDurationSeconds=totalFrames/30`。

| 字段 | 默认／含义 | 什么时候改 |
|---|---|---|
| kind | 必填 `video` | 不要继续写 screenshot 再塞MP4 |
| asset.src | 必填，当前任务staging内的public相对路径 | 指向真实本地MP4；不用盘符、HTTP、data URL、`..`或服务端API地址 |
| asset.width/height | 必填，源视频实际显示尺寸 | 不是页面1080×1920；宽视频如1920×1080就填真实值；会对照浏览器metadata校验 |
| trim | 可选，缺省从0播放整段 | 只要其中一段时，起止秒都填；区间为[start,end)，end不包含 |
| muted | 缺省true | 有外部旁白时保持静音；确实需要原声才写false，不能写字符串 `"false"` |
| fit | 缺省contain | contain完整显示、可能留边；cover填满视窗、居中裁边 |
| durationInFrames | 必填，冻结页长 | 与媒体长度独立，30fps下180帧=6秒；同时须能容纳外部旁白 |
| text/body | 与截图页相同 | 标题在上、说明在视频下，不烘焙进视频 |
| caption/cues/narration | 与截图页相同 | 字幕时刻相对本页；旁白音频独立引用已有staging文件，不在组件内合成 |

视频画面使用与截图相同的固定视窗：左146.4、上550、显示约787.2×784px，处于中间80%内。视频、相机变换在同一容器；标题、字幕、旁白、AI标识和CTA不跟着视频缩放。

## 视频短于／长于页长怎么办

**本轮明确选择：循环，不停末帧。**

- 有trim：只循环所选片段。比如 trim=2–5秒、页长6秒，就播放2–5秒两次。
- 没有trim：从第0秒开始，播放完整源文件；源文件短于页长时循环全片。
- 页长短于视频/片段：到页尾正常结束，**不会自动延长页长**。要完整播完，调用方把冻结页长设到足够长。
- 原声在 `muted:false` 时跟随片段一起循环。外部旁白、字幕和入场/镜头动效**不循环**，继续按本页冻结时钟走。
- 不想重复：把页长控制在视频/片段长度以内。本轮没有 `loop:false` 或“停末帧”配置，不要写了期待生效。
- trim秒数按成片fps取最近的整帧；不足一帧、反向区间、负数、缺少起止或超过真实媒体时长会报错。边界量化误差最多约半个30fps帧。
- Remotion按帧中心取样，审计中的实际seek可能比对应帧起点晚约半帧；这是帧采样位置，不是累计声画漂移。

原声与旁白可以同时存在，但会混在一起：默认静音正是为避免原声盖住旁白。转场旧页只保留冻结画面，强制静音，不会额外回放退出的视频声音。

## 六种常见情况

### A. 完整保留画面，外部旁白讲解

`fit:"contain", muted:true`，需要片段就写trim。外部旁白继续用：

```json
{"narration":{"src":"courseware/my_task/my_render/narration/clip.wav","durationSeconds":4.2}}
```

页长至少126帧；同时写caption，建议给真实句级cues。改变trim不会替你重新转写或移动旁白。

### B. 播原声视频

写 `muted:false`；不需要外部旁白时省略narration。若视频里已有烘焙字幕，调用方可用 `cues:[]` 关闭本页外挂字幕，避免重复。

### C. 只播2–5秒，页长6秒

写 `trim:{startSeconds:2,endSeconds:5}`、`durationInFrames:180`，会循环两次。不要把trim秒写成帧数。

### D. 宽视频完整展示／填满画面

两者都填真实 `asset.width/height`，如1920×1080。需要所有边缘就contain；允许裁边、重点在中央才选cover。cover不做人物或按钮的智能追踪。

### E. 放大或平移重点

```json
{
  "effects": {
    "motion": {"type":"zoom","steps":[{"at":0,"scale":1},{"at":0.25,"scale":1},{"at":0.5,"scale":1.3},{"at":1,"scale":1.3}]}
  }
}
```

- 视频页缺省**不自动推近**；写motion才移动，`motion:false`显式关闭。
- zoom以视窗中心为中心，1–3倍；pan用 `from/to:{x,y}`；follow用 `points:[{at,x,y,scale}]`。x/y为源视频归一化坐标，at为整页0–1进度，与trim起止秒不是同一单位。
- 静态contain不裁切；**显式zoom/pan会有意改变取景并受固定视窗裁切**。要求全图不裁时不要同时加放大镜头。
- 相机不随片段循环重置。移动到哪就停在哪；想跟随具体点，用follow，不把截图highlight硬塞进视频页。

### F. 入场与换页

- `reveal.fade/stagger/typewriter`、四种 `transition`、pan/zoom/follow、tilt、grain/gradient/lightSweep、chapter、progress与品牌/AI标识可复用。
- 视频页的typewriter只作用于页标题，不改视频内烘焙文字；截图专用 `annotationAnim/emphasis/highlight/annotation` 不适用，会明确拒绝。
- 页内视频从**页开始**计时，转场、hook或入场隐藏的时间也会推进视频，不会为了等视觉出现延后旁白。关键操作要完整展示，请预留时长或单独拆页。
- 一页选少量效果。视频本身在动时，优先简单fade，不再堆镜头运动。

## 一条命令真正跑起来

现有 renderer/public 中没有MP4，且本轮禁止改public。因此样片脚本在 `out/` 创建独立 **staging素材根**：复制已有MP4、项目字体和fixture素材，然后用 `--public-dir` 指向它。不会启动Studio，不操作4310，不下载素材。

```powershell
cd D:\AI数字资产\studio
node engines/vibemotion/renderer/src/courseware/video-example.mjs --list

# 10秒完整验收样片：静音片段+外部音轨 → 开原声/cover/推近 → 收尾
node engines/vibemotion/renderer/src/courseware/video-example.mjs --case lesson --render

# 自己的MP4：整段、完整显示、缺省静音；页长6秒
node engines/vibemotion/renderer/src/courseware/video-example.mjs --case contain --source "D:\素材\演示.mp4" --whole --duration 6 --out out/my-video --render

# 截2–5秒并开原声；页长6秒，片段循环两次
node engines/vibemotion/renderer/src/courseware/video-example.mjs --case original-audio --source "D:\素材\演示.mp4" --start 2 --end 5 --duration 6 --out out/my-audio-video

# 只选中间画面，适度推近
node engines/vibemotion/renderer/src/courseware/video-example.mjs --case zoom --fit cover --start 2 --end 4 --duration 4 --out out/my-video-zoom

# 两页推入转场验证；或 --case pan / follow / stagger
node engines/vibemotion/renderer/src/courseware/video-example.mjs --case transition --style clean --out out/my-video-transition
```

**去掉 `--render` 只准备素材并生成完整JSON**，打印可复制的Remotion命令。复制素材也只写指定out目录。`lesson`是固定10秒验收样片，使用既有图表参考视频；画面取2–4秒，抽取同一原片已有0–2秒有声音轨作外部旁白轨，验证声画独立编排，**不是新TTS**。它不是自动创作服务，也不转写任意用户视频；处理自己的源文件请用contain/original-audio等单页情况，并人工改正确标题与字幕。

单页情况可用 `--start/--end/--whole/--duration/--unmuted/--fit/--style`；固定lesson保持验收编排，不应用这些裁切/页长参数。每条命令仅生成/渲染一条，不批量。

已有业务resolved props和素材根时，可以直接：

```powershell
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npx --offline --no-install remotion render src/courseware/index.tsx Courseware D:\AI数字资产\studio\out\my-video\video.mp4 --codec=h264 --overwrite --concurrency=2 --props=D:\AI数字资产\studio\out\my-video\resolved-props.json --public-dir=D:\AI数字资产\studio\out\my-video\staging
npx --offline --no-install remotion still src/courseware/index.tsx CoursewareCover D:\AI数字资产\studio\out\my-video\cover.png --props=D:\AI数字资产\studio\out\my-video\resolved-props.json --public-dir=D:\AI数字资产\studio\out\my-video\staging
```

实际文件例如：`out/my-video/staging/courseware/my_task/my_render/assets/demo.mp4`，JSON只写 `courseware/my_task/my_render/assets/demo.mp4`。字体也要在该素材根的 `fonts/`；旁白/截图若仍被其它页引用，一并复制对应目录。契约里的 `publicRoot:"renderer/public"` 字段保持原值；此独立验证的实际静态服务目录由CLI `--public-dir` 覆盖。正式渲染若使用现有 renderer/public 并已staging素材，可省略该CLI参数。

## 验证与失败处理

- 已验证真实H.264 MP4播放、区间裁切、原声开关、两种fit、短片/整片循环、三风格、reveal/镜头/转场和原有五类页兼容。
- 读不到文件、解码失败、尺寸不匹配、trim超过实际时长，直接失败并指出原因，不拿截图伪装视频。扩展名允许mp4/webm/m4v/mov；**其它编码/旋转素材本轮未穷举**，需要同样预检。优先H.264+AAC的MP4。
- 本轮未接前端“上传MP4→自动转video页”的编译流程；DSH需要把kind/asset/trim/muted/fit以及既有冻结时序写入最终props，渲染器才能调用到。
- AI操作助理负责操作、填字段、看抽帧和替人定案；软件自带AI生成候选内容的职责没有混入渲染组件。

验收证据在 `out/courseware-video-v15/`：`video.mp4`、`contact-sheet.png`、`cover.png`、`three-styles.png`、`evidence/<情况>/comparison.png`、`verification.json`。`contain`三帧为同一片段播放中／稍后／下一轮同一时刻；前后两帧像素相同、中间帧不同，用来证明在播放且按trim循环。

重跑完整独立验证：`node engines/vibemotion/renderer/src/courseware/video-proof.mjs`。只看解码冒烟：加 `--smoke`；已有视频后只补抽帧/声音验证：加 `--finish`。完整验证依赖保留V14旧图与保护清单；正常业务调用不必重跑整套验收。
