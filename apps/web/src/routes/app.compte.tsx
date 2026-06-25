import { useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { authClient } from '#/lib/auth-client';
import { useMe } from '#/lib/me-context';
import { roleLabelForMe } from '#/lib/nav';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';

export const Route = createFileRoute('/app/compte')({
  component: ComptePage,
});

function ComptePage() {
  const me = useMe();
  const [twoFAEnabled, setTwoFAEnabled] = useState(me.twoFactorEnabled);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Mon compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informations et sécurité de votre compte.
        </p>
      </div>

      <Card title="Informations">
        <div className="space-y-1 text-sm">
          <Row label="Nom" value={me.name} />
          <Row label="Email" value={me.email} />
          <Row label="Rôle" value={roleLabelForMe(me)} />
        </div>
      </Card>

      <Card title="Double authentification (2FA)">
        <TwoFactorSection enabled={twoFAEnabled} onChange={setTwoFAEnabled} />
      </Card>

      <Card title="Mot de passe">
        <PasswordSection />
      </Card>
    </div>
  );
}

function TwoFactorSection({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');

  async function startEnable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await authClient.twoFactor.enable({ password });
      if (error) throw new Error(error.message ?? 'Mot de passe incorrect');
      const uri = (data as { totpURI?: string })?.totpURI;
      setBackupCodes((data as { backupCodes?: string[] })?.backupCodes ?? []);
      if (uri) setQr(await QRCode.toDataURL(uri));
      setPassword('');
      toast.success('Scannez le QR code puis validez avec un code');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) throw new Error(error.message ?? 'Code invalide');
      setQr(null);
      setCode('');
      onChange(true);
      toast.success('Double authentification activée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) throw new Error(error.message ?? 'Mot de passe incorrect');
      setPassword('');
      onChange(false);
      toast.success('Double authentification désactivée');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (enabled) {
    return (
      <form onSubmit={disable} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          La 2FA est <span className="font-semibold text-foreground">activée</span> sur votre
          compte.
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe pour désactiver"
          />
          <Button type="submit" variant="outline" disabled={busy || !password}>
            Désactiver
          </Button>
        </div>
      </form>
    );
  }

  if (qr) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scannez ce QR code avec votre application d’authentification, puis saisissez le code à 6
          chiffres.
        </p>
        <img src={qr} alt="QR code 2FA" className="h-44 w-44 rounded-lg border border-border" />
        {backupCodes.length > 0 && (
          <div className="rounded-lg bg-muted p-3 text-xs">
            <div className="mb-1 font-semibold">Codes de secours (à conserver)</div>
            <div className="grid grid-cols-2 gap-1 font-mono">
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={verify} className="flex gap-2">
          <Input
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code à 6 chiffres"
          />
          <Button type="submit" disabled={busy || code.length < 6}>
            Valider
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={startEnable} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Renforcez la sécurité de votre compte avec une application d’authentification (TOTP).
      </p>
      <div className="flex gap-2">
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Votre mot de passe actuel"
        />
        <Button type="submit" disabled={busy || !password}>
          Activer la 2FA
        </Button>
      </div>
    </form>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message ?? 'Échec du changement de mot de passe');
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Mot de passe mis à jour');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Input
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Mot de passe actuel"
      />
      <Input
        type="password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Nouveau mot de passe (8 caractères min.)"
      />
      <Button type="submit" disabled={busy || !currentPassword || newPassword.length < 8}>
        Changer le mot de passe
      </Button>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
