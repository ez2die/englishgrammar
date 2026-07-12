/**
 * Centralized, validated environment configuration.
 * Import AFTER ./server/loadEnv.js has run (it does, since server.js imports
 * loadEnv first and this module is only reached via routes imported later).
 */
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * JWT signing secret. In production it MUST be provided and strong, or the
 * process refuses to start (no insecure hardcoded fallback). In non-production
 * we generate an ephemeral per-boot secret so local dev "just works" (tokens
 * become invalid on restart, which is fine for dev).
 */
function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (isProduction) {
    console.error(
      '[env] FATAL: JWT_SECRET is missing or shorter than 32 chars. ' +
      'Refusing to start in production. Set a strong JWT_SECRET in .env.local.'
    );
    process.exit(1);
  }

  const ephemeral = crypto.randomBytes(48).toString('hex');
  console.warn('[env] JWT_SECRET not set — using an ephemeral dev secret (tokens reset on restart).');
  return ephemeral;
}

export const JWT_SECRET = resolveJwtSecret();

/** Comma-separated allowlist of browser origins permitted to call the API. */
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Only enable OAuth mock/dev bypass when explicitly opted in (never in prod). */
export const ENABLE_AUTH_MOCKS = process.env.ENABLE_AUTH_MOCKS === 'true' && !isProduction;

/** Enable Express `trust proxy` only when actually behind a reverse proxy. */
export const TRUST_PROXY = process.env.TRUST_PROXY === '1';

export { isProduction };
