import { useAchievements } from '@/contexts/AchievementsContext';
import { AchievementIcon } from './achievementIcons';

const TIER_STYLES: Record<string, string> = {
  bronze: 'from-amber-100 to-orange-200 dark:from-amber-950 dark:to-orange-950',
  silver: 'from-slate-100 to-slate-300 dark:from-slate-800 dark:to-slate-700',
  gold: 'from-yellow-100 to-amber-300 dark:from-yellow-950 dark:to-amber-900',
  platinum: 'from-cyan-100 to-violet-200 dark:from-cyan-950 dark:to-violet-950',
};

/** Polished, non-childish celebration popup for unlocked achievements. */
export function AchievementCelebration() {
  const { celebration, closeCelebration } = useAchievements();
  if (!celebration) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-label={`Achievement unlocked: ${celebration.name}`}
      onClick={closeCelebration}
    >
      <div
        className={`relative w-full max-w-sm animate-pop-in overflow-hidden rounded-3xl bg-gradient-to-br ${
          TIER_STYLES[celebration.tier] ?? TIER_STYLES.bronze
        } p-1 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[20px] bg-white p-6 text-center dark:bg-slate-900">
          {/* confetti dots */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {['#fbbf24', '#4f7cff', '#10b981', '#ec4899'].map((c, i) => (
              <span
                key={i}
                className="absolute h-2 w-2 animate-confetti rounded-sm"
                style={{
                  backgroundColor: c,
                  left: `${15 + i * 22}%`,
                  top: '12%',
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
            Achievement unlocked
          </p>
          <div className="my-4 flex justify-center" aria-hidden>
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-inner dark:bg-slate-800">
              <AchievementIcon code={celebration.code} tier={celebration.tier} size={44} />
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">{celebration.name}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{celebration.description}</p>
          <button
            onClick={closeCelebration}
            className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            Awesome
          </button>
        </div>
      </div>
    </div>
  );
}
