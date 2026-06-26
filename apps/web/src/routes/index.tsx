import { createFileRoute, Link } from '@tanstack/react-router';
import { buttonVariants } from '#/components/ui/button';
import { Logo } from '#/components/logo';
import { StageAuras } from '#/components/stage-auras';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="demo-stage relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
      <StageAuras />

      {/* Oversized 絆 watermark, the bond made backdrop. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[42vw] leading-none font-bold text-foreground/[0.02] select-none"
      >
        絆
      </span>

      <div className="relative flex flex-col items-center text-center">
        <div className="animate-in fade-in zoom-in-95 fill-mode-both duration-700">
          <Logo className="animate-float h-20 w-20" chip={false} />
        </div>

        <p
          className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-7 inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase shadow-sm backdrop-blur-sm duration-700"
          style={{ animationDelay: '0.1s' }}
        >
          絆 · le lien du trinôme
        </p>

        <h1
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-6 font-display text-6xl font-bold tracking-tight duration-700 sm:text-7xl"
          style={{ animationDelay: '0.2s' }}
        >
          Kizuna
        </h1>

        <p
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-secondary-foreground duration-700"
          style={{ animationDelay: '0.32s' }}
        >
          Une identité par espace. L’alternant, le tuteur pédagogique et le tuteur d’entreprise,
          réunis autour du même référentiel de compétences.
        </p>

        <div
          className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-9 flex flex-wrap items-center justify-center gap-3 duration-700"
          style={{ animationDelay: '0.44s' }}
        >
          <Link to="/login" className={buttonVariants({ size: 'lg' })}>
            Se connecter
          </Link>
          <Link to="/demo" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            Essayer la démo →
          </Link>
        </div>
      </div>
    </main>
  );
}
