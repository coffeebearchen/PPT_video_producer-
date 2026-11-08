# 蚁小二接入收尾说明

日期：2026-11-08  
状态：**基础层完成，真实联调未开始**  
分支：`feature/yixiaoer`  
基线：`v2.3.0`

---

## 一、已完成

### 版本

```text
v2.3.0 已提交并打 tag
main 保持 v2.3.0
feature/yixiaoer 独立开发
```

### 数据

```text
content_id
variant_id（字段）
template_version
provider
provider_account_id
provider_task_id
platform_ref
ai_label_status
```

已迁移：

```text
briefs
specs
renders
publications
wechat_accounts
```

### 渠道

```text
platform: wechat_article / wechat_channels / xiaohongshu / douyin
provider: direct / manual / yixiaoer
provider_account_id
```

### 映射与校验

```text
小红书 imageText
视频号 video
公众号 article
抖音 video
```

代码：

```text
lib/publishers/mapping.mjs
lib/publishers/schemas.mjs
lib/publishers/yixiaoer.mjs
```

接口：

```text
GET  /api/publish/providers
GET  /api/publish/schema/:platform/:type
POST /api/publish/preflight
```

### 测试

```text
node scripts/test-yixiaoer-mapping.mjs
node scripts/test-yixiaoer-flow.mjs
```

结果：

```text
mapping 8/8
flow   17/17
```

覆盖：

```text
四平台预检
AI text_label
话题标签
公众号不群发
抖音 statement=3
缺图阻止
超长正文阻止
任务 payload 结构
```

### UI

```text
设置 → 蚁小二发布方式
渠道弹窗：平台 / 发布方式 / 蚁小二账号 ID
账号组页面：小红书 / 抖音类型显示
```

---

## 二、没有完成

```text
真实账号列表读取
真实 schema 读取
OSS 素材上传
小红书 1080×1440 图文资产
任务创建
任务轮询
platform_ref 回写
一条真实发布
视频号副号实际支持验证
```

原因：

```text
蚁小二凭证未配置
小红书副号 / 视频号副号未授权
```

当前状态可验证：

```text
GET /api/publish/providers
  yixiaoer.configured = false
```

---

## 三、恢复工作所需

### 1. 配置凭证

设置页：

```text
设置 → 蚁小二发布方式
  BASE URL
  API KEY
  AUTHORIZATION
```

或 `.env`：

```env
YIXIAOER_BASE_URL=https://open-api.yixiaoer.cn
YIXIAOER_API_KEY=...
YIXIAOER_AUTHORIZATION=...
```

### 2. 授权账号

```text
蚁小二后台：小红书副号已授权
蚁小二后台：视频号副号已授权
```

### 3. 建渠道

```text
平台：小红书
发布方式：蚁小二
蚁小二账号 ID：真实 ID
```

```text
平台：视频号
发布方式：蚁小二
蚁小二账号 ID：真实 ID
```

---

## 四、恢复后的顺序

```text
1. 读取账号列表
2. 读取真实 schema
3. 对照四张映射表
4. 做素材上传
5. 做小红书图片资产
6. 创建一条任务
7. dry-run
8. 发布草稿
9. 人工声明 AI（如平台要求）
10. 正式发布
11. 回写 platform_ref
12. 再加视频号副号
```

---

## 五、安全边界

```text
不要合并 feature/yixiaoer 到 main
不要用生产库跑真实发布
真实测试前设置 STUDIO_DATA_DIR
不要自动群发公众号
不要在无 AI 字段平台假装已声明
```

---

## 六、测试库建议

```powershell
$env:STUDIO_DATA_DIR = "D:\AI数字资产\studio\data-yixiaoer"
node server.mjs
```

先复制：

```text
data/studio.db → data-yixiaoer/studio.db
```

---

## 七、当前结论

```text
基础层完成
真实联调 blocked
不是代码完成，是外部凭证/授权未就绪
```
