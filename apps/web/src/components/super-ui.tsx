import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '#/lib/utils';
import { roleMeta, type Swatch } from '#/lib/super';
import { useCountUp } from '#/lib/use-count-up';

/**
 * Standard page wrapper: optional back link, a large title with supporting copy,
 * then the page content. Replaces the legacy per-page top header bar.
 */
export function PageShell({
  title,
  subtitle,
  actions,
  back,
  maxWidth = 'max-w-5xl',
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mx-auto space-y-5 px-6 py-8', maxWidth)}>
      {back && (
        <Link
          to={back.to as '/app'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-strong"
        >
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <PageHead title={title} actions={actions}>
        {subtitle}
      </PageHead>
      {children}
    </div>
  );
}

/** Mono uppercase kicker used above titles and section headers. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'font-mono text-[10.5px] font-semibold tracking-[0.14em] text-brand-strong uppercase',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page header: optional eyebrow, title, supporting copy, right-aligned actions. */
export function PageHead({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-xl">
        {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {children && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

/**
 * Animated KPI value. Numbers and strings with a leading number ("30%", "3/6")
 * count up from zero; anything else ("—", "10 août") renders as-is.
 */
function StatValue({ value }: { value: ReactNode }) {
  let target: number | null = null;
  let suffix = '';
  if (typeof value === 'number') {
    target = value;
  } else if (typeof value === 'string') {
    const m = /^(\d+)([%/].*)?$/.exec(value);
    if (m) {
      target = Number(m[1]);
      suffix = m[2] ?? '';
    }
  }
  const shown = useCountUp(target ?? 0);
  if (target === null) return <>{value}</>;
  return (
    <>
      {shown}
      {suffix}
    </>
  );
}

/** KPI tile. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  to,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: ReactNode;
  to?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </div>
      </div>
      <div className="mt-2.5 font-display text-3xl font-bold tracking-tight tabular-nums">
        <StatValue value={value} />
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </>
  );
  const className =
    'block rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200';
  if (to) {
    return (
      <Link to={to as '/app'} className={cn(className, 'hover:-translate-y-1 hover:shadow-lg')}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

/** White rounded panel used for the dashboard sections and tables. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-hairline bg-card shadow-md', className)}>
      {children}
    </div>
  );
}

function Chip({
  swatch,
  className,
  children,
}: {
  swatch?: Swatch;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap',
        className,
      )}
      style={swatch && { background: swatch.bg, color: swatch.text }}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const meta = roleMeta(role);
  return <Chip swatch={meta.swatch}>{meta.label}</Chip>;
}

export function StatusBadge({ banned }: { banned: boolean }) {
  return (
    <Chip
      className={
        banned ? 'bg-status-amber text-status-amber-fg' : 'bg-status-green text-status-green-fg'
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {banned ? 'Invité' : 'Actif'}
    </Chip>
  );
}

/** Soft circular avatar with initials, tinted to the role. */
export function Avatar({
  name,
  role,
  size = 38,
}: {
  name?: string | null;
  role?: string;
  size?: number;
}) {
  const swatch = role ? roleMeta(role).swatch : { bg: '#EEF2FD', text: '#3B63CC' };
  const text = (name ?? '·')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: swatch.bg,
        color: swatch.text,
        fontSize: size * 0.36,
      }}
    >
      {text}
    </span>
  );
}

/** Shown when a non-super-admin lands on a platform page. */
export function ForbiddenSuper() {
  return (
    <div className="mx-auto grid max-w-5xl place-items-center px-6 py-24 text-center">
      <div>
        <p className="font-semibold">Espace réservé au super administrateur.</p>
        <Link to="/app" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          ← Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}
