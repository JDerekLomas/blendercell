import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        rbc: resolve(__dirname, 'rbc.html'),
        cells: resolve(__dirname, 'cells.html'),
        macrophage: resolve(__dirname, 'macrophage.html'),
        muscle: resolve(__dirname, 'muscle.html'),
      },
    },
  },
});
