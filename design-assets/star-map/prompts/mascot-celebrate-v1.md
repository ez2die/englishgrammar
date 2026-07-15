# 星星精灵庆祝姿态 v1

- 模式：内置 imagegen + 本地绿幕去除
- 用途：`stylized-concept`
- 交付：`mascots/celebrate-v1.png`，1024×1024 透明 PNG
- 参考：`mascots/guide-v1.png`

## Prompt

Create the same golden five-point star sprite in a celebration pose, preserving the approved character proportions, face, rosy cheeks, dark-indigo outline, navy arms and feet, material and rendering. It faces forward, closes its eyes in joy, smiles with an open mouth, raises both arms high and lifts one foot in a cheerful hop. No telescope. Center the complete character with generous padding on a perfectly uniform #00ff00 chroma-key background. No green in the mascot, shadows, background variation, props, confetti, text, duplicated limbs or extra fingers.

## 后处理与验收

使用 `remove_chroma_key.py` 软蒙版、去色溢和 1px 边缘收缩，再按 Alpha 包围盒等比缩放到 1024×1024，主体占用率 0.78，并与引导姿态并排检查角色一致性。
