import { defineConfig } from 'vite';

// GitHub Pages serves the site under /<repo>/; local dev stays at /.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/paper-asteroids/' : '/',
});
