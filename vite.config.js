import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: 'web',
  plugins: [svelte()],
  build: {
    outDir: '../web/dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:9999',
      '/ws': { target: 'ws://localhost:9999', ws: true }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./web/src/test-setup.js'],
    include: ['src/**/*.test.js']
  }
});
