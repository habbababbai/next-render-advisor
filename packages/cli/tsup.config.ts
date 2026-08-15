import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  minify: true,
  clean: true,
  outDir: 'dist',
});
