import { useState } from 'react';
import { Check, Play, Clock, AlertTriangle } from 'lucide-react';
import type { TaskItem } from '@/types';
import { api } from '@/services/api';
import { notifyDataChanged } from '@/services/dataEvents';
import { formatTimeSlot, isRangeOverdue, nowHHMM } from '@/utils/datetime';
import { Button, ProgressBar, Skeleton } from '@/components/ui';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { useRobot } from '@/contexts/RobotContext';

interface TaskListProps {
  tasks: TaskItem[] | undefined;
  loading: boolean;
  date: string;
  onChanged: () => void;
  onStartTimer?: (habitId: number, name: string) => void;
}

function bySlot(a: TaskItem, b: TaskItem) {
  if (a.slot && b.slot) return a.slot.localeCompare(b.slot) || a.habitId - b.habitId;
  if (a.slot) return -1;
  if (b.slot) return 1;
  return a.habitId - b.habitId;
}

export function TaskList({ tasks, loading, date, onChanged, onStartTimer }: TaskListProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rescheduling, setRescheduling] = useState<number | null>(null);
  const [newSlot, setNewSlot] = useState('');
  const { say } = useRobot();

  const sorted = tasks ? [...tasks].sort(bySlot) : undefined;

  async function completeTask(t: TaskItem) {
    setBusyId(t.habitId);
    try {
      const res = await api.post<{ newlyUnlocked: unknown[]; streaks: { current: number } }>(
        `/tasks/${t.habitId}/complete`,
        { date, completed: true }
      );
      if (res.streaks?.current >= 7) {
        say(`${res.streaks.current}-day streak. You’re building something strong!`, 'excited');
      }
      notifyDataChanged();
      onChanged();
    } catch {
      say('Hmm, that didn’t save. Mind trying again?', 'encouraging');
    } finally {
      setBusyId(null);
    }
  }

  async function undoTask(t: TaskItem) {
    setBusyId(t.habitId);
    try {
      await api.del(`/tasks/${t.habitId}/complete?date=${date}`);
      notifyDataChanged();
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  async function saveSlot(t: TaskItem) {
    if (!newSlot) return;
    setBusyId(t.habitId);
    try {
      await api.post(`/tasks/${t.habitId}/slot`, { date, slot: newSlot });
      say(`${t.name} moved to ${formatTimeSlot(newSlot)}. You’ve got this!`, 'happy');
      setRescheduling(null);
      setNewSlot('');
      notifyDataChanged();
      onChanged();
    } catch {
      say('Could not move that. Mind trying again?', 'encouraging');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!sorted || sorted.length === 0) {
    return null; // parent renders empty state
  }

  // "Up Next" sticker goes to the earliest slotted, unfinished task still ahead of now
  const now = nowHHMM();
  const nextUpId = sorted.find((t) => t.slot && !t.completed && t.slot > now)?.habitId ?? null;

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {sorted.map((t) => {
        const overdue = isRangeOverdue(t.startTime ?? t.slot, t.endTime ?? t.slot, t.completed, date);
        const upNext = t.habitId === nextUpId;
        const timeLabel =
          t.startTime && t.endTime
            ? `${formatTimeSlot(t.startTime)} – ${formatTimeSlot(t.endTime)}`
            : t.slot
              ? formatTimeSlot(t.slot)
              : null;
        const pct =
          t.targetType === 'duration'
            ? Math.min(100, Math.round((t.progress / t.targetValue) * 100))
            : t.completed
              ? 100
              : 0;
        return (
          <li
            key={t.habitId}
            className={`px-4 py-3 ${overdue ? 'bg-amber-50/60 dark:bg-amber-950/10' : upNext ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : ''}`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => (t.completed ? undoTask(t) : completeTask(t))}
                disabled={busyId === t.habitId}
                aria-label={t.completed ? `Mark ${t.name} as not done` : `Mark ${t.name} as completed`}
                aria-pressed={t.completed}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  t.completed
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 text-transparent hover:border-indigo-500 dark:border-slate-600'
                } ${busyId === t.habitId ? 'opacity-50' : ''}`}
              >
                <Check size={16} strokeWidth={3} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <p
                    className={`truncate text-sm font-medium ${
                      t.completed
                        ? 'text-slate-400 line-through dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {t.name}
                  </p>
                  {timeLabel && (
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
                        overdue
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : upNext
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                      {timeLabel}
                    </span>
                  )}
                  {t.completed ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <Check size={10} strokeWidth={3} /> Completed
                    </span>
                  ) : overdue ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Overdue
                    </span>
                  ) : upNext ? (
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      Up Next
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {t.category}
                  </span>
                </div>
                {overdue && (
                  <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    This slot has passed — mark it done or move it to a new time.
                  </p>
                )}
                {(t.targetType === 'duration' || t.targetType === 'quantity') && !t.completed && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar pct={pct} color={t.color} label={`${t.name} progress`} />
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {t.targetType === 'duration'
                        ? `${Math.round(t.progress)}/${t.targetValue}m`
                        : `${t.progress}/${t.targetValue}`}{' '}
                      ({pct}%)
                    </span>
                  </div>
                )}
              </div>

              {!t.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRescheduling(rescheduling === t.habitId ? null : t.habitId);
                    setNewSlot(t.slot ?? '');
                  }}
                  aria-label={`Reschedule ${t.name}`}
                  className={overdue ? 'text-amber-700 dark:text-amber-400' : ''}
                >
                  <Clock size={15} />
                </Button>
              )}

              {t.targetType === 'duration' && !t.completed && onStartTimer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartTimer(t.habitId, t.name)}
                  aria-label={`Start study timer for ${t.name}`}
                >
                  <Play size={15} />
                </Button>
              )}
            </div>

            {rescheduling === t.habitId && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                <label htmlFor={`slot-${t.habitId}`} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  New time for today
                </label>
                <TimeSlotPicker id={`slot-${t.habitId}`} value={newSlot || null} onChange={(v) => setNewSlot(v ?? '')} />
                <Button size="sm" onClick={() => saveSlot(t)} disabled={!newSlot || busyId === t.habitId}>
                  Move
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRescheduling(null);
                    setNewSlot('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
