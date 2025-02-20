import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
