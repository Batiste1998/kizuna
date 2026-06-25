import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.output/**',
      '**/.nitro/**',
      '**/.tanstack/**',
      '**/.turbo/**',
      '**/coverage/**',
      'maquettes/**',
      'packages/db/drizzle/**',
      '**/routeTree.gen.ts',
      '**/.output/**',
      '**/.nitro/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
