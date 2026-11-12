import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/ronda/
  base: '/ronda/',
  build: {
    outDir: 'dist',
  },
});
