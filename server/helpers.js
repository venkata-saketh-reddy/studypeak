import db from './db.js';

// ---------- helpers ----------

export function todayFor(timezone) {
  // Uses the user's IANA timezone when provided; falls back to server-local date.
  if (timezone && timezone !== 'local') {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    } catch {
      /* invalid tz -> fall through */
    }
  }
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isValidDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function isValidTime(t) {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function addDays(dateStr, n) {
  // Pure calendar arithmetic on the date string — timezone-safe (no UTC shift).
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(dateStr) {
  // 0 = Sunday ... 6 = Saturday
  return new Date(dateStr + 'T00:00:00').getDay();
}

// The pg driver returns DATE columns as JS Date objects at local midnight.
// Normalize them (or strings) back to 'YYYY-MM-DD'.
export function dateKey(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

export function isHabitScheduledOn(habit, date) {
  if (!habit.active) return false;
  const start = dateKey(habit.start_date);
  const end = habit.end_date ? dateKey(habit.end_date) : null;
  if (date < start) return false;
  if (end && date > end) return false;

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays': {
      const wd = weekdayOf(date);
      return wd >= 1 && wd <= 5;
    }
    case 'weekly': {
      const interval = Math.max(1, habit.interval_weeks || 1);
      const startWd = weekdayOf(start);
      const diffDays = Math.round((Date.parse(date) - Date.parse(start)) / 86400_000);
      const weeksBetween = Math.floor((diffDays + startWd) / 7);
      return weeksBetween % interval === 0;
    }
    case 'custom': {
      let weekdays;
      try {
        weekdays = JSON.parse(habit.weekdays || '[]');
      } catch {
        weekdays = [];
      }
      return Array.isArray(weekdays) && weekdays.includes(weekdayOf(date));
    }
    default:
      return false;
  }
}

export async function habitsDueOn(userId, date) {
  const habits = await db.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1').all(userId);
  return habits.filter((h) => isHabitScheduledOn(h, date));
}

export async function completionsForDate(userId, date) {
  return db
    .prepare(
      `SELECT hc.*, h.name AS habit_name, h.category, h.target_type, h.target_value, h.color
       FROM habit_completions hc JOIN habits h ON h.id = hc.habit_id
       WHERE hc.user_id = ? AND hc.date = ?`
    )
    .all(userId, date);
}

export async function studySecondsOnDate(userId, date) {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(duration_seconds), 0) AS total FROM study_sessions WHERE user_id = ? AND date = ?`)
    .get(userId, date);
  return row.total;
}

/**
 * A day counts toward the streak when the user completed ALL tasks due that day
 * (and at least one task was due). Days with no scheduled tasks are neutral:
 * they neither break nor extend the streak.
 *
 * Loads habits + completions once and computes everything in memory.
 */
export async function computeStreaks(userId, timezone) {
  const today = todayFor(timezone);
  const habits = await db.prepare('SELECT * FROM habits WHERE user_id = ? AND active = 1').all(userId);
  const completionRows = await db
    .prepare('SELECT habit_id, date, completed FROM habit_completions WHERE user_id = ?')
    .all(userId);

  const completionsByDate = new Map();
  for (const row of completionRows) {
    const key = dateKey(row.date);
    let byHabit = completionsByDate.get(key);
    if (!byHabit) {
      byHabit = new Map();
      completionsByDate.set(key, byHabit);
    }
    byHabit.set(row.habit_id, row.completed);
  }

  const ratioFor = (date) => {
    const due = habits.filter((h) => isHabitScheduledOn(h, date));
    if (due.length === 0) return null; // neutral day
    const comps = completionsByDate.get(date);
    const done = due.reduce((acc, h) => acc + (comps?.get(h.id) ? 1 : 0), 0);
    return done / due.length;
  };

  // Current streak: walk back from today. Today counts only if fully complete;
  // an incomplete *past* day breaks the streak. Stop once we're before every
  // habit's start date (everything earlier is neutral by definition).
  let current = 0;
  if (habits.length > 0) {
    const earliest = habits.reduce(
      (min, h) => Math.min(min, Date.parse(dateKey(h.start_date))),
      Infinity
    );
    let cursor = today;
    let isFirstDay = true;
    while (Date.parse(cursor) >= earliest) {
      const ratio = ratioFor(cursor);
      if (ratio !== null) {
        if (ratio >= 1) {
          current += 1;
        } else if (!isFirstDay) {
          break;
        }
      }
      isFirstDay = false;
      cursor = addDays(cursor, -1);
    }
  }

  // Longest streak: only days that have completions recorded can be "full" days.
  const dates = [...completionsByDate.keys()].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const date of dates) {
    const ratio = ratioFor(date);
    if (ratio !== null && ratio >= 1) {
      run = prev && addDays(prev, 1) === date ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = date;
    } else if (ratio !== null) {
      run = 0;
      prev = null;
    }
    // neutral days don't reset the run
  }

  return { current, longest: Math.max(longest, current) };
}

/**
 * Batched per-day stats for an inclusive date range — 3 queries total
 * regardless of range length. Returns a Map of date -> stats.
 * Pass kind ('daily' | 'scheduled') to restrict to one habit type.
 */
export async function dayStatsRange(userId, fromDate, toDate, kind = null) {
  const kindFilter = kind ? ' AND kind = ?' : '';
  const habits = await db
    .prepare(`SELECT * FROM habits WHERE user_id = ? AND active = 1${kindFilter}`)
    .all(...(kind ? [userId, kind] : [userId]));
  const completionRows = await db
    .prepare(
      'SELECT habit_id, date, completed FROM habit_completions WHERE user_id = ? AND date >= ? AND date <= ?'
    )
    .all(userId, fromDate, toDate);
  const studyRows = await db
    .prepare(
      'SELECT date, COALESCE(SUM(duration_seconds), 0) AS seconds FROM study_sessions WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date'
    )
    .all(userId, fromDate, toDate);

  const compsByDate = new Map();
  for (const row of completionRows) {
    const key = dateKey(row.date);
    if (!compsByDate.has(key)) compsByDate.set(key, []);
    compsByDate.get(key).push(row);
  }
  const studyByDate = new Map(studyRows.map((row) => [dateKey(row.date), Number(row.seconds)]));

  const stats = new Map();
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const due = habits.filter((h) => isHabitScheduledOn(h, d));
    const comps = compsByDate.get(d) ?? [];
    const done = due.reduce(
      (a, h) => a + (comps.some((c) => c.habit_id === h.id && c.completed) ? 1 : 0),
      0
    );
    stats.set(d, {
      date: d,
      expected: due.length,
      completed: done,
      completionPct: due.length === 0 ? null : Math.round((done / due.length) * 100),
      studySeconds: studyByDate.get(d) ?? 0,
    });
  }
  return stats;
}

export async function totalsForUser(userId) {
  const tasksDone = (await db
    .prepare('SELECT COUNT(*) AS c FROM habit_completions WHERE user_id = ? AND completed = 1')
    .get(userId)).c;
  const seconds = (await db
    .prepare('SELECT COALESCE(SUM(duration_seconds),0) AS s FROM study_sessions WHERE user_id = ?')
    .get(userId)).s;
  return { tasksDone, studySeconds: seconds };
}

// ---------- achievements ----------

const ACHIEVEMENT_CHECKS = [
  { code: 'first_task', test: (t) => t.tasksDone >= 1 },
  { code: 'tasks_100', test: (t) => t.tasksDone >= 100 },
  { code: 'first_session', test: (t) => t.studySeconds >= 60 },
  { code: 'study_10h', test: (t) => t.studySeconds >= 10 * 3600 },
  { code: 'study_50h', test: (t) => t.studySeconds >= 50 * 3600 },
  { code: 'study_100h', test: (t) => t.studySeconds >= 100 * 3600 },
];

export async function checkAndUnlockAchievements(userId) {
  const totals = await totalsForUser(userId);
  const streaks = await computeStreaks(userId, 'local');
  const longest = streaks.longest;

  const candidates = [
    ...ACHIEVEMENT_CHECKS,
    { code: 'streak_3', test: () => longest >= 3 },
    { code: 'streak_7', test: () => longest >= 7 },
    { code: 'streak_14', test: () => longest >= 14 },
    { code: 'streak_30', test: () => longest >= 30 },
  ];

  const newlyUnlocked = [];
  const insert = db.prepare(
    `INSERT INTO user_achievements (user_id, achievement_id)
     SELECT ?, id FROM achievements WHERE code = ?
     ON CONFLICT DO NOTHING
     RETURNING achievement_id`
  );
  const getAch = db.prepare('SELECT * FROM achievements WHERE id = ?');

  for (const c of candidates) {
    if (!c.test(totals)) continue;
    const row = await insert.get(userId, c.code);
    if (row) newlyUnlocked.push(await getAch.get(row.achievement_id));
  }
  return newlyUnlocked;
}
