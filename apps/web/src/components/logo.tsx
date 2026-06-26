import { cn } from '#/lib/utils';

/**
 * Kizuna brand mark — the two figures forming a heart-knot ("le lien" : the bond
 * of the trinôme). The artwork carries its own colour, so it sits on a clean
 * light chip rather than a coloured background.
 */
export function Logo({ className, chip = true }: { className?: string; chip?: boolean }) {
  const img = (
    <img
      src="/kizuna-logo.png"
      alt="Kizuna"
      className="h-full w-full object-contain"
      draggable={false}
    />
  );
  if (!chip) return <span className={cn('inline-block', className)}>{img}</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-card p-1.5 shadow-sm ring-1 ring-hairline',
        className,
      )}
    >
      {img}
    </span>
  );
}

/** Logo + wordmark lockup. */
export function Wordmark({
  className,
  size = 'md',
  tagline,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  tagline?: string;
}) {
  const mark = size === 'lg' ? 'h-12 w-12' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const word = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo className={mark} />
      <div className="leading-tight">
        <div className={cn('font-bold tracking-tight', word)}>Kizuna</div>
        {tagline && <div className="text-xs font-medium text-muted-foreground">{tagline}</div>}
      </div>
    </div>
  );
}
