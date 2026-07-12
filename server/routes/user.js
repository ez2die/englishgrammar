import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

// POST /api/user/history
router.post('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { sentence, structure_type, score, analysis_snapshot } = req.body || {};

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

    const sql = `
    INSERT INTO practice_history (user_id, sentence, structure_type, score, analysis_snapshot)
    VALUES (?, ?, ?, ?, ?)
  `;

    db.run(sql, [userId, sentence, structure_type ?? null, scoreNum, snapshotStr], function (err) {
        if (err) {
            console.error('[user] history save error:', err);
            return res.status(500).json({ error: 'Failed to save history' });
        }
        res.status(201).json({ message: 'History saved', id: this.lastID });
    });
});

// GET /api/user/stats
router.get('/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Simple stats: total practices and average score
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
        res.json({
            totalPractices: row.total_practices,
            averageScore: Math.round(row.avg_score || 0)
        });
    });
});

export default router;
