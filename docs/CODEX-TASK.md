# 给 Codex 的当前任务（DSH 更新）

> Codex：读本文件，做任务，结果写回 docs/CODEX-PROGRESS.md。

## 当前任务：阶段 2A · 固定页式四页原型

```text
目标：把旧引擎的 4 页布局迁进 VibeMotion，
      只做「离线原型」，不碰数据库/发布/4310。

边界：
  只改 engines/vibemotion/renderer/src/**
  和 TARGET-SAMPLES/**
  不改 server.mjs / lib / public

动工前：
  git tag v-2A-before

输入：
  用一条已有的旧 4 页 spec 做样本
  参考 docs/CODEX-EVALUATION.md 第 3 节「旧 spec 字段级迁移」

产出：
  1. 一条 4 页原型：逐页预览 + 字段编辑后重渲 + 封面 + 音乐混流
  2. 旧页 vs 新页 逐页对照（抽帧）
  3. 预检结果：中间 80%、正文≥24px、末页右下角 CTA
```

## 验收标准

```text
- 旧稿逐页可比：文字、页序、封面强调、对照/收束 保留
- 字段改动能重渲，不丢编辑信息
- 封面 + 音乐混流可复看
- 中间 80% 安全区、正文≥24px、末页 CTA、无内部结构词
```

## 完成后

```text
1. 写 docs/CODEX-PROGRESS.md
2. 给出样片 + 抽帧路径
3. 不要停着问“是否继续”
```
