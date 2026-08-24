import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import type { UnlockedAchievement } from '@/types';

export type TimerPhase = 'idle' | 'focus' | 'break';

interface TimerState {
  phase: TimerPhase;
  habitId: number | null;
  habitName: string;
  initialSeconds: number;
  startedAt: number; // epoch ms when the current run segment began
  accumulated: number; // seconds accumulated across paused segments
  isRunning: boolean;
  isBreak: boolean;
}

const STORAGE_KEY = 'studypeak.timer';

function loadState(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TimerState;
    if (!s || typeof s.startedAt !== 'number') return null;
    // Discard stale sessions older than 12h
    if (Date.now() - s.startedAt > 12 * 3600_000) return null;
    return s;
  } catch {
    return null;
  }
}

interface TimerContextValue {
  state: TimerState | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  start: (habitId: number | null, habitName: string, durationMinutes: number, isBreak?: boolean) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  finish: () => Promise<{ saved: boolean }>;
  halfwayNotified: boolean;
  notifyHalfway: () => void;
  newlyUnlocked: UnlockedAchievement[];
  clearUnlocked: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState | null>(() => loadState());
  const [now, setNow] = useState(Date.now());
  const [halfwayNotified, setHalfwayNotified] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<UnlockedAchievement[]>([]);

  // Tick — recompute elapsed from timestamps so browser throttling stays accurate.
  useEffect(() => {
    if (!state?.isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state?.isRunning]);

  useEffect(() => {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  }, [state]);

  const elapsedSeconds = useMemo(() => {
    if (!state) return 0;
    const runningPart = state.isRunning ? Math.max(0, Math.floor((now - state.startedAt) / 1000)) : 0;
    return state.accumulated + runningPart;
  }, [state, now]);

  const remainingSeconds = useMemo(() => {
    if (!state) return 0;
    return Math.max(0, state.initialSeconds - elapsedSeconds);
  }, [state, elapsedSeconds]);

  const start = useCallback(
    (habitId: number | null, habitName: string, durationMinutes: number, isBreak = false) => {
      const secs = Math.round(durationMinutes * 60);
      if (!Number.isFinite(secs) || secs <= 0 || secs > 24 * 3600) return;
      setState({
        phase: isBreak ? 'break' : 'focus',
        habitId,
        habitName,
        initialSeconds: secs,
        startedAt: Date.now(),
        accumulated: 0,
        isRunning: true,
        isBreak,
      });
      setHalfwayNotified(false);
      setNow(Date.now());
    },
    []
  );

  const pause = useCallback(() => {
    setState((s) => {
      if (!s || !s.isRunning) return s;
      const seg = Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000));
      return { ...s, accumulated: s.accumulated + seg, startedAt: Date.now(), isRunning: false };
    });
  }, []);

  const resume = useCallback(() => {
    setState((s) => (s && !s.isRunning ? { ...s, startedAt: Date.now(), isRunning: true } : s));
  }, []);

  const reset = useCallback(() => {
    setState(null);
    setHalfwayNotified(false);
  }, []);

  const finish = useCallback(async (): Promise<{ saved: boolean }> => {
    if (!state) return { saved: false };
    const finalElapsed =
      state.accumulated + (state.isRunning ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0);
    setState(null);
    setHalfwayNotified(false);
    if (finalElapsed < 5 || state.isBreak) return { saved: false };
    try {
      const res = await api.post<{ newlyUnlocked: UnlockedAchievement[] }>('/sessions', {
        habitId: state.habitId,
        startedAt: new Date(Date.now() - finalElapsed * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: finalElapsed,
        status: 'completed',
      });
      if (res.newlyUnlocked?.length) setNewlyUnlocked(res.newlyUnlocked);
      return { saved: true };
    } catch {
      return { saved: false };
    }
  }, [state]);

  const notifyHalfway = useCallback(() => setHalfwayNotified(true), []);
  const clearUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  return (
    <TimerContext.Provider
      value={{
        state,
        elapsedSeconds,
        remainingSeconds,
        start,
        pause,
        resume,
        reset,
        finish,
        halfwayNotified,
        notifyHalfway,
        newlyUnlocked,
        clearUnlocked,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
