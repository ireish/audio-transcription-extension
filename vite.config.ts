import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  define: {
    // Add polyfills for Node 18 compatibility
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      input: {
        // CRXJS will automatically handle these based on manifest.json
        // No need to manually specify popup.html, side_panel.html etc.
      }
    }
  }
})
