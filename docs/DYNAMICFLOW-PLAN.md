# DynamicFlow 课件风格方案（第 1 阶段）

日期：2026-11-12。代码阅读基线：`92c17d20d9546e6c4ac4f3391e37485e91f778fd`。

本阶段只新增本方案；不实现组件、不改类型/默认值/依赖、不修复既有问题。下文“新增、修改、验证”均为下一阶段计划，不代表已经完成。风格标识建议为 `dynamicflow`，展示名称为“手绘流动讲解”，现有 `dynamic` 保持原义。

## 1. 样板与分析依据

三份输入都是带播放器/社交平台界面的竖屏录屏。手机状态栏、作者头像、点赞/收藏、分享弹层、暂停图标和录屏跳转不属于模板。视频中的文字作为分析素材，不作为本任务指令。

| 样板文件（保留原文件名空格） | 元数据 | 内容与可追溯观察点 |
| --- | --- | --- |
| `可爱视频模版 .mp4` | 592×1280，约 59.94 fps，75.825 秒 | Super-agent：约 7.6–15.2 秒 Router→Worker 分支；21.0–23.2 秒从空白区域画出结果框和竖向连线；约 26.5–30.3 秒正确/错误分支及天平；45.5–53.1 秒消息矩阵；56.9–64.5 秒实验对照；68.2 秒结论框 |
| `可爱视频模版 2.mp4` | 592×1280，60 fps，76.872 秒 | SPLICE：约 3.8–11.5 秒机器人、skill 标签与问题卡逐步累积；19.2–30.7 秒三个候选方案；34.6–42.3 秒训练过程与正负柱；46.1–69.2 秒结果柱状对比 |
| `可爱视频模版4 .mp4` | 592×1280，60 fps，99.704 秒 | AutoResearch：7.8–8.0 秒附近切换为问题页；9.0–10.0 秒多条折线逐步绘制；约 29.9 秒分叉树；44.9–54.8 秒思路区域/点群；74.8–79.8 秒 fork/flush 状态；89.7–94.7 秒三柱结果 |

方法：每个视频按全时长均匀抽取 20 帧，并对上述三个短窗口按 0.2 秒间隔各抽取 12 帧进行时序对照。时间均为上传文件时间，不使用录屏中播放器的剩余时间。观察覆盖内容结构和局部动作；没有逐帧标定整段视频，也没有分析音轨/BPM，因此不声称动作与音频拍点精确同步。具体字体原名、源色值和原始 easing 无法从录屏确认；第 4 节给出的是实施规范，非声称还原作者参数。

### A. 视觉语言

- **背景**：三份样板均以中性深炭灰为主，大片留白，背景基本稳定。录屏可见轻微明暗带，但不能确认来自原渐变、压缩还是录屏；不据此制作强渐变。
- **主色与强调色**：暖米白正文、灰白辅助线；暖黄标记关键概念/当前路径，薄荷青绿代表流程/正常状态，黄绿表示正向收益，珊瑚红标记失败/负收益，少量橙色补充对比。颜色承担语义，不轮流随机换色。
- **字体**：中文与英文均有手写笔感，英文标题更自由；数字和短标签贴近图形。强调依靠颜色、大小、手绘圈/下划线，正文没有大面积霓虹外发光。
- **卡片和线条**：低对比半透明填充、细描边、小圆角，轮廓略有不规则感；图表用斜线填充，箭头和连线细而清楚。并非厚重的大圆角玻璃卡片。
- **版式**：上部放主题，中部承载主要图解，下部留字幕；内容按因果关系累积，画面不是每次都完全重排。局部常见树状分支、成对对照、结果柱图和少量线描图标。
- **光效**：没有证据支持强 bloom、持续光带或液态色团。新风格默认不加这些效果。

### B. 动效语言

1. **流动来自信息推进**：先画框/线，再放标签，再接下一节点，最后突出结论；多数物体稳定停留。样板 4 的折线窗口、样板 1 的结果框窗口都能直接看到路径逐步增长。
2. **局部接力**：卡片/标签依次显现；已解释的部分退暗，让新内容接管注意力。skill 标签有局部位置变化，但不宜泛化为全页浮动。
3. **转场克制**：观测到短切换、内容清空后重画和局部保留。约 7.8–8.0 秒的切换速度高于本次采样分辨率，不据此断言用了哪种高级转场。
4. **节奏有停顿**：构建完成后保持数秒供阅读，字幕更新不必驱动画面持续运动。新风格应围绕讲解段落安排，不强迫每个词跳动。
5. **退出主要靠淡出/降强调**：保留上下文的成本低于让所有元素飞出；不采用弹跳、旋转、循环呼吸或抖动。

### C. 可复用模式与实现边界

| 固定模式 | 下一阶段落实方式 | 边界 |
| --- | --- | --- |
| 暗底 + 手写字 + 细描边 | 专属 tokens、固定种子的线框 | 无背景噪声，不每帧重新随机路径 |
| 画框 → 标签 → 连线 → 下个节点 | 专属 Flow 渲染器和帧计划 | 首版仍使用现有 2–4 节点契约/竖向布局 |
| 卡片顺次出现，当前条更亮 | 专属 bullet/card 呈现 | 不改变旧风格 stagger 行为 |
| 圈、箭头、下划线 | 复用现有 Annotation 与归一化定位 | 禁止靠缩小截图文字维持可读性 |
| 内容退暗，结论保留 | 非活动图形降透明度，正文保持可读 | 不把仍需阅读的正文压暗 |
| 分叉树、对比柱、点群、消息矩阵 | 后续独立图解能力候选 | 不能仅靠配色声称已复刻；首版不扩展 slide.kind，不把统计数据塞进 bullets |

样板出现的步骤编号、可见页结构标签、小字密集图表、边缘控件不照搬：项目 `AGENTS.md` 的安全区、字号、无内部结构词和末页 CTA 规则优先。点群/机器人仅可作为解释对象，不能变成无语义的漂浮装饰。

## 2. 对现有架构的理解

以下路径除另注外以 `engines/vibemotion/renderer/src/` 为根。

### 2.1 风格定义与共享范围

`graphics/styles.ts` 定义 `ExplanationStyle` 三值联合、`EXPLANATION_STYLES` 和 `styleTokens()`；没有独立的动效主题层。缺省或未命中 token 时回退 industrial。

| 风格 | bg / surface | ink / muted | primary / accent / line | heading / radius |
| --- | --- | --- | --- | --- |
| industrial | #0B1210 / #111A16 | #ECF0E4 / #A4B0A6 | #AEC56B / #D99C4A / #3F5145 | LXGW WenKai / 4 |
| clean | #F4F1E9 / #FBFAF6 | #253B34 / #62766B | #497F70 / #BD713E / #B8C6BA | LXGW WenKai / 20 |
| dynamic | #122C2B / #1E3B37 | #F5EFD9 / #ADC7BA | #D7DC78 / #F29B70 / #527B6F | ZCOOL KuaiLe / 24 |

这些 token 同时被 graphics、explainer、avatar、courseware 使用。直接重写 dynamic 或在共享函数中全局改 radius/heading，会波及非课件内容；仅增加一组颜色也无法产生样板的“逐步解释”行为。

### 2.2 数据与页面渲染

流程：工作台 → `server.mjs` 课件草稿/自动生成 API → storyboard → `lib/courseware-compile.mjs` → 冻结 resolved-props → `lib/courseware-render.mjs` → `courseware/index.tsx` → Courseware / CoursewareCover。

- `model.ts` 的 `ResolvedProps` 固定 `schemaVersion: courseware/1`、1080×1920 / 30 fps、页序、总帧数、素材根目录、字幕/配音/音乐/品牌。`Slide` 包含 title、screenshot、video、flow、bullet、quote 六种页型。
- `validateResolved()` 不是类型断言：它验证后重建对象。素材路径必须属于本次 staging；页时序必须无缝相接；有旁白时必须有 caption；字幕不能重叠；flow 限 2–4 节点、12 条边，bullet 限 1–5 条。
- `Courseware.tsx` 按 `fromFrame` / `durationInFrames` 建立 `Sequence`。`Page` 用 token 控制背景、文字、边线、圆角；布局多为固定坐标。主标题 52–76 px，bullet 40 px；品牌与 AI 标签分别经 `BrandChrome.tsx` 输出。
- `SlideVisual` 负责 fade/slide/push/wipe；上一页用 `Freeze` 固定末帧，ghost 视频强制静音。转场绘制裁剪到 `inset(192px 108px)`，不会改总时长。
- 字幕、BGM/SFX、进度条和 AI 标识在全局层；标题字体取 token，但根正文/字幕 CSS 固定 LXGW WenKai。因此新风格沿用本地字体最稳妥。
- Cover 是用 `project.title` 合成的一页，不是视频第 0 帧截图；新风格必须单独定义完成态封面。

### 2.3 effects 与 layers

- `Effects.tsx`：`revealValue` 实现每项 400 ms 的 stagger；`AnimatedCopy` 实现按行/字打字；`Texture` 支持静态 radial-gradient、确定性点纹与单次 lightSweep；还有截图放大镜、进度条和音轨。
- `model.ts`：`effectPlan` 将 transition → hook → reveal 排成 intro，再安排标注、强调、tilt、sweep；时间不足会压缩窗口，并考虑镜头停稳时刻。通用插值既有线性也有 smoothstep，不能假设全都同一 easing。
- `layers.tsx`：`Screenshot` 内部使用 984×980 坐标空间，再以 .8 缩放，保持截图、spotlight、标注和镜头一致；`Annotation` 已有 circle/underline/highlight/arrow/bubble，并以 strokeDashoffset 或宽度实现绘制。
- `CoursewareFlow` 用 `flowBoxes` 产生纵向节点，`rectPaths` 画固定种子的略粗糙线框。现有边是随节点透明度显现，并没有按路径长度“流过去”。这正是新风格需要补的部分。
- `VideoPage.tsx` 有独立视频裁切、循环、静音及镜头路径；不能为增加新风格破坏这些行为。
- `audit.tsx` 已检查安全区、文字下限/溢出、节点宽度、连线穿过节点、截图标注误差、视频播放时刻、品牌/字幕与末页 CTA。它是几何验收基础，不等于完整视觉一致性测试。

### 2.4 必须记入方案的既有差异

1. 编译器默认 title/quote 写出 `effects.textSync`，渲染校验的 allowed keys 不包含它；会报未知效果。这是基线已有的不一致。
2. 编译器写 `nodeTimings` / `bulletTimings`，但当前 Slide 类型/validateResolved 没有保留它们。不能宣称已有“逐句同步点亮”可直接复用。
3. 风格白名单分散于 `server.mjs` 两个课件入口、`COURSEWARE_STYLES`、resolved 校验、工作台选择器。当前 UI 某入口还写死 industrial；只改 styles.ts 会被回退或拒绝。
4. 当前仓库 TypeScript 检查已有诊断；本阶段不修复、不把失败算作新风格导致，也不把它们当作可以跳过回归的理由。

## 3. 接入方案：课件内隔离，保持旧行为

推荐在 `courseware/styles.ts` 新增课件专用适配层：

- `CoursewareStyle = ExplanationStyle | 'dynamicflow'`；共享 `ExplanationStyle` 和 `graphics/styles.ts` 三套 token 原样保留。
- `coursewareStyleTokens(style)` 对三旧值直接委托 `styleTokens(style)`；仅对 dynamicflow 返回新 token。所有消费 project.style 的课件组件改用适配层，包括 BrandChrome、VideoPage、Effects、layers、Courseware。
- 在 `Courseware` 完成校验后按精确值分流：dynamicflow 进入独立 `DynamicFlowCourseware`，其余进入原路径。Cover 同样分流。新组件不能通过导入 Courseware 主入口造成循环依赖。
- 新风格专属布局/绘制/调度放在 `courseware/dynamicflow/`，不重构旧 Page/SlideVisual/Flow。复用纯函数和字幕/音轨等稳定组件，不改变共享组件缺省参数。
- 保留 `courseware/1`，只扩展 style 的允许值；首版不增加新 slide.kind 或 effect 字段。新增 style 对旧版渲染器不兼容，因此部署时 API/编译器/渲染器必须一起更新；回滚前暂停新增风格任务，不能把新项目偷偷降级为 industrial。
- 编译器只有在 `style === 'dynamicflow'` 时生成新预设，且不写当前不支持的 textSync。旧三风格默认对象不改；它们的 textSync 修复应单独评审。若用户显式传入非法效果，新风格也应明确校验失败，不能静默吞掉。
- 为避免两个调度器重复控制，同一页面只选择一个主模式：文字呈现、flow 构建、截图镜头+标注或视频呈现。新风格默认不叠加 hook / tilt / pulse / lightSweep。显式 effects 要有兼容矩阵并报不支持组合，不允许同时给同一 transform 写两套动画。

## 4. DynamicFlow 可实施风格规范

所有尺寸按 1080×1920、30 fps 定义。下述值是从三份样板提炼的设计目标，不是录屏像素反求的源参数。

### 4.1 Tokens、字体和版式

| Token/规则 | 取值 | 用途 |
| --- | --- | --- |
| bg | `#262725` | 中性炭灰，全片稳定 |
| surface | `#30312D` | 薄卡片填充 |
| ink | `#F0EBD4` | 暖米白正文 |
| muted | `#BDBAA8` | 辅助说明；实际合成背景测对比度 |
| primary | `#A8C9B4` | 薄荷绿流程、正常状态 |
| accent | `#E7C85B` | 暖黄主重点 |
| positive | `#C6D582` | 正向结果，必须配文字/符号 |
| danger | `#EF8581` | 负向结果，必须配 × / 文案 |
| secondaryAccent | `#DBA36D` | 仅确需第三组比较时使用 |
| line | `#858C80` | 普通轮廓；退场线可降透明度 |
| radius | `10px`，标签 `6px` | 克制圆角，不使用 24px 胶囊卡片 |
| 描边 | 主轮廓 `2px`，强调 `3px`，标注 `4px` | SVG round cap / join |
| 线框手绘感 | roughness `0.55`、固定 seed | 一次生成路径，帧间不跳动 |
| 背景渐变 | 默认关闭 | 可选静态顶部 `#2B2D29`→底部 `#262725`，不得降低对比 |
| 光效/阴影 | 默认全部关闭 | 禁用持续扫光、外发光、blur 和 grain |
| 字体 | 本地 `LXGW WenKai` | 中文/英文/数字统一；不声称与样板同款 |
| 标题 | `64px`，hero `72px`，行高 `1.25` | 最多三行，字多先改文案；不动画字体大小 |
| 正文/节点 | `38px` / `40px`，行高 `1.35` | 正文至少 24px；节点保持 audit 的 36px 下限 |
| 注释/品牌/字幕/CTA | `30 / 28 / 32 / 26px` | 注释 ≥28，字幕和 CTA ≥24；字幕可在新组件局部实现，旧 SubtitleTrack 不改 |

安全内容区为 x=108…972、y=192…1728。品牌位沿用左上约 y=204；标题区 y=320…500；图解区建议 x=148…932、y=560…1320；说明区 y=1370…1460；字幕区 y=1480…1610；保留进度条 y=1664 与底部品牌标识空间。末页右下 y≈1690 显示“有问题，评论区问”，左下 AI 标识沿用现有开关。

主内容和单行字段居中，多行说明只在可读性需要时左对齐；不能用空格凑居中。图解首版保留 flowBoxes 的节点宽度 720px、节点高 136px、间隔 44px，满足现有 audit 的节点宽度 ≥560px 约束。样板横向树/多列矩阵不强塞进这个几何契约。

正文与背景对比度目标 ≥4.5:1，大标题和必要图形 ≥3:1；检验的是最终透明度合成结果。退暗只用于已结束的图形或冗余提示，活动文字不以低透明度承载信息。

### 4.2 动效参数和确定性

| 动作 | 建议时长（30 fps） | 参数 |
| --- | --- | --- |
| 页切换 | 默认直接切换；需要淡入时 200ms / 6 帧 | 只淡入新内容，旧帧冻结、退出视频静音；计入本页时长 |
| 标题入场 | 400ms / 12 帧 | opacity 0→1，translateY 8→0；easeOutCubic `1-(1-p)^3` |
| 轮廓绘制 | 500ms / 15 帧 | pathLength=1，dashoffset 1→0；smoothstep `p²(3-2p)` |
| 连线接力 | 400ms / 12 帧 | 沿真实 path 绘制；箭头头部最后 20% 出现；不移动整张图 |
| 节点/卡片文字 | 200ms / 6 帧 | 轮廓到位后淡入，文字不逐字抖动 |
| bullet 入场 | 每项 400ms / 12 帧，间隔 200ms / 6 帧 | y 8→0；最多三个同时变化的元素 |
| 一次圈/下划线强调 | 600ms / 18 帧 | 左到右绘制；背景高亮 opacity 上限 .18 |
| 旧图形退暗 | 200ms / 6 帧 | opacity 1→.45；当前内容保持 1 |
| 截图推进（替代 flow 主动作） | 800ms / 24 帧 | 1→最多 1.35，服从完整 target 可见约束；停稳后才标注 |
| 收尾 | 至少 1000ms / 30 帧 | 所有动作停稳，CTA 可读，不循环 |

- 所有进度由 `useCurrentFrame()` / fps 与冻结 props 推导，禁止 CSS keyframes、setInterval、Date.now、无种子 Math.random 驱动画面。反向 seek、并行渲染同一帧应一致。
- 页内先转场，再构建；同一阶段只处理一个语义动作。框与其标签可视为一个动作组；背景不另加运动。
- 首版按稳定的节点/卡片顺序排程，不宣称跟随真实语音词级同步。字幕继续使用冻结 cues；未来要消费 nodeTimings/bulletTimings，需另行定义类型、验证、缺省与序列化规则。
- 例如 6 秒/180 帧 flow 页：0–12 帧标题；12–27 节点 1 框；27–33 标签；33–45 连线；45–60 节点 2 框；60–66 标签；66–78 连线；78–93 节点 3 框；93–99 标签；余下时间停留。四节点再加 33 帧，仍保留 ≥30 帧稳定阅读。
- 时间不足时先取消非必要入场，再整组展示内容；不将全部动作挤成闪烁。低于 1 秒的页只显示静态完成态（无法保证 1 秒停留时按该页全部时长停留）；不改变已经冻结的总帧数或截断旁白。
- 封面直接用完成态，无隐形首帧、无绘制到一半的连线；生成输入仍是 project.title。

## 5. 下一阶段文件改动清单

“修改”只指未来实现。第 1 阶段唯一落盘到 Git 的文件为本文。

| 文件 | 下一阶段操作与边界 |
| --- | --- |
| `engines/vibemotion/renderer/src/courseware/styles.ts` | 新增 CoursewareStyle、专属 token 和旧风格委托适配器 |
| `engines/vibemotion/renderer/src/courseware/dynamicflow/` | 新增 Courseware/封面、线框/连线组件、纯帧调度函数；按职责拆文件，样板复杂图表不一次塞入 |
| `engines/vibemotion/renderer/src/courseware/model.ts` | ResolvedProps.style 改用课件联合类型，新增合法 style 值；保持旧 effectPlan、校验及所有缺省行为 |
| `engines/vibemotion/renderer/src/courseware/Courseware.tsx` | 校验后仅新增精确 style 分支，Cover 同步；旧布局/CSS/转场函数保持 |
| `engines/vibemotion/renderer/src/courseware/Effects.tsx`、`layers.tsx` | token 入口适配；旧效果算法不改，专属绘制放新目录 |
| `engines/vibemotion/renderer/src/courseware/BrandChrome.tsx`、`VideoPage.tsx` | 适配课件 token 类型，保留位置、开关、裁切/静音/媒体时序 |
| `lib/courseware-compile.mjs` | 追加白名单；新风格条件预设，显式 effects 的兼容检查；旧分支原样保留 |
| `server.mjs` | 两处课件创建/自动生成入口放行新值；检查保存/读取/任务 style 的一致性，仅课件路径处理 |
| `public/app.js` | 仅 courseware 模式展示第四项，切回其他模式恢复旧选项；课件编辑/自动入口传递实际选择，消除对应入口的 industrial 写死值；不扩大原“同文案出 3 种风格”批量范围 |
| `engines/vibemotion/renderer/src/courseware/audit.tsx` | 仅确有新组件标记时补检查；不降低已有字号、安全区、节点宽度断言 |
| `engines/vibemotion/renderer/src/courseware/dynamicflow-proof.mjs` 等专属验证文件 | 下一阶段新增确定性、布局、入口贯通和旧风格差异检查；保留现有 proof 脚本 |
| `engines/vibemotion/renderer/src/courseware/CALLING.md` | 下一阶段补新 style、限制与验证用例；不承诺尚无的图表/语音同步能力 |

明确不动：

- `graphics/styles.ts` 的三套 token/ExplanationStyle；graphics/GraphicScene、GraphicLibrary、explainer、avatar、根 types.ts 的其他引擎风格定义。
- 旧 `renderer/` HTML 模板、旧 file:// 渲染流程；公众号图文、发布、账号、数据库 schema/迁移、TTS 服务和鉴权配置。
- package.json、锁文件、Remotion/React 版本及字体二进制；首版无需新增依赖和下载字体。
- `lib/vibemotion.mjs` 的非课件白名单、旧三风格批量默认值；不把 dynamicflow 作为所有引擎的通用第四风格。
- `lib/courseware-compose.mjs` / `lib/generator.mjs` 当前已接收或传递 style；先用确定性编译器规则，首版不通过改全局提示词改变旧项目生成。若以后需要图表数据模型，单独扩范围。
- 输入样板、抽帧图、分析缓存不提交。素材保留在附件目录，抽帧只在 `/tmp`，不作为产品资产。

## 6. 保证 industrial / clean / dynamic 不受影响

保证靠分支隔离与对照验证，不只靠口头承诺。

1. **契约不变**：对既有 resolved fixture，在基线与新版本分别执行 validateResolved，比较规范化对象、字幕 cues、时间窗口与总帧数；结果完全一致。旧 token 对象逐字段一致，未知 style 的既有入口回退/错误策略不顺便重写。
2. **旧渲染路径不变**：除了课件 token 适配调用，三旧值仍走原 Page/SlideVisual；不存在把“其他风格”统一放进 dynamicflow 的宽泛 else。新 CSS 只挂专属 class/data 属性，不覆盖 `.cw-root` / 全局 SVG / 字幕规则。
3. **同环境图像基线**：固定 Node、Remotion、Chromium、字体、素材和 props，在实现前后各渲染三旧风格的 cover + 六页型，取每页入场/中段/末帧及转场前后帧。优先做逐像素比较；如存在媒体解码差异，先重渲染基线确认噪声来源，再记录有依据的差异范围，不能放宽阈值掩盖布局变化。
4. **时序回归**：前页 Freeze、视频静音与 trim/loop、字幕边界、BGM/SFX 时刻、品牌/AI 开关全部保持。用现有 effects-proof/video-proof/brand-proof 验证，并准备存在的本地 fixture；缺素材时报告缺项，不能零用例通过。
5. **新入口往返**：创建→编辑→保存→读回→编译→resolved→视频/cover 都保留 `dynamicflow`，任务列表也一致；同时对三旧值重复该链路。切换 UI 模式时新值不能流入非课件生成器。
6. **几何与视觉验收**：`audit:true`、4/5/6 页、多行/最长合法文案、全部六页型、首帧/转场/完成态；末页 CTA 与 AI 标识不重叠，无内部标签，无动画出安全区。
7. **确定性**：同输入重复渲染关键帧哈希一致；比较串行与并行渲染、乱序 seek。确认路径 seed 固定，首帧和封面都可读。
8. **发布门槛不缩减**：遵守 AGENTS.md 的 4/5/6 页、五主题、P1 封面及 P2/P3/P4 检查。“五主题”与这里的三旧风格不是同一维度，实施前映射仓库现有主题测试入口，不能把三风格检查冒充五主题检查。

基线 textSync 不一致及现有 TypeScript 诊断单独记录；新实现不得增加类型错误或把旧失败静默隐藏。若某必需验收被基线问题阻挡，要先独立修复并重建基线，再发布新风格。环境对 file:// 的限制不应通过修改受管浏览器策略解决；新方案继续使用 Remotion 的 HTTP bundle 路径。

## 7. 后续交付顺序与本阶段停止点

下一阶段建议：先锁定三旧风格基线 → 接入第四课件值 → 完成 token/cover/title/bullet → 实现节点与连线接力 → 接 screenshot/video/字幕 → 打通工作台和 API → 跑回归矩阵。分叉树、统计柱图、消息矩阵与真正旁白同步作为另一个明确的数据模型阶段。

第 1 阶段完成条件：只提交 `docs/DYNAMICFLOW-PLAN.md` 到 `feature/courseware-dynamicflow`；检查 diff 仅此文件，push 后停止。本阶段不执行任何上述代码实现，也不声称新风格已完成渲染验证。
