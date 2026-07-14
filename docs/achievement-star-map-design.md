# 语法星图 · 成就收集系统设计文档

> Status: **设计稿(未实现)** · Owner: ez2die · 关联系统: 积分(points_ledger / users.total_points)、每日签到、难度、拍照分析(OCR)、翻译
> 目标用户: 中小学生 / 小朋友

---

## 1. 目标与非目标

**目标**
- 用"收集"驱动小朋友持续练习,把已有的积分、签到、难度、拍照、翻译等零散动作编织成**一个统一的成长元目标**。
- 提供长期留存钩子:一张越攒越完整、越来越漂亮的"个人星图"。
- 每次使用都有"快到手的下一颗星",制造持续的目标牵引与即时正反馈。

**非目标**
- 不做排行榜 / 玩家对战(避免落后挫败,低龄用户尤甚)。
- 不做负向成就("你失败了"类)。
- 首版不做社交分享、赛季、限时活动(列入未来扩展)。

---

## 2. 设计哲学(为什么对小朋友有效)

| 心理机制 | 在本设计中的落点 |
|---|---|
| 格式塔闭合 / 收集欲 | 星座是"一套",缺口天然驱动补全 |
| 拥有感 / 骄傲 | 星图是专属作品,越攒越美 |
| 惊喜 / 多巴胺 | 稀有金星 + 流星点亮动画 + 隐藏彩蛋 |
| 目标梯度效应 | 首页永远显示"再答 N 题点亮下一颗星" |
| 身份认同(非竞争) | 集齐星座得"称号",可佩戴,却不比高低 |
| 即时反馈 | 解锁信息随答题/签到响应内联返回,当场庆祝 |

---

## 3. 核心隐喻:语法星图

- 一整片**夜空**,划分为若干 **星座(Constellation)**,每个星座 = 一个成就**类别**。
- 每颗 **星(Star)** = 一个具体成就。未解锁为暗点 `·`,解锁后**点亮 ✦**。
- 星按 **稀有度** 发光:白(普通)→ 蓝(稀有)→ 紫(史诗)→ 金(传说);隐藏星点亮前显示 `· / ???`。
- **集齐一个星座内全部星** → 自动**连线成形** → 授予该星座专属**称号**(可佩戴在用户名旁)。
- 时间越久,星图越亮、越完整。

---

## 4. 稀有度系统

| 稀有度 | 颜色 | 视觉 | 一次性积分奖励 |
|---|---|---|---|
| 普通 Common | 白 | 小星,微光 | +10 |
| 稀有 Rare | 蓝 | 稍大,轻微闪烁 | +30 |
| 史诗 Epic | 紫 | 大,光晕 | +50 |
| 传说 Legendary | 金 | 最大,强光晕 + 拖尾 | +100 |
| 隐藏 Hidden | — | 点亮前显示 `???`,点亮后按其真实稀有度呈现 | 视条件而定 |

---

## 5. 星辰目录(星座 × 星)

> 约 28 颗星 / 8 星座,可扩展。分级星带**进度条**(如"百题斩 34/100")。
> `criteria` 列给出机器可判定的口径,便于实现。

### 🧭 启程座 — 新手引导
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| start.first_q | 初出茅庐 | 普通 | practices >= 1 |
| start.first_checkin | 第一次打卡 | 普通 | checkin_total >= 1 |
| start.first_perfect | 初尝完美 | 稀有 | perfect_total >= 1 |

### 📚 勤学座 — 答题量(分级)
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| diligent.10 | 好学少年 | 普通 | practices >= 10 |
| diligent.50 | 勤学不辍 | 稀有 | practices >= 50 |
| diligent.100 | 百题斩 | 史诗 | practices >= 100 |
| diligent.500 | 题海遨游 | 传说 | practices >= 500 |

### 🔥 恒心座 — 连续签到
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| streak.3 | 三日不断 | 普通 | max_checkin_streak >= 3 |
| streak.7 | 一周坚持 | 稀有 | max_checkin_streak >= 7 |
| streak.14 | 半月恒心 | 史诗 | max_checkin_streak >= 14 |
| streak.30 | 不灭星火 | 传说 | max_checkin_streak >= 30 |

### 🎯 神射座 — 精准 / 完美
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| accuracy.perfect10 | 十全十美 | 稀有 | perfect_total >= 10 |
| accuracy.perfect50 | 百发百中 | 史诗 | perfect_total >= 50 |
| accuracy.streak5 | 连中五元 | 史诗 | max_perfect_streak >= 5 |

### ⛰️ 登峰座 — 难度挑战
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| summit.inter | 进阶者 | 稀有 | intermediate_done >= 1 |
| summit.adv | 挑战者 | 史诗 | advanced_done >= 1 |
| summit.adv20 | 从句大师 | 传说 | advanced_done >= 20 |

### ⭐ 句型座 — 五芒星收集(子图鉴)
5 颗小星组成五角形,每种句型**答对至少 1 次**点亮一颗;集齐 5 颗连成完整五芒星。
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| structure.sv | 主谓 SV | 普通 | correct_structures ∋ SV |
| structure.svo | 主谓宾 SVO | 普通 | correct_structures ∋ SVO |
| structure.sp | 主系表 SP | 普通 | correct_structures ∋ SP |
| structure.svoo | 主谓双宾 SVOO | 稀有 | correct_structures ∋ SVOO |
| structure.svoc | 主谓宾宾补 SVOC | 稀有 | correct_structures ∋ SVOC |
| (座完成) | 称号「句型观星者」 | 史诗 | 上述 5 星全亮 |

### 🧭 探索座 — 玩法探索
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| explore.ocr | 火眼金睛 | 稀有 | used_ocr = true |
| explore.custom | 自定义大师 | 稀有 | used_custom = true |
| explore.theme | 换装达人 | 普通 | changed_theme = true |
| explore.all_levels | 全难度探险 | 史诗 | basic_done>0 && intermediate_done>0 && advanced_done>0 |

### 💫 奇趣星云 — 趣味 / 隐藏(点亮前显 `???`)
| key | 星名 | 稀有度 | criteria |
|---|---|---|---|
| fun.morning | 早起鸟 | 稀有 | 任一 practice 的本地时 ∈ [6,9) |
| fun.night | 夜猫子 | 稀有 | 任一 practice 的本地时 >= 22 |
| fun.points1000 | 积分大亨 | 传说 | total_points >= 1000 |
| fun.egg (隐藏) | 神秘彩蛋 | 传说 | 隐藏条件(建议:连续 7 天每天至少 1 次完美) |

---

## 6. 称号(集齐星座授予,佩戴于用户名旁)

| 星座 | 称号 |
|---|---|
| 勤学座 | 星空学者 |
| 恒心座 | 不灭之火 |
| 句型座 | 句型观星者 |
| 登峰座 | 攀星者 |
| **全部星座集齐** | 星图大师(传说) |

- `users.active_title` 记录当前佩戴称号;可在个人页切换。

---

## 7. 解锁瞬间的仪式感(UX)

1. 一颗**流星**划过夜空 → 落点**点亮新星**(放大 + 光晕 + "叮"音效)。
2. 弹卡:`✨ 新星点亮:百题斩`,带稀有度光效 + 积分奖励飘字。
3. 若正好集齐某星座 → **自动画出连线** → 横幅:`🌟 星座完成!获得称号「星空学者」`。
4. **即时性**:解锁信息随 `POST /api/user/history`、`POST /api/user/checkin` 的响应**内联返回**(与现有积分同款机制),答完/签到当场庆祝。

---

## 8. 星图页面(UX)

- 深色夜空画布;八个星座分区分布。亮星发光,暗星是微弱圆点,隐藏星是 `·`。
- 顶部状态条:`已点亮 12/28 星 · 完成 2/8 星座`;稀有度图例。
- 点击某颗星 → 卡片:名称 / 说明 / 稀有度 / 进度(分级星)/ 解锁日期;未解锁显条件,隐藏星显 `???`。
- **「下一颗星」推荐位**:`再答 3 题点亮 ⭐好学少年`(取进度最接近达成的一颗)。
- 入口:首页顶部加 🌌 图标,或个人页(HistoryView)新增「星图」Tab。

---

## 9. 技术方案(留待实现,沿用"服务端权威"模式)

### 9.1 数据模型
- **星辰定义**(不入库):共享常量模块 `server/services/achievements/stars.js`
  `{ key, constellation, title, desc, icon, rarity, criteria, hidden, points }`,前端通过接口或打包共享同一份 catalog。
- **新表**
  ```sql
  CREATE TABLE user_stars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    star_key TEXT NOT NULL,
    lit_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, star_key),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE user_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title_key TEXT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, title_key),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  -- users 追加(幂等迁移):
  -- active_title TEXT
  -- max_checkin_streak INTEGER NOT NULL DEFAULT 0
  -- max_perfect_streak INTEGER NOT NULL DEFAULT 0
  -- used_ocr / used_custom / used_translation / changed_theme INTEGER DEFAULT 0
  ```

### 9.2 指标来源(大多现成,少量补埋点)
| 指标 | 来源 |
|---|---|
| practices(总题数) | `COUNT(practice_history)` |
| perfect_total | `COUNT(points_ledger WHERE perfect=1 AND source='practice')` |
| {basic,intermediate,advanced}_done | `COUNT(points_ledger WHERE level=? AND source='practice')` |
| max_perfect_streak | 在 `POST /history` 计分时增量维护 `users.max_perfect_streak` |
| checkin_total / max_checkin_streak | `users`(签到时维护 `max_checkin_streak`) |
| total_points | `users.total_points` |
| correct_structures | `SELECT DISTINCT structure_type FROM practice_history WHERE 该题结构判定正确`(结构正确性取自 `analysis_snapshot.errors.summary.structureCorrect`;建议计分时把"结构是否答对"落成一列便于查询) |
| 时段(morning/night) | practice 落库时按 `created_at` 本地时判定,或在计分时直接判定并点亮对应星 |
| used_ocr / used_custom / used_translation / changed_theme | **需补埋点**:分别在 `/api/ocr-normalize`、`/api/analyze-sentence`(自定义)、前端查看翻译、前端换主题时置位(users 布尔列或事件) |

### 9.3 判定与接口
- `evaluateStars(userId)`:在每次 `POST /history`、`POST /checkin`、探索埋点后调用;
  拉取上述指标 → 遍历 catalog → 对未点亮且满足 criteria 的星写入 `user_stars`,并检查是否恰好集齐某星座(写 `user_titles`)→ **返回本次新点亮的星 + 新完成的星座**。
- 新点亮的星附带的一次性积分,走现有积分账本:`INSERT points_ledger(..., source='achievement')` + `users.total_points += reward`。
- `GET /api/user/starmap`:返回整册(每颗星的 lit/进度/解锁日期)、已得称号、`active_title`、汇总(已点亮/总数、已完成星座数)。
- `POST /api/user/title`:切换佩戴称号(仅限已拥有)。
- 响应内联:`/history`、`/checkin` 的返回体加 `newlyLit: [...]`、`completedConstellations: [...]` 供前端即时庆祝。

### 9.4 存量用户回溯
上线时对所有现有用户跑一次 `evaluateStars`(或首次访问星图时惰性回溯),让 beike 等过往活动**追溯点亮**已达成的星。注意:回溯发放的积分需去重(靠 `user_stars` 唯一约束天然防重;积分只在"首次点亮"时发)。

---

## 10. 与现有系统的编织
- 每颗星给**一次性积分**(见稀有度表),星座完成再 +80~200 → 星图与积分互相强化。
- 签到、难度、拍照、自定义、翻译、换主题等动作,全部同时是"点亮某颗星"的行为 → 形成统一元目标。
- 头部/首页可佩戴一枚称号 + 展示"已点亮 X/28"。

---

## 11. 留待拍板的决策
1. 星是否发积分(推荐发,强化正反馈)还是纯装饰?
2. 是否要**称号佩戴**在名字旁(需 `active_title` + 切换 UI)?
3. 是否加**音效**(点亮/星座完成)?
4. 隐藏彩蛋星的具体"梗"与条件(可留若干位由运营定)。

---

## 12. 未来扩展(不在首版)
- 赛季 / 限时星座(节日主题)。
- 分享星图卡片到社交。
- 家长端:孩子的星图周报。
- 星星兑换(积分商店 / 头像框 / 主题解锁)。
- 更细的收集子图鉴(如"语法角色全收集")。

---

## 13. 实现里程碑建议(实现时参考)
- **M1 后端**:catalog + `user_stars`/`user_titles` 表 + `evaluateStars` + 内联返回 + `GET /starmap` + 补埋点。
- **M2 前端**:星图页面(星座网格/发光/点星卡片)+ 解锁流星庆祝 + 入口。
- **M3**:称号佩戴 + 存量用户回溯 + 隐藏彩蛋 + 音效打磨。
