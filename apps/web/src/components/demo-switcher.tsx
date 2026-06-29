import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { signInThenGo } from '#/lib/auth-client';
import {
  DEMO_PASSWORD,
  STAFF_PERSONAS,
  SUBJECT_PERSONA,
  TRINOME_PERSONAS,
  isDemoAccount,
  roleLabel,
  type DemoPersona,
} from '#/lib/roles';
import { api, type Me } from '#/lib/api';
import { cn } from '#/lib/utils';
import { Coachmark, useCoachmark } from './coachmark';

/** Where a freshly-impersonated persona should land. */
async function landingFor(persona: DemoPersona): Promise<string> {
  // Tutors open the apprentice's file directly — the connection made tangible.
  if (persona.group === 'trinome' && persona.key !== 'alternant') {
    try {
      // Cap the lookup so a slow request can never stall the role switch; on
      // timeout (or any error) we just fall back to the role's default home.
      const mine = await Promise.race([
        api.getMyAlternants(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]);
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
  const coach = useCoachmark('demo-roles', isDemoAccount(me.email));

  if (!isDemoAccount(me.email) || hidden) return null;

  const firstName = me.name?.split(' ')[0] ?? 'cette personne';

  async function switchTo(p: DemoPersona) {
    if (pending || p.email === me.email) return;
    setPending(p.email);
    // On success the page hard-navigates away, so we only ever land back here on
    // failure — always release the lock so the bar can never freeze and the user
    // can retry. (A stuck lock used to block every later switch.)
    try {
      const error = await signInThenGo(p.email, DEMO_PASSWORD, () => landingFor(p));
      if (error) {
        toast.error('Bascule impossible. Réessayez.');
        setPending(null);
      }
    } catch {
      toast.error('Bascule impossible. Réessayez.');
      setPending(null);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-3 px-4 print:hidden [&>*]:pointer-events-auto">
      {coach.open && (
        <Coachmark
          title="Une alternance, 3 regards"
          onDismiss={coach.dismiss}
          arrow="bottom"
          className="w-72"
        >
          Vous explorez l’espace de <strong className="font-semibold text-white">{firstName}</strong>.
          Changez de rôle ci-dessous : c’est la même alternance, vue par chaque membre du trinôme.
        </Coachmark>
      )}
      <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-3xl border border-hairline bg-card/95 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-md sm:gap-x-3 sm:px-4">
        <span className="hidden shrink-0 text-[10px] font-bold tracking-[0.14em] text-brand-strong uppercase sm:inline">
          Démo · changer de rôle
        </span>

        <div className="flex flex-wrap items-center justify-center gap-1">
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

          <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-hairline" />

          {STAFF_PERSONAS.map((p) => (
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
  onClick,
}: {
  persona: DemoPersona;
  active: boolean;
  loading: boolean;
  disabled: boolean;
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
      <span>{persona.firstName}</span>
    </button>
  );
}
