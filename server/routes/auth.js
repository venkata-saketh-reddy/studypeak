import { Router } from 'express';
import db from '../db.js';
import { createSession, destroySession, getUserByToken, hashPassword, verifyPassword } from '../auth.js';

const router = Router();

function setAuthCookie(res, token) {
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 86400_000,
  });
}

export async function requireAuth(req, res, next) {
  const user = await getUserByToken(req.cookies?.sid);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  next();
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const hash = hashPassword(password);
    let info;
    try {
      info = await db
        .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .run(email.trim(), hash, (name && String(name).trim()) || 'Student');
    } catch (e) {
      if (/unique|duplicate key/i.test(String(e.message))) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      throw e;
    }
    const { token } = await createSession(info.lastInsertRowid);
    setAuthCookie(res, token);
    const user = await db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ user });
  } catch {
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const row = await db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(String(email ?? '').trim());
    if (!row || !verifyPassword(String(password ?? ''), row.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    const { token } = await createSession(row.id);
    setAuthCookie(res, token);
    res.json({ user: { id: row.id, email: row.email, name: row.name } });
  } catch {
    res.status(500).json({ error: 'Could not sign you in. Please try again.' });
  }
});

router.post('/logout', async (req, res) => {
  await destroySession(req.cookies?.sid);
  res.clearCookie('sid');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
