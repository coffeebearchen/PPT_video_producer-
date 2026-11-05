# RELEASE v0.85 — 元素生态与克制运动冻结版

冻结时间：2026-11-04（Asia/Shanghai）
状态：**冻结，不再直接修改**
用途：作为“元素生态随机运动 + 文字入场 + 居中版式”的稳定回退点。

## 1. 核心变化

- 每页 1–3 个元素，最多 3 个；
- 至少一页出现 3 个元素；
- 3 个元素时速度强制分档：慢 / 中 / 快；
- 所有运动速度上限降到旧版的约 60%；
- 元素颜色改为灰阶 / 米灰 / 深灰为主；
- 元素透明度降到 0.16–0.32，作为背景；
- 元素走全屏随机轨迹，可出画再回来；
- 主文字随机从左侧 / 右侧 / 顶部切入；
- 小标签随机淡入 / 侧滑 / 顶滑；
- 主文字落定后有 2–3px 的轻微漂移；
- 随机选择一页进入「居中版式」；
- 元素入场有 whoosh 音效，每页一次；
- 3–6 页全片渲染通过。

## 2. 运动模型

```text
元素：1–3 个 / 页
速度：慢 .30 / 中 .52 / 快 .82
轨迹：drop rise slide sway orbit pulse flip draw rotate
颜色：主题灰阶
透明度：0.16–0.32
文字：主标题 1 秒切入 + 落定后轻微漂移
```

## 3. 已知限制

- P2 的 `动态公网 IP` 在部分终端主题下会触发右安全区 warning；
- 元素随机可能在某些瞬间出画；
- 居中版式的 meta 布局刚修，冻结视频可能未重渲；
- 元素数量是随机 1–3，不是每页固定 3。

## 4. 冻结范围

纳入快照：

```text
server.mjs
package.json
public/
lib/
renderer/
scripts/
docs/
seed-assets/
README.md
start.cmd
.env.example
.gitignore
RELEASE-v0.85.md
```

不纳入：

```text
.env
data/
node_modules/
out/
releases/
backups/
new-brief/
renderer/template-quote-test.html
scripts/render-quote-test.mjs
```

## 5. 冻结位置

```text
快照：releases/v0.85/
压缩包：releases/v0.85.zip
数据库：backups/v0.85/studio.db
校验：releases/v0.85/MANIFEST.sha256
```

## 6. 验证

```powershell
npm run smoke:v0.85
```

## 7. 下一阶段

```text
1. 修 P2 右侧安全区 warning
2. 元素速度/数量按阅读节奏自适应
3. 文字入场只保留主标题与小标签
4. 元素灰阶在三个主题下统一
5. 5/6 页 App 内真实内容验收
```

## 8. 冻结口令

```text
v0.85-frozen-2026-11-04
```
