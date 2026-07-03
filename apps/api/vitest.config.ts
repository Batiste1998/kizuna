import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    root: './',
    setupFiles: ['./test/setup-env.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Exclus : bootstrap, seeds et modules DI (pas de logique), harnais de test.
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/seed-*.ts',
        'src/**/*.module.ts',
        'src/testing/**',
      ],
      reporter: ['text-summary', 'html', 'lcov'],
      // Seuils bloquants (CI) — état mesuré : ~68 % stmts / ~71 % branches.
      thresholds: { statements: 65, branches: 65, functions: 55, lines: 65 },
    },
  },
  plugins: [
    // SWC transform with decorator metadata so NestJS DI works under Vitest.
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
});
