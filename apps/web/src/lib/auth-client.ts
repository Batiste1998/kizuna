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

type SignInError = Awaited<ReturnType<typeof signIn.email>>['error'];

/**
 * Sign in with email/password and, on success, do a FULL navigation to `dest`
 * (a string, or a function resolving one — handy when the destination depends
 * on the freshly-authenticated session). The hard navigation is deliberate: it
 * lets the session store re-initialise from the fresh cookie — an SPA
 * transition can race the refresh and bounce back to /login. Returns the auth
 * error on failure (and stays on the page) so callers can surface it.
 */
export async function signInThenGo(
  email: string,
  password: string,
  dest: string | (() => string | Promise<string>),
): Promise<SignInError> {
  const { error } = await signIn.email({ email, password });
  if (error) return error;
  window.location.href = typeof dest === 'function' ? await dest() : dest;
  return null;
}
