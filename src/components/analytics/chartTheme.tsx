import type { ReactElement } from 'react';

export const axisTick = { fill: '#94a3b8', fontSize: 12 };
export const axisStroke = 'rgba(148,163,184,0.25)';
export const gridStroke = 'rgba(148,163,184,0.12)';
export const hoverCursor = { fill: 'rgba(99,102,241,0.08)', radius: 8 };

/** Gradient + blur filter defs for glowing bars. Include once per chart. */
export function ChartGlowDefs({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <defs>
      <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
      <filter id={`glow-${id}`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
      </filter>
    </defs>
  );
}

/** Soft blurred halo rendered behind each bar. */
export function makeGlowShape(color: string, id: string) {
  return function GlowShape(props: { x?: number; y?: number; width?: number; height?: number }): ReactElement | null {
    const { x = 0, y = 0, width = 0, height = 0 } = props;
    if (height <= 0 || width <= 0) return null;
    return (
      <rect
        x={x - 2}
        y={y - 4}
        width={width + 4}
        height={height + 4}
        rx={9}
        fill={color}
        opacity={0.55}
        filter={`url(#glow-${id})`}
      />
    );
  };
}

interface TooltipItem {
  name?: string | number;
  value?: string | number | (string | number)[];
  color?: string;
  dataKey?: string | number;
}

/** Dark glass tooltip matching the site theme. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const seen = new Set<string>();
  const items = [...payload].reverse().filter((p) => {
    const key = String(p.dataKey);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <div className="pointer-events-none rounded-xl border border-indigo-400/30 bg-slate-900/95 px-3.5 py-2.5 shadow-2xl shadow-indigo-950/60 backdrop-blur-sm">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      {items.map((p, i) => (
        <p
          key={i}
          className="flex items-center gap-2 text-sm font-semibold text-slate-100"
        >
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? '#818cf8' }} />
          {p.name ?? p.dataKey}
          <span className="ml-auto pl-3 tabular-nums text-slate-300">
            {Array.isArray(p.value) ? p.value.join(', ') : p.value}
            {unit ?? ''}
          </span>
        </p>
      ))}
    </div>
  );
}
