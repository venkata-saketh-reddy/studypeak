import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { RobotProvider } from '@/contexts/RobotContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { AchievementsProvider } from '@/contexts/AchievementsContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login, Signup } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Habits } from '@/pages/Habits';
import { Timer } from '@/pages/Timer';
import { Calendar } from '@/pages/Calendar';
import { Analytics } from '@/pages/Analytics';
import { Achievements } from '@/pages/Achievements';
import { Settings } from '@/pages/Settings';
import { Skeleton } from '@/components/ui';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RobotProvider>
          <TimerProvider>
            <AchievementsProvider>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicOnly>
                      <Login />
                    </PublicOnly>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicOnly>
                      <Signup />
                    </PublicOnly>
                  }
                />
                <Route
                  element={
                    <Protected>
                      <AppLayout />
                    </Protected>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/habits" element={<Habits />} />
                  <Route path="/timer" element={<Timer />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AchievementsProvider>
          </TimerProvider>
        </RobotProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
