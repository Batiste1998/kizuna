import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signIn } from '#/lib/auth-client';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Wordmark } from '#/components/logo';
import { StageAuras } from '#/components/stage-auras';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message ?? 'Échec de la connexion');
      return;
    }
    // Full navigation so the session store is initialised fresh from the new cookie —
    // an SPA transition can race the session refresh and bounce back to /login.
    window.location.href = '/app';
  }

  return (
    <main
      data-role="alternant"
      className="demo-stage relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16"
    >
      <StageAuras />

      {/* Same backdrop as the portal — the bond, watermarked. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[38vw] leading-none font-bold text-foreground/[0.02] select-none"
      >
        絆
      </span>

      <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both relative w-full max-w-md duration-700">
        <div className="mb-5 flex justify-center">
          <Wordmark tagline="絆 · le lien du trinôme" />
        </div>

        <Card className="relative overflow-hidden shadow-lg ring-1 ring-black/5">
          {/* The fil, resting on top of the card — one bead per voice. */}
          <span aria-hidden className="absolute inset-x-0 top-0 flex h-[3px]">
            <span className="flex-1" style={{ background: 'var(--voice-auto)' }} />
            <span className="flex-1" style={{ background: 'var(--voice-peda)' }} />
            <span className="flex-1" style={{ background: 'var(--voice-entreprise)' }} />
          </span>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Retrouvez votre fil — compétences, journal, bilans du trinôme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>

            <p className="mt-3 text-center text-xs">
              <Link to="/forgot-password" className="text-brand hover:underline">
                Mot de passe oublié ?
              </Link>
            </p>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-brand">
                ← Retour à l’accueil
              </Link>
            </p>

            <div className="mt-6 border-t border-hairline pt-4 text-center text-xs text-muted-foreground">
              Pas de compte ?{' '}
              <Link to="/demo" className="font-medium text-brand hover:underline">
                Découvrir la démo →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
