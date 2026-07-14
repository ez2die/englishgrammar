import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { evaluateStars, getStarmap } from '../services/achievements/evaluate.js';

const router = express.Router();

// ---- Points system ----
// Awarded server-side only (client-reported scores are never trusted for points).
// Dimensions: difficulty (base), accuracy (multiplier), quantity (milestone bonus).
const LEVEL_BASE = { Basic: 10, Intermediate: 20, Advanced: 30 };
const PERFECT_MULTIPLIER = 1.5;   // all roles + structure correct
const MILESTONE_EVERY = 10;       // every N-th practice ...
const MILESTONE_BONUS = 25;       // ... earns a flat bonus

// ---- Daily check-in ----
// Once per calendar day (server local date). Consecutive days grow the reward.
const CHECKIN_BASE = 5;
const CHECKIN_STREAK_STEP = 3;   // +3 per extra consecutive day ...
const CHECKIN_STREAK_CAP = 5;    // ... capped after 6 days (day6+ = 20)
function checkinReward(streak) {
    return CHECKIN_BASE + Math.min(Math.max(streak - 1, 0), CHECKIN_STREAK_CAP) * CHECKIN_STREAK_STEP;
}

function computePoints(level, correctCount, totalCount, structureCorrect) {
    const base = LEVEL_BASE[level] ?? LEVEL_BASE.Basic;
    const total = Number.isFinite(totalCount) ? Math.max(0, Math.min(Math.floor(totalCount), 500)) : 0;
    const correct = Number.isFinite(correctCount) ? Math.max(0, Math.min(Math.floor(correctCount), total)) : 0;
    const accuracy = total > 0 ? correct / total : 0;
    const perfect = total > 0 && correct === total && structureCorrect === true;
    const earned = perfect ? Math.round(base * PERFECT_MULTIPLIER) : Math.round(base * accuracy);
    return { base, accuracyPct: Math.round(accuracy * 100), perfect, earned };
}

// GET /api/user/history
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    // Clamp limit to a sane range (guard against NaN / huge scans).
    const parsed = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50;

    const sql = `
    SELECT id, sentence, structure_type, score, created_at
    FROM practice_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;

    db.all(sql, [userId, limit], (err, rows) => {
        if (err) {
            console.error('[user] history read error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// GET /api/user/history/:id — full record incl. parsed analysis snapshot (own rows only)
router.get('/history/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const sql = `SELECT id, sentence, structure_type, score, analysis_snapshot, created_at
                 FROM practice_history WHERE id = ? AND user_id = ?`;
    db.get(sql, [id, req.user.id], (err, row) => {
        if (err) {
            console.error('[user] history detail error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) return res.status(404).json({ error: 'Not found' });
        let snapshot = null;
        try { snapshot = row.analysis_snapshot ? JSON.parse(row.analysis_snapshot) : null; } catch { /* leave null */ }
        res.json({ ...row, analysis_snapshot: snapshot });
    });
});

// POST /api/user/history
// Saves the practice record AND awards points computed server-side from the
// submitted result details (level / correct_count / total_count / structure_correct).
router.post('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const {
        sentence, structure_type, score, analysis_snapshot,
        level, correct_count, total_count, structure_correct,
    } = req.body || {};

    // Basic validation / size caps to avoid storing junk or unbounded blobs.
    if (typeof sentence !== 'string' || sentence.length === 0 || sentence.length > 2000) {
        return res.status(400).json({ error: 'Invalid sentence' });
    }
    const scoreNum = Number.isFinite(score) ? score : 0;
    let snapshotStr = null;
    if (analysis_snapshot !== undefined) {
        snapshotStr = JSON.stringify(analysis_snapshot);
        if (snapshotStr.length > 100000) {
            return res.status(400).json({ error: 'Snapshot too large' });
        }
    }

    const structCorrect = typeof structure_correct === 'boolean' ? (structure_correct ? 1 : 0) : null;
    const insertSql = `
    INSERT INTO practice_history (user_id, sentence, structure_type, score, analysis_snapshot, structure_correct)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    db.run(insertSql, [userId, sentence, structure_type ?? null, scoreNum, snapshotStr, structCorrect], function (err) {
        if (err) {
            console.error('[user] history save error:', err);
            return res.status(500).json({ error: 'Failed to save history' });
        }
        const historyId = this.lastID;

        // Older clients that don't send result details: save history, no points.
        const hasPointFields = level !== undefined && total_count !== undefined && correct_count !== undefined;
        if (!hasPointFields) {
            return res.status(201).json({ message: 'History saved', id: historyId, points: null });
        }

        const p = computePoints(level, correct_count, total_count, structure_correct);
        const nowHour = new Date().getHours();

        // Quantity dimension: flat bonus on every N-th completed practice.
        db.get('SELECT COUNT(*) AS c FROM practice_history WHERE user_id = ?', [userId], (err2, row) => {
            if (err2) {
                console.error('[user] milestone count error:', err2);
                return res.status(201).json({ message: 'History saved', id: historyId, points: null });
            }
            const practiceCount = row.c;
            const milestoneBonus = practiceCount > 0 && practiceCount % MILESTONE_EVERY === 0 ? MILESTONE_BONUS : 0;
            const totalEarned = p.earned + milestoneBonus;

            db.run(
                `INSERT INTO points_ledger (user_id, points, base_points, accuracy_pct, level, perfect, milestone_bonus)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, totalEarned, p.base, p.accuracyPct, typeof level === 'string' ? level.slice(0, 20) : null, p.perfect ? 1 : 0, milestoneBonus],
                (err3) => {
                    if (err3) console.error('[user] ledger insert error:', err3);

                    db.run('UPDATE users SET total_points = total_points + ? WHERE id = ?', [totalEarned, userId], (err4) => {
                        if (err4) console.error('[user] total_points update error:', err4);

                        // Maintain perfect-streak counters, then evaluate achievements.
                        db.run('UPDATE users SET cur_perfect_streak = CASE WHEN ? = 1 THEN cur_perfect_streak + 1 ELSE 0 END WHERE id = ?', [p.perfect ? 1 : 0, userId], () => {
                            db.run('UPDATE users SET max_perfect_streak = MAX(max_perfect_streak, cur_perfect_streak) WHERE id = ?', [userId], () => {
                                evaluateStars(userId, { nowHour })
                                    .catch((e) => { console.error('[user] evaluateStars error:', e); return { newlyLit: [], newTitles: [] }; })
                                    .then((ach) => {
                                        const a = ach || { newlyLit: [], newTitles: [] };
                                        db.get('SELECT total_points FROM users WHERE id = ?', [userId], (err5, urow) => {
                                            res.status(201).json({
                                                message: 'History saved',
                                                id: historyId,
                                                points: {
                                                    earned: totalEarned,
                                                    base: p.base,
                                                    accuracyPct: p.accuracyPct,
                                                    perfect: p.perfect,
                                                    milestoneBonus,
                                                    practiceCount,
                                                    total: err5 || !urow ? null : urow.total_points,
                                                },
                                                newlyLit: a.newlyLit,
                                                newTitles: a.newTitles,
                                            });
                                        });
                                    });
                            });
                        });
                    });
                }
            );
        });
    });
});

// GET /api/user/stats
router.get('/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
    SELECT COUNT(*) as total_practices, AVG(score) as avg_score
    FROM practice_history
    WHERE user_id = ?
  `;

    db.get(sql, [userId], (err, row) => {
        if (err) {
            console.error('[user] stats error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        db.get('SELECT total_points FROM users WHERE id = ?', [userId], (err2, urow) => {
            res.json({
                totalPractices: row.total_practices,
                averageScore: Math.round(row.avg_score || 0),
                totalPoints: err2 || !urow ? 0 : (urow.total_points || 0),
            });
        });
    });
});

// GET /api/user/checkin — today's status + reward preview
router.get('/checkin', authenticateToken, (req, res) => {
    const sql = `SELECT last_checkin_date, checkin_streak, total_points,
                    date('now','localtime') AS today,
                    date('now','localtime','-1 day') AS yesterday
                 FROM users WHERE id = ?`;
    db.get(sql, [req.user.id], (err, row) => {
        if (err || !row) {
            console.error('[user] checkin status error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        const checkedInToday = row.last_checkin_date === row.today;
        const streak = row.checkin_streak || 0;
        const nextStreak = checkedInToday ? streak : (row.last_checkin_date === row.yesterday ? streak + 1 : 1);
        res.json({
            checkedInToday,
            streak,
            nextStreak,
            todayReward: checkedInToday ? 0 : checkinReward(nextStreak),
            totalPoints: row.total_points || 0,
        });
    });
});

// POST /api/user/checkin — perform today's check-in (idempotent per day)
router.post('/checkin', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT last_checkin_date, checkin_streak, total_points,
                    date('now','localtime') AS today,
                    date('now','localtime','-1 day') AS yesterday
                 FROM users WHERE id = ?`;
    db.get(sql, [userId], (err, row) => {
        if (err || !row) {
            console.error('[user] checkin read error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (row.last_checkin_date === row.today) {
            return res.json({ alreadyCheckedIn: true, streak: row.checkin_streak || 0, earned: 0, totalPoints: row.total_points || 0 });
        }
        const newStreak = row.last_checkin_date === row.yesterday ? (row.checkin_streak || 0) + 1 : 1;
        const earned = checkinReward(newStreak);

        db.run(
            'UPDATE users SET last_checkin_date = ?, checkin_streak = ?, max_checkin_streak = MAX(max_checkin_streak, ?), total_points = total_points + ? WHERE id = ?',
            [row.today, newStreak, newStreak, earned, userId],
            (err2) => {
                if (err2) {
                    console.error('[user] checkin update error:', err2);
                    return res.status(500).json({ error: 'Failed to check in' });
                }
                db.run(
                    `INSERT INTO points_ledger (user_id, points, base_points, accuracy_pct, level, perfect, milestone_bonus, source)
           VALUES (?, ?, ?, 0, NULL, 0, ?, 'checkin')`,
                    [userId, earned, CHECKIN_BASE, earned - CHECKIN_BASE],
                    (err3) => {
                        if (err3) console.error('[user] checkin ledger error:', err3);
                        evaluateStars(userId, {})
                            .catch((e) => { console.error('[user] evaluateStars error:', e); return { newlyLit: [], newTitles: [] }; })
                            .then((ach) => {
                                const a = ach || { newlyLit: [], newTitles: [] };
                                db.get('SELECT total_points FROM users WHERE id = ?', [userId], (e5, urow) => {
                                    res.json({
                                        alreadyCheckedIn: false,
                                        streak: newStreak,
                                        earned,
                                        streakBonus: earned - CHECKIN_BASE,
                                        totalPoints: e5 || !urow ? (row.total_points || 0) + earned : urow.total_points,
                                        newlyLit: a.newlyLit,
                                        newTitles: a.newTitles,
                                    });
                                });
                            });
                    }
                );
            }
        );
    });
});

// GET /api/user/points — running total + recent ledger entries
router.get('/points', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.get('SELECT total_points FROM users WHERE id = ?', [userId], (err, urow) => {
        if (err) {
            console.error('[user] points read error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        db.all(
            `SELECT points, base_points, accuracy_pct, level, perfect, milestone_bonus, created_at
       FROM points_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
            [userId],
            (err2, rows) => {
                if (err2) {
                    console.error('[user] ledger read error:', err2);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ totalPoints: urow?.total_points || 0, ledger: rows });
            }
        );
    });
});

// GET /api/user/starmap — full achievement catalog + user progress.
// Lazily backfills (re-evaluates) so past activity retroactively lights stars.
router.get('/starmap', authenticateToken, async (req, res) => {
    try {
        await evaluateStars(req.user.id, {});
        const map = await getStarmap(req.user.id);
        res.json(map);
    } catch (e) {
        console.error('[user] starmap error:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/user/flag — client-only exploration signal. Only 'theme' is accepted:
// 'ocr'/'custom' are set server-side by the endpoints that actually perform them
// (see server.js), so they can't be self-reported for free points.
router.post('/flag', authenticateToken, (req, res) => {
    const cols = { theme: 'changed_theme' };
    const col = cols[(req.body || {}).name];
    if (!col) return res.status(400).json({ error: 'Invalid flag' });
    db.run(`UPDATE users SET ${col} = 1 WHERE id = ?`, [req.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        evaluateStars(req.user.id, {})
            .catch(() => ({ newlyLit: [], newTitles: [] }))
            .then((a) => res.json({ ok: true, newlyLit: a.newlyLit, newTitles: a.newTitles }));
    });
});

// POST /api/user/title — wear an owned title (or null to clear).
router.post('/title', authenticateToken, (req, res) => {
    const titleKey = (req.body || {}).titleKey;
    if (titleKey === null || titleKey === '') {
        return db.run('UPDATE users SET active_title = NULL WHERE id = ?', [req.user.id], () => res.json({ ok: true, activeTitle: null }));
    }
    if (typeof titleKey !== 'string') return res.status(400).json({ error: 'Invalid titleKey' });
    db.get('SELECT 1 FROM user_titles WHERE user_id = ? AND title_key = ?', [req.user.id, titleKey], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(403).json({ error: 'Title not owned' });
        db.run('UPDATE users SET active_title = ? WHERE id = ?', [titleKey, req.user.id], (e2) => {
            if (e2) return res.status(500).json({ error: 'Database error' });
            res.json({ ok: true, activeTitle: titleKey });
        });
    });
});

export default router;
