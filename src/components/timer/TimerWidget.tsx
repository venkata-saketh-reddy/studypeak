import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Coffee, Target } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { useRobot } from '@/contexts/RobotContext';
import { notifyDataChanged } from '@/services/dataEvents';
import { robotLines } from '@/components/robot/useRobotNarrator';
import { Button } from '@/components/ui';
import { FancySelect } from '@/components/ui/FancySelect';
import { formatClock, formatDuration } from '@/utils/datetime';
import type { Habit } from '@/types';

interface TimerWidgetProps {
  habits: Habit[];
  defaultMinutes: number;
  defaultBreakMinutes: number;
  onSessionSaved: () => void;
}

const PRESETS = [25, 45, 60];
const ADD_PRESETS = [
  { add: 15, label: '15 min' },
  { add: 30, label: '30 min' },
  { add: 60, label: '1 hr' },
];

export function TimerWidget({ habits, defaultMinutes, defaultBreakMinutes, onSessionSaved }: TimerWidgetProps) {
  const { state, elapsedSeconds, remainingSeconds, start, pause, resume, reset, finish, halfwayNotified, notifyHalfway, newlyUnlocked, clearUnlocked } =
    useTimer();
  const { say } = useRobot();
  const [habitId, setHabitId] = useState<string>('');
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [breakMinutes, setBreakMinutes] = useState(defaultBreakMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Halfway robot reaction
  useEffect(() => {
    if (!state || !state.isRunning || state.isBreak) return;
    if (!halfwayNotified && elapsedSeconds >= state.initialSeconds / 2) {
      notifyHalfway();
      const [text, mood] = robotLines.timerHalfway();
      say(text, mood);
    }
  }, [state, elapsedSeconds, halfwayNotified, notifyHalfway, say]);

  async function handleFinish() {
    setSaving(true);
    setError(null);
    const res = await finish();
    if (res.saved) {
      const [text, mood] = robotLines.timerDone();
      say(text, mood);
      notifyDataChanged();
      onSessionSaved();
    }
    setSaving(false);
  }

  function handleStartFocus() {
    setError(null);
    const dur = Number(minutes);
    if (!Number.isFinite(dur) || dur < 1 || dur > 480) {
      setError('Duration must be between 1 and 480 minutes.');
      return;
    }
    const habit = habits.find((h) => h.id === Number(habitId));
    start(habit?.id ?? null, habit?.name ?? 'General study', dur, false);
    const [text, mood] = robotLines.timerStarted();
    say(text, mood);
  }

  function handleStartBreak(kind: 'short' | 'long' | 'custom') {
    const mins = kind === 'short' ? 5 : kind === 'long' ? 15 : breakMinutes;
    start(null, 'Break', mins, true);
  }

  const activeHabit = habits.find((h) => h.id === state?.habitId);

  if (state) {
    return (
      <ActiveTimer
        name={state.isBreak ? 'Break' : activeHabit?.name ?? state.habitName}
        isBreak={state.isBreak}
        remaining={remainingSeconds}
        total={state.initialSeconds}
        running={state.isRunning}
        saving={saving}
        error={error}
        onPause={pause}
        onResume={resume}
        onFinish={handleFinish}
        onReset={() => {
          reset();
          clearUnlocked();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Subject / habit</p>
        <FancySelect
          id="timer-habit"
          ariaLabel="Subject or habit"
          value={habitId}
          onChange={setHabitId}
          placeholder="General study"
          options={[
            { value: '', label: 'General study' },
            ...habits.map((h) => ({ value: String(h.id), label: h.name })),
          ]}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Duration</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setMinutes(p)}
              aria-pressed={minutes === p}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                minutes === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p} min
            </button>
          ))}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 dark:bg-slate-800">
            <input
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              aria-label="Custom duration in minutes"
              className="w-14 bg-transparent py-2 text-sm tabular-nums outline-none dark:text-slate-100"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Add more:</span>
          {ADD_PRESETS.map((p) => (
            <button
              key={p.add}
              type="button"
              onClick={() => setMinutes((m) => Math.min(480, Math.max(1, m + p.add)))}
              aria-label={`Add ${p.label} to session`}
              className="rounded-xl border border-dashed border-indigo-400/50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <Button onClick={handleStartFocus} className="w-full py-3 text-base">
        <Play size={18} /> Start focus session
      </Button>

      <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Coffee size={13} /> Breaks
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleStartBreak('short')}>
            Short · 5m
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleStartBreak('long')}>
            Long · 15m
          </Button>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 dark:border-slate-700">
            <input
              type="number"
              min={1}
              max={120}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Number(e.target.value))}
              aria-label="Custom break minutes"
              className="w-12 bg-transparent py-1.5 text-sm tabular-nums outline-none dark:text-slate-100"
            />
            <Button variant="ghost" size="sm" onClick={() => handleStartBreak('custom')}>
              Start
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveTimer({
  name,
  isBreak,
  remaining,
  total,
  running,
  saving,
  error,
  onPause,
  onResume,
  onFinish,
  onReset,
}: {
  name: string;
  isBreak: boolean;
  remaining: number;
  total: number;
  running: boolean;
  saving: boolean;
  error: string | null;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onReset: () => void;
}) {
  const pct = useMemo(() => Math.round(((total - remaining) / total) * 100), [total, remaining]);
  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${isBreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
        {isBreak ? <Coffee size={13} /> : <Target size={13} />}
        {isBreak ? 'Break time' : 'Focus session'}
      </p>

      <div className="relative" role="timer" aria-label={`${name}, ${formatClock(remaining)} remaining`}>
        <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
          <circle cx="110" cy="110" r={R} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
          <circle
            cx="110"
            cy="110"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke={isBreak ? '#10b981' : '#4f7cff'}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatClock(remaining)}
          </span>
          <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">{name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{pct}% complete</span>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        {running ? (
          <Button variant="secondary" onClick={onPause}>
            <Pause size={16} /> Pause
          </Button>
        ) : (
          <Button variant="secondary" onClick={onResume}>
            <Play size={16} /> Resume
          </Button>
        )}
        <Button onClick={onFinish} disabled={saving}>
          {saving ? 'Saving…' : 'Finish & save'}
        </Button>
        <Button variant="ghost" onClick={onReset} aria-label="Reset timer without saving">
          <RotateCcw size={16} />
        </Button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Elapsed: {formatDuration(total - remaining)} of {formatDuration(total)}
      </p>
    </div>
  );
}
