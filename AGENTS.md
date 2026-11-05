# 固定地址 · 内容生产系统 · 必读规则

This file is mandatory for every agent working on this project.
These are product-level visual and information rules, not suggestions.

## 1. Layout: middle 80%

For a 1080×1920 frame:

```text
left/right inset: 108px  (10%)
top/bottom inset: 192px  (10%)
content area: 864 × 1536
```

All page content must sit inside the middle 80% of the canvas.
Do not place main content against the outer 10% margins.

## 2. Alignment

```text
main content: centered
single-line fields: centered
multi-line body: centered unless readability requires left alignment
logo: may stay left
small metadata/footer: may stay left/right only if it is brand chrome
```

Never center text by adding manual spaces. Use layout/CSS.

## 3. Typography floor

```text
body copy: >= 24px
supporting note: >= 28px
CTA / bottom note: >= 24px
```

If content does not fit:

```text
rewrite or shorten the copy
do not shrink below the floor
do not clip
```

## 4. Hide the generation structure

Never show the internal generation structure to the viewer.

Forbidden visible labels include:

```text
背景
证据
反例
金句
结构对照
CONTEXT
第几页 / 01 / 02 / 03 / 04 / 05
先把背景说清楚
先把场景、角色和限制讲清楚
背景不是铺垫
```

Page numbers, section names, template names, prompt scaffolding,
and internal content-model labels must be invisible on every template.

The viewer should see only:

```text
the claim
the evidence
the contrast
the takeaway
```

Never expose:

```text
content schema
field names
prompt structure
page plan
workflow labels
internal reasoning
```

## 5. Motion and brand feel

Motion is allowed only for emphasis, not decoration.

```text
hook: text enters, then highlighter brush paints
check / cross: stroke draws from 0 to full
highlight: background sweeps or scales in
accent icons: one controlled draw/fade, 0.4–0.8s
```

Rules:

```text
one primary motion per page
no random floating objects
no more than 3 simultaneous accents
no noise, no bouncing, no spinner effects
motion must resolve to a clean static frame
```

The result should feel:

```text
premium
calm
branded
memorable
```

Not:

```text
busy
template-like
demo-like
```

## 6. Last page ask

On the final page, bottom-right corner must show a small line:

```text
有问题，评论区问
```

It must be:

```text
inside the 80% safe area
>= 24px
low emphasis, high legibility
not competing with the quote
```

This is the only allowed persistent CTA on the last page.

## 7. Content rules

```text
one main idea per page
one primary emphasis per page
short fields, no fragments
no duplicated line + highlight
no template placeholders in a finished render
```

## 8. Release gate

A template change is not accepted unless:

```text
4 / 5 / 6 page layouts checked
5 themes checked
P1 cover checked
P2 / P3 / P4 checked
all content inside middle 80%
all body copy >= 24px
no internal structure words visible
last-page ask visible at bottom-right
```

Do not lower these rules to make a render pass.
Rewrite the content instead.
