
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { verifyGoogleToken, verifyAppleToken, verifyWeChatCode } from '../services/auth/social.js';

const router = express.Router();
// Use a secure key in production!
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `INSERT INTO users (username, password_hash) VALUES (?, ?)`;
        db.run(sql, [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ message: 'User registered', token, user: { id: this.lastID, username } });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username } });
    });
});

// Helper to handle social user lookup/creation
const handleSocialUser = (res, provider, providerId, email, name) => {
    // Try to find user by social id
    // Note: specific schema for social auth might be better, but for MVP we can use username prefix
    // or a separate table. Here we'll just check if we can match or create a user.

    // Simplified: Check if user exists with this specific username format [provider]_[id]
    const username = `${provider}_${providerId}`;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (user) {
            // Login existing
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username } });
        } else {
            // Register new
            const passwordHash = 'SOCIAL_LOGIN_NO_PASSWORD'; // Placeholder
            db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash], function (err) {
                if (err) return res.status(500).json({ error: 'Database error' });
                const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ message: 'User registered via ' + provider, token, user: { id: this.lastID, username } });
            });
        }
    });
};

// POST /api/auth/google
router.post('/google', async (req, res) => {
    const { token } = req.body;
    try {
        const profile = await verifyGoogleToken(token);
        handleSocialUser(res, 'google', profile.sub, profile.email, profile.name);
    } catch (error) {
        res.status(401).json({ error: 'Google authentication failed' });
    }
});

// POST /api/auth/apple
router.post('/apple', async (req, res) => {
    const { token } = req.body;
    try {
        const profile = await verifyAppleToken(token);
        handleSocialUser(res, 'apple', profile.sub, profile.email);
    } catch (error) {
        res.status(401).json({ error: 'Apple authentication failed' });
    }
});

// POST /api/auth/wechat
router.post('/wechat', async (req, res) => {
    const { code } = req.body;
    try {
        const profile = await verifyWeChatCode(code);
        handleSocialUser(res, 'wechat', profile.openid, null, profile.nickname);
    } catch (error) {
        res.status(401).json({ error: 'WeChat authentication failed' });
    }
});

export default router;
