# 课件品牌与 AI 标识调用说明（V14）

这两个字段放在 **resolved-props 根对象**，正文 Courseware 和封面 CoursewareCover 共用。不要放到 slide、effects 或 storyboard 包装层。前端开关/服务端透传本轮未改；可直接通过独立 Remotion 命令或下面的示例 CLI 调用。

```json
{
  "brand": {"text": "客户学堂", "show": true},
  "aiLabel": {"text": "AI 辅助创作", "show": true}
}
```

上面是对现有完整 resolved JSON 的**根字段补丁**，不是独立可渲染的完整输入。保留原 schemaVersion、stagingDir、canvas、slides、配音、字幕和冻结时长。

| 字段 | 缺省 | 使用说明 |
|---|---|---|
| brand.text | 固定地址 | 更换左上角品牌；空字符串/纯空格回退默认。去首尾空格，单行最多30字符 |
| brand.show | true | 只认布尔值；false 移除整块品牌及其分隔线，内容不重新排版 |
| aiLabel.text | AI 生成 | 左下角标识，可改“AI 辅助创作”；空文字也回退默认；单行最多16字符 |
| aiLabel.show | true | false 不渲染标识。与 brand 开关独立，不传 show 即为 true |

可以只传 `{show:false}` 或 `{text:"客户学堂"}`；也可以整个字段省略。不要传 `null`、字符串 `"false"`、换行或超长文字；会明确报错，不会缩字号、裁文字或默默忽略。超长客户全称应改为简短品牌名。

## 六种情况怎么调用

在项目根目录运行。去掉 `--render` 只生成完整 JSON 并打印渲染命令，确认后再选一条渲染；不会启动/重启4310。

```powershell
cd D:\AI数字资产\studio

# 1. 平台默认：左上固定地址，左下AI生成
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click

# 2. 客户白标：更换品牌，保留AI标识
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click --brand-text "客户学堂" --out out/customer-brand --render

# 3. 不露品牌：整块左上角及分隔线消失，AI标识仍在
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click --no-brand --out out/no-brand

# 4. 自定义AI文字，切简洁风
node engines/vibemotion/renderer/src/courseware/examples.mjs --case closing --style clean --brand-text "客户学堂" --ai-label "AI 辅助创作" --out out/customer-clean

# 5. 显式关闭AI标识：复现V13旧画面
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click --no-ai-label --out out/legacy-chrome

# 6. 两个开关都关
node engines/vibemotion/renderer/src/courseware/examples.mjs --case click --no-brand --no-ai-label --out out/no-chrome
```

输出的 `resolved-props.json` 是完整契约数据，可直接交给 Courseware/CoursewareCover。`--no-brand`、`--no-ai-label` 优先于同条命令的文本参数。原 `--style industrial|clean|dynamic`、`--fixture <现有完整fixture>`、`--case`、`--out` 均保留。

封面调用（使用情况2生成的props，不重编配音）：

```powershell
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npx --offline --no-install remotion still src/courseware/index.tsx CoursewareCover D:\AI数字资产\studio\out\customer-brand\cover.png --props=D:\AI数字资产\studio\out\customer-brand\resolved-props.json
```

若用现有服务端生成链路，调用方必须把两个根字段原样写进**最终 resolved props**；只存在于编辑器对象里但被编译器丢弃，渲染器读不到。本轮按边界没有新增前端菜单，也没有修改服务端编译逻辑。AI操作助理可用上述命令/JSON替人操作确认；软件自带AI不会自行替客户选择品牌或标识开关。

## 版式与向后兼容

- 品牌沿用旧位置 `(108,204)`，28px，宽864px及原分隔线，使用当前主题 muted/line。隐藏后其它内容位置不变。
- AI标识在 `(112,1679.6)` 附近，26px、单行、宽432px，低强调；向内留4px避免字形左侧描边跨出安全线。末页CTA仍在右下 `(764,1682)`，两块边界相隔220px。都在中间80%安全区。最长合法AI文案也不会挤到CTA。
- AI标识是全局静态层，正文淡入、开场hook、截图推近或转场不会把它遮掉。封面同一规则，不新增封面CTA。
- 字体仍用项目字体；三风格使用各自 muted 配色。没有修改字体加载或样式系统。
- **实际历史差异必须说明**：V13代码没有AI标识；V14规范明确规定默认显示。因此“不传字段”仍能渲染，品牌和原有内容/节奏不变，但会新增左下“AI 生成”。这是遵守V14默认值，不能声称默认整帧与V13完全相同。要旧版整帧，传 `aiLabel:{show:false}`；五类页及封面已逐像素验证。
- 白标字段只控制左上角品牌栏，不替换截图内文字、标题、旁白或字幕。对外片应使用客户自己的内容和截图；软件名称如果写在标题里，应由内容编辑明确改写。

## 证据与复核

目录：`out/courseware-brand-v14/`。

- `brand-comparison.png`：默认／客户品牌／隐藏品牌；AI开／AI关／自定义AI文字。
- `video.mp4`、`sample-props.json`：一条157帧（5.233秒）的真实旁白样片；`contact-sheet.png` 是 ffmpeg 从该片抽出的10帧，`cover.png` 是客户品牌封面。
- `cover-comparison.png`：封面默认／客户品牌／两者都关。
- `three-styles.png`：工业／简洁／动感三风格，均同时显示客户品牌、AI标识及末页CTA。
- `defaults.png/customer.png/brand-off.png/ai-on.png/ai-off.png/custom-ai.png/both-off.png/empty-fallback.png/longest.png`：全尺寸正文证据；`covers/` 同名封面证据；`props/` 是对应完整输入。
- `effects/hook.png`、`effects/transition.png`：AI标识不随hook/推入转场消失。
- `verification.json`：实际DOM字号/边界/文字、像素兼容与保护文件哈希。

重跑独立关键帧检查：

```powershell
node engines/vibemotion/renderer/src/courseware/brand-proof.mjs
```

需要保留本轮的 `original-props.json`、`before/`、`protected-before.json` 和真实staging素材；不调用TTS、不写数据库。`--baseline` 仅供修改前取样，已有历史帧时会拒绝覆盖；不要拿V14代码重新生成V13基准。
