import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from './auth.js';
import {
  addDays,
  checkAndUnlockAchievements,
  completionsForDate,
  computeStreaks,
  habitsDueOn,
  isValidDate,
  isValidTime,
  studySecondsOnDate,
  todayFor,
} from '../helpers.js';

const router = Router();
router.use(requireAuth);

function slotOf(habit, overrideMap) {
  return overrideMap.get(habit.id) ?? habit.scheduled_time ?? null;
}

/** Effective start/end for a scheduled task — a slot override shifts the whole range. */
function effectiveTimes(habit, overrideMap) {
  const override = overrideMap.get(habit.id) ?? null;
  const start = override ?? habit.start_time ?? null;
  let end = habit.end_slot ?? null;
  if (override && habit.start_time && end) {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const duration = Math.max(0, toMin(end) - toMin(habit.start_time));
    const total = toMin(override) + duration;
    const nh = Math.floor((total % 1440) / 60);
    const nm = total % 60;
    end = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }
  return { start, end };
}

function sortBySlot(tasks) {
  // AM -> PM by time slot; untimed tasks go last, stable by habitId
  tasks.sort((a, b) => {
    if (a.slot && b.slot) return a.slot.localeCompare(b.slot) || a.habitId - b.habitId;
    if (a.slot) return -1;
    if (b.slot) return 1;
    return a.habitId - b.habitId;
  });
  return tasks;
}

async function slotOverridesFor(userId, date) {
  const rows = await db
    .prepare(
      `SELECT o.habit_id, o.scheduled_time FROM habit_slot_overrides o
       JOIN habits h ON h.id = o.habit_id WHERE h.user_id = ? AND o.date = ?`
    )
    .all(userId, date);
  return new Map(rows.map((r) => [r.habit_id, r.scheduled_time]));
}

// GET /api/tasks?date=YYYY-MM-DD — daywise scheduled tasks + daily consistency habits
router.get('/', async (req, res) => {
  const date = isValidDate(req.query.date) ? req.query.date : todayFor(req.user.timezone);
  const due = await habitsDueOn(req.user.id, date);
  const completions = await completionsForDate(req.user.id, date);
  const overrides = await slotOverridesFor(req.user.id, date);
  const scheduled = due.filter((h) => (h.kind ?? 'daily') === 'scheduled');
  const daily = due.filter((h) => (h.kind ?? 'daily') !== 'scheduled');

  async function toItem(h, { withSessions }) {
    const c = completions.find((x) => x.habit_id === h.id);
    const sessionMinutes = withSessions && h.target_type === 'duration'
      ? Math.round(
          (await db
            .prepare(
              `SELECT COALESCE(SUM(duration_seconds), 0) AS seconds
               FROM study_sessions
               WHERE user_id = ? AND habit_id = ? AND date = ? AND status = 'completed'`
            )
            .get(req.user.id, h.id, date)).seconds / 60
        )
      : 0;
    const progress = h.target_type === 'duration'
      ? Math.max(c?.progress ?? 0, sessionMinutes)
      : c?.progress ?? 0;
    const eff = effectiveTimes(h, overrides);
    return {
      habitId: h.id,
      name: h.name,
      description: h.description,
      category: h.category,
      color: h.color,
      targetType: h.target_type,
      targetValue: h.target_value,
      progress,
      completed: Boolean(c?.completed),
      slot: slotOf(h, overrides),
      kind: h.kind ?? 'daily',
      startTime: eff.start,
      endTime: eff.end,
    };
  }

  const tasks = await Promise.all(scheduled.map((h) => toItem(h, { withSessions: false })));
  tasks.sort((a, b) => (a.startTime ?? a.slot ?? '99:99').localeCompare(b.startTime ?? b.slot ?? '99:99') || a.habitId - b.habitId);

  const dailyHabits = await Promise.all(daily.map((h) => toItem(h, { withSessions: true })));
  dailyHabits.sort((a, b) => (a.slot ?? '99:99').localeCompare(b.slot ?? '99:99') || a.habitId - b.habitId);

  const studySeconds = await studySecondsOnDate(req.user.id, date);
  const streaks = date === todayFor(req.user.timezone) ? await computeStreaks(req.user.id, req.user.timezone) : null;
  res.json({ date, tasks, dailyHabits, studySeconds, ...(streaks ? { streaks } : {}) });
});

// POST /api/tasks/:habitId/complete — body: { date?, progress?, completed? }
router.post('/:habitId/complete', async (req, res) => {
  const habitId = Number(req.params.habitId);
  const habit = await db
    .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(habitId, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  const date = isValidDate(req.body?.date) ? req.body.date : todayFor(req.user.timezone);
  if (date > todayFor(req.user.timezone)) return res.status(400).json({ error: 'Cannot complete tasks in the future.' });

  let progress;
  let completed;
  if (habit.target_type === 'duration') {
    // progress is minutes studied toward the target; recompute from sessions + manual log
    const sessionSecs = (await db
      .prepare(
        `SELECT COALESCE(SUM(duration_seconds),0) AS s FROM study_sessions WHERE user_id=? AND habit_id=? AND date=?`
      )
      .get(req.user.id, habitId, date)).s;
    const existing = await db.prepare('SELECT progress FROM habit_completions WHERE habit_id = ? AND date = ?').get(habitId, date);
    const manualExtra = Math.max(0, Math.round(Number(req.body?.extraMinutes) || 0));
    progress = Math.max(existing?.progress ?? 0, Math.round(sessionSecs / 60) + manualExtra);
    // Completion is always a deliberate user action — hitting the target only fills the bar.
    completed = req.body?.completed === true;
  } else if (habit.target_type === 'quantity') {
    progress = Math.max(0, Math.min(habit.target_value, Math.round(Number(req.body?.progress ?? habit.target_value))));
    completed = req.body?.completed === true;
  } else {
    completed = true;
    progress = 1;
  }

  await db.prepare(
    `INSERT INTO habit_completions (user_id, habit_id, date, progress, completed, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (habit_id, date) DO UPDATE SET
       progress = excluded.progress,
       completed = excluded.completed,
       completed_at = excluded.completed_at`
  ).run(req.user.id, habitId, date, progress, completed ? 1 : 0, completed ? new Date().toISOString() : null);

  const newlyUnlocked = await checkAndUnlockAchievements(req.user.id);
  const streaks = await computeStreaks(req.user.id, req.user.timezone);
  const row = await db
    .prepare('SELECT * FROM habit_completions WHERE habit_id = ? AND date = ?')
    .get(habitId, date);
  res.json({
    completion: { ...row, completed: Boolean(row.completed) },
    streaks,
    newlyUnlocked,
  });
});

// DELETE /api/tasks/:habitId/complete?date=... — undo a completion
router.delete('/:habitId/complete', async (req, res) => {
  const habitId = Number(req.params.habitId);
  const date = isValidDate(req.query.date) ? req.query.date : todayFor(req.user.timezone);
  await db.prepare('DELETE FROM habit_completions WHERE user_id = ? AND habit_id = ? AND date = ?').run(
    req.user.id,
    habitId,
    date
  );
  const streaks = await computeStreaks(req.user.id, req.user.timezone);
  res.json({ ok: true, streaks });
});

// POST /api/tasks/:habitId/slot — (re)schedule the task's time slot for a specific day
router.post('/:habitId/slot', async (req, res) => {
  const habitId = Number(req.params.habitId);
  const habit = await db
    .prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?')
    .get(habitId, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  const date = isValidDate(req.body?.date) ? req.body.date : todayFor(req.user.timezone);
  const raw = req.body?.slot;
  const slot = raw == null || raw === '' ? null : String(raw);
  if (slot && !isValidTime(slot)) {
    return res.status(400).json({ error: 'Invalid time slot. Use HH:MM (24h).' });
  }

  if (slot == null) {
    await db.prepare('DELETE FROM habit_slot_overrides WHERE habit_id = ? AND date = ?').run(habitId, date);
  } else {
    await db
      .prepare(
        `INSERT INTO habit_slot_overrides (habit_id, date, scheduled_time) VALUES (?, ?, ?)
         ON CONFLICT (habit_id, date) DO UPDATE SET scheduled_time = excluded.scheduled_time`
      )
      .run(habitId, date, slot);
  }
  res.json({ ok: true, habitId, date, slot });
});

// GET /api/tasks/day-detail?date=... — full detail for calendar day modal
router.get('/day-detail', async (req, res) => {
  const date = isValidDate(req.query.date) ? req.query.date : todayFor(req.user.timezone);
  const due = await habitsDueOn(req.user.id, date);
  const completions = await completionsForDate(req.user.id, date);
  const overrides = await slotOverridesFor(req.user.id, date);
  const tasks = due.map((h) => {
    const c = completions.find((x) => x.habit_id === h.id);
    return {
      name: h.name,
      category: h.category,
      color: h.color,
      completed: Boolean(c?.completed),
      slot: slotOf(h, overrides),
      kind: h.kind ?? 'daily',
      startTime: h.start_time ?? null,
      endTime: h.end_slot ?? null,
    };
  });
  sortBySlot(tasks);
  const sessions = await db
    .prepare(
      `SELECT ss.duration_seconds, ss.started_at, COALESCE(h.name, 'General') AS subject
       FROM study_sessions ss LEFT JOIN habits h ON h.id = ss.habit_id
       WHERE ss.user_id = ? AND ss.date = ? ORDER BY ss.started_at`
    )
    .all(req.user.id, date);
  const studySeconds = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  res.json({
    date,
    tasks,
    sessions,
    studySeconds,
    completionPct: total === 0 ? null : Math.round((done / total) * 100),
  });
});

export default router;
