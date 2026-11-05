# TEMPLATE V2 — Design Drafts & UI Plan

Status: **waiting for approval**. Do not implement page templates yet.

## 1. Common frame

```text
1080 × 1920
safe area: x = 108..972, y = 192..1728
content area: 864 × 1536
all main content centered
body >= 24px
```

## 2. Page components

### A. Cover

```text
[ logo ]

lead  small / centered

        (blank)

punch large / centered / highlighter
```

Motion:

```text
lead present
punch enters
hold 1s
highlighter brush
hold 0.5s
```

### B. Context

```text
          title

        (blank)

      场景
   company gives docs to AI

        (blank)

      角色
   RAG retrieves, model generates

        (blank)

      限制
   no retrieval, no answer
```

### C. Compare

```text
       topic vs. topic

       看起来是
      按钮和货道     X  (draw)

       其实是
      工具调用       ✓  (draw)

   conclusion, centered
```

### D. Evidence

```text
          title

   user asks Agent to send mail

   no permission / no receipt / no retry   ← highlight

   that is not an Agent

        (blank)

   only failure handling counts
```

### E. Objection

```text
          objection

       claim
       (blank)
       correction
       (blank)
       boundary
```

### F. Quote / End

```text
        line 1
        line 2
       highlight
        note

                    有问题，评论区问
```

## 3. Page composition

```text
4 pages: cover + context + compare + end
5 pages: cover + context + compare + evidence + end
6 pages: cover + context + objection + compare + evidence + end
```

## 4. Typography

```text
cover lead      52–60
cover punch     96–112
context title   72–84
section value   40–44
compare turn    88–96
compare setup   34–40
evidence point  34–40
quote line      72–88
body / note     28–32
floor           24
```

## 5. UI plan

### Lite Generate

```text
Title
Topic
Page count [4/5/6]
Theme [5]
Structure [6]
[Generate]  [Use cache]
```

### Field Review

```text
Page thumbnails
cover.lead / punch
context.scene / roles / constraint
P2 fields
P3 fields
quote
[regenerate this field]  [approve]
```

### Batch

```text
items
cache hit / miss
done / failed
render
zip
```

## 6. Approval gates

```text
1. Approve static design pages
2. Approve 3 sample videos
3. Approve full batch
4. Freeze v2.0
```

## 7. Explicitly out of scope for v2.0 design

```text
new visual themes beyond current 5
avatar / voice
auto publish
multi-user
```
