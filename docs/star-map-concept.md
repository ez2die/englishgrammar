# 语法星图 · 概念/视觉设计文档(出图用)

> 用途: **AI 生图的美术指南**。本文只讲"长什么样",不讲数据/接口/判定逻辑(那些在 `star-map-system-design.md`)。
> 与系统设计的唯一交集是**名词表**:8 个星座名、~28 颗星名、4 档稀有度——这里给它们视觉定义,系统设计给它们逻辑定义。
> 目标用户: 小朋友(中小学) · 语气: 温暖、鼓励、奇妙、可爱。

---

## 0. 一句话概念
一片**温柔的夜空天文馆**:孩子每达成一件事,就点亮一颗星;星连成星座,星座拼成属于自己的、越来越亮的星图。

---

## 1. 总体美术方向(Art Direction)

| 维度 | 定义 |
|---|---|
| **风格** | 梦幻童趣 + 圆润扁平插画 / 贴纸感(rounded flat illustration, sticker-like),柔和发光,现代 UI 插画质感 |
| **参考气质** | 《Monument Valley》的柔和几何 + 儿童绘本星空 + 天文馆穹顶投影 |
| **情绪** | 安心、好奇、被鼓励;绝不冷峻/科幻硬核 |
| **光** | 柔和辉光(soft bloom),星体有光晕,无锐利高对比 |
| **线条** | 统一圆角、等宽描边(可选 2–3px 柔描边),无杂乱细节 |
| **禁忌** | 不要写实照片感、不要恐怖/黑暗、不要密集小字、不要真实人脸 |

**统一画面主色**
- 夜空底:深靛蓝 → 深紫的竖向渐变(#1b1b3a → #2a1a4a 附近),点缀极淡的青/品红星云。
- 稀有度色(见 §3)。
- 暖色点睛:琥珀金(奖励/称号)。

---

## 2. 世界/舞台(背景)
- **夜空穹顶**:柔和渐变夜空 + 稀疏飘散的星尘、极淡的彩色星云雾。
- **地平线(可选)**:底部一条柔和的小山丘剪影 / 一个小小的天文台圆顶,营造"仰望"的安全感。
- **吉祥物(可选,非必需)**:一只圆滚滚的小星星精灵 或 一个戴帽子的小宇航员小孩,表情友好,作为空状态/引导角色。
- 留白充足,星座之间有呼吸感,不要塞满。

---

## 3. 稀有度视觉语言(四档 + 隐藏)
> 这是全套图标/星体必须一致遵守的"发光规范"。

| 稀有度 | 颜色 | 星体表现 | 光晕/特效 |
|---|---|---|---|
| 普通 Common | 柔白 / 象牙白 | 小星,实心 | 微弱柔光 |
| 稀有 Rare | 天蓝 / 青 | 稍大 | 轻微闪烁 + 淡蓝光晕 |
| 史诗 Epic | 品紫 / 紫罗兰 | 大 | 明显光晕 + 细碎光尘 |
| 传说 Legendary | 琥珀金 | 最大 | 强光晕 + 拖尾 + 偶发闪光 |
| 隐藏 Hidden(未解锁) | 无色 | 一个暗灰问号或朦胧微点 | 无光,点亮后按其真实稀有度呈现 |

**星体三态**(每颗星都要出这三态素材,便于合成)
1. **未点亮 Locked**:去饱和的暗色剪影/微弱圆点(隐藏星显 `?`)。
2. **已点亮 Lit**:填色 + 稀有度辉光,轻微 twinkle。
3. **刚点亮 Just-lit**:一次性爆发闪光 + 流星拖尾(用于解锁动画帧/特效贴图)。

---

## 4. 八大星座 · 视觉身份
> 每个星座 = 一个"由星点连成的图形 + 主题小图腾"。下面给每座的**造型母题**和**氛围**,供分别出图。

| 星座 | 造型母题 | 氛围/配色倾向 |
|---|---|---|
| 🧭 启程座 | 一颗明亮**北极星** + 小巧**指南针玫瑰** | 温暖迎新,金白 |
| 📚 勤学座 | 星点连成一本**翻开的书** + 羽毛笔 | 沉静好学,蓝白 |
| 🔥 恒心座 | 星点连成**篝火/火苗** | 温暖坚持,橙红 |
| 🎯 神射座 | 星点连成**弓与箭** 指向一个**靶心** | 专注精准,青蓝 |
| ⛰️ 登峰座 | 星点连成**山峰**,峰顶一颗星 | 攀登向上,紫蓝 |
| ⭐ 句型座 | 5 颗星组成**五角星/五芒星** | 收集成就感,金紫 |
| 🧭 探索座 | 星点连成**望远镜 / 纸飞机 / 罗盘** | 好奇冒险,青绿 |
| 💫 奇趣星云 | 一团**彩色星云**,内藏若隐若现的小星 | 神秘惊喜,虹彩渐变 |

**连线规范**:星座内的星用**柔和发光的细线**连接(点亮后才连);未集齐时线是虚的/暗的,集齐瞬间线被"点亮画出"。

---

## 5. 星辰图标(Star Emblems)
每颗星除了"发光星体",还配一个**小图腾**(sticker 风,圆润、等重描边、放在星形/勋章框内,框环用稀有度色)。示例母题:
- 启程:🌱 嫩芽 · 📅 日历 · ⭐ 小星
- 勤学:📖 书 · 💯 百分 · 🌊 书海
- 恒心:🔥 火苗 · 🗓️ 日历×火 · 💎 钻石
- 神射:🎯 靶 · ✨ 命中 · 🏹 连射
- 登峰:🧗 攀登 · 🏔️ 山 · 🎓 学位帽
- 句型:5 张不同颜色的"句型卡"小星
- 探索:📸 相机 · ✍️ 铅笔 · 🎨 调色盘 · 🧭 罗盘
- 星云:🌅 日出 · 🦉 猫头鹰 · 💰 金币 · ❓ 问号(隐藏)

> 出图时保持**同一套线条粗细 + 圆角 + 内边距**,整套图标才协调。建议一次生成"图标风格样张(style sheet)"锁定风格。

---

## 6. 解锁庆祝的视觉资产
- **流星**:一道柔和拖尾的流星划过,落点炸开点亮新星。
- **星座连线动画**:集齐时,发光线依次画出,整座"亮起来"。
- **称号横幅**:一条丝带/星光横幅,金色描边,写称号(如「句型观星者」)。
- **彩带/星尘**:轻柔的金色星尘飘落(非俗气五彩纸屑)。

---

## 7. 页面观感(仅视觉,不含布局逻辑)
- 星图页:整屏夜空画布,8 个星座分区散布,亮星发光、暗星微点;顶部一条柔和的"收集进度"光带。
- 点星卡片:小巧圆角玻璃拟态卡,展示星图腾 + 名称 + 稀有度光环。
- 整体给人"这是我的一片天,还有很多空位等我填满"的期待感。

---

## 8. 需要产出的图片资产清单(给出图排期用)
1. **夜空背景** ×1(主画布,可竖屏 9:16 或适配屏比)
2. **8 个星座插画**(星点+连线+母题图腾),各 1 张,建议**透明底**便于合成
3. **星辰图标 ~28 个** × **三态(locked / lit / just-lit)**,透明底
4. **稀有度勋章框** ×4(白/蓝/紫/金环)
5. **庆祝特效**:流星、星尘、星座连线光效、称号横幅
6. **吉祥物**(可选)1–2 姿态
7. **空状态/封面图** ×1

---

## 9. AI 生图 · Prompt 库(可直接复制)

> 建议:先出一张 **风格样张** 锁定画风,拿到满意的 seed / 风格描述后,把下面的**通用风格后缀**追加到每条 prompt,保证全套一致。图标类务必要求**透明背景**。

### 9.0 通用风格后缀(每条都追加)
```
soft dreamy children's illustration, rounded flat sticker style, gentle glow and soft bloom,
cozy planetarium night sky, deep indigo-to-purple gradient, subtle nebula, warm and encouraging mood,
consistent line weight, no text, high quality, clean, kid-friendly
```
### 9.0 通用负面 prompt
```
photorealistic, realistic human face, scary, dark, horror, cluttered, tiny text, watermark,
harsh contrast, gore, low quality, jpeg artifacts
```

### 9.1 夜空背景
```
A cozy dreamy night-sky canvas for a kids' app, deep indigo to purple vertical gradient,
faint teal and magenta nebula clouds, scattered soft star dust, a tiny gentle observatory dome
silhouette on the horizon, lots of breathing space, [通用风格后缀]
— aspect 9:16
```

### 9.2 星座(模板,替换母题)
```
A constellation shaped like {AN OPEN BOOK / a small campfire / a bow and arrow with a target /
a mountain peak reaching a star / a telescope / a colorful nebula}, made of softly glowing star points
connected by gentle luminous lines, a small rounded emblem of {书 / 火苗 / 靶 / 山 / 望远镜} at its center,
transparent background, [通用风格后缀]
```

### 9.3 星辰图标(三态,举例)
```
Locked:  a small dim desaturated star silhouette icon, faint dot, transparent background, [后缀]
Lit:     a glowing {rarity: white/blue/purple/gold} star medal with a rounded {emblem} inside,
         soft halo ring in the rarity color, gentle sparkle, sticker style, transparent background, [后缀]
Just-lit: the same lit star with a bright burst flare and a short shooting-star trail, transparent background, [后缀]
```

### 9.4 稀有度勋章框(×4)
```
A rounded star-shaped medal frame with a glowing {white / sky-blue / violet / amber-gold} ring,
empty center for an icon, soft bloom, sticker style, transparent background, [后缀]
```

### 9.5 庆祝特效
```
A gentle shooting star with a soft glowing trail arcing across a night sky, sparkles at the impact point,
transparent background, [后缀]

A soft golden star-dust confetti burst, delicate and dreamy (not gaudy), transparent background, [后缀]

A ribbon banner with soft golden outline for an achievement title, empty for text, transparent background, [后缀]
```

### 9.6 吉祥物(可选)
```
A cute round little star sprite mascot with a friendly face and tiny arms, OR a small child astronaut
with a rounded helmet, warm and encouraging, sticker style, transparent background, [后缀]
```

### 一致性小贴士
- 固定 **seed**(支持的模型)+ 复用同一段风格描述,整套才统一。
- 图标/特效/勋章一律**透明底**,便于叠到 §9.1 的背景上。
- 先做 §5 的"图标样张"定风格,再批量出其余图标。
- 尺寸:背景 9:16;图标/勋章方形(1:1);星座插画建议方形透明底。

---

## 10. 与系统设计的边界(重要)
- 本文**不定义**:解锁条件、积分、数据表、接口、判定时机 → 见 `star-map-system-design.md`。
- 本文**只交付**:画风、8 星座视觉、稀有度视觉、星辰图标、庆祝特效、出图 prompt 与资产清单。
- 两文档通过**共享名词表**(星座名/星名/稀有度枚举)对齐,各自独立演进,互不阻塞。
