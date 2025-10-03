import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'playwright-core'],
  },
  build: {
    rollupOptions: {
      external: [
        'playwright-core',
        'playwright',
        'chromium-bidi',
        'fs',
        'path',
        'crypto',
        'util',
        'stream',
        'events',
        'inspector',
        'net',
        'http',
        'https',
        'http2',
        'tls',
        'zlib',
        'url',
        'constants',
        'assert',
        'child_process',
        'readline',
        'dns',
        'os',
        'tty',
        'async_hooks'
      ],
    },
  },
  ssr: {
    external: ['playwright-core', 'playwright'],
  },
});