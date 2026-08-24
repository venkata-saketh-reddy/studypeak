import { Award, BookOpen, BrainCircuit, Crown, Flame, ListChecks, Lock, Target, Timer, type LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  first_task: Target,
  first_session: Timer,
  streak_3: Flame,
  streak_7: Flame,
  streak_14: Flame,
  streak_30: Crown,
  tasks_100: ListChecks,
  study_10h: BookOpen,
  study_50h: BrainCircuit,
  study_100h: Crown,
};

const TIER_COLOR: Record<string, string> = {
  bronze: 'text-amber-600 dark:text-amber-400',
  silver: 'text-slate-400 dark:text-slate-300',
  gold: 'text-yellow-500 dark:text-yellow-400',
  platinum: 'text-cyan-500 dark:text-cyan-300',
};

export function AchievementIcon({
  code,
  tier,
  locked = false,
  size = 28,
}: {
  code: string;
  tier?: string;
  locked?: boolean;
  size?: number;
}) {
  if (locked) return <Lock size={size} className="text-slate-300 dark:text-slate-600" />;
  const Icon = MAP[code] ?? Award;
  const color = TIER_COLOR[tier ?? ''] ?? 'text-indigo-500';
  return <Icon size={size} className={color} />;
}
