import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// GitHub Pages serves the site under /<repo>/; local dev stays at /.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/paper-asteroids/' : '/',
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play/index.html'),
      },
    },
  },
});
