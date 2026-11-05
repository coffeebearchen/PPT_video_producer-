# Lite Mode

## 目标

一条内容只调用一次模型，渲染不调用模型。

## 输入

```json
{
  "title": "上下文窗口不是记忆力",
  "topic": "上下文窗口",
  "page_count": 5,
  "theme": "editorial",
  "structure_type": "causal",
  "structure_name": "因果",
  "must_include": "输入；窗口；记忆",
  "must_avoid": "夸大；编造"
}
```

## 运行

```powershell
node scripts/lite-generate.mjs data/lite-input.json
```

## 输出

```text
data/lite-output/<hash>.json
data/lite-cache.json
```

## 成本

```text
cache hit: 0 次模型调用
cache miss: 1 次模型调用
渲染 / 封面 / ffmpeg: 0 次模型调用
```

## 边界

```text
Lite 适合批量生产
不适合复杂创作探索
内容仍需要人工抽查
```

## 关键

```text
不要把聊天历史传给模型
只传 title / topic / page_count / theme / structure / must_include / must_avoid
```
