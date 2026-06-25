import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization, twoFactor } from 'better-auth/plugins';
import { schema, type Database } from '@kizuna/db';

export interface Mailer {
  sendMail(message: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void>;
}

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  /** Optional email sender — wires password reset & email verification. */
  mailer?: Mailer;
}

function layout(title: string, body: string, cta?: { url: string; label: string }) {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#1b1b19">${title}</h2>
    <p style="color:#44443f;line-height:1.5">${body}</p>
    ${
      cta
        ? `<p><a href="${cta.url}" style="display:inline-block;background:#2e9e82;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a></p>
    <p style="color:#76766f;font-size:12px">Ou copiez ce lien : ${cta.url}</p>`
        : ''
    }
    <p style="color:#76766f;font-size:12px;margin-top:24px">Kizuna — suivi d'alternance</p>
  </div>`;
}

/**
 * Better Auth instance for Kizuna.
 *
 * - Drizzle adapter bound to the shared @kizuna/db schema (same Postgres as the API).
 * - emailAndPassword: primary credential flow.
 * - twoFactor: TOTP + backup codes (Bloc 4 — authentification robuste).
 * - organization: an organization IS an établissement; members carry the
 *   business roles (admin / tuteur_pedagogique / tuteur_entreprise / alternant).
 * - admin: platform-level roles (super_admin / support) on user.role.
 */
export function createAuth(opts: CreateAuthOptions) {
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    basePath: '/api/auth',
    trustedOrigins: opts.trustedOrigins,
    database: drizzleAdapter(opts.db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        await opts.mailer?.sendMail({
          to: user.email,
          subject: 'Réinitialisation de votre mot de passe Kizuna',
          html: layout(
            'Réinitialisation du mot de passe',
            'Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire sous peu.',
            { url, label: 'Choisir un nouveau mot de passe' },
          ),
          text: `Réinitialisez votre mot de passe : ${url}`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await opts.mailer?.sendMail({
          to: user.email,
          subject: 'Vérifiez votre adresse email',
          html: layout(
            'Bienvenue sur Kizuna',
            'Confirmez votre adresse email pour activer votre compte.',
            { url, label: 'Vérifier mon email' },
          ),
          text: `Vérifiez votre adresse email : ${url}`,
        });
      },
    },
    // Cast works around an upstream type-merge imprecision between plugins'
    // databaseHooks in better-auth 1.6; runtime behaviour is unaffected.
    plugins: [twoFactor(), organization(), admin()] as BetterAuthPlugin[],
  });
}

export type Auth = ReturnType<typeof createAuth>;
