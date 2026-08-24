import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, Medal, Target, TriangleAlert } from 'lucide-react';
import { api } from '@/services/api';
import { onDataChanged } from '@/services/dataEvents';
import {
  axisStroke,
  axisTick,
  ChartGlowDefs,
  ChartTooltip,
  gridStroke,
  makeGlowShape,
} from '@/components/analytics/chartTheme';
import type { Habit, HabitAnalytics, MonthlyResponse, WeeklyResponse, YearlyResponse } from '@/types';
import { Card, CardHeader, Button, Skeleton, EmptyState, StatTile } from '@/components/ui';
import { FancySelect } from '@/components/ui/FancySelect';
import { formatDuration } from '@/utils/datetime';

type Tab = 'weekly' | 'monthly' | 'yearly' | 'habit';

export function Analytics() {
  const [tab, setTab] = useState<Tab>('weekly');
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your productivity, measured honestly.</p>
      </header>

      <div role="tablist" aria-label="Analytics period" className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900">
        {(
          [
            ['weekly', 'Weekly'],
            ['monthly', 'Monthly'],
            ['yearly', 'Yearly'],
            ['habit', 'By habit'],
          ] as [Tab, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              tab === v
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'weekly' && <WeeklyTab />}
      {tab === 'monthly' && <MonthlyTab />}
      {tab === 'yearly' && <YearlyTab />}
      {tab === 'habit' && <HabitTab />}
    </div>
  );
}

/* ---------------- Weekly ---------------- */

function WeeklyTab() {
  const [data, setData] = useState<WeeklyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await api.get<WeeklyResponse>('/analytics/weekly'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => onDataChanged(load), [load]);

  if (loading) return <Skeleton className="h-96" />;
  if (!data) return null;

  const chartData = data.days.map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    completion: d.completionPct ?? 0,
    minutes: Math.round(d.studySeconds / 60),
  }));
  const habitChartData = data.habitDays.map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    completion: d.completionPct ?? 0,
  }));
  const taskChartData = data.taskDays.map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    completion: d.completionPct ?? 0,
  }));
  const totalStudy = data.days.reduce((a, d) => a + d.studySeconds, 0);
  const tasksDone = data.days.reduce((a, d) => a + d.completed, 0);
  const tasksMissed = data.days.reduce((a, d) => a + (d.expected - d.completed), 0);
  const activeDays = data.days.filter((d) => d.expected > 0);
  const avgPct =
    activeDays.length === 0 ? null : Math.round(activeDays.reduce((a, d) => a + (d.completionPct ?? 0), 0) / activeDays.length);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Tasks Completed" value={String(tasksDone)} sub={`${tasksMissed} missed`} />
        <StatTile label="Study Time" value={formatDuration(totalStudy)} sub="this week" />
        <StatTile label="Avg Completion" value={avgPct == null ? '—' : `${avgPct}%`} sub="active days" />
        <StatTile label="Streak" value={String(data.streaks.current)} sub={`best ${data.streaks.longest}`} />
      </section>

      <Card>
        <CardHeader title="Daily habits — completion %" subtitle="consistency routines checked off each day" />
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={habitChartData} margin={{ top: 16 }}>
              <ChartGlowDefs id="weekly-habits" from="#818cf8" to="#4f7cff" />
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} stroke={axisStroke} tickLine={false} />
              <YAxis domain={[0, 100]} tick={axisTick} unit="%" tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={false} />
              <Bar
                dataKey="completion"
                fill="#4f7cff"
                shape={makeGlowShape('#4f7cff', 'weekly-habits')}
                isAnimationActive={false}
                legendType="none"
              />
              <Bar
                dataKey="completion"
                name="Habits"
                fill="url(#grad-weekly-habits)"
                radius={[8, 8, 2, 2]}
                maxBarSize={44}
                activeBar={{ stroke: '#a5b4fc', strokeWidth: 2 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Scheduled tasks — completion %" subtitle="daywise tasks finished in their time slot" />
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskChartData} margin={{ top: 16 }}>
              <ChartGlowDefs id="weekly-tasks" from="#c084fc" to="#8b5cf6" />
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} stroke={axisStroke} tickLine={false} />
              <YAxis domain={[0, 100]} tick={axisTick} unit="%" tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={false} />
              <Bar
                dataKey="completion"
                fill="#8b5cf6"
                shape={makeGlowShape('#8b5cf6', 'weekly-tasks')}
                isAnimationActive={false}
                legendType="none"
              />
              <Bar
                dataKey="completion"
                name="Tasks"
                fill="url(#grad-weekly-tasks)"
                radius={[8, 8, 2, 2]}
                maxBarSize={44}
                activeBar={{ stroke: '#c4b5fd', strokeWidth: 2 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Study minutes per day" />
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} stroke={axisStroke} tickLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip unit=" min" />} cursor={{ stroke: 'rgba(148,163,184,0.35)', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="minutes"
                name="Minutes"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }}
                activeDot={{ r: 6, strokeWidth: 3, stroke: 'rgba(16,185,129,0.35)', fill: '#34d399' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Monthly ---------------- */

function monthOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function MonthlyTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (m: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await api.get<MonthlyResponse>(`/analytics/monthly?month=${m}`));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  useEffect(() => onDataChanged(() => load(month, true)), [month, load]);

  if (loading && !data) return <Skeleton className="h-96" />;
  if (!data) return null;

  const s = data.summary;
  const chartData = data.days.map((d) => ({
    day: Number(d.date.slice(8)),
    minutes: Math.round(d.studySeconds / 60),
    completion: d.completionPct ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <label htmlFor="month-select" className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Month
        </label>
        <FancySelect
          id="month-select"
          ariaLabel="Month"
          value={month}
          onChange={setMonth}
          className="w-52"
          options={monthOptions().map((m) => ({
            value: m,
            label: new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
          }))}
        />
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Completion" value={s.completionPct == null ? '—' : `${s.completionPct}%`} sub={`${s.totalCompleted}/${s.totalExpected} tasks`} />
        <StatTile label="Total Study Time" value={formatDuration(s.studySeconds)} sub={`${formatDuration(s.avgDailyStudySeconds)} / day avg`} />
        <StatTile label="Best Day" value={s.bestDay ? `${s.bestDay.completionPct}%` : '—'} sub={s.bestDay?.date.slice(8) ?? 'no data'} />
        <StatTile label="Streak" value={String(s.streaks.current)} sub={`best ${s.streaks.longest}`} />
      </section>

      {data.days.length === 0 ? (
          <EmptyState icon={<BarChart3 size={24} />} title="No data for this month" description="Pick a different month or complete some tasks." />
      ) : (
        <>
          <Card>
            <CardHeader title="Study time per day" subtitle="minutes" />
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16 }}>
                  <ChartGlowDefs id="monthly" from="#a78bfa" to="#8b5cf6" />
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="day" tick={axisTick} stroke={axisStroke} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTooltip unit=" min" />} cursor={false} labelFormatter={(l) => `Day ${l}`} />
                  <Bar
                    dataKey="minutes"
                    fill="#8b5cf6"
                    shape={makeGlowShape('#8b5cf6', 'monthly')}
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Bar
                    dataKey="minutes"
                    name="Minutes"
                    fill="url(#grad-monthly)"
                    radius={[8, 8, 2, 2]}
                    activeBar={{ stroke: '#c4b5fd', strokeWidth: 2 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Habit breakdown" subtitle="completion rate this month" />
            {data.breakdown.length === 0 ? (
              <EmptyState icon={<Target size={24} />} title="No active habits" description="Create habits to see per-habit stats." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.breakdown.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">
                      {b.rate == null ? '—' : `${b.rate}%`} ({b.completed}/{b.expected})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------- Yearly ---------------- */

function YearlyTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<YearlyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await api.get<YearlyResponse>(`/analytics/yearly?year=${y}`));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(year);
  }, [year, load]);

  useEffect(() => onDataChanged(() => load(year, true)), [year, load]);

  if (loading && !data) return <Skeleton className="h-96" />;
  if (!data) return null;

  const chartData = data.months.map((m) => ({
    month: new Date(m.month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short' }),
    hours: +(m.studySeconds / 3600).toFixed(1),
    completion:
      m.expected === 0 ? 0 : Math.round((m.completed / m.expected) * 100),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <label htmlFor="year-select" className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Year
        </label>
        <FancySelect
          id="year-select"
          ariaLabel="Year"
          value={String(year)}
          onChange={(v) => setYear(Number(v))}
          className="w-28"
          options={[...new Set([...data.availableYears, year])]
            .sort((a, b) => b - a)
            .map((y) => ({ value: String(y), label: String(y) }))}
        />
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Study Hours" value={`${Math.round(data.totals.studySeconds / 3600)}h`} sub="this year" />
        <StatTile label="Tasks Completed" value={String(data.totals.completed)} sub={`of ${data.totals.expected} scheduled`} />
        <StatTile label="Avg Completion" value={data.totals.completionPct == null ? '—' : `${data.totals.completionPct}%`} sub="all year" />
        <StatTile label="Longest Streak" value={String(data.streaks.longest)} sub={`current ${data.streaks.current}`} />
      </section>

      {data.bestMonth && (
        <Card className="px-5 py-4">
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Medal size={16} className="text-yellow-500" />
            Best month:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {new Date(data.bestMonth.month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long' })}
            </strong>
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title="Monthly study hours" />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16 }}>
              <ChartGlowDefs id="yearly" from="#22d3ee" to="#06b6d4" />
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} stroke={axisStroke} tickLine={false} />
              <YAxis tick={axisTick} unit="h" tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={false} />
              <Bar
                dataKey="hours"
                fill="#06b6d4"
                shape={makeGlowShape('#06b6d4', 'yearly')}
                isAnimationActive={false}
                legendType="none"
              />
              <Bar
                dataKey="hours"
                name="Hours"
                fill="url(#grad-yearly)"
                radius={[8, 8, 2, 2]}
                maxBarSize={40}
                activeBar={{ stroke: '#67e8f9', strokeWidth: 2 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Monthly completion %" />
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} stroke={axisStroke} tickLine={false} />
              <YAxis domain={[0, 100]} tick={axisTick} unit="%" tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={false} />
              <Line
                type="monotone"
                dataKey="completion"
                name="Completion"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 0, fill: '#f59e0b' }}
                activeDot={{ r: 6, strokeWidth: 3, stroke: 'rgba(245,158,11,0.35)', fill: '#fbbf24' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Per-habit ---------------- */

function HabitTab() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [data, setData] = useState<HabitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ habits: Habit[] }>('/habits')
      .then((r) => {
        setHabits(r.habits);
        if (r.habits.length > 0) setSelected(String(r.habits[0].id));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadHabit = useCallback(async (id: string, silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      setData(await api.get<HabitAnalytics>(`/analytics/habit/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load habit analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabit(selected);
  }, [selected, loadHabit]);

  useEffect(() => onDataChanged(() => loadHabit(selected, true)), [selected, loadHabit]);

  if (habits.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Target size={24} />}
        title="No habits yet"
        description="Create a habit first, then come back to see its consistency stats."
      />
    );
  }

  if (loading && !data) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <label htmlFor="habit-select" className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Habit
        </label>
        <FancySelect
          id="habit-select"
          ariaLabel="Habit"
          value={selected}
          onChange={setSelected}
          className="w-56"
          options={habits.map((h) => ({ value: String(h.id), label: h.name }))}
        />
      </div>

      {error && <EmptyState icon={<TriangleAlert size={24} />} title="Couldn't load analytics" description={error} action={<Button onClick={() => loadHabit(selected)}>Retry</Button>} />}

      {data && !error && (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Completion Rate" value={data.stats.completionRate == null ? '—' : `${data.stats.completionRate}%`} sub="of scheduled days" />
            <StatTile label="Current Streak" value={String(data.stats.currentStreak)} sub="days" />
            <StatTile label="Longest Streak" value={String(data.stats.longestStreak)} sub="days" />
            <StatTile
              label="Study Time"
              value={formatDuration(data.stats.studySeconds)}
              sub={`${data.stats.totalCompleted} completions`}
            />
          </section>

          <Card>
            <CardHeader title="Weekly history" subtitle="completions per week (last 8 weeks)" />
            <div className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.stats.weekly.map((w) => ({ week: w.weekEnding.slice(5), completed: w.completed }))} margin={{ top: 16 }}>
                  <ChartGlowDefs id="habit-weekly" from={data.habit.color} to={data.habit.color} />
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="week" tick={axisTick} stroke={axisStroke} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Bar
                    dataKey="completed"
                    fill={data.habit.color}
                    shape={makeGlowShape(data.habit.color, 'habit-weekly')}
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Bar
                    dataKey="completed"
                    name="Completions"
                    fill="url(#grad-habit-weekly)"
                    radius={[8, 8, 2, 2]}
                    maxBarSize={36}
                    activeBar={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Monthly history" subtitle="completions per month (last 12 months)" />
            <div className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.stats.monthly.map((m) => ({ month: m.month.slice(2), completed: m.completed }))} margin={{ top: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={axisTick} stroke={axisStroke} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completions"
                    stroke={data.habit.color}
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 0, fill: data.habit.color }}
                    activeDot={{ r: 6, strokeWidth: 3, stroke: `${data.habit.color}55`, fill: data.habit.color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
