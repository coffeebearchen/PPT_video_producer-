# RELEASE v0.7.5 — 结构优先工作台冻结版

冻结时间：2026-11-04（Asia/Shanghai）
状态：**冻结，不再直接修改**
用途：作为“模板库 / 主题系统 / 3–6 页渲染”改造前的回退点。

## 1. 这一版的核心变化

- 左侧新增「创作台」；
- 结构库：类型、映射、边界、适用场景、签名、使用次数；
- 新建内容先做「方向体检」和「结构诊断」；
- 结构可存入结构库，选中后写入 Brief 快照；
- Brief 顶部和右栏锁定当前结构；
- 角度生成带结构约束；
- 金句候选：AI 给 3 句，人选择；
- P3 从“音乐页”迁移为「结论页」；
- BGM 全程铺底，不再单独占一页；
- 预览帧 356×634 低清；
- 预览阶段排版体检 + Highlight / 长英文自动 fit；
- 渲染可「停止」，服务重启会重置卡住状态；
- 页面结构选择器：3 / 4 / 5 / 6（默认 4）；
- Brief 保存 `page_count` / `page_plan`。

## 2. 这一版还没有完成

```text
4 / 5 / 6 页真实渲染
context / evidence / objection 版式
主题预览（Archive / Terminal / Editorial）
模板预设库
元素库 / 受约束画布
```

**重要：** 页面结构选择器已经保存到 Brief，但渲染器仍然是旧的三页 + 可选金句。  
选 4/5/6 不会立刻多出真实页面，下一版才接渲染器。

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
RELEASE-v0.7.5.md
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
renderer/template-quote-test.html
scripts/render-quote-test.mjs
```

## 4. 冻结文件位置

```text
快照目录：releases/v0.7.5/
压缩包：releases/v0.7.5.zip
数据库备份：backups/v0.7.5/studio.db
音乐库备份：backups/v0.7.5/music-library.json
校验清单：releases/v0.7.5/MANIFEST.sha256
```

## 5. 如何回退

```powershell
cd D:\AI数字资产\studio\releases\v0.7.5
npm install
New-Item -ItemType Directory -Force data
Copy-Item ..\..\backups\v0.7.5\studio.db data\studio.db
npm start
```

## 6. 验证

```powershell
npm run smoke:v0.7.5
```

## 7. 下一阶段

```text
1. UI 结构重设计确认
2. 4 页参考实现（hook / context / contrast / quote）
3. 5/6 页 + evidence / objection
4. 三个主题低清预览
5. 模板预设库
6. 元素库 / 动效 / 转场选择
```

## 8. 冻结口令

```text
v0.7.5-frozen-2026-11-04
```
