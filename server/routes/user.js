
import express from 'express';
import { db } from '../db/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// GET /api/user/history
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const sql = `
    SELECT id, sentence, structure_type, score, created_at 
    FROM practice_history 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `;

    db.all(sql, [userId, limit], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// POST /api/user/history
router.post('/history', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { sentence, structure_type, score, analysis_snapshot } = req.body;

    const sql = `
    INSERT INTO practice_history (user_id, sentence, structure_type, score, analysis_snapshot) 
    VALUES (?, ?, ?, ?, ?)
  `;

    const snapshotStr = JSON.stringify(analysis_snapshot);

    db.run(sql, [userId, sentence, structure_type, score, snapshotStr], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to save history' });
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
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({
            totalPractices: row.total_practices,
            averageScore: Math.round(row.avg_score || 0)
        });
    });
});

export default router;
