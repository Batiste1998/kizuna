import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Standalone Vitest config for unit tests — intentionally does NOT load the app
 * Vite config (TanStack Start plugin) so pure-logic tests stay fast and isolated.
 */
export default defineConfig({
  resolve: {
    alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Le harnais unitaire web cible la logique pure de src/lib (les composants
      // React et les routes sont couverts par les e2e Playwright).
      include: ['src/lib/**/*.ts'],
      // auth-client = câblage Better Auth sans logique ; use-count-up = hook
      // React exercé par les e2e Playwright.
      exclude: ['src/lib/**/*.test.ts', 'src/lib/auth-client.ts', 'src/lib/use-count-up.ts'],
      reporter: ['text-summary', 'html', 'lcov'],
      // Seuils bloquants (CI) — état mesuré : ~87 % stmts / ~87 % branches.
      thresholds: { statements: 80, branches: 80, functions: 85, lines: 80 },
    },
  },
});
