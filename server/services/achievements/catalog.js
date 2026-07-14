/**
 * 语法星图 · 成就目录(静态定义)
 * 纯逻辑,不含任何视觉。视觉见 docs/star-map-concept.md。
 * 每颗星: { key, constellation, title, rarity, hidden, points?, check(m, ctx), progress?(m) }
 *   - check: 传入 metrics(见 evaluate.computeMetrics)与 ctx(如 {nowHour}),返回是否达成
 *   - progress: 可选,数值型星返回 {cur, target} 供进度条
 * rarity ∈ common | rare | epic | legendary  (hidden 是独立标志)
 */

export const RARITY_POINTS = { common: 10, rare: 30, epic: 50, legendary: 100 };

/** 某颗星首次点亮发放的积分 */
export function starPoints(star) {
  return Number.isFinite(star.points) ? star.points : (RARITY_POINTS[star.rarity] ?? 0);
}

/** 星座定义;titleKey 非空表示"集齐该座全部非隐藏星"授予称号 */
export const CONSTELLATIONS = [
  { key: 'start',     title: '启程座',   titleKey: null },
  { key: 'diligent',  title: '勤学座',   titleKey: 'title.scholar',       titleName: '星空学者' },
  { key: 'streak',    title: '恒心座',   titleKey: 'title.eternal_flame', titleName: '不灭之火' },
  { key: 'accuracy',  title: '神射座',   titleKey: null },
  { key: 'summit',    title: '登峰座',   titleKey: 'title.climber',       titleName: '攀星者' },
  { key: 'structure', title: '句型座',   titleKey: 'title.stargazer',     titleName: '句型观星者' },
  { key: 'explore',   title: '探索座',   titleKey: null },
  { key: 'fun',       title: '奇趣星云', titleKey: null },
];

/** 集齐所有非隐藏星的终极称号 */
export const STARMASTER = { key: 'title.starmaster', name: '星图大师' };

export const TITLES = {
  'title.scholar': '星空学者',
  'title.eternal_flame': '不灭之火',
  'title.climber': '攀星者',
  'title.stargazer': '句型观星者',
  'title.starmaster': '星图大师',
};

const num = (cur, target) => ({ cur: Math.min(cur, target), target });

export const STARS = [
  // 🧭 启程座
  { key: 'start.first_q',        constellation: 'start',     title: '初出茅庐', rarity: 'common', hidden: false, check: m => m.practices >= 1 },
  { key: 'start.first_checkin',  constellation: 'start',     title: '第一次打卡', rarity: 'common', hidden: false, check: m => m.checkin_total >= 1 },
  { key: 'start.first_perfect',  constellation: 'start',     title: '初尝完美', rarity: 'rare',   hidden: false, check: m => m.perfect_total >= 1 },

  // 📚 勤学座
  { key: 'diligent.10',  constellation: 'diligent', title: '好学少年', rarity: 'common',    hidden: false, check: m => m.practices >= 10,  progress: m => num(m.practices, 10) },
  { key: 'diligent.50',  constellation: 'diligent', title: '勤学不辍', rarity: 'rare',      hidden: false, check: m => m.practices >= 50,  progress: m => num(m.practices, 50) },
  { key: 'diligent.100', constellation: 'diligent', title: '百题斩',   rarity: 'epic',      hidden: false, check: m => m.practices >= 100, progress: m => num(m.practices, 100) },
  { key: 'diligent.500', constellation: 'diligent', title: '题海遨游', rarity: 'legendary', hidden: false, check: m => m.practices >= 500, progress: m => num(m.practices, 500) },

  // 🔥 恒心座
  { key: 'streak.3',  constellation: 'streak', title: '三日不断', rarity: 'common',    hidden: false, check: m => m.max_checkin_streak >= 3,  progress: m => num(m.max_checkin_streak, 3) },
  { key: 'streak.7',  constellation: 'streak', title: '一周坚持', rarity: 'rare',      hidden: false, check: m => m.max_checkin_streak >= 7,  progress: m => num(m.max_checkin_streak, 7) },
  { key: 'streak.14', constellation: 'streak', title: '半月恒心', rarity: 'epic',      hidden: false, check: m => m.max_checkin_streak >= 14, progress: m => num(m.max_checkin_streak, 14) },
  { key: 'streak.30', constellation: 'streak', title: '不灭星火', rarity: 'legendary', hidden: false, check: m => m.max_checkin_streak >= 30, progress: m => num(m.max_checkin_streak, 30) },

  // 🎯 神射座
  { key: 'accuracy.perfect10', constellation: 'accuracy', title: '十全十美', rarity: 'rare', hidden: false, check: m => m.perfect_total >= 10, progress: m => num(m.perfect_total, 10) },
  { key: 'accuracy.perfect50', constellation: 'accuracy', title: '百发百中', rarity: 'epic', hidden: false, check: m => m.perfect_total >= 50, progress: m => num(m.perfect_total, 50) },
  { key: 'accuracy.streak5',   constellation: 'accuracy', title: '连中五元', rarity: 'epic', hidden: false, check: m => m.max_perfect_streak >= 5, progress: m => num(m.max_perfect_streak, 5) },

  // ⛰️ 登峰座
  { key: 'summit.inter', constellation: 'summit', title: '进阶者',   rarity: 'rare',      hidden: false, check: m => m.inter_done >= 1 },
  { key: 'summit.adv',   constellation: 'summit', title: '挑战者',   rarity: 'epic',      hidden: false, check: m => m.adv_done >= 1 },
  { key: 'summit.adv20', constellation: 'summit', title: '从句大师', rarity: 'legendary', hidden: false, check: m => m.adv_done >= 20, progress: m => num(m.adv_done, 20) },

  // ⭐ 句型座(集齐 5 颗 → 称号「句型观星者」)
  { key: 'structure.sv',   constellation: 'structure', title: '主谓 SV',       rarity: 'common', hidden: false, check: m => m.correct_structures.has('SV') },
  { key: 'structure.svo',  constellation: 'structure', title: '主谓宾 SVO',    rarity: 'common', hidden: false, check: m => m.correct_structures.has('SVO') },
  { key: 'structure.sp',   constellation: 'structure', title: '主系表 SP',     rarity: 'common', hidden: false, check: m => m.correct_structures.has('SP') },
  { key: 'structure.svoo', constellation: 'structure', title: '主谓双宾 SVOO', rarity: 'rare',   hidden: false, check: m => m.correct_structures.has('SVOO') },
  { key: 'structure.svoc', constellation: 'structure', title: '主谓宾宾补 SVOC', rarity: 'rare', hidden: false, check: m => m.correct_structures.has('SVOC') },

  // 🧭 探索座
  { key: 'explore.ocr',        constellation: 'explore', title: '火眼金睛',   rarity: 'rare',   hidden: false, check: m => m.used_ocr },
  { key: 'explore.custom',     constellation: 'explore', title: '自定义大师', rarity: 'rare',   hidden: false, check: m => m.used_custom },
  { key: 'explore.theme',      constellation: 'explore', title: '换装达人',   rarity: 'common', hidden: false, check: m => m.changed_theme },
  { key: 'explore.all_levels', constellation: 'explore', title: '全难度探险', rarity: 'epic',   hidden: false, check: m => m.basic_done > 0 && m.inter_done > 0 && m.adv_done > 0 },

  // 💫 奇趣星云(fun.egg 隐藏)
  { key: 'fun.morning',    constellation: 'fun', title: '早起鸟',   rarity: 'rare',      hidden: false, check: (m, ctx) => ctx && ctx.nowHour >= 6 && ctx.nowHour < 9 },
  { key: 'fun.night',      constellation: 'fun', title: '夜猫子',   rarity: 'rare',      hidden: false, check: (m, ctx) => ctx && ctx.nowHour >= 22 },
  { key: 'fun.points1000', constellation: 'fun', title: '积分大亨', rarity: 'legendary', hidden: false, check: m => m.total_points >= 1000, progress: m => num(m.total_points, 1000) },
  { key: 'fun.egg',        constellation: 'fun', title: '神秘彩蛋', rarity: 'legendary', hidden: true,  points: 150, check: m => m.max_perfect_streak >= 10 },
];

export const STARS_BY_KEY = Object.fromEntries(STARS.map(s => [s.key, s]));
