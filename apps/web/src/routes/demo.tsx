import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signInThenGo } from '#/lib/auth-client';
import {
  DEMO_PASSWORD,
  STAFF_PERSONAS,
  TRINOME_PERSONAS,
  roleLabel,
  roleTagline,
  type DemoPersona,
} from '#/lib/roles';
import { initials } from '#/lib/super';
import { Logo } from '#/components/logo';
import { StageAuras } from '#/components/stage-auras';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/demo')({
  component: DemoPage,
});

function DemoPage() {
  // Track which persona is mid-sign-in so we disable just that card.
  const [pending, setPending] = useState<string | null>(null);

  async function handlePick(p: DemoPersona) {
    if (pending) return;
    setPending(p.email);
    const error = await signInThenGo(p.email, DEMO_PASSWORD, '/app');
    if (error) {
      setPending(null);
      toast.error(error.message ?? 'Connexion à la démo impossible');
    }
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

      <div className="relative mx-auto max-w-4xl px-6 py-16 sm:py-20">
        {/* Hero */}
        <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col items-center text-center duration-700">
          <Logo className="animate-float h-12 w-12" chip={false} />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase shadow-sm backdrop-blur-sm">
            絆 · Espace de démonstration
          </p>
          <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl">
            Entrez dans le lien.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-secondary-foreground">
            Chaque profil ouvre Kizuna vu depuis son rôle. Choisissez celui que vous voulez
            incarner — un clic, sans inscription.
          </p>
        </header>

        {/* Le trinôme — the three roles bound around one apprenticeship */}
        <section className="mt-14">
          <GroupLabel title="Le trinôme" note="les trois liés autour d’une même alternance" />
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary-foreground">
            L’alternant, son tuteur école et son tuteur entreprise partagent{' '}
            <strong className="font-semibold text-foreground">le même dossier</strong> — fini le
            suivi éclaté entre mails et tableurs. Entrez par le profil que vous voulez : une fois
            dedans, vous basculez d’un rôle à l’autre en un clic.
          </p>
          <TrinomeThread />
          <div className="grid gap-5 sm:grid-cols-3">
            {TRINOME_PERSONAS.map((p, i) => (
              <PersonaCard
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

        {/* Les coulisses — platform staff, deliberately quieter than the trinôme */}
        <section className="mt-12">
          <GroupLabel title="Les coulisses" note="l’équipe qui fait tourner la plateforme" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {STAFF_PERSONAS.map((p, i) => (
              <StaffRow
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
            Comptes de démonstration · données fictives
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
      <h2 className="font-mono text-[11px] font-semibold tracking-[0.16em] text-secondary-foreground uppercase">
        {title}
      </h2>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

// The three trinôme members, in grid order, at the column centres below (⅙, ½, ⅚).
// Each node is themed by data-role so its colour tracks the same --accent token as
// the cards (no hard-coded hex). y=24 in the 36-tall viewBox is where they meet.
const THREAD_NODES: Array<{ role: DemoPersona['key']; left: string }> = [
  { role: 'alternant', left: '16.666%' },
  { role: 'tuteur_pedagogique', left: '50%' },
  { role: 'tuteur_entreprise', left: '83.333%' },
];
const THREAD_NODE_TOP = `${(24 / 36) * 100}%`;

/**
 * The woven thread that binds the trinôme (絆) — Kizuna's one signature flourish,
 * drawing itself on load. The three nodes read as "these three are tied together".
 * Decorative and desktop-only; honours prefers-reduced-motion via .thread-path.
 */
function TrinomeThread() {
  return (
    <div aria-hidden className="relative mt-5 mb-1 hidden h-9 sm:block">
      <svg viewBox="0 0 1000 36" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          {/* Decorative blend of the trinôme's two role accents (teal → orange).
              A single gradient can't read three different per-role tokens, so the
              stops mirror styles.css --accent values; the nodes use the live token. */}
          <linearGradient id="trinome-thread" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2e9e82" />
            <stop offset="55%" stopColor="#2e9e82" />
            <stop offset="100%" stopColor="#e06a41" />
          </linearGradient>
        </defs>
        {/* Weaves up between the nodes then down, all three meeting at y=24. */}
        <path
          className="thread-path"
          pathLength={1}
          d="M166 24 C 280 6, 386 6, 500 24 C 614 42, 720 42, 833 24"
          fill="none"
          stroke="url(#trinome-thread)"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {THREAD_NODES.map((n) => (
        <span
          key={n.role}
          data-role={n.role}
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] ring-4 ring-background"
          style={{ left: n.left, top: THREAD_NODE_TOP }}
        />
      ))}
    </div>
  );
}

interface PersonaPickProps {
  persona: DemoPersona;
  index: number;
  pending: boolean;
  disabled: boolean;
  onPick: (p: DemoPersona) => void;
}

/**
 * Shared button shell for both persona affordances: owns the role theming
 * (data-role), the click/disabled/aria wiring and the focus ring, so the card
 * and the row only describe their own layout. `delay` staggers the entrance.
 */
function PersonaButton({
  persona,
  disabled,
  pending,
  onPick,
  delay,
  className,
  children,
}: Omit<PersonaPickProps, 'index'> & {
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-role={persona.key}
      onClick={() => onPick(persona)}
      disabled={disabled}
      aria-busy={pending}
      aria-label={`Entrer dans l’espace de ${persona.name} — ${roleLabel(persona.key)}`}
      style={{ animationDelay: `${delay}s` }}
      className={cn(
        'group animate-in fade-in fill-mode-both cursor-pointer bg-card text-left ring-1 ring-hairline duration-500 transition-[transform,box-shadow]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        !pending && disabled && 'opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * A trinôme persona — a calm, light card themed by the role's accent. The accent
 * lives in a left spine, the monogram chip and the action, not in a flooded
 * surface, so the card sits naturally on Kizuna's light canvas.
 */
function PersonaCard({ persona, index, pending, disabled, onPick }: PersonaPickProps) {
  return (
    <PersonaButton
      persona={persona}
      pending={pending}
      disabled={disabled}
      onPick={onPick}
      delay={0.15 + index * 0.1}
      className="relative flex flex-col overflow-hidden rounded-2xl p-6 pl-7 shadow-md slide-in-from-bottom-3 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Role accent spine. */}
      <span aria-hidden className="bg-brand-gradient absolute inset-y-0 left-0 w-1.5" />

      <span className="bg-brand-soft text-brand-strong ring-brand/15 grid h-14 w-14 place-items-center rounded-2xl font-display text-xl font-bold ring-1 ring-inset">
        {initials(persona.name)}
      </span>

      <div className="mt-5">
        <div className="font-display text-lg font-bold tracking-tight">{persona.name}</div>
        <div className="text-brand-strong mt-0.5 text-[13px] font-semibold">
          {roleLabel(persona.key)}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-secondary-foreground">{persona.persona}</p>

      <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
        <span className="text-sm font-semibold text-foreground">
          {pending ? 'Connexion…' : 'Entrer dans cet espace'}
        </span>
        <span
          aria-hidden
          className="bg-brand-soft text-brand-strong grid h-8 w-8 place-items-center rounded-full transition-colors duration-200 group-hover:bg-[var(--accent)] group-hover:text-white"
        >
          <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </PersonaButton>
  );
}

/**
 * Platform staff — a compact horizontal row. Quieter than the trinôme cards on
 * purpose: these people work behind the scenes, not inside the bond.
 */
function StaffRow({ persona, index, pending, disabled, onPick }: PersonaPickProps) {
  return (
    <PersonaButton
      persona={persona}
      pending={pending}
      disabled={disabled}
      onPick={onPick}
      delay={0.2 + index * 0.08}
      className="flex items-center gap-4 rounded-xl p-4 shadow-sm slide-in-from-bottom-2 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="bg-brand-soft text-brand-strong grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-base font-bold">
        {initials(persona.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[15px] font-bold tracking-tight">
          {persona.name}
        </div>
        <div className="text-[13px] text-muted-foreground">
          {roleLabel(persona.key)} · {roleTagline(persona.key)}
        </div>
      </div>
      <span
        aria-hidden
        className="text-brand-strong shrink-0 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-0.5"
      >
        {pending ? '…' : '→'}
      </span>
    </PersonaButton>
  );
}
