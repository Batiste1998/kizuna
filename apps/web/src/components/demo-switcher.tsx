import { useState } from 'react';
import { X } from 'lucide-react';
import { signInThenGo } from '#/lib/auth-client';
import {
  DEMO_PASSWORD,
  STAFF_PERSONAS,
  SUBJECT_PERSONA,
  TRINOME_PERSONAS,
  roleLabel,
  type DemoPersona,
} from '#/lib/roles';
import { api, type Me } from '#/lib/api';
import { cn } from '#/lib/utils';

/** Demo accounts all live on the seeded @kizuna.dev domain. */
const isDemoAccount = (email?: string) => Boolean(email && email.endsWith('@kizuna.dev'));

/** Where a freshly-impersonated persona should land. */
async function landingFor(persona: DemoPersona): Promise<string> {
  // Tutors open the apprentice's file directly — the connection made tangible.
  if (persona.group === 'trinome' && persona.key !== 'alternant') {
    try {
      const mine = await api.getMyAlternants();
      const lea = mine.find((a) => a.email === SUBJECT_PERSONA?.email);
      if (lea) return `/app/alternants/${lea.alternantProfilId}`;
    } catch {
      // Fall through to the role's default home.
    }
  }
  return '/app';
}

/**
 * Floating "demo mode" bar, shown only when signed in as a seeded demo account.
 * Its job is to make Kizuna's one differentiator tangible: switch hats between
 * the alternant, her school tutor and her company tutor and watch the *same*
 * apprenticeship from each side — without ever signing out and back in.
 */
export function DemoSwitcher({ me }: { me: Me }) {
  const [pending, setPending] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  if (!isDemoAccount(me.email) || hidden) return null;

  async function switchTo(p: DemoPersona) {
    if (pending || p.email === me.email) return;
    setPending(p.email);
    const error = await signInThenGo(p.email, DEMO_PASSWORD, () => landingFor(p));
    if (error) setPending(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 print:hidden">
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-2 overflow-x-auto rounded-full border border-hairline bg-card/95 py-2 pr-2 pl-3 shadow-lg ring-1 ring-black/5 backdrop-blur-md sm:gap-3 sm:pl-4">
        <div className="hidden shrink-0 flex-col leading-tight sm:flex">
          <span className="text-[10px] font-bold tracking-[0.14em] text-brand-strong uppercase">
            Démo
          </span>
          <span className="text-[11px] text-muted-foreground">Une alternance, 3 regards</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {TRINOME_PERSONAS.map((p) => (
            <PersonaPill
              key={p.email}
              persona={p}
              active={p.email === me.email}
              loading={pending === p.email}
              disabled={pending !== null}
              onClick={() => switchTo(p)}
            />
          ))}
        </div>

        <span aria-hidden className="h-7 w-px shrink-0 bg-hairline" />

        <div className="flex shrink-0 items-center gap-1">
          {STAFF_PERSONAS.map((p) => (
            <PersonaPill
              key={p.email}
              persona={p}
              compact
              active={p.email === me.email}
              loading={pending === p.email}
              disabled={pending !== null}
              onClick={() => switchTo(p)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Masquer la barre de démo"
          title="Masquer"
          className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PersonaPill({
  persona,
  active,
  loading,
  disabled,
  compact = false,
  onClick,
}: {
  persona: DemoPersona;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-role={persona.key}
      onClick={onClick}
      disabled={disabled || active}
      aria-current={active ? 'true' : undefined}
      title={`${persona.firstName} — ${roleLabel(persona.key)}`}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
        active
          ? 'bg-[var(--accent)] text-white shadow-sm cursor-default'
          : 'text-secondary-foreground hover:bg-brand-soft hover:text-brand-strong',
        disabled && !active && 'opacity-60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          loading && 'animate-pulse',
          active ? 'bg-white/90' : 'bg-[var(--accent)]',
        )}
      />
      <span className={cn(compact && 'hidden sm:inline')}>{persona.firstName}</span>
    </button>
  );
}
