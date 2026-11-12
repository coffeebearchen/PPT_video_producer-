# DSH → Codex 同步说明（2026-11-12）

> 平台侧已完成 12 项，分支 `feature/courseware-dynamicflow` 最新 commit：`23f8e7c`。
> 请先 `git pull` 再改，避免冲突。

## 一、平台侧已完成（DSH 域）

| # | 内容 | 位置 |
|---|---|---|
| 1 | 编译支持 `kind:"diagram"`（layout + data）| `lib/courseware-compile.mjs` |
| 2 | 背景统一 #282828 | `DYNAMICFLOW_TOKENS` + `source.js` |
| 3 | 编辑器加 视频页/图片页/图解页（45 布局可选）| `public/app.js` |
| 4 | AI 分镜能选 45 种图解布局 | `lib/generator.mjs` + `lib/courseware-compose.mjs` |
| 5 | 涂鸦封面 `DoodleCover` | `doodle/DoodleCourseware.tsx`（DSH 改） |
| 6 | 低清预览（0.5 倍 / 跳过封面）| `lib/courseware-render.mjs` + `server.mjs` |
| 7 | BGM 选择（bg_pad / pulse）| 编译 + 编辑器 |
| 8 | TTS 音色（按项目覆盖）| `lib/tts.mjs` + 编辑器 |
| 9 | 批量出片（topics 数组）| `server.mjs` `/api/courseware/batch` |
| 10 | 撤销/重做（Ctrl+Z）| `public/app.js` |
| 11 | 模板（3 个）| `public/app.js` |
| 12 | 横屏 1920×1080（竖屏居中）| `model.ts` + `index.tsx` + `Courseware.tsx` |

## 二、已成规范（请对齐，不要改回）

1. **色板**（`docs/DIRECTOR-MANUAL.md` 2.1.1）：
   bg #282828 / ink #EDE6D6 / muted #8A8A80
   yellow #DCBC62 / green #90C380 / red #E06B6B
   pink #D38796 / orange #F08419 / line #6E6E68 / surface #2E2E2E
2. **填充规则**（2.1.2）：点群/热力/图例用 hatch；文字块/线条框不用。
3. **背景暗角**（2.1.3）：radial gradient，中心透明、边缘 -28% 黑。
4. `DoodleVignette` 组件已被采纳（DSH 保留你的实现）。

## 三、Codex 待做（你之前确认的三个缺口）

```text
1. 转场：doodle 页之间接旧 SlideVisual（fade/slide/push/wipe）
2. 字幕：doodle 模式加 cue 驱动的全局字幕层（activeSubtitle + subtitleCues）
3. 图元同步：图元/分组出场时间对齐旁白 cues（替代 DiagramPage 固定 400+cell*1100）
   —— nodeTimings/bulletTimings 编译层已生成，但 model.ts 还没保留
```

## 四、协作约定

1. **先 pull 再改**，避免 `source.js`/`DiagramPage.tsx` 再冲突。
2. 只改 `renderer/src/courseware/` + `graphics/`；平台侧（`lib/` `public/` `server.mjs`）DSH 负责。
3. 改完 push 分支，不要在 main 上直接改。
