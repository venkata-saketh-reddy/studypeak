import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { api } from '@/services/api';
import { onDataChanged } from '@/services/dataEvents';
import type { HeatmapResponse } from '@/types';
import { Card, CardHeader, Button, Skeleton, EmptyState } from '@/components/ui';
import { ActivityHeatmap } from '@/components/calendar/ActivityHeatmap';
import { DayDetailModal } from '@/components/calendar/DayDetailModal';

export function Calendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const load = useCallback(async (y: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await api.get<HeatmapResponse>(`/analytics/heatmap?year=${y}`));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(year);
  }, [year, load]);

  // Live refresh when a task/session changes elsewhere — updates without wiping the view
  useEffect(() => onDataChanged(() => load(year, true)), [year, load]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every square is a day. Click any day to see what you accomplished.
        </p>
      </header>

      <Card>
        <CardHeader
          title={`Activity — ${year}`}
          subtitle="Color shows the share of scheduled tasks you completed"
          action={
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
                <ChevronLeft size={15} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setYear((y) => y + 1)}
                disabled={year >= new Date().getFullYear()}
                aria-label="Next year"
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          }
        />
        <div className="p-5">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data && data.days.some((d) => d.expected > 0) ? (
            <ActivityHeatmap year={data.year} days={data.days} onDayClick={setDetailDate} />
          ) : (
          <EmptyState
            icon={<CalendarDays size={24} />}
            title="No activity yet"
            description="Complete tasks to start filling your calendar."
          />
          )}
        </div>
      </Card>

      <DayDetailModal date={detailDate} onClose={() => setDetailDate(null)} />
    </div>
  );
}
