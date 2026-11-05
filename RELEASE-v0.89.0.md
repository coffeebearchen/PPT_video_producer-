# RELEASE v0.89.0 — 内容 Schema v2 冻结版

状态：**冻结**

## 核心

- 最新 spec：16 / 17 已迁移到 content_schema_version=2
- 1 条 approved 文案保留旧版，不覆盖
- structure_fields：causal / checklist / boundary / misconception
- 迁移生成新 spec 版本，旧版保留
- Highlight 不属于 P1 的自动修正
- P1 短行合并
- 背景标题按语义边界缩短
- P2 超长 Highlight 缩短
- 迁移后 16 条预览：0 layout issue
- 迁移 dry-run / pilot / 批量脚本均已落地

## 产物

```text
data/spec-audit.json
data/spec-migration-proposals.json
data/spec-migrate-all.json
data/migration-preview/layout-report.json
```

## 已知

- 旧视频不会自动变，仍需重新渲染
- 1 条 approved 旧 spec 未迁移
- 语义断行仍是首版，不是完整中文分词器
- 未接看图模型
