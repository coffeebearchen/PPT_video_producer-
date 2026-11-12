# CODEX-OUT：涂鸦色板与 hatch 同步

依据 `docs/DIRECTOR-MANUAL.md` 的 2.1.1 / 2.1.2 / 2.1.3，本次仅修改 `renderer/src/courseware/` 下的涂鸦组件与检查脚本；此交付记录按用户最新指定放入 `docs/CODEX-OUT.md`。未修改导演手册、生成器源脚本、server、lib、public 或 graphics/styles.ts。

## 变更

- `doodle/source.js` 导出并集中维护十色：bg `#282828` / ink `#EDE6D6` / muted `#8A8A80` / yellow `#DCBC62` / green `#90C380` / red `#E06B6B` / pink `#D38796` / orange `#F08419` / line `#6E6E68` / surface `#2E2E2E`。
- 图形、标题、字幕、网格底色、首尾页图标与背景均引用同一色板，避免渲染组件残留旧值。
- 图元支持可选 hatch：`hachureAngle: -41`，默认间距 8px；D01 五个椭圆全部使用自身语义色斜线，间距 9px；内部小点保留实色。
- C04 热力格、B06 关系矩阵、P01 集合范围，以及已有数据填充的雷达/面积区域使用斜线。文字卡片与普通线框不加 hatch，整体背景不铺斜线。
- `DoodleVignette.tsx` 为图解页、标题页和收尾页叠加 radial gradient：中心透明、外侧 stop-opacity 0.28；位置沿用已确认脚本 `cx=50% / cy=45% / r=75%`。
- roughness 2.2 / bowing 1.6 基准、3.2 粉笔位移、黑体和固定种子保持原设置。8 页顺序与每页 6 秒保持不变；D01 单独出预览，不插入原 48 秒样片。

## 检查与交付

`node src/courseware/doodle/check.mjs` 检查色值完全一致、45 种布局无旧色残留、种子确定性、D01/C04/B06/P01 的 hatch 区域数、文字块/线框不使用 hatch、暗角首尾透明度，以及真实 300 点/20 亮点。新增入口的 TypeScript 通过。

重渲命令（renderer 目录）：`node src/courseware/doodle/render.mjs`。

成片与抽帧位于 `out/super-agent-doodle/`：

- `super-agent-48s-palette.mp4`：新版色板 48 秒视频。
- `page-1.png` 至 `page-8.png`：8 页抽帧；`contact.png` 为总览。
- `D01-hatch.png`：点群斜线填充预览。
- `C04-hatch.png` / `B06-hatch.png`：热力与矩阵填充预览。
- `metadata.json`：最终视频时长、分辨率与帧数。


---

# 上一项交付：image 照片 / 插图页

已完成 renderer 层 `kind: "image"`，四种风格均可使用。截图页、视频页和无 image 的课件继续使用原路径。此次变更仅在 `renderer/src/courseware/`，照片和抽帧位于忽略的 `out/image-page/`。

交付记录已按用户指定从 renderer/src/courseware/CODEX-OUT.md 移至 docs/CODEX-OUT.md。

## 调用

冻结后的课件 slides 可加入：

```json
{
  "id": "photo",
  "kind": "image",
  "text": "照片完整展示",
  "caption": "照片与插图，直接展示就好。",
  "asset": {
    "src": "courseware/image-photo/still/photo.jpg",
    "width": 512,
    "height": 600
  },
  "fit": "contain",
  "kenBurns": false,
  "fromFrame": 0,
  "durationInFrames": 180
}
```

`asset.src` 沿用本次 staging 的 public 根相对路径校验。`fit` 默认并且只支持 `contain`；`kenBurns` 默认 false，开启时设为 true。`body`、`caption`、`cues`、`narration` 均沿用原截图页的标题、说明、字幕和配音机制。

媒体区域与截图页一致：x=146.4、y=550、宽787.2、高784，完整位于安全区内。照片保持原比例并居中，无浏览器边框、圈注或 dim。Ken Burns 从局部首帧 1 线性推进至末帧 1.06，预留 6% 缩放空间，推进结束仍展示完整照片。只有照片缩放，文字布局不受影响；所有时间由局部帧推导。

image 明确拒绝 `cover`、`highlight`、`annotation`、`dim` 和非布尔 kenBurns；素材实际尺寸不符或加载失败时明确报告渲染错误。

此提交只接入 renderer 的 resolved-props；未修改服务端或编译器。

## 文件

- `ImagePage.tsx`：照片容器、contain 几何、可选推进与素材校验。
- `model.ts`：新增 image、fit/kenBurns 默认值及校验；reveal 计入照片元素。
- `Courseware.tsx`、`dynamicflow/DynamicFlowCourseware.tsx`：在既有标题/字幕/配音框架内接入照片组件。
- `audit.tsx`：检查照片比例、尺寸、contain、缩放不裁切及无截图圈注。
- `image-example.tsx`、`check-image.mjs`：照片预览入口及检查。

## 抽帧

- `out/image-page/image-dynamicflow.png`：照片页抽帧（1080×1920，第150帧，默认关闭推进）。
- `out/image-page/image-industrial.png` / `image-clean.png` / `image-dynamic.png`：三套旧风格的照片页。
- `out/image-page/ken-burns-0.png` / `ken-burns-90.png` / `ken-burns-179.png`：推进首、中、尾帧。
- `out/image-page/screenshot-regression.png`：原 screenshot 回归帧。
- `out/image-page/audits.json`：上述8次浏览器布局检查，issueCount 均为0。

测试照片为环境中 Matplotlib 自带的 Grace Hopper 肖像（grace_hopper.jpg，512×600），仅作照片展示测试；复制到 out 下的临时 publicDir，没有改动仓库 public。

## 验证

从 renderer 执行 `node src/courseware/check-image.mjs`：TypeScript 通过；默认关闭推进、1→1.06 首尾值、横图/竖图/方图完整展示、非法输入拒绝及 screenshot 原默认值均通过。

实际浏览器渲染：industrial / clean / dynamic / dynamicflow 四种 image 页通过；Ken Burns 首中尾无裁切；原 clean screenshot 通过，8次布局检查均无错误。照片抽帧已人工查看。

重出照片帧（需保留 out 下的测试素材）：

```sh
npx remotion still src/courseware/image-example.tsx ImagePhoto ../../../out/image-page/image-dynamicflow.png --frame=150 --public-dir=../../../out/image-page/public
```
