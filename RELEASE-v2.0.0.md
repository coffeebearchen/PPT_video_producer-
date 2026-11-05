# RELEASE v2.0.0 — PageFrame v2 + 10 条视频

状态：**冻结**

SHA256: $sha
Files: $entries

## 核心

- renderer/v2/template.html：统一 PageFrame
- renderer/v2/render.mjs：独立 v2 渲染器
- server 按 spec.renderer='v2' 路由
- 80% 安全区，正文 >= 24px
- B1 / B2 / B3 系列色
- 慢速背景，主句切入，高亮刷色，X/✓ 出现
- 最后一页“有问题，评论区问”
- 10 条视频，不做 36 条

## 产物

- data/v2-samples/ten.zip
- data/v2-samples/ten-board.jpg
- spec_v2_01..10

## 保留

- 旧模板：renderer/legacy
- 旧 36 条数据保留
- 回滚：releases/v1.2.1-pre-rebuild.zip
