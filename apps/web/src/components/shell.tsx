import type { ReactNode } from 'react';

export function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center text-muted-foreground">{children}</main>
  );
}

/** Full-page loading state — three voice-coloured beads breathing on a thread. */
export function CenteredLoading() {
  return (
    <Centered>
      <div className="flex flex-col items-center gap-3" role="status" aria-label="Chargement">
        <div className="relative flex h-4 w-16 items-center">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
          {(['--voice-auto', '--voice-peda', '--voice-entreprise'] as const).map((v, i) => (
            <span
              key={v}
              aria-hidden
              className="animate-float absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
              style={{
                left: `${i * 40 + 8}%`,
                background: `var(${v})`,
                animationDuration: '1.8s',
                animationDelay: `${i * 0.22}s`,
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium">Chargement…</span>
      </div>
    </Centered>
  );
}
