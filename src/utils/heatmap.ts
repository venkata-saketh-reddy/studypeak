import type { DayStats } from '@/types';

export type HeatLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Map a completion percentage to a heatmap intensity level.
 * 0% -> 0 (empty/red), 1-25 -> 1, 26-50 -> 2, 51-75 -> 3, 76-99 -> 4, 100 -> 5.
 * Days with no scheduled tasks are neutral (level 0, but rendered differently).
 */
export function heatLevel(day: DayStats | undefined): HeatLevel {
  if (!day || day.completionPct == null) return 0;
  const pct = day.completionPct;
  if (pct === 0) return 0;
  if (pct <= 25) return 1;
  if (pct <= 50) return 2;
  if (pct <= 75) return 3;
  if (pct < 100) return 4;
  return 5;
}

export const HEAT_COLORS: Record<HeatLevel, string> = {
  0: '#ef4444', // red — nothing done
  1: '#fca5a5', // light red
  2: '#fde047', // yellow
  3: '#bef264', // light green
  4: '#4ade80', // green
  5: '#15803d', // dark green
};

// Dark-mode variants for comfortable contrast
export const HEAT_COLORS_DARK: Record<HeatLevel, string> = {
  0: '#7f1d1d',
  1: '#b45309',
  2: '#ca8a04',
  3: '#65a30d',
  4: '#22c55e',
  5: '#166534',
};
