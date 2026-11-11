# 课件吸引力效果：调用说明（V13）

V14新增品牌与AI标识根字段，调用见 [BRAND-CALLING.md](./BRAND-CALLING.md)。旧props默认新增左下“AI 生成”；若要复现V13整帧，显式设置 `aiLabel:{show:false}`。这不改变下述 effects 的缺省行为。

V15新增 `kind:"video"`，数据、裁切/原声/适配、循环策略与独立调用命令见 [VIDEO-CALLING.md](./VIDEO-CALLING.md)。视频不默认推近；仅在显式写motion时移动，截图默认行为保持原样。

给 DSH、编译器和 AI 操作助理：下面的调用已提供完整 props 生成器，直接复制命令即可验证。这里新增的是课件渲染能力；没有修改软件前端、服务端或数据库，也没有给现有页面偷偷加开关。

## 先确定你传的是哪一层

1. **编辑器 storyboard** 可以保存 `assetId`、旁白文字。它不能直接交给此入口。DSH 编译器先解析素材、TTS、冻结帧数，产出契约 v2 的 **resolved-props 根对象**。
2. **渲染器输入** 是该根对象本身，不是 `{storyboard: ...}`。保留 `schemaVersion/taskId/renderId/draftRevision/title/style/canvas/publicRoot/stagingDir/totalFrames/totalDurationSeconds/slides`。页面保留冻结 `id/kind/text/fromFrame/durationInFrames`；截图是 `asset:{src,width,height}`，不是 `assetId`；流程必须有 `nodes` **及** `edges`。
3. 在目标页面写 `slides[i].effects`。`bgm/sfx` 放**根对象**；全片 `hook/progress` 也放根对象。首页局部钩子写 `slides[0].effects.hook`。章节写 `slides[i].effects.chapter`。不要写 `slides[i].bgm`、`effects.bgm` 或 `effects.zoom`。
4. 所有新字段都可省略。省略 effects 或写 `{}` **保持 V12**；不会自动打开淡入、进度条或音乐。V12 的截图默认推近仍保留；只想使用放大镜时，必须明确写 `effects.motion:false`。
5. `effects.motion` 优先于旧 `slide.motion`。旧 zoom 字段仍支持；一页不要同时写两处镜头。`progress:false` 可在某页关闭根对象的进度条。

**AI 操作助理**负责替人操作、填配置、查看证据并定案；**软件自带 AI**负责生成文案/编排候选。渲染组件只读已确认数据，不联网、不找位置、不合成语音，也不会替人决定事实。

## 一条真正能运行的命令

在 PowerShell，项目根目录执行：

```powershell
cd D:\AI数字资产\studio
node engines/vibemotion/renderer/src/courseware/examples.mjs --list
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click --style industrial --render
```

第二条列出所有情况；第三条**只渲一条**，输出 `out/courseware-effects-examples/click/video.mp4`，完整输入保存为同目录 `resolved-props.json`。去掉 `--render` 只生成 JSON 并打印 Remotion 命令。它使用现有真实 fixture 和 staging，既不复制素材也不修改 public。

可选项：`--fixture <绝对或相对路径>` 更换现有 resolved fixture；`--style industrial|clean|dynamic` 切换三风格；`--out out/自定目录` 更换输出。替换 fixture 后，应含示例需要的页类型、真实截图和配音文件。素材不存在会明确渲染失败，不会偷偷用占位图。

已有完整 props 时，不必走示例生成器：

```powershell
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npx --offline --no-install remotion render src/courseware/index.tsx Courseware D:\AI数字资产\studio\out\my-courseware\video.mp4 --codec=h264 --overwrite --concurrency=2 --props=D:\AI数字资产\studio\out\my-courseware\resolved-props.json
npx --offline --no-install remotion still src/courseware/index.tsx CoursewareCover D:\AI数字资产\studio\out\my-courseware\cover.png --props=D:\AI数字资产\studio\out\my-courseware\resolved-props.json
```

默认使用已安装的本地 Chromium。示例的 `--render` 会明确指定仓库内缓存的 headless-shell 路径，离线运行。这里不启动 Studio，也不操作 4310。

## 每个效果怎么选、怎么写

表中路径相对单页 `effects`，标“根”的例外。数值默认只在**已声明该效果**时补齐。每页最多选 2–3 个视觉效果，依次强调；静态底纹也要克制。

| 效果／一句话翻译 | 什么时候用 | 什么时候别用 | 调用及参数 |
|---|---|---|---|
| zoom：镜头推近重点 | 截图教“点这里” | 无 highlight、已很清楚、要保持全图关系 | `motion:{type:"zoom"}`；steps 可省；`[{at:0,scale:1},{at:.25,scale:1},{at:.45,scale:2.6},{at:.8,scale:2.6},{at:1,scale:2.6}]`；scale 1–3，实际按重点完整可见上限裁小 |
| pan：平移着看大图 | 截图横扫；流程轻移 | 小图无需移动；想同时大幅缩放 | `motion:{type:"pan",from:{x:.2,y:.5},to:{x:.8,y:.5}}`；可写 `steps:[{at:0,x:.2,y:.5},{at:1,x:.8,y:.5}]`；不缩放 |
| follow：按顺序跟几个位置 | 截图先看 A 再看 B | 单目标；快速来回扫；希望自动找按钮 | `motion:{type:"follow",points:[{at:0,x:.4,y:.4,scale:1},{at:.6,x:.6,y:.5,scale:2},{at:1,x:.6,y:.5,scale:2}]}`；2–12 点，scale 缺省1 |
| stagger：元素依次淡入、上移8px | 流程或逐条要点 | 想让整页一起显现；旁白不按顺序讲 | `reveal:{type:"stagger",staggerMs:120,from:"all"}`；from 可为 title/body/all；每元素淡入400ms，间隔错开 |
| typewriter：按行或按字显现 | 短标题、短金句、少量要点 | 长正文、截图文字、流程标签 | `reveal:{type:"typewriter",by:"line",speedMs:40}`；by line/char，显式换行用 `\n`；保留最终占位，不挤动排版 |
| fade：当前整页淡入 | 稳定讲述、金句 | 同页已有复杂出现效果 | `reveal:{type:"fade",durationMs:400}`；只淡入当前页，**不是**两页交叠 |
| draw：圈、线或高亮带画出来 | 截图标一个目标 | annotation=arrow/bubble，或没有 highlight | `annotationAnim:{type:"draw",durationMs:600}`；同时写 `annotation:"circle"|"underline"|"highlight"` |
| arrow：箭头从起点画向目标 | 指明按钮/位置 | 需要表达流程边；已有圈且不想换标注 | `annotationAnim:{type:"arrow",durationMs:500}`；annotation=arrow，未填会补 arrow |
| bubblePop：提示气泡从0长到1 | 轻提示、确认位置 | 重要说明需要长文字；要弹跳卡通效果 | `annotationAnim:{type:"bubblePop",durationMs:300}`；annotation=bubble；只缩放一次，不超调 |
| pulse：框有限次轻呼吸 | 推近后再强调一次 | 连续闪烁、整个画面需要稳定阅读 | `emphasis:{type:"pulse",amount:.06,times:2}`；amount 0–.12，times 1–3；独立外圈，原取景框不移位 |
| magnifier：圆镜放大局部 | 小字；要保留整图 | 镜片会遮住另一关键区域；已强推近；倾斜时还要比较像素 | `motion:false, emphasis:{type:"magnifier",radius:.18,zoom:2}`；radius 是980px截图视窗高度比例，.08–.25；zoom 1.2–3；镜片留在视窗内 |
| transition.fade：旧页淡出、新页淡入 | 普通换页 | 已用当前页 fade 且不想重复淡入 | `transition:{type:"fade",durationMs:400}`，写在**进入的下一页** |
| transition.slide：新页滑进盖住旧页 | 轻微场景更换 | 高频方向切换、长文字还没读完 | `transition:{type:"slide",durationMs:400,direction:"left"}`；旧页留在下面 |
| transition.push：新页推进、旧页退出 | 连贯的步骤推进 | 想保持旧页静止；不希望强空间感 | `transition:{type:"push",durationMs:400,direction:"left"}`；两页一起平移 |
| wipe：边界扫过露出新页 | 明确换场景 | 每页都换；要表达截图内部滑动 | `transition:{type:"wipe",durationMs:500,direction:"left"}`；direction 支持 left/right/up/down，表示移动方向；left 为从右向左露出 |
| bgm：低声垫底音乐 | 氛围、长讲解 | 严肃操作演示无需音乐；音乐盖旁白 | **根** `bgm:{src:"audio/music-pulse.wav",volume:.18,fadeInMs:800,fadeOutMs:800}`；volume0–1；循环音频但仅首尾淡入出，无视觉循环 |
| sfx：某个时刻播一次声音 | 少量点击/转场 | 每页都嗖、干扰旁白 | **根** `sfx:[{at:1,src:"audio/whoosh.wav",volume:.5}]`；at 是**整片秒数**，不是归一化值，也不是页内秒数；最多32条 |
| hook：开头先说一句抓人的话 | 有明确收益的开场 | 已有标题就足够；配音没读这句；中段页 | **根**或首页 `effects.hook:{text:"从想法到可靠结果",durationMs:2000}`；不插入额外帧，首页局部优先根配置 |
| progress：底部极细进度条 | 多页教学 | 单页短金句；与原有进度重复 | **根** `progress:true` 或 `effects.progress:{style:"bottom"}`；页级false覆盖根；无数字页码 |
| chapter：标题上方低强调业务标签 | 多步骤教学、阶段切换 | “第1页/背景/证据”等内部标签；重述标题 | `chapter:{label:"确认发布边界"}`；最多12字，不自动生成序号 |
| grain：静态细颗粒 | 轻纸感、减少平底生硬 | 截图本身已经噪；期待动态雪花 | `texture:{type:"grain",opacity:.035}`；最大.08，固定图案，不闪动 |
| gradient：淡淡径向暗角 | 标题、结尾、清晰层次 | 原图有复杂背景；强色带 | `texture:{type:"gradient"}`；低强度，采用当前风格配色 |
| lightSweep：柔光只扫一次 | 首页或收尾/换场景 | 每页、长时间阅读、小字截图 | `texture:{type:"lightSweep"}`；1.2秒，最后消失；不要加循环 |
| tilt：卡片微倾后回正 | 独立截图、流程、要点卡片的轻强调 | 放大镜同时用；密集文字；需要固定的工业测量图 | `tilt:{deg:2}`；-4–4度，800ms，最终归零 |

同组只能一种：一个 motion、一种 reveal、一种 annotationAnim、一种 emphasis、一种 transition、一种 texture。不能同时给 texture 填 grain 和 lightSweep；需要二者并存应先扩展契约，不能传数组期待自动组合。

## 五类页推荐组合

| 页类型 | 默认推荐（必须显式写入） | 特定情况替换 | 不推荐 |
|---|---|---|---|
| title | typewriter.line + gradient | 要先说收益：hook 后再 fade；首屏可选一次 lightSweep | 同时堆 hook、逐字、光扫、倾斜 |
| screenshot | zoom + draw + pulse | 大图：pan+draw；细字：motion:false+magnifier；指向：arrow | arrow 标注配 draw；无重点照样放大；镜头未停又乱飞 |
| flow | stagger | 业务阶段标签 chapter；图太宽轻 pan | 对流程用截图放大镜；节点与边分离移动 |
| bullet | stagger | 短条目可 typewriter.line；卡片可单次 tilt | 每条循环闪烁；长段逐字 |
| quote | fade + lightSweep | 更安静可只 gradient；跨页 transition.fade 单独选 | 长金句逐字拖慢收尾；另加持久 CTA |

所有最终页仍由渲染器显示“有问题，评论区问”，在80%安全区右下，不需另写 CTA。三风格只改变已有字体/配色/框线，不改变效果字段。

## 分情况调用：A–H 都有完整生成器

以下均在项目根目录运行。**先去掉 --render 生成 props，改文案/目标，再选择一条渲染；不要批量跑。** 每个示例保留真实截图、配音、冻结字幕与时长。

### A. 教“点这个按钮”：先推近，再画圈，再呼吸

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click --style industrial --render
```

目标页外层 `annotation:"circle"`；效果：
```json
{"motion":{"type":"zoom"},"annotationAnim":{"type":"draw"},"emphasis":{"type":"pulse","amount":0.06,"times":2}}
```
不要复制文档里的示意坐标覆盖真实识别结果。修改生成 JSON 的 highlight（**源图左上原点归一化0–1**），确认 source width/height 真实，再渲染。

### B. 大截图横扫：平移，不再强推近

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case scan --style clean --render
```
外层 `annotation:"highlight"`，使用 pan.from/to + draw。x/y 指源图取景中心，而不是屏幕坐标；可编辑 points 做有停留的跟随，见 `--case follow`。流程 pan 是安全区内的克制平移，不是整图任意飞出画布。

### C. 讲流程：节点依次出，边跟着端点出现

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case process --style industrial --render
```
`effects:{reveal:{type:"stagger",staggerMs:150}}`。节点2–4个；每个必须有唯一id，edges必须引用已存在的id。没有 edges 不会让渲染器猜关系。字幕仍按冻结 cues，不会根据 stagger 自动改写旁白。

### D. 讲要点：逐条，保留最终排版

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case checklist --style dynamic --render
```
`effects:{reveal:{type:"stagger",staggerMs:200}}`。bullets 1–5条，每条≤32字，别靠缩字体塞长文。想逐行显现改用 `--case typewriter-line`。

### E. 收尾金句：先淡入，柔光扫一次

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case closing --style clean --render
```
`effects:{reveal:{type:"fade"},texture:{type:"lightSweep"}}`。光扫后消失，最后保留干净静帧。

### F. 小字看不清：关掉默认 zoom，再加圆镜

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case magnifier --style industrial --render
```
`effects:{motion:false,emphasis:{type:"magnifier",radius:0.18,zoom:2}}`。圆镜显示源图局部，不能恢复低分辨率素材；模糊原图要重截，而不是继续放大。

### G. 两页换场景：给进入页写 wipe

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case wipe --style clean --render
```
示例生成完整两页，第二页 `transition:{type:"wipe",direction:"left",durationMs:600}`。改为 `--case transition-fade/transition-slide/transition-push` 比较其它转场。转场占**进入页开头**，不改总帧数、不重叠播放前页配音；旧页冻结在最后一帧。

### H. 全片低声配乐／单次音效

```powershell
node engines/vibemotion/renderer/src/courseware/examples.mjs --case bgm --render
node engines/vibemotion/renderer/src/courseware/examples.mjs --case sfx
```
第二条只生成 JSON，查看根字段位置，再决定是否渲染。使用已有本地音频，不联网找歌。`sfx.at` 用整片秒数；某页开始帧为300，要在该页1秒时点击，就写 `at:11`（300/30+1）。不要把 bgm/sfx 放进 effects。

另有 `opening/hook/progress/chapter/grain/gradient/lightSweep/tilt/draw-underline/draw-highlight/arrow/bubblePop` 可直接 `--case` 调用，完整清单由 `--list` 输出。

## 时间、坐标、素材：避免“写了但不生效”

- `at`：镜头关键点为**整页归一化进度0–1**，首点0、末点1、严格递增；sfx.at 则是**全片秒数**。不要混用。
- 页面总长度只认冻结 `durationInFrames`。旁白必须能放入；不满足直接报错。新增效果不延长页面，不截短真实配音。hook 也不额外加两秒：编译器应给首页预留并配好旁白，否则钩子文字与旧配音不一致。
- 页面开头依次分配 transition → hook → reveal。镜头沿原归一化曲线执行；一般在镜头停稳后分配 annotation → emphasis → tilt → lightSweep。末帧必定完成。太短时按比例压缩效果窗口，不挤走字幕或添加帧。
- 若 follow 一直移动到末尾，附着在截图上的标注会跟随同一容器，不能再等镜头停稳；想严格“一次只一个主动作”，在 points 的后半段写两个相同坐标/scale，显式留停留段。不推荐开场多动效叠上持续跟随。
- screenshot 的图、框、暗角和标注共用同一个变换容器。contain 的源图尺寸必须真实；放大上限会保证完整重点在取景视窗内。宽 highlight 可能达不到请求的2.6倍，这是避免裁重点的保护。
- screenshot asset/narration src 沿契约使用本次 `courseware/<taskId>/<renderId>/...` 相对 public 路径；BGM/SFX 可引用共享 `audio/...` 本地素材。不要传盘符、HTTP、`..`、data URL。渲染机需已存在这些文件。
- `style` 在根对象切换三风格；不要写 `effects.style`。已加载项目字体，不用系统字体。
- 顶层未知 effects、错误页类型、标注不匹配、越界音效时间、无高亮的标注等会明确抛错；不会默默丢弃错误配置。音频路径不存在由渲染器报错。先用 `validateResolved` 或下面检查命令，再渲染。

## 怎么验证真的调用到了

```powershell
# 只检查类型、字段、时长和错误兜底，不渲染
node engines/vibemotion/renderer/src/courseware/effects-proof.mjs --model-only
# 现有交付证据，无需重跑：
explorer D:\AI数字资产\studio\out\courseware-effects-v13
```

交付证据：`out/courseware-effects-v13/evidence/<效果名>/comparison.png` 为**前／中／末**；各目录有完整 resolved-props，能直接用上面的 Remotion 命令重现。draw 另有 `draw-underline`、`draw-highlight`；转场另有 `transition-fade/transition-slide/transition-push/wipe`；声音看 `bgm/waveform.png`、`sfx/waveform.png` 和实际 video.mp4，**静态图片不能证明声音被听到**。

`verification.json` 记录真实 DOM 安全区/字号/字幕/高亮误差、五类页的旧图像素比对、三风格帧和视频探测。声音波形是从实际 MP4 解码、减去另外两条已知声轨后的残差，采用平方根纵轴便于看清弱音；视频本身音量不变。BGM/SFX 各自与参考的相关性也在记录中。`contact-sheet.png` 是 ffmpeg 从短样片抽出的10帧，不是拼的设计稿。封面不播放动效。

静态效果 grain/gradient/chapter 另有 `evidence/<名称>/on-off.png`：同一帧的关／开对照，避免把旧入场动画误当成静态质感。开场 hook 与截图标注、流程 stagger、微倾的叠加回归见 `hook-regressions/`。

全量复核脚本 `effects-proof.mjs` 需要已保留的 `out/courseware-effects-v13/baseline` 才能做修改前像素比较；它会生成所有关键帧和**一条5秒样片**，不是批量渲染完整成片。日常接入不需要运行该脚本，生成器 `--case` 已足够。
