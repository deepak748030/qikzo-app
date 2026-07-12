import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    // Split heavy vendor libs out of the main bundle so route chunks
    // stay tiny and browser caches survive app-code changes.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  esbuild: {
    // Strip console + debugger from production bundles.
    drop: ['debugger'],
    pure: ['console.log', 'console.debug'],
  },
});
