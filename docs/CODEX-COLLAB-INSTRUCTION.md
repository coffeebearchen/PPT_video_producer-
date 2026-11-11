# 给 Codex 的协作对齐指令（一次沟通）

> 请先读 D:\AI数字资产\studio\docs\COLLAB-PLAN.md，按分工和顺序执行。

## 1. 你的分工（只碰这些，别碰 DSH 的文件）

```text
你负责（Codex）：
  engines/vibemotion/renderer/src/**
  TARGET-SAMPLES/**

DSH 负责（别碰）：
  server.mjs / lib/ / public/ / docs/
```

两边文件不重叠，避免冲突。

## 2. 你现在要做哪一步

```text
阶段 2A · 固定页式四页原型（可与 DSH 的阶段 1 并行）

目标：
  把旧引擎的 4 页布局迁进 VibeMotion，
  只做「离线原型」，不碰数据库、不碰发布、不碰 4310。

输入：
  用一条已有的旧 spec（4 页）做样本
  参考 docs/CODEX-EVALUATION.md 第 3 节「旧 spec 字段级迁移」

产出：
  1. 一条 4 页原型（逐页预览 + 编辑后重渲 + 封面 + 音乐混流）
  2. 旧页 vs 新页 逐页对照
  3. 预检结果（安全区 / 字号 / 末页 CTA）
```

## 3. 回滚纪律（必须遵守）

```text
- 动工前：git tag v-2A-before
- 只新建文件 + 改 engines/vibemotion/renderer，不改已有共享入口
- 不改 server.mjs / lib / public / db
- 不推远程
```

## 4. 每次同步方式

```text
完成一个可验证里程碑，写进 docs/CODEX-PROGRESS.md：
  1. 改了什么文件
  2. 验证结果（渲染 + 抽帧路径）
  3. 遗留问题
  4. 是否需要 DSH 或用户决策

不要停着问“是否继续”，除非真的需要决策。
```

## 5. 验收标准（2A）

```text
- 旧稿逐页可比（文字、页序、强调保留）
- 字段改动能重渲，不丢编辑信息
- 封面 + 音乐混流可复看
- 中间 80% 安全区、正文 ≥24px、末页 CTA
```

---

# 一句话

```text
读 COLLAB-PLAN.md，你只做阶段 2A（固定页式四页原型），
只碰 engines/vibemotion/renderer，先 git tag v-2A-before，
每个里程碑写 docs/CODEX-PROGRESS.md。
```
