/**
 * Optional JWT auth: if a valid Bearer token is present, attach req.user;
 * otherwise continue anonymously. Used on endpoints that work for guests but
 * want to credit achievements when a logged-in user performs the action.
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
    if (!err && user) req.user = user;
    next();
  });
}
