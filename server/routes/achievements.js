import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/achievements — catalog + user's unlocked set
router.get('/', async (req, res) => {
  const all = await db.prepare('SELECT * FROM achievements ORDER BY id').all();
  const unlocked = await db
    .prepare('SELECT achievement_id, unlocked_at, seen FROM user_achievements WHERE user_id = ?')
    .all(req.user.id);
  const map = new Map(unlocked.map((u) => [u.achievement_id, u]));
  res.json({
    achievements: all.map((a) => ({
      ...a,
      unlocked: map.has(a.id),
      unlockedAt: map.get(a.id)?.unlocked_at ?? null,
      seen: Boolean(map.get(a.id)?.seen),
    })),
  });
});

// POST /api/achievements/see — mark celebration popups as seen
router.post('/see', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  if (ids.length) {
    await Promise.all(ids.map((id) => db.prepare('UPDATE user_achievements SET seen = 1 WHERE user_id = ? AND achievement_id = ?').run(req.user.id, id)));
  }
  res.json({ ok: true });
});

export default router;
