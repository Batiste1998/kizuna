import { useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { signIn } from '#/lib/auth-client';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? 'Échec de la connexion');
      return;
    }
    toast.success('Connecté');
    void navigate({ to: '/app' });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar text-sm font-bold text-white">
              K
            </div>
            <span className="font-semibold">Kizuna</span>
          </div>
          <CardTitle className="mt-3">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace de suivi d’alternance.</CardDescription>
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

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-secondary-foreground">Comptes de démo</div>
            <div className="mt-1 font-mono">alternant@kizuna.dev · admin@kizuna.dev …</div>
            <div className="font-mono">mot de passe : Password123!</div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
