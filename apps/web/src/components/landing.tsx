import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '#/components/ui/button';
import { cn } from '#/lib/utils';

/*
 * Landing sections below the hero: the same "fil" signature, declined three
 * ways — the trinôme linked by one thread, the modules on a snap rail, the
 * semester as a beaded path. Copy stays product-real (no marketing filler).
 */

/** Adds .is-visible once the element enters the viewport (scroll reveal). */
function Reveal({
  className,
  delay,
  children,
}: {
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn('reveal', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-brand-strong uppercase">
        {eyebrow}
      </p>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 text-[15px] leading-relaxed text-balance text-secondary-foreground">
          {lead}
        </p>
      )}
    </div>
  );
}

/* --- Section 1 : le trinôme, trois cartes sur un même fil -------------------- */

const VOICES = [
  {
    name: 'Alternant',
    color: 'var(--voice-auto)',
    role: 'La première voix',
    text: 'S’auto-évalue sur le référentiel, tient son journal d’activités et dépose ses livrables au fil du semestre.',
  },
  {
    name: 'Tuteur pédagogique',
    color: 'var(--voice-peda)',
    role: 'Le regard de l’école',
    text: 'Suit la progression de ses alternants, évalue côté école et planifie les bilans tripartites.',
  },
  {
    name: 'Tuteur d’entreprise',
    color: 'var(--voice-entreprise)',
    role: 'Le regard du terrain',
    text: 'Évalue en situation de travail, valide le journal d’activités et signe les bilans.',
  },
] as const;

function TrinomeSection() {
  return (
    <section className="relative px-6 py-24">
      <Reveal>
        <SectionHeader
          eyebrow="Le trinôme"
          title="Trois voix, un même fil"
          lead="Chaque compétence du référentiel est lue trois fois : par l’alternant, par l’école, par l’entreprise. Les écarts deviennent des conversations."
        />
      </Reveal>

      <div className="relative mx-auto mt-14 max-w-5xl">
        {/* The thread linking the three cards (desktop). */}
        <span
          aria-hidden
          className="absolute top-0 right-[16%] left-[16%] hidden h-px bg-hairline lg:block"
        />
        <div className="grid gap-10 gap-y-14 lg:grid-cols-3 lg:gap-6">
          {VOICES.map((v, i) => (
            <Reveal key={v.name} delay={i * 120}>
              <article className="relative flex h-full flex-col rounded-2xl border border-hairline bg-card p-6 shadow-sm">
                {/* The bead pinning this voice onto the thread. */}
                <span
                  aria-hidden
                  className="absolute -top-[7px] left-1/2 h-[14px] w-[14px] -translate-x-1/2 rounded-full"
                  style={{
                    background: v.color,
                    boxShadow: '0 0 0 3px var(--background), 0 2px 6px rgba(20,23,33,0.14)',
                  }}
                />
                <p
                  className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                  style={{ color: v.color }}
                >
                  {v.role}
                </p>
                <h3 className="mt-2 text-lg font-bold tracking-tight">{v.name}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-secondary-foreground">
                  {v.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Section 2 : les modules, sur un rail à défilement ----------------------- */

interface Module {
  name: string;
  text: string;
  vignette: ReactNode;
}

/** Tiny abstract vignettes — each one a variation of the fil motif. */
function VignetteCompetences() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-3 px-6">
      {[82, 58, 34].map((left, i) => (
        <div key={left} className="relative h-2.5 rounded-full bg-muted">
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${left + 8}%`,
              background: 'color-mix(in srgb, var(--voice-auto) 22%, transparent)',
            }}
          />
          <span
            className="absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${left}%`,
              background: ['var(--voice-auto)', 'var(--voice-peda)', 'var(--voice-entreprise)'][i],
              boxShadow: '0 0 0 2px var(--card)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

function VignetteJournal() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2.5 px-6">
      {[
        { w: '86%', dot: 'var(--color-status-green)' },
        { w: '68%', dot: 'var(--color-status-amber)' },
        { w: '76%', dot: 'var(--color-status-green)' },
      ].map((line, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: line.dot }} />
          <span className="h-2 rounded-full bg-muted" style={{ width: line.w }} />
        </div>
      ))}
    </div>
  );
}

function VignetteBilans() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 px-6">
      {VOICES.map((v) => (
        <span
          key={v.name}
          className="h-8 w-8 rounded-full border-2 border-card"
          style={{ background: `color-mix(in srgb, ${v.color} 30%, white)` }}
        />
      ))}
      <span className="ml-2 font-mono text-[11px] font-semibold text-muted-foreground">PDF ↓</span>
    </div>
  );
}

function VignetteEcheancier() {
  return (
    <div className="relative flex h-full w-full items-center px-8">
      <span className="h-px w-full bg-foreground/15" />
      {[14, 42, 70, 92].map((left, i) => (
        <span
          key={left}
          className="absolute top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full"
          style={{
            left: `${left}%`,
            background: i < 2 ? 'var(--brand)' : 'var(--muted-foreground)',
            opacity: i < 2 ? 1 : 0.35,
            boxShadow: '0 0 0 2px var(--card)',
          }}
        />
      ))}
    </div>
  );
}

function VignetteMessagerie() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 px-7">
      <span
        className="h-5 w-3/5 self-start rounded-xl rounded-bl-sm"
        style={{ background: 'color-mix(in srgb, var(--voice-auto) 20%, white)' }}
      />
      <span
        className="h-5 w-1/2 self-end rounded-xl rounded-br-sm"
        style={{ background: 'color-mix(in srgb, var(--voice-entreprise) 20%, white)' }}
      />
      <span
        className="h-5 w-2/5 self-start rounded-xl rounded-bl-sm"
        style={{ background: 'color-mix(in srgb, var(--voice-peda) 20%, white)' }}
      />
    </div>
  );
}

function VignetteDocuments() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-3">
      {['CV', 'RAP', 'CON'].map((tag, i) => (
        <span
          key={tag}
          className="flex h-14 w-11 items-end justify-center rounded-md border border-hairline bg-card pb-1.5 font-mono text-[9px] font-semibold text-muted-foreground shadow-sm"
          style={{ transform: `rotate(${(i - 1) * 4}deg)` }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

const MODULES: Module[] = [
  {
    name: 'Compétences',
    text: 'Le fil à trois voix sur chaque compétence du référentiel RNCP.',
    vignette: <VignetteCompetences />,
  },
  {
    name: 'Journal d’activités',
    text: 'Rédigé par l’alternant, validé ou commenté par le tuteur d’entreprise.',
    vignette: <VignetteJournal />,
  },
  {
    name: 'Bilans tripartites',
    text: 'Planifiés avec le trinôme, suivis par statut, exportables en PDF.',
    vignette: <VignetteBilans />,
  },
  {
    name: 'Échéancier',
    text: 'Les jalons de la promotion, avec rappels automatiques par email.',
    vignette: <VignetteEcheancier />,
  },
  {
    name: 'Messagerie',
    text: 'Le trinôme entier dans un seul fil de discussion.',
    vignette: <VignetteMessagerie />,
  },
  {
    name: 'Documents',
    text: 'Conventions, rapports et livrables déposés au même endroit.',
    vignette: <VignetteDocuments />,
  },
];

function ModulesSection() {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollRail(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.72, behavior: 'smooth' });
  }

  return (
    <section className="relative py-24">
      <Reveal className="px-6">
        <SectionHeader
          eyebrow="La plateforme"
          title="Tout le suivi, module par module"
          lead="Six espaces reliés par le même fil, du référentiel de compétences jusqu’au bilan signé."
        />
      </Reveal>

      <Reveal className="mt-12">
        <div
          ref={railRef}
          role="region"
          aria-label="Modules de la plateforme"
          className="snap-rail flex gap-5 overflow-x-auto px-[max(1.5rem,calc(50vw-34rem))] pb-4"
        >
          {MODULES.map((m) => (
            <article
              key={m.name}
              className="w-[290px] shrink-0 rounded-2xl border border-hairline bg-card shadow-sm sm:w-[320px]"
            >
              <div className="h-36 rounded-t-2xl border-b border-hairline bg-gradient-to-b from-muted/40 to-transparent">
                {m.vignette}
              </div>
              <div className="p-5">
                <h3 className="text-[15px] font-bold tracking-tight">{m.name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-secondary-foreground">
                  {m.text}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Modules précédents"
            onClick={() => scrollRail(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-card text-secondary-foreground shadow-sm transition-colors hover:text-foreground"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Modules suivants"
            onClick={() => scrollRail(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-card text-secondary-foreground shadow-sm transition-colors hover:text-foreground"
          >
            →
          </button>
        </div>
      </Reveal>
    </section>
  );
}

/* --- Section 3 : le parcours du semestre, perles sur un fil ------------------- */

const STEPS = [
  {
    title: 'Le référentiel est posé',
    text: 'Blocs et compétences RNCP importés pour la promotion.',
  },
  {
    title: 'L’alternant s’auto-évalue',
    text: 'Niveau par niveau, au rythme du semestre — première voix sur le fil.',
  },
  {
    title: 'Les tuteurs posent leur regard',
    text: 'École et entreprise évaluent à leur tour : les trois perles se répondent.',
  },
  {
    title: 'Le bilan tripartite est signé',
    text: 'Planifié, mené à trois, exporté en PDF — la boucle est bouclée.',
  },
];

function ParcoursSection() {
  return (
    <section className="relative px-6 py-24">
      <Reveal>
        <SectionHeader
          eyebrow="Le parcours"
          title="Un semestre sur le fil"
          lead="De l’import du référentiel au bilan signé, la même trajectoire pour chaque alternant."
        />
      </Reveal>

      <div className="relative mx-auto mt-14 max-w-5xl">
        {/* Desktop: one horizontal thread. Mobile: a vertical one on the left. */}
        <span
          aria-hidden
          className="absolute top-[7px] right-[12%] left-[12%] hidden h-px bg-foreground/15 lg:block"
        />
        <span
          aria-hidden
          className="absolute top-1 bottom-4 left-[7px] w-px bg-foreground/15 lg:hidden"
        />
        <ol className="grid gap-9 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 110}>
              <li className="relative pl-8 lg:pl-0 lg:text-center">
                <span
                  aria-hidden
                  className="absolute top-0 left-0 h-[15px] w-[15px] rounded-full bg-brand lg:static lg:mx-auto lg:block"
                  style={{
                    boxShadow: '0 0 0 3px var(--background), 0 2px 6px rgba(20,23,33,0.14)',
                  }}
                />
                <p className="mt-0 font-mono text-[11px] font-semibold text-muted-foreground lg:mt-4">
                  Étape {i + 1}
                </p>
                <h3 className="mt-1 text-[15px] font-bold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-secondary-foreground">
                  {s.text}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --- Bandeau final ------------------------------------------------------------ */

function FinalSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[26rem] leading-none font-bold text-foreground/[0.025] select-none"
      >
        絆
      </span>
      <Reveal className="relative mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Prêt à relier votre trinôme ?
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-secondary-foreground">
          Des comptes de démonstration sont inclus pour chaque rôle — aucune installation, aucune
          donnée à créer.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/login" className={buttonVariants({ size: 'lg' })}>
            Accéder à mon espace
          </Link>
          <Link to="/demo" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            Explorer la démo →
          </Link>
        </div>
      </Reveal>
      <p className="relative mt-16 text-center text-[11px] font-medium text-muted-foreground">
        © 2026 Kizuna · Tous droits réservés
      </p>
    </section>
  );
}

export function LandingSections() {
  return (
    <>
      {/* The thread carrying the eye from the hero into the story. */}
      <div aria-hidden className="flex justify-center">
        <span className="timeline-thread block h-16 w-px bg-foreground/15" />
      </div>
      <TrinomeSection />
      <ModulesSection />
      <ParcoursSection />
      <FinalSection />
    </>
  );
}
