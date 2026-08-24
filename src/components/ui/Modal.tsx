import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open && !mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 transition-opacity duration-200 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-2xl ${
          open ? 'animate-slide-up-fade' : ''
        }`}
        onAnimationEnd={() => {
          if (!open) setMounted(false);
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
