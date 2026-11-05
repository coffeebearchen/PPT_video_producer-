# 全链路测试报告 — v0.85.1

测试时间：2026-11-04（Asia/Shanghai）
测试范围：结构 → 文案 → 元素 → 3–6 页 → 主题 → 预览 → 全片 → 审批 → 发布包

## 1. 自动化检查

```text
npm run smoke:v0.85.1
14/14 checks passed
```

## 2. 页面加载

| 页面 | 结果 |
|---|---|
| `#/create` | 通过，4 个页数选项、3 个主题选项 |
| `#/templates` | 通过，3 个主题、6 个预设 |
| `#/elements` | 通过，13 个元素 |
| `#/brief/brief_3ddad1c8` | 通过，Brief + 6 页文案 |
| `#/review/render_bc99f270` | 通过，视频、预检、审批清单 |
| `#/publish` | 通过，已通过内容出现在发布队列 |

## 3. 元素自动分配

对 3/4/5/6 页各跑 40 轮随机：

```text
每个视频至少 1 个元素
每页最多 3 个元素
3 页以上至少 1 页 0 元素
至少 1 页 3 个元素
三元素速度至少三档不同
所有速度 <= 0.50
颜色均为灰阶
```

结果：

```text
ELEMENT DISTRIBUTION OK
```

## 4. 全片

```text
1080×1920
30fps
H.264 + AAC
28.0 秒
6.26 MB
layout_issues: []
```

## 5. 审批与发布包

```text
审批：approved
发布包：data/publish-kits/render_bc99f270-wechat_channels/
video.mp4
cover.png
metadata.json
README.txt
```

## 6. 已知视觉警告

功能链路通过，但机器预检仍有 warn：

```text
P1「址」字单独成行 / 橙色线贴近
P2 右侧安全区
转场时旧页残留
P3 反例页底部切字
P5 高亮块重叠
```

这些不阻断渲染和审批，属于下一阶段视觉清理。

## 7. 结论

```text
功能链路：全部走通
元素自动分配：不遗漏视频
全片、审批、发布包：通过
视觉：仍有 warn，需要修版式细节
```
