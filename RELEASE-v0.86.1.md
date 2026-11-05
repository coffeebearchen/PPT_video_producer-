# RELEASE v0.86.1 — 安全区 / 转场补丁

冻结时间：2026-11-05（Asia/Shanghai）
状态：**冻结**

## 本轮

- P2 结论高亮缩小到 52px，预览 layout_issues = 0
- 对比页结论上移
- 出页淡出从 10% 提到完整淡出，减少转场旧页残留
- 结构专属页：因果 / 清单 / 边界 / 误区
- 批量新建 + 批量渲染 + ZIP 保持可用
- 内容相关性闸门保持

## 实测

```text
spec_b6461777 preview
layout_issues: 0

batch_ed14bd02
2 条 done
ZIP HTTP 200
smoke 14/14
```

## 已知非阻断

- 清单/边界/误区仍由 note 拆分
- 批量审批/取消/断点续跑未做
- 视频号仍为发布包，不是直接 API 发布
