import { X } from 'lucide-react';
import { useRobot } from '@/contexts/RobotContext';
import { Robot } from './Robot';

/**
 * Game-style companion bubble. Click/tap anywhere on it to advance dialogue.
 * Auto-minimizes after advancing past the last message.
 */
export function RobotCompanion() {
  const { message, visible, next, dismiss } = useRobot();

  if (!visible || !message) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-end gap-2 sm:bottom-6 sm:right-6 animate-slide-up-fade"
      role="status"
      aria-live="polite"
    >
      <div className="shrink-0">
        <Robot mood={message.mood} size={64} />
      </div>
      <div className="group relative">
        <button
          onClick={next}
          aria-label="Next message"
          className="block max-w-xs cursor-pointer rounded-2xl rounded-br-sm border border-slate-200 bg-white px-4 py-3 text-left shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{message.text}</p>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 dark:text-slate-500">
            Tap to continue
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss companion"
          className="absolute -right-2 -top-2 rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow-sm transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
