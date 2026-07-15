# 移动端星图背景 v1

- 模式：内置 imagegen
- 用途：`stylized-concept`
- 交付：`backgrounds/mobile-v1.webp`，2160×3840，不透明 WebP
- 参考：`source/style-master-v1.png`、八星座图腾总览

## Prompt

Create a polished portrait 9:16 background for a child-friendly English grammar achievement star map. Use a calm deep-indigo night sky fading into muted violet, with very subtle cyan and violet nebula haze only near the outer edges and sparse tiny dust. Keep the central 75% visually quiet and dark as a safe zone for dynamic constellation nodes, lines, labels and progress UI. Reserve a calm top area for navigation. Along only the bottom 12%, add soft rounded layered hills and one tiny whimsical observatory with a single warm amber window. Match the established premium storybook game-UI style: clean shapes, soft depth, gentle glow, restrained detail, no photorealism. No text, no logos, no large stars, no achievement icons, no fixed constellation points or lines, no moon, planets, comets or characters.

## 后处理与验收

生成源按中心构图等比裁切并缩放到 2160×3840，导出高质量 WebP。检查中央安全区、顶部 UI 安全区、底部地标高度以及与前端动态星点/连线的冲突。
