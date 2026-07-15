# 语法星图前端 Handover

> 交接日期：2026-07-15
> 资产版本：v1
> 资产状态：53/53 `production`
> 适用项目：React 19 + TypeScript + Vite + Tailwind CSS

## 1. 交接结论

语法星图的全部位图资产已经生产、归档并通过技术门禁。前端可以直接使用 `public/assets/star-map/` 下的成品，不需要再进行裁切、抠图、尺寸调整或颜色修正。

当前仓库尚未实现星图页面、`GET /api/user/starmap`、`newlyLit`、`newTitles`、`user_stars` 或 `user_titles`。前端开发应先按照 [`star-map-system-design.md`](./star-map-system-design.md) 的接口结构建立 mock/adapter；后端 M1 完成后只替换数据源，不改变视图层的数据结构。

## 2. 目录边界

| 路径 | 使用者 | 是否进入线上包 | 说明 |
|---|---|---:|---|
| `public/assets/star-map/` | 前端 | 是 | 仅包含 53 项运行时位图，约 20 MB |
| `design-assets/star-map/` | 美术/维护者 | 否 | 生成源、提示词、淘汰稿、评审图、manifest 和生产计划 |
| `docs/star-map-concept.md` | 设计/前端 | 否 | 视觉规范与动态层边界 |
| `docs/star-map-system-design.md` | 前后端 | 否 | 星目录、接口、判定和数据结构 |

硬性规则：应用代码只能请求 `/assets/star-map/` 目录下的生产文件，不得引用 `design-assets/star-map/source/` 或 `review/`。

## 3. 前端实现范围

前端负责：

1. 星图页面入口、路由、加载态、空状态和错误态。
2. 消费 `/api/user/starmap`，在接口完成前使用同构 mock。
3. 维护星座和星点的响应式布局坐标。
4. 使用 SVG/Canvas 绘制星点、连线、进度和集齐动画。
5. 将位图组合为 Locked、Lit、Just-lit 和 Hidden 状态。
6. 实现星详情卡、收集进度、称号展示和佩戴入口。
7. 响应 `newlyLit` / `newTitles`，播放一次性庆祝流程。
8. 处理减少动态效果、键盘操作、读屏文本和触控热区。

位图中故意没有星点坐标、连线、文字和业务进度；这些必须保持为动态层。

## 4. 推荐图层结构

从底到顶保持以下顺序：

1. `background`：移动端或桌面夜空背景。
2. `constellation-lines`：SVG/Canvas 暗线、亮线与绘制动画。
3. `constellation-totems`：八个透明星座图腾，作为分区视觉锚点。
4. `star-nodes`：30 枚可交互星标及 Locked/Hidden 叠层。
5. `celebration-effects`：爆发光、星尘、流星、称号横幅。
6. `hud`：返回按钮、总进度、详情卡、称号和无障碍文本。

建议使用归一化坐标而非设备像素：

```ts
type Point = { x: number; y: number }; // 0..1

type ConstellationLayout = {
  totem: Point;
  stars: Record<string, Point>;
  edges: Array<[string, string]>;
};

type ResponsiveLayouts = {
  portrait: Record<string, ConstellationLayout>;
  landscape: Record<string, ConstellationLayout>;
};
```

布局数据应独立于 React 组件和后端 catalog，便于多端调整。连线端点使用星标中心；Lit 星之间显示亮线，未点亮区段保持暗线或虚线。

## 5. 背景与响应式规则

| 场景 | 资产路径 | 交付尺寸 |
|---|---|---:|
| 竖屏/移动端星图 | `/assets/star-map/backgrounds/mobile-v1.webp` | 2160×3840 |
| 横屏/Web/平板星图 | `/assets/star-map/backgrounds/desktop-v1.webp` | 3840×2160 |
| 移动端空状态封面 | `/assets/star-map/backgrounds/empty-state-cover-v1.webp` | 2160×3840 |

- 背景使用 `cover`，但星座布局必须限制在中央安全区。
- 推荐优先按宽高比切换背景，而不是只按屏宽：横向宽高比使用 desktop，其余使用 mobile。
- 桌面空状态不要拉伸竖版封面；使用 desktop 背景，并动态叠加 `mascots/guide-v1.png`。
- 顶部导航和底部安全区需考虑 Capacitor 的 `safe-area-inset-*`。

## 6. 星状态合成

| 数据状态 | 视觉组合 | 交互 |
|---|---|---|
| 普通 Locked | 对真实星标降低饱和度/亮度，再叠加 `locked-mask-v1.png` | 可打开详情，显示进度 |
| Hidden + Locked | 只显示 `hidden-question-v1.png`；不得泄露真实图标、标题或条件 | 可提示“隐藏星辰” |
| Lit | 显示真实星标；按稀有度提供克制的静态光晕 | 可打开完整详情 |
| Just-lit | Lit 星标 + `burst-flare-v1.png` + `stardust-v1.png`；画布层播放流星 | 动画结束回到 Lit |

建议 CSS 基线：

```css
.star--locked {
  filter: grayscale(1) saturate(.25) brightness(.48);
  opacity: .78;
}

@media (prefers-reduced-motion: reduce) {
  .star-map * {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

`title-banner-v1.png` 中央为空，称号文字必须用 HTML/SVG 动态叠加，不能编辑位图写死标题。

## 7. 通用资产

### 星座图腾

| constellation key | 路径 |
|---|---|
| `start` | `/assets/star-map/constellations/start-v1.png` |
| `diligent` | `/assets/star-map/constellations/diligent-v1.png` |
| `streak` | `/assets/star-map/constellations/streak-v1.png` |
| `accuracy` | `/assets/star-map/constellations/accuracy-v1.png` |
| `summit` | `/assets/star-map/constellations/summit-v1.png` |
| `structure` | `/assets/star-map/constellations/structure-v1.png` |
| `explore` | `/assets/star-map/constellations/explore-v1.png` |
| `fun` | `/assets/star-map/constellations/fun-v1.png` |

### 稀有度底座

| rarity | 路径 |
|---|---|
| `common` | `/assets/star-map/rarities/common-base-v1.png` |
| `rare` | `/assets/star-map/rarities/rare-base-v1.png` |
| `epic` | `/assets/star-map/rarities/epic-base-v1.png` |
| `legendary` | `/assets/star-map/rarities/legendary-base-v1.png` |

具体星标已经包含对应稀有度边框；底座用于通用占位、未知内容或详情装饰，不要再次垫在星标下造成双层边框。

### 特效与吉祥物

| 用途 | 路径 |
|---|---|
| Locked 遮罩 | `/assets/star-map/effects/locked-mask-v1.png` |
| Hidden 问号 | `/assets/star-map/effects/hidden-question-v1.png` |
| 流星 | `/assets/star-map/effects/shooting-star-v1.png` |
| 点亮爆发 | `/assets/star-map/effects/burst-flare-v1.png` |
| 星尘 | `/assets/star-map/effects/stardust-v1.png` |
| 空白称号横幅 | `/assets/star-map/effects/title-banner-v1.png` |
| 引导吉祥物 | `/assets/star-map/mascots/guide-v1.png` |
| 庆祝吉祥物 | `/assets/star-map/mascots/celebrate-v1.png` |

## 8. 30 枚星标映射

前端必须以 API 返回的 `star.key` 显式查表，不要依赖文件遍历顺序，也不要用标题拼文件名。

| star key | 资产路径 | rarity |
|---|---|---|
| `start.first_q` | `/assets/star-map/stars/start-first-q-v1.png` | common |
| `start.first_checkin` | `/assets/star-map/stars/start-first-checkin-v1.png` | common |
| `start.first_perfect` | `/assets/star-map/stars/start-first-perfect-v1.png` | rare |
| `diligent.10` | `/assets/star-map/stars/diligent-10-v1.png` | common |
| `diligent.50` | `/assets/star-map/stars/diligent-50-v1.png` | rare |
| `diligent.100` | `/assets/star-map/stars/diligent-100-v1.png` | epic |
| `diligent.500` | `/assets/star-map/stars/diligent-500-v1.png` | legendary |
| `streak.3` | `/assets/star-map/stars/streak-3-v1.png` | common |
| `streak.7` | `/assets/star-map/stars/streak-7-v1.png` | rare |
| `streak.14` | `/assets/star-map/stars/streak-14-v1.png` | epic |
| `streak.30` | `/assets/star-map/stars/streak-30-v1.png` | legendary |
| `accuracy.perfect10` | `/assets/star-map/stars/accuracy-perfect10-v1.png` | rare |
| `accuracy.perfect50` | `/assets/star-map/stars/accuracy-perfect50-v1.png` | epic |
| `accuracy.streak5` | `/assets/star-map/stars/accuracy-streak5-v1.png` | epic |
| `summit.inter` | `/assets/star-map/stars/summit-inter-v1.png` | rare |
| `summit.adv` | `/assets/star-map/stars/summit-adv-v1.png` | epic |
| `summit.adv20` | `/assets/star-map/stars/summit-adv20-v1.png` | legendary |
| `structure.sv` | `/assets/star-map/stars/structure-sv-v1.png` | common |
| `structure.svo` | `/assets/star-map/stars/structure-svo-v1.png` | common |
| `structure.sp` | `/assets/star-map/stars/structure-sp-v1.png` | common |
| `structure.svoo` | `/assets/star-map/stars/structure-svoo-v1.png` | rare |
| `structure.svoc` | `/assets/star-map/stars/structure-svoc-v1.png` | rare |
| `explore.ocr` | `/assets/star-map/stars/explore-ocr-v1.png` | rare |
| `explore.custom` | `/assets/star-map/stars/explore-custom-v1.png` | rare |
| `explore.theme` | `/assets/star-map/stars/explore-theme-v1.png` | common |
| `explore.all_levels` | `/assets/star-map/stars/explore-all-levels-v1.png` | epic |
| `fun.morning` | `/assets/star-map/stars/fun-morning-v1.png` | rare |
| `fun.night` | `/assets/star-map/stars/fun-night-v1.png` | rare |
| `fun.points1000` | `/assets/star-map/stars/fun-points1000-v1.png` | legendary |
| `fun.egg` | `/assets/star-map/stars/fun-egg-v1.png` | legendary |

建议在前端建立 `starMapAssets.ts`，导出 `as const satisfies Record<StarKey, string>`；开发环境遇到未知 key 时报警，生产环境回退到对应 rarity 底座。

## 9. 数据适配要求

视图层只依赖下面的稳定模型：

```ts
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

type StarViewModel = {
  key: string;
  title: string;
  rarity: Rarity;
  hidden: boolean;
  lit: boolean;
  litAt?: string;
  progress?: { cur: number; target: number };
};
```

- 隐藏星未解锁时后端只返回 `title: "???"`，前端不得从本地映射反查真实标题。
- `progress` 可能缺省；集合型和布尔型条件不能假定有百分比。
- `newlyLit` 和 `newTitles` 是一次性事件，播放后要在前端会话中去重，避免刷新重复庆祝。
- 接口失败时保留页面框架并提供重试，不要误显示为“0 颗星”。

## 10. 性能与多端

- 首屏只预加载当前宽高比的背景和首屏星座；其余星标使用懒加载与 `decoding="async"`。
- 透明 PNG 不要转成 CSS base64；保持独立静态文件，利用浏览器缓存。
- 连线和持续闪烁不要每帧触发 React state；动画交给 CSS、SVG 或 Canvas。
- 同一时间只播放一个主庆祝序列，避免大量透明层同时合成。
- Android/iOS 打包前执行 `npm run build` 和对应的 Capacitor sync；资产位于 `public/`，会自动进入 Web 构建。
- 不要将 `design-assets/` 复制进移动端包或 CDN。

## 11. 无障碍与交互门禁

- 星节点可点击区域至少 44×44 CSS px，并支持键盘聚焦和 Enter/Space。
- 节点的可访问名称包含星名、稀有度、点亮状态和可用进度。
- 装饰图腾、星尘和流星使用 `aria-hidden="true"`。
- 稀有度必须同时显示文字或形状差异，不能只依靠颜色。
- `prefers-reduced-motion: reduce` 下禁用流星、持续闪烁和大范围粒子，只保留短淡入与静态高亮。
- 夜空上的正文、进度和按钮需满足可读对比度；不要把文字写入背景图。

## 12. 验收步骤

提交前运行：

```bash
node scripts/verify-star-map-assets.mjs --require-complete
npm run build
```

前端功能验收至少覆盖：

- [ ] 30 个 API star key 均能命中正确图片。
- [ ] 8 个星座在 portrait/landscape 布局中无裁切和重叠。
- [ ] Locked、Hidden、Lit、Just-lit 四种组合符合 §6。
- [ ] 隐藏星未解锁时不泄露标题、条件或真实图标。
- [ ] 空状态在移动端使用封面，在桌面端使用背景 + 动态吉祥物。
- [ ] 减少动态效果模式不播放流星和粒子。
- [ ] 网络请求中不存在 `design-assets/`、`source/` 或 `review/`。
- [ ] Web、Android 和 iOS 至少各完成一次关键页面截图检查。

视觉总览位于 [`design-assets/star-map/review/final-assets-v1-contact-sheet.jpg`](../design-assets/star-map/review/final-assets-v1-contact-sheet.jpg)，生产记录位于 [`design-assets/star-map/manifest.json`](../design-assets/star-map/manifest.json)。
