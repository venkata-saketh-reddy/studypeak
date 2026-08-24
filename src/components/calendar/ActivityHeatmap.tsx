import { useMemo, useState } from 'react';
import type { DayStats } from '@/types';
import { HEAT_COLORS, HEAT_COLORS_DARK, heatLevel } from '@/utils/heatmap';
import { useTheme } from '@/contexts/ThemeContext';

interface HeatmapProps {
  year: number;
  days: DayStats[];
  onDayClick?: (date: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ActivityHeatmap({ year, days, onDayClick }: HeatmapProps) {
  const { resolved } = useTheme();
  const [hovered, setHovered] = useState<{ date: string; x: number; y: number } | null>(null);
  const palette = resolved === 'dark' ? HEAT_COLORS_DARK : HEAT_COLORS;

  const dayMap = useMemo(() => {
    const m = new Map<string, DayStats>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  // Build weeks (columns) starting on the first Sunday on/before Jan 1
  const weeks = useMemo(() => {
    const jan1 = `${year}-01-01`;
    const first = new Date(jan1 + 'T00:00:00');
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const dec31 = `${year}-12-31`;
    const cols: (string | null)[][] = [];
    const cursor = new Date(start);
    while (cursor <= new Date(dec31 + 'T00:00:00') || cursor.getDay() !== 0) {
      if (cursor > new Date(dec31 + 'T00:00:00') && cursor.getDay() === 0) break;
      const col: (string | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = isoDate(cursor);
        col.push(cursor.getFullYear() === year ? iso : null);
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
      if (cursor.getFullYear() > year) break;
    }
    return cols;
  }, [year]);

  const monthLabels = useMemo(() => {
    let lastMonth = -1;
    return weeks.map((col) => {
      const firstValid = col.find((d) => d != null) as string | null;
      if (!firstValid) return null;
      const m = Number(firstValid.slice(5, 7)) - 1;
      if (m === lastMonth) return null;
      lastMonth = m;
      return { label: MONTHS[m] };
    });
  }, [weeks]);

  function handleEnter(e: React.MouseEvent, date: string) {
    setHovered({ date, x: e.clientX, y: e.clientY });
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-1" role="region" aria-label={`Activity calendar for ${year}`}>
        <div className="flex min-w-[640px] gap-[3px]">
          {/* day-of-week labels */}
          <div className="mr-1 flex flex-col gap-[3px] pt-0 text-[9px] text-slate-400 dark:text-slate-500">
            {DOW.map((d, i) => (
              <span key={d} className="h-[13px] leading-[13px]">
                {i % 2 === 1 ? d.slice(0, 1) : ''}
              </span>
            ))}
          </div>
          <div>
            {/* month labels */}
            <div className="mb-1 flex gap-[3px] text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {weeks.map((_, i) => {
                const ml = monthLabels[i];
                return (
                  <span key={i} className="w-[13px] shrink-0">
                    {ml ? ml.label : ''}
                  </span>
                );
              })}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((col, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {col.map((date, di) => {
                    if (!date) return <span key={di} className="h-[13px] w-[13px]" />;
                    const stat = dayMap.get(date);
                    const level = heatLevel(stat);
                    const neutral = stat == null || stat.completionPct == null;
                    const future = date > new Date().toISOString().slice(0, 10);
                    return (
                      <button
                        key={date}
                        disabled={future}
                        onClick={() => !future && onDayClick?.(date)}
                        onMouseEnter={(e) => handleEnter(e, date)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={(e) => handleEnter(e as unknown as React.MouseEvent, date)}
                        onBlur={() => setHovered(null)}
                        aria-label={`${date}: ${
                          neutral
                            ? 'no tasks scheduled'
                            : `${stat!.completionPct}% completed, ${formatMins(stat!.studySeconds)} studied`
                        }`}
                        className="h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default"
                        style={{
                          backgroundColor: future
                            ? undefined
                            : neutral && level === 0
                              ? resolved === 'dark'
                                ? '#1e293b'
                                : '#f1f5f9'
                              : palette[level],
                          opacity: future ? 0.35 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Less</span>
        {([0, 1, 2, 3, 4, 5] as const).map((l) => (
          <span
            key={l}
            aria-hidden
            className="h-[12px] w-[12px] rounded-[3px]"
            style={{ backgroundColor: l === 0 && false ? undefined : palette[l] }}
          />
        ))}
        <span>More</span>
      </div>

      {/* tooltip */}
      {hovered && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-700"
          style={{ left: hovered.x, top: hovered.y - 8 }}
          role="tooltip"
        >
          {tooltipText(dayMap.get(hovered.date), hovered.date)}
        </div>
      )}
    </div>
  );
}

function tooltipText(stat: DayStats | undefined, date: string): string {
  if (!stat || stat.completionPct == null) return `${date} — no tasks scheduled`;
  return `${date} — ${stat.completed}/${stat.expected} tasks · ${formatMins(stat.studySeconds)} studied`;
}

function formatMins(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m === 0) return '0m';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
