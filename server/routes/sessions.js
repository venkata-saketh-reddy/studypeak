import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from './auth.js';
import { checkAndUnlockAchievements, isValidDate, todayFor } from '../helpers.js';

const router = Router();
router.use(requireAuth);

// POST /api/sessions — save a finished study session
router.post('/', async (req, res) => {
  const { habitId, startedAt, endedAt, durationSeconds, status } = req.body ?? {};
  const secs = Math.round(Number(durationSeconds));
  if (!Number.isFinite(secs) || secs <= 0 || secs > 24 * 3600) {
    return res.status(400).json({ error: 'Invalid session duration.' });
  }
  const start = new Date(String(startedAt));
  const end = new Date(String(endedAt));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return res.status(400).json({ error: 'Invalid session times.' });
  }

  let habit = null;
  if (habitId != null) {
    habit = await db.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?').get(Number(habitId), req.user.id);
    if (!habit) return res.status(404).json({ error: 'Habit not found.' });
  }

  // Attribute the session to the local date on which it *ended*, so a session
  // that crosses midnight is counted on the day the work actually finished.
  const date = isValidDate(req.body?.date)
    ? req.body.date
    : endDateInTimezone(end, req.user.timezone);
  const info = await db
    .prepare(
      `INSERT INTO study_sessions (user_id, habit_id, started_at, ended_at, duration_seconds, date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      habit?.id ?? null,
      start.toISOString(),
      end.toISOString(),
      secs,
      date,
      status === 'abandoned' ? 'abandoned' : 'completed'
    );

  const newlyUnlocked =
    status === 'abandoned' ? [] : await checkAndUnlockAchievements(req.user.id);

  const session = await db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ session, newlyUnlocked });
});

// GET /api/sessions?from=&to=&habitId=
router.get('/', async (req, res) => {
  const clauses = ['ss.user_id = ?'];
  const params = [req.user.id];
  if (isValidDate(req.query.from)) {
    clauses.push('date >= ?');
    params.push(req.query.from);
  }
  if (isValidDate(req.query.to)) {
    clauses.push('date <= ?');
    params.push(req.query.to);
  }
  if (req.query.habitId) {
    clauses.push('habit_id = ?');
    params.push(Number(req.query.habitId));
  }
  const rows = await db
    .prepare(
      `SELECT ss.*, COALESCE(h.name, 'General') AS subject FROM study_sessions ss
       LEFT JOIN habits h ON h.id = ss.habit_id
       WHERE ${clauses.join(' AND ')} ORDER BY ss.started_at DESC LIMIT 500`
    )
    .all(...params);
  res.json({ sessions: rows });
});

/** Format an instant as YYYY-MM-DD in the user's timezone (falls back to server-local). */
function endDateInTimezone(endDate, timezone) {
  if (timezone && timezone !== 'local') {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(endDate);
    } catch {
      /* invalid tz -> fall through */
    }
  }
  const y = endDate.getFullYear();
  const m = String(endDate.getMonth() + 1).padStart(2, '0');
  const d = String(endDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default router;
