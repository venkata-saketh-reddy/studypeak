import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FancyOption {
  value: string;
  label: string;
}

interface FancySelectProps {
  value: string;
  options: FancyOption[];
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Themed dropdown replacing native <select> — dark glass popover, glowing
 * hover, check on the selected item. Keyboard: arrows / Enter / Escape.
 */
export function FancySelect({ value, options, onChange, id, ariaLabel, placeholder = 'Select…', className = '' }: FancySelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlight(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function commit(idx: number) {
    const opt = options[idx];
    if (opt) onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && highlight >= 0) commit(highlight);
        else setOpen(true);
        break;
      case 'Escape':
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlight((h) => Math.min(options.length - 1, h + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else setHighlight((h) => Math.max(0, h - 1));
        break;
      case 'Home':
        if (open) { e.preventDefault(); setHighlight(0); }
        break;
      case 'End':
        if (open) { e.preventDefault(); setHighlight(options.length - 1); }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`group flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
          open
            ? 'border-indigo-500/70 bg-slate-800 text-slate-100 shadow-lg shadow-indigo-950/40'
            : 'border-slate-200 bg-white text-slate-900 hover:border-indigo-400/60 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-500/50'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-indigo-400 transition-transform duration-200 ${open ? 'rotate-180' : ''} group-hover:scale-110`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="fancy-scroll absolute left-0 top-full z-40 mt-2 max-h-60 min-w-full w-max max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-indigo-500/20 bg-slate-900/95 p-1.5 shadow-2xl shadow-indigo-950/60 ring-1 ring-white/5 backdrop-blur-md"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlight;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(i)}
                  className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition-colors duration-100 ${
                    isHighlighted
                      ? 'bg-indigo-500/20 text-slate-100 shadow-inner shadow-indigo-500/10'
                      : 'text-slate-300'
                  } ${isSelected ? 'font-semibold' : ''}`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all ${
                      isSelected ? 'bg-indigo-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.6)]' : isHighlighted ? 'bg-indigo-400/50' : 'bg-transparent'
                    }`}
                  />
                  <span>{opt.label}</span>
                  {isSelected && <Check size={15} className="ml-auto shrink-0 text-indigo-400" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
