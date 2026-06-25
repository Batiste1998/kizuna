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
  },
});
