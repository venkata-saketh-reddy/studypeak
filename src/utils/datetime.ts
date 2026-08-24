export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthYear(month: string): string {
  return new Date(month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** 5460 -> "1h 31m"; 3600 -> "1h"; 600 -> "10m" */
export function formatDuration(seconds: number): string {
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** seconds -> "H:MM:SS" or "MM:SS" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "06:30" -> "6:30 AM" */
export function formatTimeSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Current local time as "HH:MM" (24h) */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** A task is overdue when its slot has passed today and it isn't done yet */
export function isSlotOverdue(slot: string | null | undefined, completed: boolean, date: string): boolean {
  if (!slot || completed || date !== todayStr()) return false;
  return slot <= nowHHMM();
}

const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Overdue check for a start→end range. Handles ranges that cross midnight
 * (end < start means it ends the next day, so it's only overdue once the
 * wrapped end time has passed).
 */
export function isRangeOverdue(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  completed: boolean,
  date: string
): boolean {
  const start = startTime ?? endTime ?? null;
  if (!start || completed || date !== todayStr()) return false;
  if (!endTime) return isSlotOverdue(start, completed, date);
  const nowM = toMinutes(nowHHMM());
  const startM = toMinutes(start);
  const endM = toMinutes(endTime);
  if (endM > startM) return nowM > endM;
  // crosses midnight
  return nowM > endM + 1440;
}
