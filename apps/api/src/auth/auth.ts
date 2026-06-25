import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization, twoFactor } from 'better-auth/plugins';
import { schema, type Database } from '@kizuna/db';

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
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
    },
    // Cast works around an upstream type-merge imprecision between plugins'
    // databaseHooks in better-auth 1.6; runtime behaviour is unaffected.
    plugins: [twoFactor(), organization(), admin()] as BetterAuthPlugin[],
  });
}

export type Auth = ReturnType<typeof createAuth>;
