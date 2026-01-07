import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Polyfill global for Stellar SDK
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Polyfill buffer for Stellar SDK
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Define global for esbuild
      define: {
        global: 'globalThis',
      },
    },
  },
})
