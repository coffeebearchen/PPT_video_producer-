# 排版回归报告 — 15 组

生成时间：2026-11-05

样本：

```text
5 主题 × 4/5/6 页 = 15
Archive / Terminal / Editorial / Noir / Earth
```

命令：

```bash
node renderer/render.mjs --spec data/regression/<theme>-<pages>.json --out data/media/reg-<theme>-<pages> --mode preview
```

结果：

```text
archive-4    0
archive-5    0
archive-6    0
earth-4      0
earth-5      0
earth-6      0
editorial-4  0
editorial-5  0
editorial-6  0
noir-4       0
noir-5       0
noir-6       0
terminal-4   0
terminal-5   0
terminal-6   0
```

```text
总布局问题：0
```

覆盖的修复：

```text
P1 词组保护
P1 单字成行合并
P1/P2/P3/P4 自动缩字
P2 左右/上下/对角安全区
P2 Highlight 宽度
P2 文字滑入误判
```

注意：

- 这是视觉布局检查，不是事实核查。
- 4/5/6 页来自同一内容底稿，主要验证排版约束。
- 未接看图模型。
