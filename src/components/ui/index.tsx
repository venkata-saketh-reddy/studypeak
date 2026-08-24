import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-900';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm' };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 dark:bg-indigo-500/10"
      >
        {icon}
      </span>
      <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ProgressBar({ pct, color = '#4f7cff', label }: { pct: number; color?: string; label?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </Card>
  );
}
