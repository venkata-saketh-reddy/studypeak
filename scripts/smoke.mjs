// End-to-end API smoke test (run: node scripts/smoke.mjs)
const BASE = 'http://localhost:3001';
let cookie = '';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) process.exitCode = 1;
}

const email = `smoke_${Date.now()}@test.dev`;

// Auth
let r = await req('POST', '/api/auth/signup', { email, password: 'secret123', name: 'Smoke' });
assert(r.status === 201 && r.data.user?.id, 'signup creates user + session');

r = await req('GET', '/api/auth/me');
assert(r.status === 200 && r.data.user?.email === email, 'session persists via cookie');

// Unauthenticated access is blocked
const saved = cookie;
cookie = '';
r = await req('GET', '/api/tasks');
assert(r.status === 401, 'tasks endpoint rejects unauthenticated requests');
cookie = saved;

// Habits
r = await req('POST', '/api/habits', {
  name: 'Study Java', category: 'Study', targetType: 'duration', targetValue: 120,
  frequency: 'weekdays', startDate: '2026-08-17',
});
assert(r.status === 201, 'habit created');
const habitId = r.data.habit.id;

r = await req('POST', '/api/habits', { name: '', targetType: 'boolean' });
assert(r.status === 400, 'invalid habit rejected');

r = await req('GET', '/api/tasks?date=2026-08-17'); // Monday
assert(r.data.tasks?.length === 1, 'weekday habit due on Monday');
r = await req('GET', '/api/tasks?date=2026-08-29'); // Saturday
assert(r.data.tasks?.length === 0, 'weekday habit not due on Saturday');

// Study session feeds duration-based habit
r = await req('POST', '/api/sessions', {
  habitId, startedAt: '2026-08-17T09:00:00Z', endedAt: '2026-08-17T10:00:00Z',
  durationSeconds: 3600, status: 'completed',
});
assert(r.status === 201, 'study session saved');
assert(r.data.newlyUnlocked?.some((a) => a.code === 'first_session'), 'first_session achievement unlocked');

r = await req('GET', '/api/tasks?date=2026-08-17');
assert(r.data.tasks[0].progress === 60 && !r.data.tasks[0].completed, '60/120 min progress, incomplete');

// Duplicate completion protection
r = await req('POST', `/api/tasks/${habitId}/complete`, { date: '2026-08-17', extraMinutes: 60 });
assert(r.data.completion.completed === true, 'habit completes at target (120/120)');
r = await req('POST', `/api/tasks/${habitId}/complete`, { date: '2026-08-17', extraMinutes: 0 });
r = await req('GET', '/api/tasks/day-detail?date=2026-08-17');
assert(r.data.completionPct === 100, 'day detail shows 100%');

// Streaks
r = await req('GET', '/api/analytics/weekly');
assert(typeof r.data.streaks.current === 'number', 'streaks computed');

// Analytics
r = await req('GET', '/api/analytics/monthly?month=2026-08');
assert(r.status === 200 && r.data.summary != null, 'monthly analytics');
r = await req('GET', '/api/analytics/yearly?year=2026');
assert(r.status === 200 && r.data.months.length === 12, 'yearly analytics');
r = await req('GET', `/api/analytics/habit/${habitId}`);
assert(r.status === 200 && r.data.stats.totalCompleted >= 1, 'per-habit analytics');

// Settings
r = await req('PUT', '/api/settings', { theme: 'dark', defaultStudyMinutes: 30 });
assert(r.data.settings.theme === 'dark' && r.data.settings.defaultStudyMinutes === 30, 'settings update');

// Logout
r = await req('POST', '/api/auth/logout');
r = await req('GET', '/api/auth/me');
assert(r.status === 401, 'logout invalidates session');

console.log('\nSmoke test complete.');
