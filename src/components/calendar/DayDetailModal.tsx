import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '@/services/api';
import type { DayDetail } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui';
import { formatDateLong, formatDuration, formatTimeSlot } from '@/utils/datetime';

export function DayDetailModal({ date, onClose }: { date: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<DayDetail>(`/tasks/day-detail?date=${date}`)
      .then(setDetail)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <Modal open={date != null} onClose={onClose} title={date ? formatDateLong(date) : ''}>
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {detail && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                {detail.completionPct == null ? '—' : `${detail.completionPct}%`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Completion</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                {formatDuration(detail.studySeconds)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Study time</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                {detail.sessions.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sessions</p>
            </div>
          </div>

          <section aria-label="Tasks">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tasks
            </h3>
            {detail.tasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No tasks were scheduled this day.</p>
            ) : (
              <ul className="space-y-1.5">
                {detail.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                        t.completed
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                      }`}
                    >
                      {t.completed ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    </span>
                    <span
                      className={
                        t.completed
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-500 line-through decoration-red-400 dark:text-slate-400'
                      }
                    >
                      {t.slot && <span className="mr-1.5 tabular-nums text-slate-400 dark:text-slate-500">{formatTimeSlot(t.slot)}</span>}
                      {t.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail.sessions.length > 0 && (
            <section aria-label="Study sessions">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Study sessions
              </h3>
              <ul className="space-y-1.5">
                {detail.sessions.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                    <span className="text-slate-700 dark:text-slate-200">{s.subject}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatDuration(s.duration_seconds)} ·{' '}
                      {new Date(s.started_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
