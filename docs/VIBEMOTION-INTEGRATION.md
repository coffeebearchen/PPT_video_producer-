# VibeMotion 接入说明

## 当前状态（MVP）

```text
自动生成菜单可用
自动模式：直接出片
人工模式：先确认分镜再渲染
合规闸门：敏感词拦截
进度：帧级
封面：首帧
TTS：接口与设置已就绪，真实语音未接入（无 Key/音色）
```

## 目录

```text
engines/vibemotion/renderer     Remotion 渲染引擎（本机副本，git 忽略）
lib/vibemotion.mjs              DSL 生成 + 渲染 + 封面
lib/tts.mjs                     TTS 抽象（OpenAI 兼容已实现，其余待接）
lib/compliance.mjs              合规检查
server.mjs                      video_tasks 接口 + 队列
```

## 引擎安装

```powershell
cd D:\AI数字资产\studio\engines\vibemotion\renderer
npm ci --no-audit --no-fund
```

首次渲染会下载 Chrome Headless Shell（约 131MB）。

## 运行

```powershell
cd D:\AI数字资产\studio
node server.mjs
```

打开：

```text
http://127.0.0.1:4310/#/autogen
```

## 自动任务接口

```text
POST /api/video-tasks              创建任务
GET  /api/video-tasks              任务列表 + 计数
GET  /api/video-tasks/:id          任务详情
POST /api/video-tasks/:id/confirm  人工模式确认分镜
POST /api/video-tasks/:id/cancel   取消
POST /api/video-tasks/:id/retry    重试
```

## 设置

```text
设置 → 视频引擎 / TTS
```

字段：

```text
render_service_url
engine_default_mode（auto / manual）
tts_provider（none / openai_compat / volcano / minimax / iflytek / siliconflow）
tts_base_url
tts_model
tts_voice
tts_api_key
```

## 已知限制

```text
真实 TTS 未验证
独立渲染服务未实现（当前 CLI 子进程）
服务器迁移到 Linux 未验证
结构库 → 组件映射目前是简化规则
```

## 回滚

```text
git tag v2.5.0-autogen-mvp
git tag v2.6.0-tts-settings
git tag v2.3.1-rollback
```

回滚到基线：

```text
git reset --hard v2.3.1-rollback
```
