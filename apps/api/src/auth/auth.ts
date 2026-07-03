import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization, twoFactor } from 'better-auth/plugins';
import { schema, type Database } from '@kizuna/db';
import { mailLayout as layout } from '../mail/mail-layout';

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
      // 24h so that invitation links (below) survive until the invitee opens their inbox.
      resetPasswordTokenExpiresIn: 60 * 60 * 24,
      sendResetPassword: async ({ user, url }) => {
        // Admin-created accounts reuse the reset flow as an invitation: the
        // redirectTo carries an `invitation=1` marker (URL-encoded inside callbackURL).
        const isInvitation = url.includes('invitation%3D1') || url.includes('invitation=1');
        if (isInvitation) {
          await opts.mailer?.sendMail({
            to: user.email,
            subject: 'Bienvenue sur Kizuna — activez votre compte',
            html: layout(
              'Bienvenue sur Kizuna',
              `Bonjour ${user.name || ''}, un compte vient d'être créé pour vous sur Kizuna, la plateforme de suivi d'alternance. Choisissez votre mot de passe pour vous connecter (lien valable 24 h).`,
              { url, label: 'Définir mon mot de passe' },
            ),
            text: `Votre compte Kizuna est prêt. Définissez votre mot de passe : ${url}`,
          });
          return;
        }
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
