# 蚁小二 API / CLI 调研

调研日期：2026-11-08

## 协议与基础

```text
HTTPS + JSON REST
Host（文档环境）：open-api.yixiaoer.cn
鉴权：请求头 authorization
```

登录：

```text
POST /users/auth
body: { phone, code | password, deviceId, channel }
response.data.authorization
```

企业 API Key / CLI 的 Key 从蚁小二客户端获取。

## 核心接口

### 账号列表

```text
GET /v2/platform/accounts?page=1&size=100&platform=视频号
header: authorization
```

返回：

```json
{
  "data": [
    {
      "id": "平台账号ID",
      "platformAccountName": "账号昵称",
      "platformName": "视频号",
      "status": 1
    }
  ]
}
```

`status=1` 才是登录成功。

### 上传素材

先用存储接口获取 OSS 直传地址，上传文件，再调用：

```text
POST /material
```

关键字段：

```json
{
  "filePath": "OSS key",
  "fileName": "video.mp4",
  "width": 1080,
  "height": 1920,
  "type": "video"
}
```

`type`: `video | image | article | system`

### 创建发布任务

```text
POST /taskSets/v2
header: authorization
```

关键字段：

```json
{
  "platforms": ["视频号"],
  "publishType": "video",
  "publishChannel": "cloud",
  "coverKey": "OSS key",
  "platformAccountId": "账号ID",
  "publishArgs": {
    "video": {},
    "cover": {},
    "accountForms": [
      {
        "platformAccountId": "账号ID",
        "contentPublishForm": {}
      }
    ]
  }
}
```

`publishType`：

```text
video
imageText
article
```

`platforms` 枚举包括：

```text
抖音
快手
视频号
小红书
微信公众号
微信公众号-Open
哔哩哔哩
头条号
知乎
...
```

`publishChannel`：

```text
cloud  云端发布
local  本机客户端发布（需要 clientId）
```

### 任务与回执

```text
任务集列表 / 详情
子任务列表
发布记录
作品数据
```

发布后轮询任务状态，拿平台作品链接/ID。

## 平台字段不是统一的

真正的发布参数在：

```text
publishArgs.accountForms[].contentPublishForm
```

每个平台不同：

```text
视频号：short_title / description / location / scheduledTime / createType
小红书：title / description / images / scheduledTime / ...
公众号：publishType=article + HTML 内容
抖音：title / description / 话题 / 声明 / 位置 / ...
```

必须按平台/内容类型读 schema。

## CLI 更合适做适配

```text
yxer doctor
yxer accounts list 视频号 --status 1 --json
yxer schema fields 视频号 video
yxer upload ./video.mp4
yxer validate 视频号 video payload.json
yxer publish video 视频号 payload.json --dry-run
yxer publish video 视频号 payload.json
```

CLI 的价值：

```text
账号查询
字段 schema
payload 校验
dry-run
上传
发布
发布记录
```

## 对我们的接入建议

```text
provider = yixiaoer
provider_account_id = 账号列表里的 id
publish_type = video / imageText / article
publish_channel = cloud（优先）
```

不要自己拼所有平台字段。  
先调用 schema/validate，再 publish。

## 合规注意

```text
平台审核仍会拦截
AI 生成内容要按平台 declaration 字段声明
不要批量发高度相似内容
不要用自动发布规避平台审核
公众号订阅号权限仍受微信限制
```

## 来源

- [蚁小二 API 文档（Apifox）](https://s.apifox.cn/e66df935-0c39-44d0-8096-abd39417fa6a/llms.txt)
- [蚁小二开放 API 接入教程](https://xueyuan.yixiaoer.cn/article/46925)
- [蚁小二 CLI](https://www.yixiaoer.cn/cli)
