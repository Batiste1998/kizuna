import type { ReactNode } from 'react';
import { cn } from '#/lib/utils';

/*
 * Vertical "fil" timeline shared by the échéancier and the journal: one thread,
 * beads strung on it, cards to the right. The thread↔bead↔padding geometry
 * lives here only — panels just pick each bead's colour and state.
 */

export function ThreadTimeline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <span
        aria-hidden
        className="timeline-thread absolute top-1 bottom-1 left-[8px] w-[2px] rounded-full bg-gradient-to-b from-brand/50 via-brand/25 to-border"
      />
      <ol className="stagger-children space-y-4 pl-8">{children}</ol>
    </div>
  );
}

export function ThreadTimelineItem({
  bead,
  children,
}: {
  bead: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="relative">
      {bead}
      {children}
    </li>
  );
}

/**
 * A bead on the thread. `pulse` marks the upcoming milestone (bigger, breathing
 * ring); `className` carries its colour (`bg-*`, `border-*`, `ring-*`).
 */
export function ThreadBead({ pulse, className }: { pulse?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute rounded-full',
        pulse ? 'bead-pulse top-4 -left-[31px] h-4 w-4' : 'top-4.5 -left-[29px] h-3 w-3',
        className,
      )}
    />
  );
}
