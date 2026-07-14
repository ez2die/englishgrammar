# 语法星图 · 系统设计文档(技术/逻辑)

> 用途: **工程实现规格**。本文只讲"怎么运作"——数据模型、判定逻辑、接口、集成、回溯。
> 视觉/美术在 `star-map-concept.md`,本文不涉及任何画风/颜色/出图。
> 两文档通过**共享名词表**(星座 key / 星 key / 稀有度枚举)对齐,各自独立演进。
> Status: 设计稿(未实现)。沿用本项目既有"服务端权威"模式(见 points/check-in 实现)。

---

## 1. 范围与目标
- 把已有的答题、签到、难度、拍照、翻译等行为,统一映射为"点亮星辰 / 集齐星座 / 获得称号"。
- 服务端权威判定,客户端仅展示;不信任客户端上报的达成状态。
- 幂等:同一颗星只点亮一次、奖励只发一次。
- 支持对存量用户**回溯**已达成项。
- 非目标:排行榜、赛季、社交分享(未来)。

---

## 2. 领域模型(实体)

| 实体 | 说明 |
|---|---|
| **Constellation(星座)** | 成就类别。静态定义。含 key、title、称号 key。 |
| **Star(星)** | 单个成就。静态定义。含 key、所属 constellation、rarity、criteria、points、hidden。 |
| **Title(称号)** | 集齐某星座授予的头衔。静态定义,key。 |
| **UserStar** | 某用户点亮某星的记录(user_id, star_key, lit_at)。 |
| **UserTitle** | 某用户获得的称号(user_id, title_key, earned_at)。 |
| **users.active_title** | 当前佩戴称号。 |

**稀有度**为枚举 `common | rare | epic | legendary`(隐藏是 `hidden` 标志,不是稀有度)。稀有度在本文只决定**奖励额度**;其视觉在概念文档定义。

---

## 3. 星辰目录(Catalog)
> 静态定义,建议放 `server/services/achievements/catalog.js`,前端通过接口获取或共享同一份。
> 每条:`{ key, constellation, title, rarity, hidden, points, criteria }`。`criteria` 用统一的"指标 + 阈值"结构,便于判定引擎通用化。

**criteria 统一结构**
```
{ metric: <指标名>, op: '>=' , value: <阈值> }
// 特殊: metric='set_contains'（句型收集）：{ metric:'correct_structures', op:'contains', value:'SVO' }
// 特殊: metric='flag'（探索类）：{ metric:'used_ocr', op:'==', value:true }
```

| key | constellation | rarity | hidden | points | criteria(metric op value) |
|---|---|---|---|---|---|
| start.first_q | start | common | no | 10 | practices >= 1 |
| start.first_checkin | start | common | no | 10 | checkin_total >= 1 |
| start.first_perfect | start | rare | no | 30 | perfect_total >= 1 |
| diligent.10 | diligent | common | no | 10 | practices >= 10 |
| diligent.50 | diligent | rare | no | 30 | practices >= 50 |
| diligent.100 | diligent | epic | no | 50 | practices >= 100 |
| diligent.500 | diligent | legendary | no | 100 | practices >= 500 |
| streak.3 | streak | common | no | 10 | max_checkin_streak >= 3 |
| streak.7 | streak | rare | no | 30 | max_checkin_streak >= 7 |
| streak.14 | streak | epic | no | 50 | max_checkin_streak >= 14 |
| streak.30 | streak | legendary | no | 100 | max_checkin_streak >= 30 |
| accuracy.perfect10 | accuracy | rare | no | 30 | perfect_total >= 10 |
| accuracy.perfect50 | accuracy | epic | no | 50 | perfect_total >= 50 |
| accuracy.streak5 | accuracy | epic | no | 50 | max_perfect_streak >= 5 |
| summit.inter | summit | rare | no | 30 | intermediate_done >= 1 |
| summit.adv | summit | epic | no | 50 | advanced_done >= 1 |
| summit.adv20 | summit | legendary | no | 100 | advanced_done >= 20 |
| structure.sv | structure | common | no | 10 | correct_structures contains SV |
| structure.svo | structure | common | no | 10 | correct_structures contains SVO |
| structure.sp | structure | common | no | 10 | correct_structures contains SP |
| structure.svoo | structure | rare | no | 30 | correct_structures contains SVOO |
| structure.svoc | structure | rare | no | 30 | correct_structures contains SVOC |
| explore.ocr | explore | rare | no | 30 | used_ocr == true |
| explore.custom | explore | rare | no | 30 | used_custom == true |
| explore.theme | explore | common | no | 10 | changed_theme == true |
| explore.all_levels | explore | epic | no | 50 | basic_done>0 && inter_done>0 && adv_done>0 |
| fun.morning | fun | rare | no | 30 | practice_in_hour_range [6,9) |
| fun.night | fun | rare | no | 30 | practice_in_hour_range [22,24) |
| fun.points1000 | fun | legendary | no | 100 | total_points >= 1000 |
| fun.egg | fun | legendary | **yes** | 150 | (隐藏:如 7 天内每天至少 1 次完美) |

**称号(Title)**:集齐某星座全部**非隐藏**星即授予。
| title_key | 触发星座 | 名称 |
|---|---|---|
| title.scholar | diligent | 星空学者 |
| title.eternal_flame | streak | 不灭之火 |
| title.stargazer | structure | 句型观星者 |
| title.climber | summit | 攀星者 |
| title.starmaster | (全部星座集齐) | 星图大师 |

---

## 4. 指标(Metrics)与来源
> 判定引擎需要把用户当前状态算成一组指标。多数可从现有表聚合,少量需补埋点。

| metric | 来源 |
|---|---|
| practices | `SELECT COUNT(*) FROM practice_history WHERE user_id=?` |
| perfect_total | `SELECT COUNT(*) FROM points_ledger WHERE user_id=? AND source='practice' AND perfect=1` |
| {basic,inter,adv}_done | `SELECT COUNT(*) FROM points_ledger WHERE user_id=? AND source='practice' AND level=?` |
| checkin_total | `SELECT COUNT(*) FROM points_ledger WHERE user_id=? AND source='checkin'` |
| max_checkin_streak | `users.max_checkin_streak`(签到时维护,见 §7) |
| max_perfect_streak | `users.max_perfect_streak`(计分时维护,见 §7) |
| total_points | `users.total_points` |
| correct_structures | `SELECT DISTINCT structure_type FROM practice_history WHERE user_id=? AND structure_correct=1`(需落 `structure_correct` 列,见 §7) |
| practice_in_hour_range | 计分时按本地时判定并直接尝试点亮对应星(见 §5 备注),或落 `practice_history.hour` 列 |
| used_ocr / used_custom / changed_theme | `users` 布尔列,对应埋点置位(见 §7) |

---

## 5. 判定引擎 evaluateStars(userId, ctx?)
**时机**:每次 `POST /history`、`POST /checkin`、探索埋点(OCR/自定义/换主题)后调用。
**算法**
1. 读取该用户已点亮的 star_keys 集合 `lit`(一次查询)。
2. 计算当前 metrics(§4)。
3. 遍历 catalog 中**未在 `lit`** 的星:
   - 用 `criteria` 对 metrics 求值;满足则加入 `toLight`。
4. 事务内:对 `toLight` 每颗 `INSERT OR IGNORE INTO user_stars(user_id, star_key)`(唯一约束天然幂等)。
   - 仅当**本次真正插入成功**(即首次点亮)时,发放该星 `points`:`INSERT points_ledger(..., source='achievement', points=star.points)` + `users.total_points += points`。
5. 检查是否有星座因本次点亮而"**集齐全部非隐藏星**":若是且未发过对应 title → `INSERT user_titles` + 授予称号(可另发一次性奖励)。检查是否所有星座都集齐 → 授予 `title.starmaster`。
6. 返回 `{ newlyLit: Star[], newTitles: Title[] }`。

**幂等 / 并发**:靠 `user_stars(user_id,star_key)` 与 `user_titles(user_id,title_key)` 的唯一约束;奖励只在"插入成功"分支发放,天然防重复发。整个过程放一个事务或串行执行(sqlite 单写)。

**备注(时段类)**:`practice_in_hour_range` 依赖单次事件的时间点,难以从聚合还原历史;建议在 `POST /history` 落库时**当场**判定当前本地时并直接尝试点亮 `fun.morning/night`(而非在通用 evaluate 里回溯)。

---

## 6. 内联返回(即时庆祝)
`POST /api/user/history` 与 `POST /api/user/checkin` 的响应体追加:
```json
{
  "...existing (points 等)...": {},
  "newlyLit": [ { "key":"diligent.100", "title":"百题斩", "rarity":"epic", "points":50 } ],
  "newTitles": [ { "key":"title.scholar", "name":"星空学者" } ]
}
```
前端据此弹出解锁庆祝(视觉见概念文档)。

---

## 7. 需要新增的存储与埋点(Migrations)
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
-- users 追加(幂等 ALTER,duplicate column 忽略):
--   active_title TEXT
--   max_checkin_streak  INTEGER NOT NULL DEFAULT 0
--   max_perfect_streak  INTEGER NOT NULL DEFAULT 0
--   used_ocr        INTEGER NOT NULL DEFAULT 0
--   used_custom     INTEGER NOT NULL DEFAULT 0
--   changed_theme   INTEGER NOT NULL DEFAULT 0
-- practice_history 追加:
--   structure_correct INTEGER   -- 计分时写入,便于 correct_structures 查询
```
**埋点位置**
- `max_checkin_streak`:`POST /checkin` 更新 streak 后 `MAX(旧, 新)`。
- `max_perfect_streak`:`POST /history` 计分时维护连续完美计数(完美+1,否则归零),取 MAX。
- `structure_correct`:`POST /history` 计分时把 `structure_correct` 一并落到 practice_history。
- `used_ocr`:`POST /api/ocr-normalize` 成功后置 1(需带用户身份——目前该接口未鉴权;可选:仅登录时置位,或前端登录态下调用)。
- `used_custom`:`POST /api/analyze-sentence`(自定义句)置 1。
- `changed_theme`:前端换主题时打一个 `POST /api/user/flag {name:'theme'}` 或在下次 history 请求捎带。

> 注:OCR/自定义接口当前无需登录也能用;要计入成就需要用户身份。实现时决定:①这些成就仅对登录用户在登录态操作时触发;或②给这两个接口加可选鉴权。

---

## 8. 接口(API Contracts)

### GET /api/user/starmap(需鉴权)
返回整册 + 用户进度。
```json
{
  "summary": { "litCount": 12, "totalStars": 28, "constellationsDone": 2, "totalConstellations": 8 },
  "activeTitle": "title.scholar",
  "titles": [ { "key":"title.scholar", "name":"星空学者", "earnedAt":"..." } ],
  "constellations": [
    {
      "key":"diligent", "title":"勤学座",
      "stars":[
        { "key":"diligent.10","title":"好学少年","rarity":"common","hidden":false,
          "lit":true, "litAt":"2026-07-10", "progress": {"cur":10,"target":10} },
        { "key":"diligent.100","title":"百题斩","rarity":"epic","hidden":false,
          "lit":false, "progress": {"cur":34,"target":100} }
      ]
    }
  ]
}
```
- 未解锁的隐藏星返回 `{ hidden:true, lit:false, title:"???", criteria 不下发 }`。
- `progress` 仅对"数值阈值型"criteria 计算;集合/布尔型可省略或给 0/1。

### POST /api/user/title(需鉴权)
`{ "titleKey": "title.scholar" }` → 切换佩戴(仅限已拥有);更新 `users.active_title`。

### 内联字段
见 §6:`/history`、`/checkin` 响应追加 `newlyLit`、`newTitles`。

---

## 9. 与积分系统集成
- 每颗星首次点亮发一次性积分(catalog.points),走现有账本:`points_ledger(source='achievement')` + `users.total_points +=`。
- 星座称号可另发奖励(可选,如 +80~200,`source='title'`)。
- 去重由 `user_stars`/`user_titles` 唯一约束保证:奖励只在"首次插入成功"时发。

---

## 10. 存量用户回溯(Backfill)
- 上线迁移后,对所有现有用户各跑一次 `evaluateStars`(或首次访问 starmap 时惰性执行一次)。
- 因奖励只在首次点亮发放,回溯天然幂等;beike 等历史活动会被追溯点亮并补发积分。
- 时段类(morning/night)无法从聚合回溯 → 回溯时跳过,仅对上线后的新答题生效(可接受)。
- `structure_correct` 列对历史行为空 → `correct_structures` 只统计新数据 + 可选一次性从 `analysis_snapshot.errors.summary.structureCorrect` 回填。

---

## 11. 边界与不变量
- 一星一次:`UNIQUE(user_id, star_key)`。
- 一称号一次:`UNIQUE(user_id, title_key)`。
- 奖励发放**当且仅当**首次点亮(INSERT 影响行数=1)。
- 隐藏星在解锁前:接口不下发其 criteria/title(防剧透)。
- 星座"集齐"只看**非隐藏**星(隐藏星是额外惊喜,不阻塞称号)。
- evaluate 必须对"未点亮集合"求值,避免重复处理已点亮星。

---

## 12. 里程碑(实现顺序)
- **M1 后端**:catalog + 两张表 + users 迁移 + `evaluateStars` + 内联返回 + `GET /starmap` + 关键埋点(perfect streak / structure_correct / checkin max)。
- **M2 前端**:星图页(消费 `/starmap`)+ 解锁庆祝(接概念文档美术)+ 入口 + 称号佩戴。
- **M3**:探索埋点(OCR/自定义/换主题)+ 隐藏彩蛋 + 存量回溯 + 打磨。

---

## 13. 测试要点
- 判定幂等:同一 metric 反复触发只点亮一次、只发一次积分。
- 阈值边界:practices 恰好 =阈值 触发。
- 星座集齐:最后一颗非隐藏星点亮时授予称号 + starmaster 全集齐检测。
- 隐藏星:接口不泄露条件;满足后正常点亮。
- 回溯:对已有历史用户跑一次,点亮数与积分与手算一致,再跑一次无变化(幂等)。
- 内联返回:`/history` 触发新星时,响应含 `newlyLit`。
