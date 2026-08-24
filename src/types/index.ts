export type TargetType = 'boolean' | 'duration' | 'quantity';
export type Frequency = 'daily' | 'weekdays' | 'weekly' | 'custom';

export interface User {
  id: number;
  email: string;
  name: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  defaultStudyMinutes: number;
  defaultBreakMinutes: number;
  notificationsEnabled: boolean;
}

export type HabitKind = 'daily' | 'scheduled';

export interface Habit {
  id: number;
  user_id?: number;
  name: string;
  description: string;
  category: string;
  target_type: TargetType;
  target_value: number;
  frequency: Frequency;
  weekdays: string | number[];
  interval_weeks: number;
  start_date: string;
  end_date: string | null;
  active: number | boolean;
  color: string;
  scheduled_time?: string | null;
  kind?: HabitKind;
  start_time?: string | null;
  end_slot?: string | null;
  created_at?: string;
  dueToday?: boolean;
}

export interface TaskItem {
  habitId: number;
  name: string;
  description: string;
  category: string;
  color: string;
  targetType: TargetType;
  targetValue: number;
  progress: number;
  completed: boolean;
  slot: string | null;
  kind: HabitKind;
  startTime: string | null;
  endTime: string | null;
}

export interface DayTasksResponse {
  date: string;
  tasks: TaskItem[];
  dailyHabits: TaskItem[];
  studySeconds: number;
  streaks?: { current: number; longest: number };
}

export interface Streaks {
  current: number;
  longest: number;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedAt: string | null;
  seen: boolean;
}

export interface UnlockedAchievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

export interface StudySessionRow {
  id: number;
  habit_id: number | null;
  subject: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  date: string;
  status: 'completed' | 'abandoned';
}

export interface DayStats {
  date: string;
  expected: number;
  completed: number;
  completionPct: number | null;
  studySeconds: number;
}

export interface HeatmapResponse {
  year: number;
  days: DayStats[];
}

export interface WeeklyResponse {
  days: DayStats[];
  habitDays: DayStats[];
  taskDays: DayStats[];
  streaks: Streaks;
}

export interface MonthlyResponse {
  month: string;
  days: DayStats[];
  summary: {
    totalExpected: number;
    totalCompleted: number;
    completionPct: number | null;
    studySeconds: number;
    avgDailyStudySeconds: number;
    bestDay: DayStats | null;
    streaks: Streaks;
  };
  breakdown: { id: number; name: string; color: string; expected: number; completed: number; rate: number | null }[];
}

export interface YearlyResponse {
  year: number;
  months: { month: string; expected: number; completed: number; studySeconds: number }[];
  totals: { expected: number; completed: number; studySeconds: number; completionPct: number | null };
  bestMonth: { month: string } | null;
  streaks: Streaks;
  availableYears: number[];
}

export interface HabitAnalytics {
  habit: Habit & { weekdays: number[] };
  stats: {
    completionRate: number | null;
    currentStreak: number;
    longestStreak: number;
    totalCompleted: number;
    studySeconds: number;
    weekly: { weekEnding: string; completed: number }[];
    monthly: { month: string; completed: number }[];
  };
}

export interface DayDetail {
  date: string;
  tasks: { name: string; category: string; color: string; completed: boolean; slot: string | null; kind?: string; startTime?: string | null; endTime?: string | null }[];
  sessions: { duration_seconds: number; started_at: string; subject: string }[];
  studySeconds: number;
  completionPct: number | null;
}
