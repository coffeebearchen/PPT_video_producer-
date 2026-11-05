# RELEASE v0.6.0 — 结构优先改造前的冻结基线

冻结时间：2026-11-03（Asia/Shanghai）
状态：**冻结，不再直接修改**
用途：作为“结构优先 / VideoSpec”改造前的回退点。

## 1. 相比 v0.5.0 增加了什么

- 视频抽帧预检：9 帧、技术检查、qwen3-vl-plus 视觉警告；
- 审批页「机器预检」卡片与重新预检；
- 独立「音乐库」内容资产页：分类、标签、BPM、试听、上传、编辑、删除；
- AI 选曲建议：1 个建议 + 最多 2 个备选，人工确认后可写入选题 BGM；
- B 金句结尾页：可选第 4 页，总时长 18 / 21 秒；
- 金句页垂直居中、隐藏 HUD、印章下移；
- 发布页队列布局修正；
- 设置页音乐入口收敛到独立音乐库；
- 静态资源 no-store，避免浏览器缓存旧 UI。

## 2. 这一版仍然是什么

```text
固定 3 页 + 可选金句页
```

当前视频结构：

```text
p1 邮局钩子
p2 NAS vs 云服务器
p3 音乐页（仍在）
p4 可选 B 金句页
```

还没有：

- VideoSpec v1 多页引擎；
- 3–6 页可变结构；
- context / evidence 独立版式；
- 结构库 / 结构诊断；
- AI 自动页数规划；
- 动态备选；
- 效果数据报表。

## 3. 冻结范围

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
RELEASE-v0.6.0.md
```

不纳入快照：

```text
.env
data/
node_modules/
out/
releases/
backups/
new-brief/
renderer/template-quote-test.html   # 独立测试模板，不进入正式快照
scripts/render-quote-test.mjs       # 独立测试脚本
```

## 4. 冻结文件位置

```text
快照目录：releases/v0.6.0/
压缩包：releases/v0.6.0.zip
数据库备份：backups/v0.6.0/studio.db
音乐库备份：backups/v0.6.0/music-library.json
校验清单：releases/v0.6.0/MANIFEST.sha256
```

## 5. 如何回退

```powershell
cd D:\AI数字资产\studio\releases\v0.6.0
npm install
New-Item -ItemType Directory -Force data
Copy-Item ..\..\backups\v0.6.0\studio.db data\studio.db
npm start
```

不要用快照直接覆盖当前 `data`，除非确认要回到 v0.6.0 的数据状态。

## 6. 验证

```powershell
npm run smoke:v0.6
```

标准：

```text
14/14 checks passed
```

## 7. 下一阶段

结构优先改造：

1. 类比库升级为结构库；
2. 结构诊断进入新建选题；
3. VideoSpec v1；
4. hook / context / contrast / evidence / quote 五个版式；
5. 3–6 页通用渲染器；
6. 结构使用记录与效果反馈。

## 8. 冻结口令

```text
v0.6.0-frozen-2026-11-03
```
