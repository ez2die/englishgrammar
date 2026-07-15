# 语法星图资产库

本目录保存 `docs/star-map-concept.md` 对应的生成式视觉资产管理资料。所有生成结果必须先登记到 `manifest.json`,不能只保留在 Codex 默认生成目录。

运行时交付物单独位于 `public/assets/star-map/`。两者必须分开：`design-assets/` 保存生成源、淘汰稿、提示词和评审证据，不会被 Vite 复制进线上包；`public/` 只保存前端实际加载的 53 项生产资产。

## 目录约定

| 目录 | 用途 |
|---|---|
| `review/` | 未采用或待比较的候选图,不直接用于产品 |
| `source/` | 已采用风格板、纯色底原图等不可直接交付的生成源文件 |
| `prompts/` | 可复现的提示词与生成约束 |

`public/assets/star-map/` 的运行时目录：

| 目录 | 用途 |
|---|---|
| `backgrounds/` | 移动端、Web 夜空背景与空状态封面 |
| `constellations/` | 八个星座主题图腾 |
| `rarities/` | Common/Rare/Epic/Legendary 基础星徽 |
| `stars/` | 30 个具体成就图标 |
| `effects/` | Locked 遮罩、Just-lit、流星、星尘等通用效果 |
| `mascots/` | 星星精灵的引导与庆祝姿态 |

## 交付状态

`production-plan.json` 定义的 **53 项资产已全部达到 `production`**：

| 分类 | 数量 | 目录/文件 |
|---|---:|---|
| 夜空背景 | 2 | `public/assets/star-map/backgrounds/mobile-v1.webp`、`desktop-v1.webp` |
| 空状态封面 | 1 | `public/assets/star-map/backgrounds/empty-state-cover-v1.webp` |
| 星座主题图腾 | 8 | `public/assets/star-map/constellations/` |
| 稀有度底座 | 4 | `public/assets/star-map/rarities/` |
| 成就星标 | 30 | `public/assets/star-map/stars/` |
| 通用状态/庆祝特效 | 6 | `public/assets/star-map/effects/` |
| 吉祥物姿态 | 2 | `public/assets/star-map/mascots/` |

全量视觉总览见 `review/final-assets-v1-contact-sheet.jpg`。

## 状态

- `candidate`:候选图,等待评审。
- `approved`:视觉方向已确认,可作为后续生成参考。
- `processed`:已完成抠图/尺寸等后处理,等待产品验收。
- `production`:通过视觉和技术验收,允许被应用代码引用。
- `rejected`:未采用,仅用于追溯和比较。

## 命名

- 文件名使用小写 kebab-case。
- 生成源文件追加 `-chroma`;交付文件不带该后缀。
- 新版本使用 `-v2`、`-v3`,不覆盖既有版本。
- 星辰图标优先使用系统 key,将 `.` 改为 `-`,例如 `start-first-q-v1.png`。

## 入库流程

1. 生成图复制到 `review/` 或 `source/`。
2. 在 `prompts/` 保存本次提示词和参考图说明。
3. 需要透明背景时,从纯色底源图生成 RGBA PNG。
4. 检查尺寸、Alpha、透明四角、主体安全边距、色边和风格一致性。
5. 更新 `manifest.json` 的路径、状态、尺寸和 SHA-256。
6. 只有 `production` 状态的文件可以被应用代码引用。

## 开发接入

- 浏览器公开路径统一以 `/assets/star-map/` 开头，例如 `/assets/star-map/stars/start-first-q-v1.png`。
- 移动端默认使用 `backgrounds/mobile-v1.webp`；宽屏断点切换为 `backgrounds/desktop-v1.webp`。
- 空状态页面使用 `backgrounds/empty-state-cover-v1.webp`，文案和按钮必须由前端动态叠加，不能修改位图写入文字。
- 星座节点、连接线、进度、锁定状态和解锁动画属于前端动态层；星标图可与 `effects/` 中的透明层叠加。
- 成就 key 到星标文件的映射以 `manifest.json` 中生产资产的 `starKey` 为准，不要依赖目录遍历顺序。
- 吉祥物按情境选用 `mascots/guide-v1.png` 或 `mascots/celebrate-v1.png`。

## 质量门禁

```bash
node scripts/verify-star-map-assets.mjs --require-complete
```

该命令会核对 53 项生产状态、真实尺寸/颜色模式、文件 SHA-256、输出路径、透明四角、Alpha 包围盒、安全边距，以及提示词来源链。更新任何生产文件后必须同步更新 `manifest.json`，并重新生成总览：

```bash
python3 scripts/create-star-map-contact-sheet.py
```
