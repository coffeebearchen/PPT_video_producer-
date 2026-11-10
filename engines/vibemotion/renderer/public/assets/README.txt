VibeMotion 外部素材目录（PNG / WebP / SVG）
================================================

放这里：03_renderer/public/assets/

怎么在分镜里用（timeline_dsl.json 任意场景的 initialProps.decor）：
  {
    "type": "image",
    "src": "assets/star.png",
    "x": 0.5,          // 画面横向位置 0~1
    "y": 0.25,         // 画面纵向位置 0~1
    "size": 200,       // 宽度像素（1080 宽基准）
    "anim": "bob",     // twinkle / bob / spin / wiggle / pulse / static
    "delay": 0,        // 延迟多少帧出现
    "opacity": 1
  }

命名规范
  - 英文小写 + 数字 + 下划线：star_gold.png、robot_wave_01.png
  - 不要用中文、空格、特殊符号（避免路径问题）

格式要求
  - 首选：PNG 带透明通道（RGBA）
  - 次选：WebP 带 alpha（体积更小）
  - 矢量的话 SVG 也能接（需要时告诉我）
  - 尺寸建议 512 ~ 1024 px，单张不要超过 2MB
  - 白底不透明的 PNG 也能用：给我，我用脚本抠透明（简单图形效果好，复杂照片不保证）

版权提示
  - 只用可商用的免费素材（CC0 / 商用免费授权），并保留授权说明
  - 常见来源：SVG Repo(CC0)、OpenMoji、Iconify、Flaticon(需署名)、Freepik(需授权)
  - 商用前请自己确认授权范围，避免侵权
