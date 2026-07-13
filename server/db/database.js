
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// verbose() adds heavy stack capture meant for debugging — enable only outside production.
const driver = process.env.NODE_ENV === 'production' ? sqlite3 : sqlite3.verbose();

const dbPath = path.join(__dirname, '../../database.sqlite');
console.log(`[DB] Database path: ${dbPath}`);

const db = new driver.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB] Connection error:', err.message);
    } else {
        console.log('[DB] Connected to SQLite database.');
    }
});

function initDB() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
            if (err) console.error('[DB] Error creating users table:', err);
            else console.log('[DB] Users table ready.');
        });

        // Practice History table
        db.run(`CREATE TABLE IF NOT EXISTS practice_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sentence TEXT,
      structure_type TEXT,
      score INTEGER,
      analysis_snapshot JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
            if (err) console.error('[DB] Error creating practice_history table:', err);
            else console.log('[DB] Practice History table ready.');
        });

        // Points + daily check-in columns on users (idempotent migrations —
        // a "duplicate column" error just means it already exists).
        const addColumn = (sql) => db.run(sql, (err) => {
            if (err && !/duplicate column/i.test(err.message)) console.error('[DB] migration error:', err.message);
        });
        addColumn(`ALTER TABLE users ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0`);
        addColumn(`ALTER TABLE users ADD COLUMN last_checkin_date TEXT`);
        addColumn(`ALTER TABLE users ADD COLUMN checkin_streak INTEGER NOT NULL DEFAULT 0`);

        // Points ledger: one row per award, auditable breakdown.
        // `source` distinguishes 'practice' vs 'checkin' awards.
        db.run(`CREATE TABLE IF NOT EXISTS points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      points INTEGER NOT NULL,
      base_points INTEGER NOT NULL,
      accuracy_pct INTEGER NOT NULL,
      level TEXT,
      perfect INTEGER NOT NULL DEFAULT 0,
      milestone_bonus INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'practice',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
            if (err) console.error('[DB] Error creating points_ledger table:', err);
            else {
                console.log('[DB] Points ledger table ready.');
                // Existing ledger tables (created before `source`) get the column here.
                addColumn(`ALTER TABLE points_ledger ADD COLUMN source TEXT NOT NULL DEFAULT 'practice'`);
            }
        });
    });
}

export { db, initDB };
