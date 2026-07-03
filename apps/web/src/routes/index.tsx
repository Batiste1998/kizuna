import { createFileRoute, Link } from '@tanstack/react-router';
import { buttonVariants } from '#/components/ui/button';
import { Logo } from '#/components/logo';
import { StageAuras } from '#/components/stage-auras';

export const Route = createFileRoute('/')({
  component: HomePage,
});

/*
 * The portal opens on the product's heart: on the left the promise, on the
 * right a living preview of the "fil à trois voix". The page is tinted to the
 * alternant's teal — the first voice of the trinôme.
 */
function HomePage() {
  return (
    <main
      data-role="alternant"
      className="demo-stage relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
    >
      <StageAuras />

      {/* Oversized 絆 watermark, the bond made backdrop. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[42vw] leading-none font-bold text-foreground/[0.02] select-none"
      >
        絆
      </span>

      <div className="relative grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* ---- The promise ---- */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="animate-in fade-in zoom-in-95 fill-mode-both duration-700">
            <Logo className="animate-float h-16 w-16" chip={false} />
          </div>

          <p
            className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase shadow-sm backdrop-blur-sm duration-700"
            style={{ animationDelay: '0.1s' }}
          >
            絆 · le lien du trinôme
          </p>

          <h1
            className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-5 font-display text-6xl font-bold tracking-tight duration-700 sm:text-7xl"
            style={{ animationDelay: '0.2s' }}
          >
            Kizuna
          </h1>

          <p
            className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-secondary-foreground duration-700"
            style={{ animationDelay: '0.32s' }}
          >
            Une identité par espace. L’alternant, le tuteur pédagogique et le tuteur d’entreprise,
            réunis autour du même référentiel de compétences.
          </p>

          <div
            className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-8 flex flex-wrap items-center justify-center gap-3 duration-700 lg:justify-start"
            style={{ animationDelay: '0.44s' }}
          >
            <Link to="/login" className={buttonVariants({ size: 'lg' })}>
              Se connecter
            </Link>
            <Link to="/demo" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              Essayer la démo →
            </Link>
          </div>

          <div
            className="animate-in fade-in fill-mode-both mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 duration-700 lg:justify-start"
            style={{ animationDelay: '0.6s' }}
          >
            <VoiceDot color="var(--voice-auto)">Alternant</VoiceDot>
            <VoiceDot color="var(--voice-peda)">Tuteur école</VoiceDot>
            <VoiceDot color="var(--voice-entreprise)">Tuteur entreprise</VoiceDot>
          </div>
        </div>

        {/* ---- The living preview: le fil à trois voix ---- */}
        <div
          className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both duration-700"
          style={{ animationDelay: '0.5s' }}
        >
          <FilPreview />
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            Le fil à trois voix — chaque compétence, lue par le trinôme entier.
          </p>
        </div>
      </div>
    </main>
  );
}

function VoiceDot({ color, children }: { color: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-secondary-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

/* --- Static, animated vignette of the competences thread --------------------- */

const PREVIEW_ROWS: Array<{
  label: string;
  fill: number; // % of track achieved
  beads: Array<{ color: string; left: number; delay: number }>;
}> = [
  {
    label: 'Participer aux réunions clients',
    fill: 100,
    beads: [
      { color: 'var(--voice-auto)', left: 87, delay: 0.9 },
      { color: 'var(--voice-entreprise)', left: 81, delay: 1.15 },
      { color: 'var(--voice-peda)', left: 62, delay: 1.4 },
    ],
  },
  {
    label: 'Modéliser l’application et ses données',
    fill: 75,
    beads: [
      { color: 'var(--voice-auto)', left: 62, delay: 1.2 },
      { color: 'var(--voice-peda)', left: 56, delay: 1.45 },
      { color: 'var(--voice-entreprise)', left: 37, delay: 1.7 },
    ],
  },
  {
    label: 'Déployer et maintenir en production',
    fill: 50,
    beads: [
      { color: 'var(--voice-peda)', left: 37, delay: 1.5 },
      { color: 'var(--voice-auto)', left: 31, delay: 1.75 },
    ],
  },
];

const PREVIEW_LEVELS = ['NA', 'EC', 'A', 'M'];

function FilPreview() {
  return (
    <div className="rounded-2xl border border-hairline bg-card/95 p-5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-lg bg-brand-soft px-2.5 py-1 font-mono text-xs font-semibold text-brand-strong">
          BC02
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Concevoir et modéliser une application
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {PREVIEW_ROWS.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium">{row.label}</span>
            </div>
            <div className="relative h-[26px] rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--hairline)]">
              <span
                aria-hidden
                className="bar-fill absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${row.fill}%`,
                  background:
                    'linear-gradient(90deg, color-mix(in srgb, var(--voice-auto) 10%, transparent), color-mix(in srgb, var(--voice-auto) 26%, transparent))',
                  animationDelay: '0.8s',
                }}
              />
              <span aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-4">
                {PREVIEW_LEVELS.map((l, i) => (
                  <span
                    key={l}
                    className={i < 3 ? 'border-r border-dashed border-foreground/[0.07]' : ''}
                  />
                ))}
              </span>
              {row.beads.map((b) => (
                <span
                  key={b.color + b.left}
                  aria-hidden
                  className="absolute top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${b.left}%` }}
                >
                  <span
                    className="bead-pop absolute inset-0 rounded-full"
                    style={{
                      background: b.color,
                      boxShadow: '0 0 0 2.5px var(--card), 0 2px 6px rgba(20,23,33,0.12)',
                      animationDelay: `${b.delay}s`,
                    }}
                  />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        <span>Non acquis</span>
        <span>En cours</span>
        <span>Acquis</span>
        <span>Maîtrisé</span>
      </div>
    </div>
  );
}
