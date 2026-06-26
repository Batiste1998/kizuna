import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signIn } from '#/lib/auth-client';
import {
  DEMO_PERSONAS,
  STAT_LABELS,
  personaAvatar,
  roleLabel,
  type DemoPersona,
} from '#/lib/roles';
import { Logo } from '#/components/logo';
import { StageAuras } from '#/components/stage-auras';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/demo')({
  component: DemoPage,
});

// Shared password for every seeded demo account (apps/api/src/seed-users.ts).
const DEMO_PASSWORD = 'Password123!';

const TRINOME = DEMO_PERSONAS.filter((p) => p.group === 'trinome');
// Platform staff, minus super_admin — kept out of the demo so nobody can sign in
// with the keys-to-everything account from here.
const PLATEFORME = DEMO_PERSONAS.filter(
  (p) => p.group === 'plateforme' && p.key !== 'super_admin',
);

function DemoPage() {
  // Track which persona is mid-sign-in so we disable just that card.
  const [pending, setPending] = useState<string | null>(null);

  async function handlePick(p: DemoPersona) {
    if (pending) return;
    setPending(p.email);
    const { error } = await signIn.email({ email: p.email, password: DEMO_PASSWORD });
    if (error) {
      setPending(null);
      toast.error(error.message ?? 'Connexion à la démo impossible');
      return;
    }
    // Full navigation so the session store initialises from the fresh cookie —
    // an SPA transition can race the refresh and bounce back to /login.
    window.location.href = '/app';
  }

  return (
    <main className="demo-stage relative min-h-screen overflow-hidden">
      <StageAuras />

      {/* Oversized 絆 watermark, the bond made backdrop. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[5vw] left-1/2 -translate-x-1/2 text-[40vw] leading-none font-bold text-foreground/[0.02] select-none sm:text-[32vw]"
      >
        絆
      </span>

      <div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20">
        {/* Hero */}
        <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col items-center text-center duration-700">
          <Logo className="animate-float h-12 w-12" chip={false} />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase shadow-sm backdrop-blur-sm">
            絆 · Espace de démonstration
          </p>
          <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl">
            Choisissez votre carte.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-secondary-foreground">
            Chaque carte ouvre l’espace Kizuna vu depuis son rôle. Cliquez sur celle que vous voulez
            incarner — un seul clic, sans inscription.
          </p>
        </header>

        {/* Le trinôme — the hero trading cards */}
        <section className="mt-14">
          <GroupLabel title="Le trinôme" note="le lien au cœur de Kizuna" />
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {TRINOME.map((p, i) => (
              <FutCard
                key={p.email}
                persona={p}
                index={i}
                pending={pending === p.email}
                disabled={pending !== null}
                onPick={handlePick}
              />
            ))}
          </div>
        </section>

        {/* Les coulisses — platform staff */}
        <section className="mt-12">
          <GroupLabel title="Les coulisses" note="l’équipe qui fait tourner la plateforme" />
          <div className="mx-auto mt-7 grid max-w-[33rem] gap-5 sm:grid-cols-2">
            {PLATEFORME.map((p, i) => (
              <FutCard
                key={p.email}
                persona={p}
                index={i}
                pending={pending === p.email}
                disabled={pending !== null}
                onPick={handlePick}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 flex flex-col items-center gap-4 text-center">
          <p className="text-xs text-muted-foreground">
            Comptes de démonstration · données fictives · notes pour le fun
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-muted-foreground transition-colors hover:text-brand-strong">
              ← Accueil
            </Link>
            <span aria-hidden className="text-hairline">
              ·
            </span>
            <Link
              to="/login"
              className="text-muted-foreground transition-colors hover:text-brand-strong"
            >
              Se connecter à un vrai compte
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function GroupLabel({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <h2 className="text-[11px] font-bold tracking-[0.16em] text-secondary-foreground uppercase">
        {title}
      </h2>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

/**
 * A premium "trading card" (FUT homage), themed by the persona's role colour.
 * The entire card is the button; a full-width footer makes the action obvious.
 */
function FutCard({
  persona,
  index,
  pending,
  disabled,
  onPick,
}: {
  persona: DemoPersona;
  index: number;
  pending: boolean;
  disabled: boolean;
  onPick: (p: DemoPersona) => void;
}) {
  return (
    <button
      type="button"
      data-role={persona.key}
      onClick={() => onPick(persona)}
      disabled={disabled}
      aria-busy={pending}
      aria-label={`Entrer dans l’espace de ${persona.name} — ${roleLabel(persona.key)}`}
      style={{ animationDelay: `${0.15 + index * 0.1}s` }}
      className={cn(
        'group bg-brand-gradient animate-in fade-in zoom-in-95 fill-mode-both relative aspect-[3/4] cursor-pointer overflow-hidden rounded-[1.6rem] text-left text-white shadow-[0_26px_60px_-26px_color-mix(in_srgb,var(--accent)_70%,black)] ring-1 ring-black/5 duration-500',
        'transition-[transform,box-shadow] duration-300 hover:-translate-y-2 hover:shadow-[0_36px_72px_-26px_color-mix(in_srgb,var(--accent)_75%,black)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-background',
        'disabled:pointer-events-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        !pending && disabled && 'opacity-50',
      )}
    >
      {/* Top sheen + holographic sweep on hover */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(255,255,255,0.4),transparent_55%)]"
      />
      <span
        aria-hidden
        className="absolute -inset-y-12 -left-1/2 w-1/2 rotate-12 bg-white/25 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
      />
      {/* Inner frame */}
      <span aria-hidden className="absolute inset-2 rounded-[1.2rem] ring-1 ring-white/30" />

      {/* Rating + position */}
      <div className="absolute top-5 left-6 z-10">
        <div className="font-display text-[2.75rem] leading-none font-bold drop-shadow-sm">
          {persona.rating}
        </div>
        <div className="mt-1 text-xs font-bold tracking-[0.18em] text-white/85">
          {persona.position}
        </div>
        <div className="mt-2 h-px w-7 bg-white/45" />
      </div>

      {/* Avatar — illustrated sticker over the holo background */}
      <div className="absolute inset-x-0 top-7 flex justify-center">
        <span aria-hidden className="absolute top-4 h-28 w-28 rounded-full bg-white/25 blur-2xl" />
        <span className="relative grid h-36 w-36 place-items-center">
          <span aria-hidden className="absolute font-display text-6xl font-bold text-white/25">
            {persona.firstName.charAt(0)}
          </span>
          <img
            src={personaAvatar(persona.name)}
            alt=""
            className="relative h-36 w-36 object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.3)]"
          />
        </span>
      </div>

      {/* Name, stats and the full-width action footer */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="bg-gradient-to-t from-black/45 via-black/15 to-transparent px-5 pt-16 pb-4">
          <div className="text-center font-display text-lg font-bold tracking-tight">
            {persona.name}
          </div>
          <div className="mt-0.5 text-center text-[11px] font-medium text-white/75">
            {roleLabel(persona.key)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-1.5 border-t border-white/20 pt-3">
            {persona.stats.map((value, i) => (
              <div key={STAT_LABELS[i]} className="flex items-baseline justify-center gap-1">
                <span className="text-sm font-bold tabular-nums">{value}</span>
                <span className="text-[10px] font-semibold text-white/60">{STAT_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 border-t border-white/15 bg-black/25 py-3 text-sm font-semibold backdrop-blur-sm transition-colors duration-200 group-hover:bg-black/40">
          {pending ? (
            'Connexion…'
          ) : (
            <>
              Entrer dans cet espace
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
