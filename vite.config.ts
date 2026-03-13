import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer')
    }
  }
});
