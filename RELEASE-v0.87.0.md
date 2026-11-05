# RELEASE v0.87.0 — 排版内核冻结版

冻结时间：2026-11-05（Asia/Shanghai）
状态：**冻结**

## 核心

- 内容模型：headline / emphasis / max_lines，旧 lines 自动回退
- 词组保护：Highlight、AI Agent、固定公网 IP、知识库、检索路径
- 自动缩字：P1 / P2 / P3 / P4 全槽位
- 单字成行：渲染时自动合并
- P2：上下 / 左右 / 对角，Editorial 固定上下
- P2 Highlight：.88em + max-width，安全区 0 warning
- 五主题对比度：全部通过
- Editorial Red：#C73520，正文对比度 4.71
- 转场：出页淡出时序修正；#stage 主题底色，取消左侧黑边

## 验证

```text
5 主题 × 4/5/6 页 = 15
layout issue = 0

对比度 5/5 通过

smoke 14/14
```

## 已知限制

- 页面原语仍是首版，未完全拆成独立模板
- 对比度是主题级检查，不是逐帧像素检查
- 转场只做关键帧抽检
- 未接看图模型

## 回退

```text
releases/v0.87.0/
releases/v0.87.0.zip
backups/v0.87.0/studio.db
```
