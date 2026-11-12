# 第一批手绘图解

已实现图元、12 图标，以及 A/B 类 18 种布局。样图为 1080×1920 独立 SVG；文字和图形均可缩放。样图正文使用有意义的案例，布局名称只出现在画廊导航中。

[打开样图画廊](../../graphics/handdrawn/samples/index.html)。共 20 张：18 种布局、一个甘特变体、一张 12 图标总览。每张图附一句用途说明。

## 使用

```tsx
import {Sequence} from 'remotion';
import {HanddrawnDiagram} from './HanddrawnDiagram';
import type {LayoutSpec} from './HanddrawnDiagram';

const spec: LayoutSpec = {
  kind: 'branch', id: 'decision',
  title: '先猜一条路，再验证', takeaway: '猜对保留，猜错丢弃',
  root: {label: '候选方案', role: 'current'},
  branches: [
    {label: '保留结果', condition: '验证通过', role: 'normal'},
    {label: '丢弃结果', condition: '验证失败', role: 'failure'},
  ],
};
// Sequence 为每页提供局部帧时钟；时长应覆盖该场景全部笔画。
<Sequence from={0} durationInFrames={450}>
  <HanddrawnDiagram spec={spec}/>
</Sequence>
```

自由定位使用 `Pen` + `PrimitiveCanvas`，坐标单位为设计像素。可组合框、椭圆、点、线、箭头、路径、多边形、斜线填充、括号、图标和文本。`Pen.elements` 中每个图元的 `startMs/durationMs` 可以按旁白调整。直接使用 `PrimitiveCanvas` 时传入 `timeMs` 可导出指定时刻的静态图。

```tsx
import {Pen, PrimitiveCanvas} from './HanddrawnDiagram';
const pen = new Pen('custom');
pen.box(240, 500, 600, 180, {label: '确认问题', role: 'current'});
pen.arrow({x:540,y:700}, {x:540,y:850}, 'normal');
pen.icon(520, 900, 'check', 'normal', 40);
const scene = {id:'custom', title:'确认后再执行', takeaway:'', elements:pen.elements};
<PrimitiveCanvas scene={scene} timeMs={3000}/>;
```

图标名称：`check/cross/warning/lock/trash/timer/person/money/gear/star/retry/bidirectional`。

## 布局输入

所有布局共享 `id/title/takeaway`，其余字段由 `kind` 判别联合类型限定，见 `graphics/handdrawn/layouts.ts`。完整案例见 `examples.ts`。

| kind | 输入 / 当前容量 |
|---|---|
| tree | nodes：2–12 节点，最多 4 层、每层 4 节点；parentId 定义关系 |
| branch | root + branches：2–3 个条件分支 |
| radial | center + satellites：3–6 个外围节点 |
| layers | layers：2–4 层，每层 1–3 项 |
| nested | containers：2–9 个容器，单根树，最多 4 层；可有兄弟容器，空间不足时明确报错 |
| brackets | groups：2–3 组，每组 1–3 项 |
| pyramid | levels：3–5 层 |
| funnel | stages：3–5 阶段，value 必须非负、逐级不增；宽度仅示意阶段，不代表数量比例，数值以文字为准 |
| rings | rings：2–4 个圈 + center |
| vertical / horizontal / causal | steps：纵向/因果 3–5 步、横向 3–4 步；可加 links 文案 |
| cycle | steps：3–6 步 + center 文案 |
| swimlane | lanes：2–3 条；tasks 含 lane/order；links 定义交接，order 为 0–3 |
| matrix | rows：2–5；columns：2–4；cells 显式给出位置、文案和语义色，未给出的单元为空 |
| beforeAfter | before/after：各 2–4 节点，edges 定义实际连接 |
| table | columns：2–4；rows：2–6；每行列数一致 |
| timeline | events：3–5 事件；或 tasks + lanes/min/max/unit 共享数值时间刻度的甘特变体 |

长文案应缩短或拆页。组件不将文字缩到 24px 以下；卡片说明默认 28px，正文 32px，标题 42px。默认内容限制在 x108–972 / y192–1728 安全区。自由定位场景由调用方负责边界与排布。

## 锚定参数与动画

- 背景 `#262725`；正文 `#F0EBD4`；黄 `#E7C85B` 当前；绿 `#A8C9B4` 正常；红 `#EF8581` 失败；粉 `#E39BB0` 对照；橙 `#DBA36D` 补充；灰 `#858C80` 轮廓。
- roughness `1.05`、描边 `3px`、位移滤镜 `2.5`；图标缩放保持 3px 描边，滤镜在外层应用。文本保持清晰黑体，不施加位移。
- 字体栈 Microsoft YaHei / PingFang SC / Noto Sans CJK SC / sans-serif。当前 Linux 没有前两款，样图实际使用 Noto Sans CJK SC 黑体回退；不使用楷体或手写字体。
- 固定种子由图元 id 派生；滤镜噪声种子固定为 7。运动仅由局部 frame/fps 推导，无 CSS keyframes、无实时随机数。
- 默认每笔 400ms，每 150ms 接入下一笔，最多同时 3 个图元处于入场。顺序写入后静止保持；完整时长取图元 `max(startMs + durationMs)`，再加阅读停留。
- 此库提供课件内可调用组件及独立 Remotion 画廊入口，未扩展服务端请求字段，也未自动替换现有课件页型。

## 重建与检查

从 `engines/vibemotion/renderer` 执行：

```sh
node src/courseware/handdrawn/export-samples.mjs
node src/courseware/handdrawn/verify.mjs
npx remotion studio src/courseware/handdrawn/gallery.tsx
npx remotion still src/courseware/handdrawn/gallery.tsx A03-radial radial.png --frame=90
```

导出脚本先检查新增组件的 TypeScript 依赖树，再编译到忽略目录 `node_modules/.cache/handdrawn-build`，使用实际 SVG 组件生成样图。验证包含同帧确定性、开始/中间/结束状态、并行动效上限、错误父子关系及无效数据拒绝。

## 后续批次

等待第一批视觉确认后，再实施 C 数据类 10 种、D 示意类 8 种、E 标注 6 种和导演手册。已记录新增 Venn 交集图、2×2 象限及可选手绘代码块/终端，归入后续批次。
