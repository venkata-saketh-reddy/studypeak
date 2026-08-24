import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from './auth.js';
import { isHabitScheduledOn, isValidDate, isValidTime, todayFor } from '../helpers.js';

const router = Router();
router.use(requireAuth);

const CATEGORIES = ['Study', 'Fitness', 'Reading', 'Personal', 'General'];
const TARGET_TYPES = ['boolean', 'duration', 'quantity'];
const FREQUENCIES = ['daily', 'weekdays', 'weekly', 'custom'];
const KINDS = ['daily', 'scheduled'];

function validateHabit(body) {
  const kind = KINDS.includes(body.kind) ? body.kind : 'daily';
  const name = String(body.name ?? '').trim();
  if (!name) return { error: 'Habit name is required.' };
  if (name.length > 80) return { error: 'Habit name must be 80 characters or fewer.' };

  const targetType = kind === 'scheduled' ? 'boolean' : body.targetType;
  if (!TARGET_TYPES.includes(targetType)) return { error: 'Invalid target type.' };

  let targetValue = Number(body.targetValue);
  if (kind === 'scheduled') {
    targetValue = 1; // check-off only
  } else {
    if (!Number.isFinite(targetValue) || targetValue <= 0) return { error: 'Target must be a positive number.' };
    if (targetType === 'duration') targetValue = Math.round(targetValue); // minutes
    if (targetType === 'quantity') targetValue = Math.round(targetValue);
    if (targetType === 'boolean') targetValue = 1;
  }

  const frequency = kind === 'scheduled' ? 'daily' : body.frequency ?? 'daily';
  if (!FREQUENCIES.includes(frequency)) return { error: 'Invalid frequency.' };

  let weekdays = '[1,2,3,4,5]';
  if (frequency === 'custom') {
    const list = Array.isArray(body.weekdays)
      ? body.weekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      : [];
    if (list.length === 0) return { error: 'Pick at least one day of the week.' };
    weekdays = JSON.stringify([...new Set(list)].sort());
  }

  const startDate = body.startDate ?? todayFor('local');
  if (!isValidDate(startDate)) return { error: 'Invalid start date.' };
  // Only daily habits can have an end date — scheduled tasks run until cancelled.
  const endDate = kind === 'scheduled' ? null : body.endDate || null;
  if (endDate && !isValidDate(endDate)) return { error: 'Invalid end date.' };
  if (endDate && endDate < startDate) return { error: 'End date cannot be before the start date.' };

  const intervalWeeks = Math.max(1, Math.min(52, Math.round(Number(body.intervalWeeks) || 1)));
  const category = kind === 'scheduled' ? 'Scheduled' : CATEGORIES.includes(body.category) ? body.category : 'General';
  const color = /^#[0-9a-fA-F]{6}$/.test(body.color ?? '') ? body.color : '#4f7cff';

  const scheduledTime = body.scheduledTime == null || body.scheduledTime === '' ? null : String(body.scheduledTime);
  if (scheduledTime && !isValidTime(scheduledTime)) return { error: 'Invalid time slot. Use HH:MM (24h).' };

  // Daywise tasks get a time-slot range (from – to)
  let startTime = null;
  let endTime = null;
  if (kind === 'scheduled') {
    startTime = body.startTime ? String(body.startTime) : null;
    endTime = body.endTime ? String(body.endTime) : null;
    if (!startTime || !isValidTime(startTime)) return { error: 'Pick a valid start time for the task.' };
    if (!endTime || !isValidTime(endTime)) return { error: 'Pick a valid end time for the task.' };
    if (endTime <= startTime) return { error: 'End time must be after the start time.' };
  }

  return {
    value: {
      name,
      description: String(body.description ?? '').slice(0, 300),
      category,
      target_type: targetType,
      target_value: targetValue,
      frequency,
      weekdays,
      interval_weeks: intervalWeeks,
      start_date: startDate,
      end_date: endDate,
      color,
      scheduled_time: kind === 'scheduled' ? startTime : scheduledTime,
      kind,
      start_time: startTime,
      end_slot: endTime,
    },
  };
}

// List habits + which are due on a given date
router.get('/', async (req, res) => {
  const date = isValidDate(req.query.date) ? req.query.date : todayFor(req.user.timezone);
  const habits = await db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at').all(req.user.id);
  res.json({
    habits: habits.map((h) => ({ ...h, dueToday: isHabitScheduledOn(h, date) })),
    categories: CATEGORIES,
  });
});

router.post('/', async (req, res) => {
  const v = validateHabit(req.body ?? {});
  if (v.error) return res.status(400).json({ error: v.error });
  const h = v.value;
  const info = await db
    .prepare(
      `INSERT INTO habits (user_id, name, description, category, target_type, target_value,
        frequency, weekdays, interval_weeks, start_date, end_date, color, scheduled_time, kind, start_time, end_slot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id, h.name, h.description, h.category, h.target_type, h.target_value,
      h.frequency, h.weekdays, h.interval_weeks, h.start_date, h.end_date, h.color,
      h.scheduled_time, h.kind, h.start_time, h.end_slot
    );
  res.status(201).json({ habit: await db.prepare('SELECT * FROM habits WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/:id', async (req, res) => {
  const existing = await db
    .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Habit not found.' });

  // Allow partial updates for simple fields (e.g. toggling active), full validation otherwise.
  if (req.body?.toggleActiveOnly) {
    await db.prepare('UPDATE habits SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      existing.active ? 0 : 1,
      existing.id
    );
    return res.json({ habit: await db.prepare('SELECT * FROM habits WHERE id = ?').get(existing.id) });
  }

  const merged = {
    ...existing,
    ...req.body,
    weekdays: Array.isArray(req.body?.weekdays) ? req.body.weekdays : JSON.parse(existing.weekdays || '[]'),
    startDate: req.body?.startDate ?? existing.start_date,
    endDate: req.body?.endDate !== undefined ? req.body.endDate : existing.end_date,
    targetType: req.body?.targetType ?? existing.target_type,
    targetValue: req.body?.targetValue ?? existing.target_value,
    intervalWeeks: req.body?.intervalWeeks ?? existing.interval_weeks,
    scheduledTime: req.body?.scheduledTime !== undefined ? req.body.scheduledTime : existing.scheduled_time,
    kind: req.body?.kind ?? existing.kind ?? 'daily',
    startTime: req.body?.startTime !== undefined ? req.body.startTime : existing.start_time,
    endTime: req.body?.endTime !== undefined ? req.body.endTime : existing.end_slot,
  };
  const v = validateHabit(merged);
  if (v.error) return res.status(400).json({ error: v.error });
  const h = v.value;
  await db.prepare(
    `UPDATE habits SET name=?, description=?, category=?, target_type=?, target_value=?,
      frequency=?, weekdays=?, interval_weeks=?, start_date=?, end_date=?, color=?, scheduled_time=?,
      kind=?, start_time=?, end_slot=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).run(
    h.name, h.description, h.category, h.target_type, h.target_value,
    h.frequency, h.weekdays, h.interval_weeks, h.start_date, h.end_date, h.color, h.scheduled_time,
    h.kind, h.start_time, h.end_slot, existing.id
  );
  res.json({ habit: await db.prepare('SELECT * FROM habits WHERE id = ?').get(existing.id) });
});

router.delete('/:id', async (req, res) => {
  const deleted = await db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ? RETURNING id').all(req.params.id, req.user.id);
  if (deleted.length === 0) return res.status(404).json({ error: 'Habit not found.' });
  res.json({ ok: true });
});

export default router;
