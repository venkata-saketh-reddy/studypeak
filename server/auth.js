import crypto from 'crypto';
import db from './db.js';

const SESSION_DAYS = 30;

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return { token, expires };
}

export async function destroySession(token) {
  if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export async function getUserByToken(token) {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.timezone, u.theme, u.default_study_minutes,
              u.default_break_minutes, u.notifications_enabled
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > NOW()`
    )
    .get(token);
  return row ?? null;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
