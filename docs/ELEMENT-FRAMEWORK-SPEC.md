# 元素框架与模板系统 · 正式指令 v1

## 目标

把 VibeMotion 的渲染能力变成平台里**可枚举、可开关、可组合、可预览**的元素框架。

平台工作方式：

```text
用户选题材 + 结构 + 文案 + 语音
        ↓
导演（规则 + LLM）根据语义调取元素
        ↓
TimelineDSL（8–12 场景，含字幕/音效/镜头/封面）
        ↓
渲染成片 + 封面
```

不允许：

```text
一屏只有标题 + 一行字
系统字体
所有场景等长、硬切
没有封面
没有音效
没有装饰层
```

---

## 一、元素框架（地基）

所有元素必须登记进元素目录，字段固定：

```json
{
  "elementId": "flowchart",
  "type": "structure",
  "componentName": "FlowChart",
  "label": "动态流程",
  "propsSchema": {
    "title": "string",
    "nodes": "FlowNode[]",
    "activeStep": "number",
    "stepCaption": "string"
  },
  "density": {
    "simple": {"decor": false, "particles": false, "annotations": false},
    "standard": {"decor": true, "particles": false, "annotations": true},
    "rich": {"decor": true, "particles": true, "annotations": true}
  },
  "preview": "gallery/flowchart.png"
}
```

### 元素分类

```text
structure   流程 / 循环 / 分支 / 树 / 层叠 / 矩阵 / 金字塔 / 中心辐射
data        折线 / 阶梯 / 柱状 / 条形 / 面积 / 饼 / 环 / 数字滚动 / 进度条 / 对比条 / 甘特
narrative   时间轴 / 阶段演进 / 误区划线 / 二元对比 / 三支柱 / 金句排版
media       手绘 SVG / Lottie / 截图聚光 / 外链图片
annotation  手绘圈 / 下划线 / 荧光笔 / 聚光灯 / 箭头 / 编号气泡
texture     底纹 / 手绘框 / 斜纹 / 粉笔颗粒 / 粒子 / 扫光 / 暗角
layout      Kicker / SectionHeader / 副标题 / 页码 / 章节条
```

### 每个元素必须有

```text
elementId        稳定 ID
componentName    对应 React 组件
propsSchema      参数说明
density          简洁 / 标准 / 丰富
preview          静态预览图
```

---

## 二、模板系统

模板 = 可换字、换色、换字体、换元素组合的骨架。

```json
{
  "templateId": "chalk-explain-v1",
  "name": "粉笔讲解·标准",
  "palette": "cream-paper",
  "fonts": {"heading": "ZCOOL KuaiLe", "body": "LXGW WenKai"},
  "density": "rich",
  "elements": {
    "showDecor": true,
    "showParticles": true,
    "showChalkGrain": true,
    "showKicker": true,
    "annotations": true,
    "doodles": true
  },
  "scenes": [],
  "cover": {"title": "", "kicker": "", "heroElement": "FlowChart"}
}
```

### 必须做到

```text
字体可切：霞鹜文楷 / 站酷快乐体
标题与正文分别调，不是全局替换
配色可切：粉笔深底 / 米白纸底 / 冷灰
封面与正片自动同步
元素可开关 + 密度可调
```

### 先给 3 个预设模板

```text
讲解型：FlowChart / Pipeline / SpotlightPillars 为主
数据型：Chart / Counter / Gantt / Dashboard 为主
故事型：EvolutionTimeline / Comparison / MythBuster / KineticTypography 为主
```

---

## 三、导演：按语言与文案调取元素

输入：

```text
structure_type：causal / contrast / misconception / checklist / timeline / boundary / analogy
script：分句后的文案
voice timestamps：语音时间点
```

输出：

```text
TimelineDSL
```

调取规则：

```text
因果 / 步骤    → FlowChart → PipelineArchitecture → 结论金句
对照 / 类比    → ComparisonSplitCard → KineticTypography
误区修正       → MythBusterStrike → 结论金句
清单           → FlowChart / SpotlightPillars
时间演进       → EvolutionTimeline
边界           → SpotlightPillars → ComparisonSplitCard
```

每个场景必须：

```text
主视觉元素 1 个
标注元素 ≥ 1 个
装饰层（视密度）
字幕 1 条
音效触发 ≥ 1 个
镜头变化（cameraKeyframe）
```

---

## 四、成片标准

```text
时长 45–60 秒
场景 8–12 个
场景时长 5–10 秒，不相等
每屏视觉元素 ≥ 8 个
每 2–4 秒一次视觉变化
至少 7 种元素类型
字幕烧进画面，关键词高亮
音效对齐动作点
```

---

## 五、封面

```text
1080×1920 竖版
1080×1440 3:4
主标题 ≥72px
小标签
主视觉元素
底纹 + 颗粒
与正片同字体同配色同线条
输出 cover.png / cover_3x4.png
```

---

## 六、元素画廊

```text
每个元素一张静态预览 PNG
编号索引
我按图选元素，不靠文字描述
```

---

## 七、禁止

```text
禁止 AI 生图替代代码画元素
禁止系统字体
禁止一屏只有标题 + 一行字
禁止所有场景等长硬切
禁止省略封面
禁止在没抽帧图之前说“做好了”
```

---

## 八、验收

```text
阶段 0：环境跑通 + 10 秒测试片 + 元素画廊第一版
阶段 1：元素框架 + 标注元素搬入 + 徽标可开关
阶段 2：模板系统 + 3 配色 + 2 字体搭配 + 3 预设模板
阶段 3：45–60 秒完整片 + 封面 + 抽帧图
阶段 4：素材扩充 + 许可表 + 搭配建议
```

每阶段先给抽帧图，再往下。
