# RELEASE v0.86.0 — 批量生产 / 结构页冻结版

冻结时间：2026-11-05（Asia/Shanghai）
状态：**冻结**

## 核心

- 批量新建：选题 → AI 角度 → 文案 → 金句 → 检查 → 队列 → ZIP
- 批量渲染：选择已有文案，串行队列，独立目录，ZIP
- 内容相关性闸门：低重合度拦截；批量生成会重写一次
- 结构专属页首版：因果链 / 清单 / 边界 / 误区；对照由 P2 承担
- 模板清理：微信邮局、退回、信封、邮票、邮戳、邮寄路线
- 高亮对比：深色字 + 荧光底
- P2 黑底黑字修复
- 结构视觉分支：structure-contrast/causal/misconception/boundary/checklist
- 批量失败重试：只重跑 failed 项

## 批量目录

```text
data/batch-output/<批次ID>/
  *.mp4
  *.jpg
  batch_<批次ID>.zip
```

## 实测

```text
batch_7d0950b0  1 条  done  ZIP 200
batch_285132af  2 条  done  ZIP 10.28 MB 200
batch_ed14bd02  2 条  done  ZIP 10.08 MB 200
smoke 14/14
```

## 已知限制

- 清单 / 边界 / 误区仍是 note 拆分，不是独立可编辑字段
- P2 右侧安全区仍有 warning
- 标题仍可能单字换行
- 转场旧页残留未彻底清理
- 批量生成偏题只重写一次，仍失败需人工改写
- 批量没有取消 / 删除 / 断点续跑
- 视频号仍为发布包，不是直接 API 发布

## 回退

```text
releases/v0.86.0/
releases/v0.86.0.zip
backups/v0.86.0/studio.db
```
