import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, ListChecks, CalendarClock, Repeat, Trophy, TriangleAlert, Sprout, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import { onDataChanged } from '@/services/dataEvents';
import type { DayTasksResponse } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, Button, StatTile, Skeleton, EmptyState, ProgressBar } from '@/components/ui';
import { TaskList } from '@/components/habits/TaskList';
import { DayDetailModal } from '@/components/calendar/DayDetailModal';
import { HabitForm } from '@/components/habits/HabitForm';
import { Modal } from '@/components/ui/Modal';
import { useRobotNarrator } from '@/components/robot/useRobotNarrator';
import { greeting, formatDateLong, formatDuration, todayStr } from '@/utils/datetime';

export function Dashboard() {
  const { user } = useAuth();
  const today = todayStr();
  const [data, setData] = useState<DayTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<DayTasksResponse>(`/tasks?date=${today}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh when a task/session changes anywhere in the app
  useEffect(() => onDataChanged(load), [load]);

  // Robot reactions to progress milestones
  useRobotNarrator(data ? [...(data.tasks ?? []), ...(data.dailyHabits ?? [])] : undefined, loading);

  const tasks = data?.tasks ?? [];
  const dailyHabits = data?.dailyHabits ?? [];
  const everything = [...tasks, ...dailyHabits];
  const done = everything.filter((t) => t.completed).length;
  const pct = everything.length ? Math.round((done / everything.length) * 100) : null;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <EmptyState
          icon={<TriangleAlert size={24} />}
          title="Something went wrong"
          description={error}
          action={<Button onClick={load}>Try again</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting()}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDateLong(today)}</p>
      </header>

      {/* Stats */}
      <section aria-label="Today's stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Today's Progress"
          value={pct == null ? '—' : `${done}/${everything.length}`}
          sub={pct == null ? 'No tasks scheduled' : `${pct}% complete`}
          icon={<ListChecks size={16} />}
        />
        <StatTile
          label="Study Time Today"
          value={formatDuration(data?.studySeconds ?? 0)}
          sub="Focused work"
          icon={<Clock size={16} />}
        />
        <StatTile
          label="Current Streak"
          value={String(data?.streaks?.current ?? 0)}
          sub={(data?.streaks?.current ?? 0) === 1 ? 'day' : 'days'}
          icon={<Flame size={16} />}
        />
        <StatTile
          label="Longest Streak"
          value={String(data?.streaks?.longest ?? 0)}
          sub={(data?.streaks?.longest ?? 0) === 1 ? 'one' : 'best'}
          icon={<Trophy size={16} />}
        />
      </section>

      {pct != null && (
        <Card className="px-5 py-4">
          <ProgressBar pct={pct} label="Today's completion" />
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Scheduled tasks (daywise, with time slots) */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <CalendarClock size={16} className="text-violet-500" /> Today's schedule
              </span>
            }
            subtitle={
              tasks.length === 0
                ? undefined
                : `${tasks.filter((t) => t.completed).length} of ${tasks.length} done · sorted by time`
            }
            action={
              <Button size="sm" variant="secondary" onClick={() => setShowAddTask(true)}>
                + Task
              </Button>
            }
          />
          {tasks.length === 0 ? (
            <EmptyState
              icon={<CalendarClock size={24} />}
              title="Nothing scheduled today"
              description="Book a task into a time slot and it will appear here every day."
              action={<Button onClick={() => setShowAddTask(true)}>Schedule a task</Button>}
            />
          ) : (
            <TaskList tasks={tasks} loading={false} date={today} onChanged={load} />
          )}
        </Card>

        {/* Daily consistency habits */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Repeat size={16} className="text-indigo-500" /> Daily habits
              </span>
            }
            subtitle={
              dailyHabits.length === 0
                ? undefined
                : `${dailyHabits.filter((t) => t.completed).length} of ${dailyHabits.length} checked off`
            }
            action={
              <Button size="sm" variant="secondary" onClick={() => setShowAddHabit(true)}>
                + Habit
              </Button>
            }
          />
          {dailyHabits.length === 0 ? (
            <EmptyState
              icon={<Sprout size={24} />}
              title="No daily habits yet"
              description="Create a daily habit and mark it complete here every day to build your streak."
              action={<Button onClick={() => setShowAddHabit(true)}>Add your first habit</Button>}
            />
          ) : (
            <TaskList tasks={dailyHabits} loading={false} date={today} onChanged={load} />
          )}
        </Card>
      </div>

      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="New scheduled task">
        <HabitForm
          kind="scheduled"
          onSaved={() => {
            setShowAddTask(false);
            load();
          }}
          onCancel={() => setShowAddTask(false)}
        />
      </Modal>

      <Modal open={showAddHabit} onClose={() => setShowAddHabit(false)} title="New daily habit">
        <HabitForm
          kind="daily"
          onSaved={() => {
            setShowAddHabit(false);
            load();
          }}
          onCancel={() => setShowAddHabit(false)}
        />
      </Modal>

      <DayDetailModal date={detailDate} onClose={() => setDetailDate(null)} />

      <p className="text-center text-sm text-slate-400 dark:text-slate-500">
        Want the full picture?{' '}
        <Link to="/analytics" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Open analytics <ArrowRight size={14} />
        </Link>
      </p>
    </div>
  );
}
