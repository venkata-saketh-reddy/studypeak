import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardHeader, Button, Skeleton } from '@/components/ui';
import { FancySelect } from '@/components/ui/FancySelect';

interface SettingsData {
  name: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  defaultStudyMinutes: number;
  defaultBreakMinutes: number;
  notificationsEnabled: boolean;
}

export function Settings() {
  const { refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [data, setData] = useState<SettingsData | null>(null);
  const [timezones, setTimezones] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ settings: SettingsData; timezones: string[] }>('/settings');
      setData(res.settings);
      setTimezones(res.timezones);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load settings.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Partial<SettingsData>) {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const merged = { ...data, ...patch };
      const res = await api.put<{ settings: SettingsData }>('/settings', merged);
      setData(res.settings);
      await refreshUser();
      setSavedMsg('Saved!');
      window.setTimeout(() => setSavedMsg(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwMsg(null);
    try {
      await api.put('/settings/password', { currentPassword, newPassword });
      setPwMsg('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not update password.');
    }
  }

  async function requestNotifications(enabled: boolean) {
    if (!enabled) {
      await save({ notificationsEnabled: false });
      return;
    }
    if (!('Notification' in window)) {
      setError('Your browser does not support notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await save({ notificationsEnabled: true });
      new Notification('Studypeak', { body: 'Reminders are on. Let’s keep the streak alive!' });
    } else {
      setError('Notification permission was denied in your browser.');
    }
  }

  if (!data && !error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Make Studypeak yours.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <Card>
        <CardHeader title="Profile" action={savedMsg ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{savedMsg}</span> : undefined} />
        {data && (
          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="set-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Name
              </label>
              <input
                id="set-name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                onBlur={() => save({ name: data.name })}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="set-tz" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Timezone
              </label>
              <FancySelect
                id="set-tz"
                ariaLabel="Timezone"
                value={data.timezone}
                onChange={(tz) => save({ timezone: tz })}
                options={timezones.map((tz) => ({ value: tz, label: tz === 'local' ? 'Device timezone' : tz }))}
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Your "day" boundary for streaks and tasks follows this setting.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Appearance" />
        <div className="p-5">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={theme === t}
                onClick={() => setTheme(t)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                  theme === t
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Study defaults" />
        {data && (
          <div className="grid grid-cols-2 gap-4 p-5">
            <div>
              <label htmlFor="set-study" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Default session (min)
              </label>
              <input
                id="set-study"
                type="number"
                min={5}
                max={480}
                value={data.defaultStudyMinutes}
                onChange={(e) => setData({ ...data, defaultStudyMinutes: Number(e.target.value) })}
                onBlur={() => save({ defaultStudyMinutes: data.defaultStudyMinutes })}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="set-break" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Default break (min)
              </label>
              <input
                id="set-break"
                type="number"
                min={1}
                max={120}
                value={data.defaultBreakMinutes}
                onChange={(e) => setData({ ...data, defaultBreakMinutes: Number(e.target.value) })}
                onBlur={() => save({ defaultBreakMinutes: data.defaultBreakMinutes })}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Notifications" subtitle="Optional reminders — always optional" />
        {data && (
          <div className="flex items-center justify-between p-5">
            <p className="text-sm text-slate-600 dark:text-slate-300">Browser reminders</p>
            <button
              role="switch"
              aria-checked={data.notificationsEnabled}
              onClick={() => requestNotifications(!data.notificationsEnabled)}
              disabled={saving}
              className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                data.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  data.notificationsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <form onSubmit={changePassword} className="space-y-3 p-5">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={inputCls}
          />
          <input
            type="password"
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
            className={inputCls}
          />
          {pwMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400">{pwMsg}</p>}
          {pwError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {pwError}
            </p>
          )}
          <Button type="submit" variant="secondary">
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
