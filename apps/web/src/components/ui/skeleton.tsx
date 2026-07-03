import { cn } from '#/lib/utils';

/** Shimmering placeholder block (see .skeleton in styles.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/**
 * Loading state for list-shaped pages: a few ghost rows strung on a faint
 * vertical thread — the app's loading texture, on-brand with the "lien".
 */
export function ThreadSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('relative space-y-3 py-1', className)} role="status" aria-label="Chargement">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-transparent via-border to-transparent"
      />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5">
          <span className="skeleton h-[15px] w-[15px] flex-none rounded-full" />
          <div className="flex-1 space-y-2 rounded-2xl border border-hairline bg-card p-4 shadow-sm">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3 opacity-70" />
          </div>
        </div>
      ))}
    </div>
  );
}
