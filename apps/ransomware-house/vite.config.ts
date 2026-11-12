import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the build works under any GitHub Pages path
  // (https://<user>.github.io/<repo>/) without knowing the repository name.
  base: './',
  build: {
    outDir: 'dist',
  },
});
