# RELEASE v1.0.0 — 独立可用内容生产系统

状态：**冻结**

## P0 已完成

- v2 全量重渲：16 / 16 done
- 全部 quality pass
- ZIP：data/batch-output/batch_03b0131a.zip（88.98 MB, HTTP 200）
- app_version / content_schema_version 标识
- 多批次真队列
- 可点开预览
- 新旧版本对比
- 一键启动 scripts/start.mjs
- 备份 / 恢复 scripts/backup.mjs, restore.mjs
- approved 旧文案保留，不覆盖

## P1 核心

- 8 页面原语登记：lib/primitives.mjs
- 中文语义断行：Intl.Segmenter
- P1 规则：10 字完整行，Highlight 8 字
- 转场逐帧检查：scripts/transition-check.py
- 预览 / 审批 / 退回 / 修改闭环
- 40 个语义元素 / 136 总元素
- 使用文档：docs/V1-USER-GUIDE.md

## 验证

`	ext
16 条 v2 全量视频：done
quality：16/16 pass
ZIP：HTTP 200
15/15 主题页数布局回归：0
16/16 v2 预览：0
5/5 主题对比度：通过
smoke：14/14
`

## 已知

- 视频号无直接发布 API，仍为发布包
- 页面原语是共享层 + registry，不是 8 个独立文件
- 未接看图模型
