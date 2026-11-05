# Motion Model v1

目标：把“旧版视觉”的运动和元素做成可调用模块，不改变现有画面。

## 层

```text
Page transition  页面切换
Text entrance    标题/正文进入
Highlight        高亮刷色
Mark draw        X / ✓
Elements         矢量元素持续运动
Background       纸张/网格/圆环
```

## 已有模块

```text
lib/motion.mjs        文字与页面运动的预设
lib/elements.mjs      旧版 SVG 元素库与选择逻辑
lib/motion-model.mjs  统一速度、目录、默认值
renderer/render.mjs   消费这些配置
```

## 速度

`spec.motion.elementSpeed` 是矢量元素速度倍率。

```json
{
  "motion": {
    "preset": "flow",
    "elementSpeed": 0.5
  }
}
```

```text
1.0 = 旧版原速
0.5 = 当前 H 样片速度
```

只影响 `elements` 的 p 值，不影响文字进入、页面切换、高亮、X / ✓。

## 元素目录

```text
drop    下落
rise    上浮
slide   横移
sway    漂移
orbit   环绕
pulse   呼吸
flip    翻转
draw    描画
rotate  旋转
```

Dashboard 可以按 `id` 选择，不需要改 renderer。

## 未来可调参数

```text
elementSpeed
elementOpacityMax
textEnterDuration
highlightDuration
markDrawDuration
pageTransitionDuration
palette
fontDisplay
fontBody
```

## 原则

```text
不改布局
不改字段顺序
不改颜色时只换 token
不改运动时只换 catalog id 或 duration
```
