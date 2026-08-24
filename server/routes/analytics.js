import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from './auth.js';
import {
  addDays,
  computeStreaks,
  dateKey,
  dayStatsRange,
  isValidDate,
  todayFor,
} from '../helpers.js';

const router = Router();
router.use(requireAuth);

// GET /api/analytics/heatmap?year=2026 — full-year day cells
router.get('/heatmap', async (req, res) => {
  const year = Math.min(2100, Math.max(2000, Number(req.query.year) || new Date().getFullYear()));
  const today = todayFor(req.user.timezone);
  const start = `${year}-01-01`;
  const end = `${year}-12-31` > today ? today : `${year}-12-31`;
  const stats = start > today ? new Map() : await dayStatsRange(req.user.id, start, end);
  res.json({ year, days: [...stats.values()] });
});

// GET /api/analytics/weekly?end=YYYY-MM-DD (week ending on that date)
router.get('/weekly', async (req, res) => {
  const endDate = isValidDate(req.query.end) ? req.query.end : todayFor(req.user.timezone);
  const start = addDays(endDate, -6);

  const [stats, habitStats, taskStats] = await Promise.all([
    dayStatsRange(req.user.id, start, endDate),
    dayStatsRange(req.user.id, start, endDate, 'daily'),
    dayStatsRange(req.user.id, start, endDate, 'scheduled'),
  ]);
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(stats.get(addDays(endDate, -i)));
  const habitDays = [];
  const taskDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(endDate, -i);
    habitDays.push(habitStats.get(d));
    taskDays.push(taskStats.get(d));
  }
  const streaks = await computeStreaks(req.user.id, req.user.timezone);
  res.json({ days, habitDays, taskDays, streaks });
});

// GET /api/analytics/monthly?month=2026-08
router.get('/monthly', async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month)) ? req.query.month : todayFor(req.user.timezone).slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
  const today = todayFor(req.user.timezone);
  const start = `${month}-01`;
  const end = monthEnd > today ? today : monthEnd;
  const stats = start > today ? new Map() : await dayStatsRange(req.user.id, start, end);
  const days = [...stats.values()];

  const activeDays = days.filter((d) => d.expected > 0);
  const totalExpected = days.reduce((a, d) => a + d.expected, 0);
  const totalCompleted = days.reduce((a, d) => a + d.completed, 0);
  const studySeconds = days.reduce((a, d) => a + d.studySeconds, 0);
  const bestDay = [...activeDays].sort(
    (a, b) => b.completionPct - a.completionPct || b.studySeconds - a.studySeconds
  )[0] ?? null;

  // per-habit breakdown (batched: one extra query for the month's completions)
  const habitRows = await db
    .prepare('SELECT id, name, color, start_date FROM habits WHERE user_id = ? AND active = 1')
    .all(req.user.id);
  const monthCompletions = await db
    .prepare(
      'SELECT habit_id, date, completed FROM habit_completions WHERE user_id = ? AND date >= ? AND date <= ?'
    )
    .all(req.user.id, start, monthEnd > today ? today : monthEnd);
  const doneByHabit = new Map();
  for (const row of monthCompletions) {
    if (!row.completed) continue;
    const key = dateKey(row.date);
    const set = doneByHabit.get(row.habit_id) ?? new Set();
    set.add(key);
    doneByHabit.set(row.habit_id, set);
  }
  const breakdown = habitRows.map((h) => {
    const habitStart = dateKey(h.start_date);
    const doneDays = doneByHabit.get(h.id) ?? new Set();
    let expected = 0;
    let completed = 0;
    for (const d of days) {
      if (d.date < habitStart) continue;
      expected += 1;
      if (doneDays.has(d.date)) completed += 1;
    }
    return {
      id: h.id,
      name: h.name,
      color: h.color,
      start_date: habitStart,
      expected,
      completed,
      rate: expected === 0 ? null : Math.round((completed / expected) * 100),
    };
  });

  const streaks = await computeStreaks(req.user.id, req.user.timezone);
  res.json({
    month,
    days,
    summary: {
      totalExpected,
      totalCompleted,
      completionPct: totalExpected === 0 ? null : Math.round((totalCompleted / totalExpected) * 100),
      studySeconds,
      avgDailyStudySeconds: days.length ? Math.round(studySeconds / days.length) : 0,
      bestDay,
      streaks,
    },
    breakdown,
  });
});

// GET /api/analytics/yearly?year=2026
router.get('/yearly', async (req, res) => {
  const year = Math.min(2100, Math.max(2000, Number(req.query.year) || new Date().getFullYear()));
  const today = todayFor(req.user.timezone);
  const start = `${year}-01-01`;
  const end = `${year}-12-31` > today ? today : `${year}-12-31`;
  const stats = start > today ? new Map() : await dayStatsRange(req.user.id, start, end);
  const days = [...stats.values()];

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, '0')}`;
    const monthDays = days.filter((d) => d.date.startsWith(month));
    months.push({
      month,
      expected: monthDays.reduce((a, d) => a + d.expected, 0),
      completed: monthDays.reduce((a, d) => a + d.completed, 0),
      studySeconds: monthDays.reduce((a, d) => a + d.studySeconds, 0),
    });
  }
  const totals = months.reduce(
    (acc, m) => ({
      expected: acc.expected + m.expected,
      completed: acc.completed + m.completed,
      studySeconds: acc.studySeconds + m.studySeconds,
    }),
    { expected: 0, completed: 0, studySeconds: 0 }
  );
  const bestMonth = [...months]
    .filter((m) => m.expected > 0)
    .sort((a, b) => b.completed / b.expected - a.completed / a.expected)[0] ?? null;
  const streaks = await computeStreaks(req.user.id, req.user.timezone);

  // available years with data
  const years = (await db
    .prepare(`SELECT DISTINCT substr(date::text, 1, 4) AS y FROM habit_completions WHERE user_id = ? ORDER BY y`)
    .all(req.user.id))
    .map((r) => Number(r.y));

  res.json({
    year,
    months,
    totals: {
      ...totals,
      completionPct: totals.expected === 0 ? null : Math.round((totals.completed / totals.expected) * 100),
      avgDailyCompletion:
        totals.expected === 0 ? null : Math.round((totals.completed / totals.expected) * 100),
    },
    bestMonth,
    streaks,
    availableYears: [...new Set([...years, new Date().getFullYear()])],
  });
});

// GET /api/analytics/habit/:id — per-habit deep dive
router.get('/habit/:id', async (req, res) => {
  const habitId = Number(req.params.id);
  const habit = await db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(habitId, req.user.id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  const rows = (await db
    .prepare('SELECT date, completed FROM habit_completions WHERE user_id = ? AND habit_id = ? AND completed = 1 ORDER BY date')
    .all(req.user.id, habitId))
    .map((r) => dateKey(r.date));

  const today = todayFor(req.user.timezone);
  // current streak for this habit
  let current = 0;
  let cursor = today;
  const doneSet = new Set(rows);
  for (let i = 0; i < 3650; i++) {
    if (!isHabitScheduled(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (doneSet.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    } else if (cursor !== today) {
      break;
    } else {
      cursor = addDays(cursor, -1);
    }
  }

  // longest streak
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const date of rows) {
    run = prev && addDays(prev, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  const studySeconds = (await db
    .prepare('SELECT COALESCE(SUM(duration_seconds),0) AS s FROM study_sessions WHERE user_id=? AND habit_id=?')
    .get(req.user.id, habitId)).s;

  // weekly history (last 8 weeks): completions per ISO week
  const weekly = [];
  for (let w = 7; w >= 0; w--) {
    const end = addDays(today, -7 * w);
    const start = addDays(end, -6);
    const c = rows.filter((d) => d >= start && d <= end).length;
    weekly.push({ weekEnding: end, completed: c });
  }

  // monthly history (last 12 months)
  const monthly = [];
  for (let m = 11; m >= 0; m--) {
    const ref = new Date(today + 'T00:00:00');
    ref.setMonth(ref.getMonth() - m);
    const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
    const c = rows.filter((d) => d.startsWith(key)).length;
    monthly.push({ month: key, completed: c });
  }

  const totalCompleted = rows.length;
  const startDate = dateKey(habit.start_date);
  const daysSince = Math.max(1, Math.round((Date.parse(today) - Date.parse(startDate)) / 86400_000) + 1);
  const scheduledDays = countScheduledBetween(habit, startDate, today);
  const completionRate =
    scheduledDays === 0 ? null : Math.round((totalCompleted / scheduledDays) * 100);

  res.json({
    habit: { ...habit, weekdays: JSON.parse(habit.weekdays || '[]') },
    stats: {
      completionRate,
      currentStreak: current,
      longestStreak: longest,
      totalCompleted,
      studySeconds,
      weekly,
      monthly,
    },
  });
});

function isHabitScheduled(habit, date) {
  const start = dateKey(habit.start_date);
  const end = habit.end_date ? dateKey(habit.end_date) : null;
  if (date < start) return false;
  if (end && date > end) return false;
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays': {
      const wd = new Date(date + 'T00:00:00').getDay();
      return wd >= 1 && wd <= 5;
    }
    case 'custom': {
      const wd = new Date(date + 'T00:00:00').getDay();
      try {
        return JSON.parse(habit.weekdays || '[]').includes(wd);
      } catch {
        return false;
      }
    }
    case 'weekly': {
      const interval = Math.max(1, habit.interval_weeks || 1);
      const diffDays = Math.round((Date.parse(date) - Date.parse(start)) / 86400_000);
      return diffDays % (interval * 7) === 0;
    }
    default:
      return false;
  }
}

function countScheduledBetween(habit, from, to) {
  let count = 0;
  let d = from;
  while (d <= to) {
    if (isHabitScheduled(habit, d)) count += 1;
    d = addDays(d, 1);
  }
  return count;
}

export default router;
