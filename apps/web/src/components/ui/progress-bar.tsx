import { cn } from '#/lib/utils';

/**
 * Progress bar — track, animated fill and rounding assembled once.
 * Brand gradient by default; pass `color` for a custom fill (e.g. role swatch).
 */
export function ProgressBar({
  pct,
  color,
  className,
}: {
  pct: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('bar-fill h-full rounded-full', !color && 'bg-brand-gradient')}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}
