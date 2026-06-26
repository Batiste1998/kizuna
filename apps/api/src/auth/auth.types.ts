/**
 * Domain-facing shapes of the authenticated user/session.
 *
 * Defined explicitly (rather than inferred from Better Auth) so application code
 * stays decoupled from the library's internal plugin-merged inference. Fields map
 * to the Drizzle `user`/`session` tables incl. the admin & organization plugins.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  twoFactorEnabled?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  /** Active organization from the session (organization plugin), if any. */
  activeOrganizationId?: string | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  activeOrganizationId?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment Express.Request
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: AuthSession;
    }
  }
}

export {};
