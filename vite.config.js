import { defineConfig } from 'vite';

// base relativa: el mismo build funciona en GitHub Pages (/reino-magico-gina/)
// y en local o cualquier otro hosting estático.
export default defineConfig({
  base: './',
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700, // Three.js ocupa ~500 kB por sí solo
  },
});
