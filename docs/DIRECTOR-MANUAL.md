# 课件导演手册（Director's Manual）v1

> 这份手册给「AI 编导」和「软件编译器」共用：**AI 照着选，软件照着排，人工照着改。**
> 目标：让视频的动效、元素、颜色**有章可循**，而不是每次自由发挥。

## 0. 总纲（动效哲学）

```text
1. 动效服务内容，不是装饰内容。
2. 一页只有一次主强调。
3. 最后停成干净静帧，不循环、不抖动、不随机漂浮。
4. 克制 > 华丽。高级感来自「该动时才动」，不是「一直动」。
```

## 1. 全片节奏（叙事弧）

```text
开场 title    → 轻、稳、引人：typewriter（逐行）或 fade
推进 body     → 每页一个「动作」：zoom / draw / stagger
收尾 quote    → 静、高级：fade + lightSweep（柔光扫一次）
转场          → 统一 fade；只有「换场景」才 wipe
```

## 2. 颜色系统（配色规则）

### 2.1 三种风格色板（真实值）

| 风格 | 背景 bg | 表面 surface | 正文 ink | 辅助 muted | 主强调 primary | 次强调 accent | 框线 line | 圆角 |
|---|---|---|---|---|---|---|---|---|
| **工业风** | #0B1210 | #111A16 | #ECF0E4 | #A4B0A6 | #AEC56B | #D99C4A | #3F5145 | 4 |
| **简洁风** | #F4F1E9 | #FBFAF6 | #253B34 | #62766B | #497F70 | #BD713E | #B8C6BA | 20 |
| **动感风** | #122C2B | #1E3B37 | #F5EFD9 | #ADC7BA | #D7DC78 | #F29B70 | #527B6F | 24 |

### 2.2 颜色角色（每个颜色只干一件事）

```text
bg / surface  背景与卡片底（铺底，不抢戏）
ink           正文（可读性第一）
muted         辅助文字 / 弱线
primary       主强调色（要圈的重点、当前节点、主图标）
accent        次强调（危险/警示/第二层信息，少用）
line          框线 / 连线 / 分隔线
```

### 2.3 配色铁律

```text
1. 一页最多 3 个「有存在感的颜色」：1 主（primary）+ 1 次（accent）+ 中性（ink/muted）。
2. 强调色（primary）只用于「这页唯一要强调的那个元素」。
3. 截图取景框/高亮统一用金色（GOLD #E2BE5C），三种风格一致，作为「教学标识」。
4. 正文永远 ink，不要用彩色正文。
5. 对比度：ink 对 bg 必须清晰可读，不许为配色牺牲可读性。
```

## 3. 元素选择（用什么元素）

### 3.1 标注元素（截图页专用，一页只用一种）

```text
circle    椭圆圈 —— 圈「这一个按钮/位置」
underline 下划线 —— 强调一行文字
highlight 高亮色带 —— 罩住一个区域
arrow     箭头 —— 指向某个位置
bubble    气泡 —— 一句轻提示
```

规则：**一页只选一种标注**；「圈重点」优先 circle，「指位置」优先 arrow。

### 3.2 流程节点

```text
圆角矩形（圆角随风格 4/20/24）+ primary 描边 + 当前节点实心高亮。
节点 2–4 个；主标签 ≥36px、宽 ≥560px；label ≤24 字。
```

### 3.3 图标 / 装饰

```text
图标只作「少量点缀」（一页 ≤1 个），不喧宾夺主。
手绘斜线填充（hatch）可用于卡片底纹，opacity 要低。
```

## 4. 页型默认（5+1 类页）

| 页型 | 默认版式 | 默认动效 |
|---|---|---|
| **title** | 主标题 + 副标题居中 | reveal.typewriter（逐行）/ fade |
| **screenshot** | 真实截图 + 金色取景框 + 标注 | motion.zoom + annotationAnim.draw + emphasis.pulse |
| **video** | 视频片段（contain）+ 标题/字幕 | reveal.fade（motion 可选）|
| **flow** | 纵向节点 + 箭头连线 | reveal.stagger（节点依次弹入）|
| **bullet** | 要点列表（1–5 条）| reveal.stagger（逐条）|
| **quote** | 金句 + 右下 CTA | reveal.fade + texture.lightSweep |

## 5. 流程图画法（专门）

```text
1. 方向：纵向（从上到下），不横排（竖屏 1080×1920）。
2. 节点：2–4 个，宽 ≥560px，主标签 ≥36px，label ≤24 字，≤2 行。
3. 连线：节点之间箭头，从上到下；由编译器冻结 edges（sequential）。
4. 颜色：节点用 primary；当前讲到的节点用 primary 实心/加粗，其余用 line 描边。
5. 动效：reveal.stagger —— 讲一步，出现一步；连线跟随节点端点出现。
6. 循环/分支：当前只支持线性（sequential）；需要循环/分支先扩展契约，不要硬画。
7. 禁止：节点不穿字、不越界、不与正文重叠。
```

## 6. 意图覆盖（什么时候换动法）

```text
这页要「指位置」→ zoom + draw + pulse
这页要「看细节」→ motion:false + emphasis.magnifier
这页要「看全貌」→ motion.pan（横扫）
这页要「讲流程」→ reveal.stagger
这页要「讲要点」→ reveal.stagger
这页要「收尾」  → reveal.fade + lightSweep
```

## 7. 页内时序（每页动效时间轴）

```text
0–10%    transition（进页转场）
10–30%   reveal（元素/文字出现）
30–60%   motion（镜头动，如推近）
50–80%   annotation / emphasis（标注画出来、呼吸强调）
80–100%  静止留白（人读内容）
末帧     干净静帧
```

## 8. 禁止清单

```text
- 不循环、不抖动、不弹跳、不随机漂浮、不无限呼吸。
- 一页最多 2–3 个视觉特效；同组只一种（一个 motion、一种 reveal、一种 annotationAnim…）。
- 不动到安全区（中间 80%）外。
- 不遮挡字幕、CTA、AI 标识。
- 内部结构词不可见（背景/证据/第几页/01/02…）。
- 不为塞长文缩字号（正文 ≥24px、说明 ≥28px 是底线）。
```

## 9. 决策表（输入 → 输出）

```text
输入：页型 × 意图 × 节奏位置 × 风格
输出：slide.effects JSON（+ annotation / nodes / bullets）

示例：
  页型 screenshot + 意图「指位置」 + 节奏「推进」
  → effects { motion:{zoom}, annotationAnim:{draw}, emphasis:{pulse} }, annotation:"circle"
```

## 10. 落地方式

```text
1. AI 编导：本手册注入 composeCourseware 的 prompt（照着选）。
2. 软件编译：lib/courseware-compile.mjs 的默认 effects 对齐本手册（AI 没选时兜底）。
3. 人工：编辑器里可手动覆盖 effects。
4. 以后加效果/改规则：只改这一份，不改散落的逻辑。
```
