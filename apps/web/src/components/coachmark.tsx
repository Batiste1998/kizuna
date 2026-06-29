import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '#/lib/utils';

const STORAGE_PREFIX = 'kizuna-coach-';

/**
 * One-time, dismissible coachmark state, remembered in localStorage so a hint is
 * shown once and never nags again (survives the demo's hard role-switches).
 * Stays closed until mounted on the client, avoiding any SSR hydration mismatch.
 */
export function useCoachmark(id: string, enabled = true) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(STORAGE_PREFIX + id) !== 'seen') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [id, enabled]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_PREFIX + id, 'seen');
    } catch {
      /* localStorage unavailable — fine, it just won't be remembered. */
    }
  }

  return { open, dismiss };
}

/**
 * A small, on-brand coaching bubble that points out one demo affordance. Purely
 * presentational: the caller decides when it's open (useCoachmark), sizes/places
 * it next to its target, and `arrow` draws a pointer toward that target.
 */
export function Coachmark({
  title,
  children,
  onDismiss,
  arrow,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onDismiss: () => void;
  arrow?: 'top' | 'bottom';
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'bg-brand-action animate-in fade-in zoom-in-95 fill-mode-both relative rounded-xl p-3.5 text-left text-white shadow-lg duration-300',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-tight font-bold">{title}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="-mt-0.5 -mr-0.5 shrink-0 rounded-md p-0.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/85">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2.5 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
      >
        Compris
      </button>
      {arrow && (
        <span
          aria-hidden
          className={cn(
            'bg-brand-action absolute h-3 w-3 rotate-45',
            arrow === 'bottom' && 'bottom-[-6px] left-1/2 -translate-x-1/2',
            arrow === 'top' && 'top-[-6px] left-7',
          )}
        />
      )}
    </div>
  );
}
