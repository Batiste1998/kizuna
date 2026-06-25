import { createFileRoute, Link } from '@tanstack/react-router';
import { ROLES } from '#/lib/roles';
import { buttonVariants } from '#/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar text-xl font-bold text-white">
          K
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kizuna</h1>
          <p className="text-sm text-muted-foreground">La plateforme de suivi d’alternance</p>
        </div>
      </div>

      <p className="mt-8 max-w-xl text-center text-[15px] leading-relaxed text-secondary-foreground">
        Une identité par espace. Le trinôme alternant · tuteur pédagogique · tuteur d’entreprise,
        réuni autour du référentiel de compétences.
      </p>

      <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div
            key={role.key}
            data-role={role.key}
            className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
            <div className="mt-3 font-semibold">{role.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{role.tagline}</div>
          </div>
        ))}
      </div>

      <Link to="/login" className={buttonVariants({ className: 'mt-10' })}>
        Se connecter
      </Link>
    </main>
  );
}
