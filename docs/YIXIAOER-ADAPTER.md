# 蚁小二发布适配方案

## 判断

```text
方向可行
比无障碍自动发布更合规
但不是“填一个 API Key 就能发”
```

蚁小二提供企业开放 API / CLI，能力包括：

```text
素材上传
创建发布任务
查询任务状态
读取已授权账号
定时发布
```

限制：

```text
需要企业 API 权限 / 开发者密钥
账号必须先授权
并非所有平台字段都能传
平台审核仍会拦截
短时间批量发相似内容会被判重
```

## 推荐定位

```text
主账号：直连官方 API / 人工发布
副账号：蚁小二适配器
```

不要让所有账号都走同一个通道。

## 账号组模型

```text
账号组：固定地址
  ├─ 公众号主号        publish_provider = direct
  ├─ 视频号主号        publish_provider = manual
  └─ 副账号矩阵        publish_provider = yixiaoer
```

## 需要增加的字段

```text
wechat_accounts.publish_provider
  direct | manual | yixiaoer

wechat_accounts.provider_account_id
  蚁小二里的账号 ID

publications.provider
  direct | manual | yixiaoer

publications.provider_task_id
publications.platform_ref
publications.provider_status
publications.provider_response_json
```

## 适配器接口

```js
publish(channel, contentPackage) -> {
  provider_task_id,
  status
}

poll(provider_task_id) -> {
  status,
  platform_ref,
  error
}
```

## 发布包内容

```json
{
  "content_id": "content_xxx",
  "group_id": "group_fixed",
  "channel_id": "wechat_xxx",
  "platform": "wechat_channels",
  "title": "...",
  "body": "...",
  "video": "data/publish-kits/.../video.mp4",
  "cover": "data/publish-kits/.../cover.png",
  "tags": [],
  "scheduled_at": "...",
  "ai_label": true,
  "template_version": "v2.2"
}
```

## 流程

```text
1. 选择渠道
2. 如果 provider = yixiaoer
3. 上传素材到蚁小二
4. 用 provider_account_id 创建任务
5. 保存 provider_task_id
6. 轮询状态
7. 回写 platform_ref / 回执
8. 失败进入人工检查
```

## 必须先拿到的资料

```text
蚁小二企业 API 文档
鉴权方式
素材上传接口
任务创建接口
任务查询接口
账号列表 / 分组接口
限流和计费
支持平台与字段矩阵
```

## 风险

```text
平台仍按自己的规则审核
副账号同质化内容会被限流
API 不是绕过审核的通道
公众号订阅号权限仍受官方限制
视频号是否可自动发要以蚁小二实际支持为准
```

## 建议

```text
先拿一个副账号做单条测试
不接批量
不接自动通过
先验证：上传、创建、发布、回执、失败原因
跑通后再进账号组
```
