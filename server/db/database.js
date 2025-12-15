
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const verboseSqlite = sqlite3.verbose();

const dbPath = path.join(__dirname, '../../database.sqlite');
console.log(`[DB] Database path: ${dbPath}`);

const db = new verboseSqlite.Database(dbPath, (err) => {
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
    });
}

export { db, initDB };
