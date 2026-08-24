import type { DayStats } from '@/types';

export interface ProgressSummary {
  expected: number;
  completed: number;
  pct: number | null;
}

/** Aggregate a list of day stats into overall progress. */
export function aggregateProgress(days: DayStats[]): ProgressSummary {
  const expected = days.reduce((a, d) => a + d.expected, 0);
  const completed = days.reduce((a, d) => a + d.completed, 0);
  return { expected, completed, pct: expected === 0 ? null : Math.round((completed / expected) * 100) };
}

export function totalStudySeconds(days: DayStats[]): number {
  return days.reduce((a, d) => a + d.studySeconds, 0);
}

/**
 * Streak calculation is done server-side (see server/helpers.js) so it stays
 * consistent across devices. This helper just formats display values.
 */
export function streakLabel(current: number): string {
  if (current === 0) return 'No active streak';
  if (current === 1) return '1 day';
  return `${current} days`;
}
