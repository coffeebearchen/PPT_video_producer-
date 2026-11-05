# RELEASE v1.1.0 — 封面系统 + 全页残句检查

状态：**冻结**

## 核心

- 所有 16 条 v2 文案新增 page1.cover.lead / page1.cover.punch
- content_schema_version = 3
- 封面统一两段式：lead 小字 + 空行 + punch 大字高亮
- 动态顺序：punch 文字切入 → 停 1 秒 → 高亮刷色 → 停 0.5 秒
- 静态封面取第 90 帧（3.0s）
- 全局 fragment-check：封面/P1/P2/P3/P4/标题
- 16 条全量重渲：16/16 done，16/16 quality pass
- ZIP：data/batch-output/batch_a6a32f6f.zip（81.8 MB）

## 验证

`	ext
v3 spec：16/16 check OK
fragment：16/16 0
cover：16/16
batch：16/16 pass
smoke：14/14
`

## 已知

- approved 旧文案 spec_e6d210ef 保持旧版
- 封面 lead/punch 由文本模型生成，已逐条跑长度/重复/残句校验
- 未接看图模型
