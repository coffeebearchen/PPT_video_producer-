# 协作规则（DSH × Codex 共同遵守）

## 一、角色

```text
DSH（我）= 总经理 / 架构师 / 中台开发者
  - 写总计划、阶段计划、给 Codex 的任务
  - 改中台：server.mjs / lib / public
  - 维护状态板、更新进度、向用户提「决策点」

Codex = 渲染工程师
  - 读我给的任务文件，做渲染/组件/编排
  - 只改 engines/vibemotion/renderer/src 和 TARGET-SAMPLES
  - 把结果写回进度文件

用户 = 决策者
  - 只做大方向决策和最终验收
  - 不搬运信息
```

## 二、共同文件（各自读写，单点真相）

```text
docs/COLLAB-RULES.md      协作规则（本文件，基本不变）
docs/COLLAB-BOARD.md      状态板（DSH 维护，双方都读）
docs/CODEX-TASK.md        当前给 Codex 的任务（DSH 写，Codex 读）
docs/CODEX-PROGRESS.md    Codex 的进度汇报（Codex 写，DSH 读）
```

## 三、协作循环（不经过用户搬运）

```text
1. DSH 把「下一件给 Codex 的活」写进 docs/CODEX-TASK.md
2. Codex 读 docs/CODEX-TASK.md → 干活
3. Codex 把结果写进 docs/CODEX-PROGRESS.md
4. DSH 读 docs/CODEX-PROGRESS.md → 更新 docs/COLLAB-BOARD.md
5. DSH 如有下一步，更新 docs/CODEX-TASK.md
6. 只有「需要用户决策」时才写给用户
```

## 四、文件边界（避免冲突）

```text
DSH 只改：server.mjs / lib/ / public/ / docs/（规则、状态板、任务）
Codex 只改：engines/vibemotion/renderer/src/** / TARGET-SAMPLES/** / docs/CODEX-PROGRESS.md
```

## 五、回滚

```text
每个阶段动工前：git tag v-阶段-before + DB 快照
出问题：git reset --hard v-阶段-before + 恢复 DB
```

## 六、同步格式

```text
进度文件 docs/CODEX-PROGRESS.md 每次更新包含：
  1. 改了什么文件
  2. 验证结果（渲染/抽帧路径）
  3. 遗留问题
  4. 是否需要 DSH 或用户决策
```

## 七、心跳与握手（防沉睡，关键）

```text
问题：两个 agent 通过共享盘协作，没有推送，
      必须靠“轮询 + 标记已读 + 心跳”。

协议：
1. 每个可写文件头部带「版本号 + 时间戳」，例如：
   ---
   VERSION: 3
   UPDATED: 2026-11-11T09:40:00
   ---

2. 谁写完，就把版本号 +1。

3. 谁读完并处理完，就在自己的 ACK 文件里写一行：
   [时间] 已读 CODEX-PROGRESS V3 → 已处理 → 更新了 CODEX-TASK V4

4. 心跳：DSH 每 15 分钟轮询一次；Codex 每次启动先读板再干活，
   干完写进度+ACK，不等待、不停顿。
```

### 双方固定文件

```text
docs/COLLAB-BOARD.md     状态板（DSH 写，双方读）
docs/CODEX-TASK.md       给 Codex 的任务（DSH 写，Codex 读）
docs/CODEX-PROGRESS.md   Codex 进度（Codex 写，DSH 读）
docs/HANDSHAKE.md        握手记录（双方各写自己的 ACK 行）
```

### 轮询节奏

```text
DSH：  每 15 分钟检查一次 CODEX-PROGRESS 和 HANDSHAKE
Codex：每次启动先读 COLLAB-BOARD + CODEX-TASK，再干活
```

### 防沉睡规则

```text
- 谁都不能“读完不动”；
- 读到了新版本必须处理，处理完必须写 ACK；
- 没有新任务也要写心跳（时间 + 状态），证明还活着。
```
