import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from './auth.js';
import { hashPassword, verifyPassword } from '../auth.js';

const router = Router();
router.use(requireAuth);

const TIMEZONES = [
  'local',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

router.get('/', (req, res) => {
  res.json({
    settings: {
      name: req.user.name,
      timezone: req.user.timezone,
      theme: req.user.theme,
      defaultStudyMinutes: req.user.default_study_minutes,
      defaultBreakMinutes: req.user.default_break_minutes,
      notificationsEnabled: Boolean(req.user.notifications_enabled),
    },
    timezones: TIMEZONES,
  });
});

router.put('/', async (req, res) => {
  const s = req.body ?? {};
  const name = String(s.name ?? req.user.name).trim().slice(0, 60) || 'Student';
  const timezone = TIMEZONES.includes(s.timezone) ? s.timezone : req.user.timezone;
  const theme = ['light', 'dark', 'system'].includes(s.theme) ? s.theme : req.user.theme;
  const study = Math.min(480, Math.max(5, Math.round(Number(s.defaultStudyMinutes ?? req.user.default_study_minutes))));
  const brk = Math.min(120, Math.max(1, Math.round(Number(s.defaultBreakMinutes ?? req.user.default_break_minutes))));
  const notif = s.notificationsEnabled != null ? (s.notificationsEnabled ? 1 : 0) : req.user.notifications_enabled;

  await db.prepare(
    `UPDATE users SET name=?, timezone=?, theme=?, default_study_minutes=?, default_break_minutes=?, notifications_enabled=?
     WHERE id=?`
  ).run(name, timezone, theme, study, brk, notif, req.user.id);

  res.json({
    settings: { name, timezone, theme, defaultStudyMinutes: study, defaultBreakMinutes: brk, notificationsEnabled: Boolean(notif) },
  });
});

router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(String(currentPassword ?? ''), row.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(newPassword)), req.user.id);
  res.json({ ok: true });
});

export default router;
