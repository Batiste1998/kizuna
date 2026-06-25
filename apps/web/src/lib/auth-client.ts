import { createAuthClient } from 'better-auth/react';
import { adminClient, organizationClient, twoFactorClient } from 'better-auth/client/plugins';

const apiURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * Better Auth browser client. Talks to the NestJS API over CORS with credentials,
 * mirroring the server plugins (organization / 2FA / admin).
 */
export const authClient = createAuthClient({
  baseURL: apiURL,
  basePath: '/api/auth',
  plugins: [organizationClient(), twoFactorClient(), adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
