import type { ReactNode } from 'react';
import { cn } from '#/lib/utils';

/** Small icon-only action (row buttons): neutral hover, or orange when `danger`. */
export function IconAction({
  title,
  icon,
  onClick,
  href,
  danger,
  disabled,
  className,
}: {
  title: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const classes = cn(
    'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors',
    disabled
      ? 'cursor-not-allowed opacity-40'
      : danger
        ? 'hover:bg-status-orange hover:text-status-orange-fg'
        : 'hover:bg-muted hover:text-secondary-foreground',
    className,
  );
  if (href && !disabled) {
    return (
      <a href={href} title={title} aria-label={title} className={classes}>
        {icon}
      </a>
    );
  }
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {icon}
    </button>
  );
}
