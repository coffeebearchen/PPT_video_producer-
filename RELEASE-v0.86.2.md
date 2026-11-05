# RELEASE v0.86.2 — 结构字段 / 转场最终补丁

冻结时间：2026-11-05（Asia/Shanghai）
状态：**冻结**

## 本轮

- 出页完整淡出，减少转场旧页残留
- structure_fields 写入 spec（因果 / 清单 / 边界 / 误区）
- 结构页优先读取 structure_fields，旧文案自动回退 note 拆分
- P2 安全区 0 warning
- 全片 6 页渲染通过

## 验证

```text
spec_b6461777 preview
layout_issues: 0

spec_b6461777 full
status: rendered
duration: 28
size: 4.36 MB

smoke 14/14
```
