# RELEASE v0.90.0 — Schema v2 + 语义断行

状态：**冻结**

## 核心

- 16 条最新 spec 迁移到 content_schema_version=2
- 1 条 approved 旧 spec 保留
- Intl.Segmenter 中文分词保护
- P1 / P2 / P3 / P4 词组保护与自动缩字
- 16/16 迁移后预览：0 layout issue
- 15/15 主题页数回归：0 layout issue

## 证据

```text
data/spec-audit.json
data/spec-migration-proposals.json
data/spec-migrate-all.json
data/migration-preview/layout-report.json
smoke 14/14
```

## 已知

- 旧视频仍需重新渲染
- 1 条 approved 旧 spec 未迁移
- 语义断行是首版，不是完整中文排版引擎
- 未接看图模型
