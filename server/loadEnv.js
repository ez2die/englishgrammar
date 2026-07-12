/**
 * Environment loader — MUST be imported first (before any module that reads
 * process.env at evaluation time). In ESM, sibling imports are evaluated in
 * source order, so importing this at the very top of server.js guarantees
 * dotenv has populated process.env before routes/config modules load.
 * Loads .env.local first (takes precedence), then falls back to .env.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();
