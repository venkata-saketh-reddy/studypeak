import { useEffect, useRef, useState } from 'react';

interface TimeSlotPickerProps {
  value: string | null;
  onChange: (v: string | null) => void;
  id?: string;
}

const PERIODS = ['AM', 'PM'] as const;

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return {
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: String(m).padStart(2, '0'),
    period: (h < 12 ? 'AM' : 'PM') as 'AM' | 'PM',
  };
}

function from12h(hour: number, minute: string, period: 'AM' | 'PM'): string {
  const h = period === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

const inputCls =
  'w-12 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-medium tabular-nums text-slate-900 placeholder:text-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-600';

/** Typeable 12-hour AM/PM time picker (stores "HH:MM" 24h). No dropdowns. */
export function TimeSlotPicker({ value, onChange, id }: TimeSlotPickerProps) {
  const initial = value ? to12h(value) : null;
  const [hourStr, setHourStr] = useState(initial ? String(initial.hour) : '');
  const [minStr, setMinStr] = useState(initial?.minute ?? '');
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial?.period ?? 'AM');
  const minuteRef = useRef<HTMLInputElement>(null);
  const lastCommitted = useRef<string | null>(value ?? null);

  // Sync only when the value changes externally (e.g. opening the editor for
  // another task) — our own commits echo back as `value` and must NOT reset
  // the fields while the user is typing.
  useEffect(() => {
    if ((value ?? null) === lastCommitted.current) return;
    const v = value ? to12h(value) : null;
    setHourStr(v ? String(v.hour) : '');
    setMinStr(v?.minute ?? '');
    setPeriod(v?.period ?? 'AM');
    lastCommitted.current = value ?? null;
  }, [value]);

  function commit(h: string, m: string, p: 'AM' | 'PM') {
    const hour = parseInt(h, 10);
    const min = parseInt(m, 10);
    if (!Number.isFinite(hour) || hour < 1 || hour > 12 || !Number.isFinite(min) || min < 0 || min > 59) return;
    const next = from12h(hour, String(min).padStart(2, '0'), p);
    if (next !== lastCommitted.current) {
      lastCommitted.current = next;
      onChange(next);
    }
  }

  function handleHour(raw: string) {
    const digits = raw.replace(/\D/g, '');
    // Typing into pre-filled content (e.g. "11" + "1" = "111"): keep the newest digit
    const next = digits.length > 2 ? digits.slice(-1) : digits;
    setHourStr(next);
    commit(next, minStr, period);
  }

  function handleMinute(raw: string) {
    const digits = raw.replace(/\D/g, '');
    const next = digits.length > 2 ? digits.slice(-1) : digits;
    setMinStr(next);
    commit(hourStr, next, period);
  }

  // Enter in the hours field: pad a single digit ("1" -> "01") and move to minutes.
  function handleHourKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (hourStr) {
      const n = parseInt(hourStr, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 12) {
        setHourStr(String(n).padStart(2, '0'));
        commit(String(n), minStr, period);
      }
    }
    minuteRef.current?.focus();
    minuteRef.current?.select();
  }

  // Enter in the minutes field: pad and commit.
  function handleMinuteKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (minStr) {
      const n = parseInt(minStr, 10);
      if (Number.isFinite(n)) {
        const clamped = String(Math.min(59, Math.max(0, n))).padStart(2, '0');
        setMinStr(clamped);
        commit(hourStr, clamped, period);
      }
    }
  }

  function togglePeriod() {
    const next = period === 'AM' ? 'PM' : 'AM';
    setPeriod(next);
    commit(hourStr, minStr, next);
  }

  return (
    <div className="flex items-center gap-1.5" id={id}>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Hour (1-12)"
        placeholder="HH"
        value={hourStr}
        onChange={(e) => handleHour(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={handleHourKeyDown}
        className={inputCls}
        maxLength={2}
      />
      <span aria-hidden className="text-sm font-semibold text-slate-400">
        :
      </span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        aria-label="Minutes (0-59)"
        placeholder="MM"
        value={minStr}
        onChange={(e) => handleMinute(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={handleMinuteKeyDown}
        className={inputCls}
        maxLength={2}
      />
      <button
        type="button"
        onClick={togglePeriod}
        aria-label={`Switch to ${period === 'AM' ? 'PM' : 'AM'}`}
        className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-500/20 dark:text-indigo-400"
      >
        {period}
      </button>
    </div>
  );
}
