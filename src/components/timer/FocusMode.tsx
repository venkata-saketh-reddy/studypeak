import { useEffect } from 'react';
import { Pause, Play, X, Check } from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { useRobot } from '@/contexts/RobotContext';
import { robotLines } from '@/components/robot/useRobotNarrator';
import { Button } from '@/components/ui';
import { formatClock } from '@/utils/datetime';
import { Robot } from '@/components/robot/Robot';

/** Distraction-free full-screen focus mode. */
export function FocusMode({ onExit }: { onExit: () => void }) {
  const { state, elapsedSeconds, remainingSeconds, pause, resume, finish, halfwayNotified, notifyHalfway } = useTimer();
  const { say } = useRobot();

  // Halfway encouragement
  useEffect(() => {
    if (!state || !state.isRunning || state.isBreak) return;
    if (!halfwayNotified && elapsedSeconds >= state.initialSeconds / 2) {
      notifyHalfway();
      const [text, mood] = robotLines.timerHalfway();
      say(text, mood);
    }
  }, [state, elapsedSeconds, halfwayNotified, notifyHalfway, say]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === ' ') {
        e.preventDefault();
        state?.isRunning ? pause() : resume();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, pause, resume, state]);

  if (!state) return null;

  const pct = Math.round((elapsedSeconds / state.initialSeconds) * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white">
      <button
        onClick={onExit}
        aria-label="Exit focus mode"
        className="absolute right-5 top-5 rounded-full p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <X size={22} />
      </button>

      <p className="mb-10 font-display text-sm font-semibold uppercase tracking-[0.35em] text-indigo-400">
        Focus Mode
      </p>
      <p className="mb-6 text-lg text-slate-300">{state.isBreak ? 'Break' : state.habitName}</p>

      <div
        role="timer"
        aria-label={`${formatClock(remainingSeconds)} remaining`}
        className="font-display text-7xl font-semibold tabular-nums sm:text-8xl"
      >
        {formatClock(remainingSeconds)}
      </div>

      <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-slate-800" aria-hidden>
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-3 text-sm tabular-nums text-slate-500">{pct}%</p>

      <div className="mt-12 flex gap-3">
        {state.isRunning ? (
          <Button variant="secondary" onClick={pause} className="px-6">
            <Pause size={16} /> Pause
          </Button>
        ) : (
          <Button onClick={resume} className="px-6">
            <Play size={16} /> Resume
          </Button>
        )}
        <Button
          onClick={async () => {
            await finish();
            onExit();
          }}
          className="bg-emerald-600 px-6 hover:bg-emerald-700"
        >
          <Check size={16} /> Finish
        </Button>
      </div>

      <p className="absolute bottom-8 text-xs text-slate-600">Space to pause · Esc to exit</p>
    </div>
  );
}
