import { useAchievements } from '@/contexts/AchievementsContext';
import { Card, Skeleton, EmptyState } from '@/components/ui';
import { AchievementIcon } from '@/components/achievements/achievementIcons';
import { Award } from 'lucide-react';

const TIER_BADGE: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  silver: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300',
  platinum: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300',
};

export function Achievements() {
  const { achievements, loading } = useAchievements();
  const unlocked = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Achievements</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {unlocked} of {achievements.length} unlocked
        </p>
      </header>

      {achievements.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Award size={26} />}
            title="No achievements yet"
            description="Complete tasks and build streaks to unlock achievements."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <Card
              key={a.id}
              className={`p-5 transition-opacity ${a.unlocked ? '' : 'opacity-55 grayscale'}`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"
                >
                  <AchievementIcon code={a.code} tier={a.tier} locked={!a.unlocked} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-slate-900 dark:text-slate-100">{a.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.description}</p>
                  <span
                    className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TIER_BADGE[a.tier]}`}
                  >
                    {a.tier}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
