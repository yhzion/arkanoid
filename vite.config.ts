import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'ES2020',
    outDir: 'dist',
  },
  server: {
    open: true,
  },
});
