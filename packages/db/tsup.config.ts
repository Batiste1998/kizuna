import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    schema: 'src/schema/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // drizzle-orm / postgres stay external (resolved from node_modules at runtime)
  external: ['drizzle-orm', 'postgres'],
});
