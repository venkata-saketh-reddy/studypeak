import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import { onDataChanged } from '@/services/dataEvents';
import type { Achievement, UnlockedAchievement } from '@/types';

interface AchievementsContextValue {
  achievements: Achievement[];
  loading: boolean;
  refresh: () => Promise<void>;
  celebration: UnlockedAchievement | null;
  celebrateAndMarkSeen: (items: UnlockedAchievement[]) => void;
  closeCelebration: () => void;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<UnlockedAchievement | null>(null);
  const [pendingQueue, setPendingQueue] = useState<UnlockedAchievement[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ achievements: Achievement[] }>('/achievements');
      setAchievements(data.achievements);
    } catch (e) {
      // Let the Api service handle 401s, just ignore it here
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => onDataChanged(refresh), [refresh]);

  const celebrateAndMarkSeen = useCallback((items: UnlockedAchievement[]) => {
    if (!items.length) return;
    setPendingQueue(items);
    setCelebration(items[0]);
    api
      .post('/achievements/see', { ids: items.map((i) => i.id) })
      .catch(() => undefined);
  }, []);

  const closeCelebration = useCallback(() => {
    setPendingQueue((q) => {
      const rest = q.slice(1);
      setCelebration(rest[0] ?? null);
      return rest;
    });
  }, []);

  return (
    <AchievementsContext.Provider
      value={{ achievements, loading, refresh, celebration, celebrateAndMarkSeen, closeCelebration }}
    >
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const ctx = useContext(AchievementsContext);
  if (!ctx) throw new Error('useAchievements must be used within AchievementsProvider');
  return ctx;
}
