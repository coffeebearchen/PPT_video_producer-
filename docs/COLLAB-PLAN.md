# DSH × Codex 协作计划（含逐步回滚）

> 目标：按已对齐的执行顺序，DSH 与 Codex 分工并行，每步可回滚。
> 铁律：每步动工前 git tag + DB 快照；不真实发送（dry-run）；一次只改一个变量；不推远程。

## 0. 回滚机制（每步通用）

```text
动工前：
  git tag v-<阶段>-before
  复制 data/studio.db → backups/<阶段>-before/studio.db

验收通过：
  git tag v-<阶段>-done

出问题回滚：
  git reset --hard v-<阶段>-before
  恢复 backups/<阶段>-before/studio.db
```

## 1. 分工（文件不重叠，避免冲突）

```text
DSH 负责：
  server.mjs / lib/db.mjs / lib/wechat.mjs / lib/tts.mjs
  public/app.js / public/index.html / public/styles.css
  （发布边界、任务一致性、统一接入、渠道、工作台）

Codex 负责：
  engines/vibemotion/renderer/src/**
  TARGET-SAMPLES/**
  （固定页式原型、自动样片编排、渲染组件）
```

两边不碰同一个文件。

## 2. 阶段与顺序

| 阶段 | 谁 | 内容 | 回滚点 | 通过条件 |
|---|---|---|---|---|
| 0 基线+契约 | DSH 主导，Codex 对齐 | 隔离恢复一条代表作品；定内容/尝试/产物/审批/回执接口；修 channel 越界 + 生产入口混入演示数据 | v-0-before | 隔离恢复成功；接口约定文档化 |
| 1A 发布边界 | DSH | 草稿≠已发布、账号必选、回执幂等、默认 dry-run、历史回执不被动改 | v-1A-before | 两账号 dry-run 无真实写入；重复点击不重复建 |
| 1B 任务一致性 | DSH | 改稿失效旧配音/审批/发布；取消真停；重试/重启状态机；attempt 回写 | v-1B-before | 改稿不复用旧语音；取消不回 done；重启可恢复 |
| 2A 固定页式四页原型 | Codex（与 1A/1B 并行） | 旧 4 页 → VibeMotion，逐页预览/编辑/封面/音乐，离线样本 | v-2A-before | 旧稿逐页可比，字段改动能重渲 |
| 2B 平台讲解式样片 | Codex 编排+渲染，DSH 对接 | 空稿→45–60s，8–12 非等长场景，句级字幕，5–7 图解，双封面 | v-2B-before | 平台新建一条接近样片A，可改可重渲 |
| 3 统一接入+兼容 | 双方 | 两模式同一工作项；成片库/审批/发布覆盖两引擎；15 组版式回归；文章配图 | v-3-before | 两模式都能走手动包/模拟草稿 |
| 4 切新建默认 | DSH，用户确认 | 小范围试用后切默认；历史成片可读；可路由回退 | v-4-before | 切回路由验证通过 |
| 5 退役旧执行器 | 双方，用户确认 | 清点旧依赖；恢复演练；归档先 dry-run | v-5-before | 恢复成功；清理可审阅 |

## 3. 沟通方式（每次同步）

```text
Codex 完成一个阶段：
  1. 写入 docs/CODEX-PROGRESS.md（改了啥、验证结果、遗留）
  2. 抽帧/产物路径贴出
  3. 不停在“是否继续”，除非需要用户决策

DSH 读 CODEX-PROGRESS.md 后对接。
```

## 4. 如果明天只能做三件

```text
1A 发布边界 → 1B 任务一致性 → 2B 平台自动样片闭环
（2A 四页原型可与 1A/1B 并行）
```
