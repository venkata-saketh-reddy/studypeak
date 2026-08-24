import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Timer,
  CalendarDays,
  BarChart3,
  Trophy,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RobotCompanion } from '@/components/robot/RobotCompanion';
import { AchievementCelebration } from '@/components/achievements/AchievementCelebration';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/timer', label: 'Study Timer', icon: Timer },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile nav on navigation
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const nav = (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            }`
          }
        >
          <Icon size={18} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-lg font-bold tracking-tight">Studypeak</span>
        </div>
        {nav}
        <div className="mt-auto space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="truncate px-3 text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <LogOut size={18} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="font-display font-bold">Studypeak</span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 top-[57px] animate-slide-up-fade rounded-b-3xl border-b border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {nav}
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut size={18} aria-hidden /> Sign out
            </button>
          </div>
        </div>
      )}

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-60 lg:px-8 lg:pb-10">{<Outlet />}</main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
      >
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <Icon size={20} aria-hidden />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>

      <RobotCompanion />
      <AchievementCelebration />
    </div>
  );
}
