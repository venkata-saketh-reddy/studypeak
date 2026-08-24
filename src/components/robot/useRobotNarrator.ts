import { useEffect, useRef } from 'react';
import { useRobot } from '@/contexts/RobotContext';
import { isSlotOverdue } from '@/utils/datetime';
import type { TaskItem } from '@/types';

export { useRobot };

/**
 * useRobotNarrator — central place that maps application events to robot dialogue.
 * Keeps robot logic out of pages/components.
 */

const WELCOME_SEEN_KEY = 'studypeak.welcomed';

export function useRobotNarrator(tasks: TaskItem[] | undefined, loading: boolean) {
  const { say } = useRobot();
  const prevCompletedRef = useRef<number | null>(null);
  const milestonesRef = useRef<Set<string>>(new Set());
  const greetedRef = useRef(false);

  // First visit / new day greeting
  useEffect(() => {
    if (loading || greetedRef.current) return;
    greetedRef.current = true;
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('studypeak.lastVisit');
    localStorage.setItem('studypeak.lastVisit', today);

    if (!localStorage.getItem(WELCOME_SEEN_KEY)) {
      localStorage.setItem(WELCOME_SEEN_KEY, '1');
      say('Welcome! Ready to make today count?', 'excited');
    } else if (lastVisit !== today) {
      say('A fresh day — let’s make it a good one!', 'happy');
    }
  }, [loading, say]);

  // Progress-based reactions
  useEffect(() => {
    if (!tasks || tasks.length === 0 || loading) return;
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const prev = prevCompletedRef.current;
    prevCompletedRef.current = completed;

    if (prev === null || completed === prev) return;

    const pct = Math.round((completed / total) * 100);
    const milestoneKey = `${todayStr()}:${pct >= 100 ? 100 : pct >= 80 ? 80 : pct >= 50 ? 50 : pct >= 25 ? 25 : 'first'}`;

    if (completed === total) {
      say('MISSION COMPLETE! Every task done. Enjoy this feeling.', 'celebrating');
      return;
    }
    if (milestonesRef.current.has(milestoneKey)) return;
    milestonesRef.current.add(milestoneKey);

    if (completed === 1 && prev === 0) say('One down. Momentum starts now!', 'happy');
    else if (pct >= 80) say('Almost there — just keep going!', 'encouraging');
    else if (pct >= 50) say('Halfway there! You’re on a roll.', 'excited');
    else if (pct >= 25) say('Nice! You’ve started.', 'happy');
  }, [tasks, loading, say]);

  // No tasks nudge (only once per session)
  useEffect(() => {
    if (loading || !tasks) return;
    if (tasks.length === 0 && !milestonesRef.current.has('notasks')) {
      milestonesRef.current.add('notasks');
      say('Looks like we haven’t planned today yet. Let’s add a goal.', 'encouraging');
    }
  }, [tasks, loading, say]);

  // Overdue slot reminder — the robot asks you to move missed tasks to a free slot today.
  // Re-arms whenever the list becomes overdue-free, so a new slip gets flagged again.
  const overdueRef = useRef(false);
  useEffect(() => {
    if (loading || !tasks) return;
    const overdue = tasks.filter((t) => isSlotOverdue(t.slot, t.completed, todayDateStr()));
    if (overdue.length === 0) {
      overdueRef.current = false;
      return;
    }
    if (overdueRef.current) return;
    overdueRef.current = true;
    const names = overdue.map((t) => t.name);
    const who =
      names.length === 1
        ? `“${names[0]}” has slipped past its time slot`
        : `${names.length} tasks have slipped past their time slots`;
    say(`${who}. Want to move ${names.length === 1 ? 'it' : 'them'} to a freer time today? Tap the clock next to the task.`, 'encouraging');
  }, [tasks, loading, say]);
}

function todayStr() {
  return new Date().toDateString();
}

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One-off dialogue helpers for timer events. */
export const robotLines = {
  timerStarted: () => ['Ready? Let’s focus.', 'thinking'] as const,
  timerHalfway: () => ['Halfway there! Keep going!', 'encouraging'] as const,
  timerDone: () => ['Great session! Your future self says thanks.', 'celebrating'] as const,
  streak: (days: number) =>
    days >= 30
      ? ([`${days} DAYS! That’s incredible consistency!`, 'celebrating'] as const)
      : days >= 7
        ? ([`A full ${days} days! You’re building something strong.`, 'excited'] as const)
        : ([`${days}-day streak. Keep the fire going!`, 'happy'] as const),
};
