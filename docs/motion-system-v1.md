# 固定地址 · 运动系统 v1

> 目标：让视频“像视频”，不是会动的 PPT。  
> 原则：运动由 **数据（Spec）** 驱动，不由每条视频手写代码。

## 1. 总体结构

```text
Brief / 角度
  ↓
Spec.motion（运动指令）
  ↓
lib/motion.mjs（运动库 + 预设 + 校验）
  ↓
renderer/template.html（window.MOTION + applyMotion）
  ↓
540 帧 → ffmpeg → MP4
```

一份 Spec 里同时有：

```json
{
  "music": "pulse",
  "motion": {
    "preset": "flow",
    "transition": { "mode": "slide", "duration": 0.9 },
    "elements": {
      "p1-kicker": { "type": "slideY", "fromY": 30, "toY": 0, "start": -0.8, "duration": 0.6, "fade": true }
    }
  }
}
```

以后换内容，只换 Spec，不重写渲染代码。

## 2. 运动指令标准

每个元素一条运动指令：

```json
{
  "type": "slideX | slideY | rotateIn | scaleIn | float | none",
  "start": 0.8,
  "duration": 2.35,
  "ease": "outCubic | inOut | outBack | linear",
  "fade": true,

  "fromX": -300,
  "toX": 0,
  "fromY": 32,
  "toY": 0,
  "fromRot": -7,
  "toRot": 0,
  "fromScale": 0.9,
  "toScale": 1,
  "x": 12,
  "y": 8,
  "rot": 2,
  "speed": 1.2,
  "phase": 0
}
```

字段说明：

| 字段 | 作用 |
|---|---|
| `type` | 运动类型 |
| `start` | 开始秒数，可为负（入场前准备） |
| `duration` | 持续秒数 |
| `ease` | 缓动 |
| `fade` | 是否同时淡入 |
| `fromX/toX` | 水平位移 |
| `fromY/toY` | 垂直位移 |
| `fromRot/toRot` | 旋转角度 |
| `fromScale/toScale` | 缩放 |
| `x/y/rot/speed/phase` | `float` 漂浮参数 |

约束：

- 文字类元素位移不超过 80px，避免“飞进来”；
- 卡片类不超过 180px；
- 主标题入场 0.4–0.9 秒，不要拖到 2 秒；
- 同一屏最多 4 个元素同时运动；
- 转场必须短于 1 秒，否则节奏断。

## 3. 当前模板元素注册表

这些 ID 已经能被 `spec.motion.elements` 覆盖：

| ID | 元素 | 默认运动 |
|---|---|---|
| `p1-env` | 信封 | `slideX` 左→右 |
| `p1-mail` | 邮路整行 | `slideY` 上浮 |
| `p1-meta` | 页眉 | `slideY` |
| `p1-kicker` | 眉题 | `slideY` |
| `p1-ip` | 固定公网 IP | `scaleIn` |
| `p1-foot` | 页脚 | `slideY` |
| `p2-meta` | 页眉 | `slideY` |
| `p2-kicker` | 眉题 | `slideY` |
| `p2-nas` | NAS 块 | 左→右切入 |
| `p2-cloud` | 云服务器块 | 右→左切入 |
| `p2-conclusion` | 结论 | `slideY` |
| `p2-foot` | 页脚 | `slideY` |
| `p3-meta` | 页眉 | `slideY` |
| `p3-kicker` | 眉题 | `slideY` |
| `p3-info` | 唱片信息 | `slideY` |
| `p3-note` | 底部说明 | `slideY` |
| `p3-bottom` | 底句 | `slideY` |

新增模板时，只要给元素固定 ID，并在 `lib/motion.mjs` 里加默认值，就能被 AI/Spec 控制。

## 4. 运动预设

### `flow`：流动

- 信封从左侧滑入；
- 卡片左右切入；
- 标题/页眉轻微上浮；
- 适合大多数科技、解释类内容。

### `strong`：强动效

- 更快、更大位移、回弹；
- 转场默认 `wipe_up`；
- 适合强节奏、短促内容。

### `none`：无动效

- 只保留淡入；
- 用于对比或调试。

## 5. 转场

`spec.motion.transition.mode` 支持：

| 模式 | 效果 | 状态 |
|---|---|---|
| `slide` | 横向推页 | 已实现 |
| `wipe_up` | 上翻页：深色幕布从下往上盖过 | 已实现 |
| `wipe_down` | 下翻页：深色幕布从上往下盖过 | 已实现 |
| `zoom` | 缩放转场 | 计划 |
| `flip` | 3D 翻页 | 计划 |

转场时长默认 0.9 秒，强动效 0.78 秒。

实现方式：

- `slide`：`track` 横向平移；
- `wipe_up/down`：转场时页面跳页，`#wipe` 幕布扫过，避免“横向推页 + 竖切”打架。

## 6. AI 怎么控制运动

当前链路：

```text
内容关键词 → 选 motion preset（flow/strong）
内容关键词 → 选 BGM
```

下一层能力（Spec 已支持，缺 AI 输出）：

```json
{
  "motion": {
    "preset": "flow",
    "elements": {
      "p1-env": { "type": "slideX", "fromX": -380, "toX": 0, "duration": 1.7 },
      "p1-kicker": { "type": "slideY", "fromY": 44, "toY": 0, "start": -0.7, "duration": 0.5 }
    }
  }
}
```

AI 指令标准：

1. 只能使用注册过的元素 ID；
2. 只能使用允许的运动类型；
3. 位移/时长必须在约束范围内；
4. 缺省字段由 `buildMotion()` 补；
5. 非法指令丢弃，回退到 preset。

这样 AI 可以“导演”，但不能把渲染器写崩。

## 7. 音乐库

### 内置

| ID | 名称 | 分类 | BPM |
|---|---|---|---|
| `pulse` | Pulse 120 | 科技 | 120 |
| `minimal` | Minimal 80 | 叙事 | 80 |
| `none` | 无音乐 | — | — |

### 后台上传

路径：

```text
设置 → 音乐库
```

支持：

- WAV / MP3 / M4A / AAC；
- 名称、分类、BPM、标签；
- 上传后存到 `data/music/`，元数据写 `data/music/library.json`。

### 自动匹配

`lib/music.mjs`：

```text
标签命中数最多的音轨 → 选中
没有命中 → 关键词规则
再没有 → pulse
```

示例：

```text
“自动化发布 / 效率 / 工具” → pulse
“原理 / 故事 / 人物” → minimal
上传曲目标签含“测试运动 / 自动化” → 优先选上传曲目
```

### 手动覆盖

Spec 的 `music` 字段可以直接写任意音乐库 ID；编辑器下拉会列出内置 + 上传曲目。

## 8. 验收标准

一条视频必须同时满足：

- 首屏 1 秒内开始入场，不是静止图；
- 每个页面至少 3 个元素有独立运动；
- 转场 < 1 秒，且不是简单硬切；
- 音乐有清晰节拍，Pulse 120 的 kick 间隔 0.5 秒；
- 运动不遮挡文字、不超出安全区；
- 整条视频可重复渲染，结果确定（同一 Spec 同一 hash 逻辑）。

## 9. 已知限制

- 当前只有一套模板，元素注册表是这套模板的；
- 上传音乐暂未生成专属波形，音乐页波形会用默认包络；
- AI 目前选 preset，不逐元素输出覆盖项；
- `zoom` / `flip` 转场还没实现。

## 10. 下一步

1. 让 AI 输出 `motion.elements` 覆盖项；
2. 上传音乐时用 ffmpeg 生成 540 帧波形；
3. 增加 `zoom` / `flip` 转场；
4. 为每个新模板维护自己的元素注册表。
