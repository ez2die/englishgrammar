import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { JWT_SECRET } from '../config/env.js';
import { verifyGoogleToken, verifyAppleToken, verifyWeChatCode } from '../services/auth/social.js';

const router = express.Router();

const BCRYPT_COST = 12;
const JWT_OPTS = { expiresIn: '7d', algorithm: 'HS256' };
// Reserved so a local account can't pre-claim/hijack a social identity (which
// uses `${provider}_${providerId}` as its username).
const RESERVED_PREFIXES = ['google_', 'apple_', 'wechat_'];
// A pre-computed bcrypt hash used to equalize timing on the "user not found"
// path so login latency doesn't reveal whether a username exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_COST);

function validateCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required';
  }
  if (username.length < 3 || username.length > 32) {
    return 'Username must be 3-32 characters';
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    return 'Username may only contain letters, numbers, and . _ -';
  }
  if (RESERVED_PREFIXES.some((p) => username.toLowerCase().startsWith(p))) {
    return 'This username prefix is reserved';
  }
  // bcrypt only uses the first 72 bytes; cap to avoid silent truncation / DoS.
  if (password.length < 6 || password.length > 72) {
    return 'Password must be 6-72 characters';
  }
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};

  const validationError = validateCredentials(username, password);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    const sql = `INSERT INTO users (username, password_hash) VALUES (?, ?)`;
    db.run(sql, [username, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Username already exists' });
        }
        console.error('[auth] register db error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, JWT_OPTS);
      res.status(201).json({ message: 'User registered', token, user: { id: this.lastID, username } });
    });
  } catch (error) {
    console.error('[auth] register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const sql = `SELECT * FROM users WHERE username = ?`;
  db.get(sql, [username], async (err, user) => {
    if (err) {
      console.error('[auth] login db error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Always run a bcrypt compare (against a dummy hash if the user is absent)
    // so response timing doesn't leak account existence.
    const hash = user ? user.password_hash : DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hash);

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, JWT_OPTS);
    res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username } });
  });
});

// Helper to handle social user lookup/creation.
// Social identities are namespaced as `${provider}_${providerId}`, and local
// registrations are forbidden from using those prefixes (RESERVED_PREFIXES),
// so the two namespaces cannot collide.
const handleSocialUser = (res, provider, providerId) => {
  if (!providerId) {
    return res.status(401).json({ error: 'Invalid social profile' });
  }
  const username = `${provider}_${providerId}`;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('[auth] social db error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, JWT_OPTS);
      return res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username } });
    }

    // Social accounts have no password; store a sentinel that can never match a
    // bcrypt.compare (it is not a valid bcrypt hash).
    const passwordHash = 'SOCIAL_LOGIN_NO_PASSWORD';
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash], function (err2) {
      if (err2) {
        console.error('[auth] social insert error:', err2);
        return res.status(500).json({ error: 'Database error' });
      }
      const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, JWT_OPTS);
      res.json({ message: 'User registered via ' + provider, token, user: { id: this.lastID, username } });
    });
  });
};

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { token } = req.body || {};
  try {
    const profile = await verifyGoogleToken(token);
    handleSocialUser(res, 'google', profile.sub);
  } catch (error) {
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// POST /api/auth/apple
router.post('/apple', async (req, res) => {
  const { token } = req.body || {};
  try {
    const profile = await verifyAppleToken(token);
    handleSocialUser(res, 'apple', profile.sub);
  } catch (error) {
    res.status(401).json({ error: 'Apple authentication failed' });
  }
});

// POST /api/auth/wechat
router.post('/wechat', async (req, res) => {
  const { code } = req.body || {};
  try {
    const profile = await verifyWeChatCode(code);
    handleSocialUser(res, 'wechat', profile.openid);
  } catch (error) {
    res.status(401).json({ error: 'WeChat authentication failed' });
  }
});

export default router;
