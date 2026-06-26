import { createFileRoute, Link } from '@tanstack/react-router';
import { ROLES } from '#/lib/roles';
import { buttonVariants } from '#/components/ui/button';
import { Logo } from '#/components/logo';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-soft opacity-70 blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <Logo className="h-24 w-24" chip={false} />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Kizuna</h1>
        <p className="mt-3 text-sm font-medium tracking-wide text-muted-foreground">
          絆 — le lien du trinôme d’alternance
        </p>

        <p className="mt-7 max-w-xl text-balance text-[15px] leading-relaxed text-secondary-foreground">
          Une identité par espace. L’alternant, le tuteur pédagogique et le tuteur d’entreprise,
          réunis autour du même référentiel de compétences.
        </p>
      </div>

      <div className="relative mt-12 grid w-full grid-cols-2 gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div
            key={role.key}
            data-role={role.key}
            className="group rounded-2xl border border-hairline bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
            <div className="mt-4 font-semibold">{role.label}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{role.tagline}</div>
          </div>
        ))}
      </div>

      <Link to="/login" className={buttonVariants({ size: 'lg', className: 'relative mt-12' })}>
        Se connecter
      </Link>
    </main>
  );
}
