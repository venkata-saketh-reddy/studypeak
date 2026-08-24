import { useCallback, useEffect, useState } from 'react';
import { Maximize2, Timer as TimerIcon } from 'lucide-react';
import { api } from '@/services/api';
import type { Habit, StudySessionRow } from '@/types';
import { Card, CardHeader, Button, Skeleton, EmptyState } from '@/components/ui';
import { TimerWidget } from '@/components/timer/TimerWidget';
import { FocusMode } from '@/components/timer/FocusMode';
import { useTimer } from '@/contexts/TimerContext';
import { formatDuration, todayStr } from '@/utils/datetime';

export function Timer() {
  const { state } = useTimer();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<StudySessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusOpen, setFocusOpen] = useState(false);
  const [settings, setSettings] = useState({ defaultStudyMinutes: 45, defaultBreakMinutes: 5 });

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get<{ sessions: StudySessionRow[] }>(`/sessions?from=${todayStr()}`);
      setSessions(res.sessions);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<{ habits: Habit[] }>('/habits'),
      loadSessions(),
      api.get<{ settings: typeof settings }>('/settings').then((r) => setSettings(r.settings)),
    ])
      .then(([h]) => setHabits(h.habits))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [loadSessions]);

  // Open focus mode automatically when a session starts from elsewhere (e.g. task list)
  useEffect(() => {
    if (state) setFocusOpen(true);
  }, [state]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Study Timer</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Deep work, one session at a time.</p>
        </div>
        {state && (
          <Button variant="secondary" size="sm" onClick={() => setFocusOpen(true)}>
            <Maximize2 size={15} /> Focus mode
          </Button>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="New session" />
          <div className="p-5">
            <TimerWidget
              habits={habits.filter((h) => h.active)}
              defaultMinutes={settings.defaultStudyMinutes}
              defaultBreakMinutes={settings.defaultBreakMinutes}
              onSessionSaved={loadSessions}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Today's sessions" subtitle={`${formatDuration(sessions.reduce((a, s) => a + s.duration_seconds, 0))} total`} />
          {sessions.length === 0 ? (
            <EmptyState
              icon={<TimerIcon size={24} />}
              title="Your study journey starts here"
              description="Finish your first session and it will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{s.subject}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(s.started_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {formatDuration(s.duration_seconds)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {focusOpen && state && <FocusMode onExit={() => setFocusOpen(false)} />}
    </div>
  );
}
