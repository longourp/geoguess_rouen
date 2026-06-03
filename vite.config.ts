import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Served at https://<user>.github.io/geoguess_rouen/ on GitHub Pages.
// Change `base` to '/' for a user-page or custom domain, or assets will 404.
// https://vite.dev/config/
export default defineConfig({
  base: '/geoguess_rouen/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
