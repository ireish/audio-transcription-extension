import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json'

// https://vite.dev/config/
export default defineConfig({
  // Ensure relative asset paths inside the extension package
  base: '',
  // Default to production when building (can still be overridden by CLI)
  mode: 'production',
  plugins: [
    react(),
    crx({ manifest })
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
    },
  },
  define: {
    // Add polyfills for Node 18 compatibility
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: 'sidepanel.html',
        offscreen: 'offscreen.html',
        // CRXJS will automatically handle these based on manifest.json
        // No need to manually specify popup.html, side_panel.html etc.
      }
    }
  }
})
