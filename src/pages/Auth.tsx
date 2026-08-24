import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { Robot } from '@/components/robot/Robot';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your streak">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{' '}
        <Link to="/signup" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await signup(email, password, name);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Plan. Focus. Track. Repeat.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Name" type="text" value={name} onChange={setName} autoComplete="name" placeholder="Alex" />
        <Input label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          hint="At least 6 characters"
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {busy ? 'Creating account…' : 'Get started'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Robot mood="happy" size={80} />
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Studypeak
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  hint,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  hint?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={props.id ?? props.name} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={props.id ?? props.name}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        {...props}
      />
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
