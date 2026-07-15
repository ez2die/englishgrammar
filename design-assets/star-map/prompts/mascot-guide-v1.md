# 星星精灵引导姿态 v1

- 模式：内置 imagegen + 本地绿幕去除
- 用途：`stylized-concept`
- 交付：`mascots/guide-v1.png`，1024×1024 透明 PNG
- 参考：`source/style-master-v1.png`

## Prompt

Create one cute round golden-yellow five-point star sprite mascot for a child-friendly grammar achievement star map. Give it a friendly face, rosy cheeks, tiny navy arms and rounded feet. It holds a simple brass telescope in its left hand and points upward with its right arm. Match the approved premium storybook game-UI style: clean rounded silhouette, soft cel-shaded depth, restrained indigo outline and warm highlight. Center the complete character with generous padding on a perfectly uniform #00ff00 chroma-key background. No green in the subject, shadows, background variation, text, extra stars, particles or duplicated limbs.

## 后处理与验收

使用 `remove_chroma_key.py` 软蒙版、去色溢和 1px 边缘收缩，再按 Alpha 包围盒等比缩放到 1024×1024，主体占用率 0.78。
