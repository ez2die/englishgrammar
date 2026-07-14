/**
 * 语法星图 · 判定引擎(服务端权威)
 * evaluateStars: 计算指标 → 点亮新星(幂等)→ 发积分 → 检查星座集齐授予称号 → 返回新解锁
 * getStarmap: 组装整册 + 用户进度(供 GET /api/user/starmap)
 */
import { db } from '../../db/database.js';
import { STARS, CONSTELLATIONS, STARMASTER, TITLES, starPoints } from './catalog.js';

const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this); }));

/** 从答案的 structure_type 文本提取句型代码(顺序重要:先长后短) */
export function structCode(s) {
  if (!s) return null;
  if (s.includes('SVOC')) return 'SVOC';
  if (s.includes('SVOO')) return 'SVOO';
  if (s.includes('SVO')) return 'SVO';
  if (s.includes('SP')) return 'SP';
  if (s.includes('SV')) return 'SV';
  return null;
}

export async function computeMetrics(userId) {
  const u = await get(
    'SELECT total_points, max_checkin_streak, max_perfect_streak, used_ocr, used_custom, changed_theme FROM users WHERE id = ?',
    [userId]
  ) || {};
  const pc = await get('SELECT COUNT(*) c FROM practice_history WHERE user_id = ?', [userId]);
  const perfect = await get("SELECT COUNT(*) c FROM points_ledger WHERE user_id = ? AND source = 'practice' AND perfect = 1", [userId]);
  const checkins = await get("SELECT COUNT(*) c FROM points_ledger WHERE user_id = ? AND source = 'checkin'", [userId]);
  const lvl = await all("SELECT level, COUNT(*) c FROM points_ledger WHERE user_id = ? AND source = 'practice' GROUP BY level", [userId]);
  const structs = await all("SELECT DISTINCT structure_type s FROM practice_history WHERE user_id = ? AND structure_correct = 1", [userId]);

  const levelCount = {};
  lvl.forEach(r => { if (r.level) levelCount[r.level] = r.c; });
  const correct_structures = new Set(structs.map(r => structCode(r.s)).filter(Boolean));

  return {
    practices: pc?.c || 0,
    perfect_total: perfect?.c || 0,
    checkin_total: checkins?.c || 0,
    basic_done: levelCount.Basic || 0,
    inter_done: levelCount.Intermediate || 0,
    adv_done: levelCount.Advanced || 0,
    max_checkin_streak: u.max_checkin_streak || 0,
    max_perfect_streak: u.max_perfect_streak || 0,
    total_points: u.total_points || 0,
    correct_structures,
    used_ocr: !!u.used_ocr,
    used_custom: !!u.used_custom,
    changed_theme: !!u.changed_theme,
  };
}

/**
 * 判定并点亮。幂等:靠 user_stars / user_titles 唯一约束,积分仅在首次插入成功时发。
 * @param {number} userId
 * @param {object} ctx 额外事件上下文,如 { nowHour } 用于时段类星
 * @returns {Promise<{newlyLit:Array, newTitles:Array}>}
 */
export async function evaluateStars(userId, ctx = {}) {
  const litRows = await all('SELECT star_key FROM user_stars WHERE user_id = ?', [userId]);
  const lit = new Set(litRows.map(r => r.star_key));
  const m = await computeMetrics(userId);

  const newlyLit = [];
  for (const star of STARS) {
    if (lit.has(star.key)) continue;
    let ok = false;
    try { ok = !!star.check(m, ctx); } catch { ok = false; }
    if (!ok) continue;

    const ins = await run('INSERT OR IGNORE INTO user_stars(user_id, star_key) VALUES (?, ?)', [userId, star.key]);
    if (ins.changes === 1) {
      const pts = starPoints(star);
      if (pts > 0) {
        // The UNIQUE(user_id,star_key) insert above is the single source of truth
        // and prevents double-awards even under concurrent requests. The point
        // credit is two more statements; on the (rare) chance they fail after the
        // star is lit we log a reconcilable PARTIAL AWARD rather than a hard error.
        // (A single-connection sqlite transaction is intentionally NOT used here —
        // other endpoints share the connection and would be captured by an open
        // BEGIN across awaits. True ACID would need a dedicated write connection.)
        try {
          await run(
            "INSERT INTO points_ledger(user_id, points, base_points, accuracy_pct, level, perfect, milestone_bonus, source) VALUES (?, ?, ?, 0, NULL, 0, 0, 'achievement')",
            [userId, pts, pts]
          );
          await run('UPDATE users SET total_points = total_points + ? WHERE id = ?', [pts, userId]);
        } catch (e) {
          console.error(`[achievements] PARTIAL AWARD: star ${star.key} lit for user ${userId} but ${pts} pts not credited:`, e.message);
        }
      }
      lit.add(star.key);
      newlyLit.push({ key: star.key, title: star.title, rarity: star.rarity, points: pts });
    }
  }

  // 星座集齐 → 称号
  const newTitles = [];
  for (const c of CONSTELLATIONS) {
    if (!c.titleKey) continue;
    const stars = STARS.filter(s => s.constellation === c.key && !s.hidden);
    const done = stars.length > 0 && stars.every(s => lit.has(s.key));
    if (done) {
      const ins = await run('INSERT OR IGNORE INTO user_titles(user_id, title_key) VALUES (?, ?)', [userId, c.titleKey]);
      if (ins.changes === 1) newTitles.push({ key: c.titleKey, name: c.titleName });
    }
  }
  // 全部非隐藏星集齐 → 终极称号
  const allNonHidden = STARS.filter(s => !s.hidden);
  if (allNonHidden.every(s => lit.has(s.key))) {
    const ins = await run('INSERT OR IGNORE INTO user_titles(user_id, title_key) VALUES (?, ?)', [userId, STARMASTER.key]);
    if (ins.changes === 1) newTitles.push({ key: STARMASTER.key, name: STARMASTER.name });
  }

  return { newlyLit, newTitles };
}

/**
 * 服务端置位探索埋点(ocr / custom / theme)并重新判定。
 * 由真正发生该行为的接口调用(如 /api/ocr-normalize、/api/analyze-sentence),
 * 避免客户端自报刷分。
 */
export async function markExploration(userId, flag) {
  const cols = { ocr: 'used_ocr', custom: 'used_custom', theme: 'changed_theme' };
  const col = cols[flag];
  if (!col) return { newlyLit: [], newTitles: [] };
  await run(`UPDATE users SET ${col} = 1 WHERE id = ?`, [userId]);
  return evaluateStars(userId, {});
}

/** 组装整册 + 用户进度(GET /api/user/starmap 使用) */
export async function getStarmap(userId) {
  const litRows = await all('SELECT star_key, lit_at FROM user_stars WHERE user_id = ?', [userId]);
  const litAt = new Map(litRows.map(r => [r.star_key, r.lit_at]));
  const titleRows = await all('SELECT title_key, earned_at FROM user_titles WHERE user_id = ?', [userId]);
  const activeRow = await get('SELECT active_title FROM users WHERE id = ?', [userId]);
  const m = await computeMetrics(userId);

  const constellations = CONSTELLATIONS.map(c => {
    const stars = STARS.filter(s => s.constellation === c.key).map(s => {
      const isLit = litAt.has(s.key);
      const base = {
        key: s.key,
        rarity: s.rarity,
        hidden: s.hidden,
        lit: isLit,
        litAt: isLit ? litAt.get(s.key) : null,
        // 隐藏且未点亮 → 不泄露标题/条件
        title: s.hidden && !isLit ? '???' : s.title,
      };
      if (s.progress && !(s.hidden && !isLit)) {
        try { base.progress = s.progress(m); } catch { /* ignore */ }
      }
      return base;
    });
    const nonHiddenDone = stars.filter(s => !s.hidden).every(s => s.lit) && stars.some(s => !s.hidden);
    return { key: c.key, title: c.title, titleKey: c.titleKey, completed: nonHiddenDone, stars };
  });

  const totalStars = STARS.length;
  const litCount = litRows.length;
  const totalConstellations = CONSTELLATIONS.length;
  const constellationsDone = constellations.filter(c => c.completed).length;

  return {
    summary: { litCount, totalStars, constellationsDone, totalConstellations },
    activeTitle: activeRow?.active_title || null,
    titles: titleRows.map(t => ({ key: t.title_key, name: TITLES[t.title_key] || t.title_key, earnedAt: t.earned_at })),
    constellations,
  };
}
