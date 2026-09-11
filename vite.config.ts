import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { instagramResolvePlugin } from './server/igPlugin.ts'

// Shape Lab — local gymnastics coaching prototype
// Default port 43127 avoids clashing with common 3000/5173 setups.
export default defineConfig({
  plugins: [react(), tailwindcss(), instagramResolvePlugin()],
  // iPad Air 2 tops out at iOS 15 / Safari 15. Default Vite 8 targets skip that.
  build: {
    target: ['es2020', 'safari15'],
    cssMinify: 'esbuild',
  },
  server: {
    host: true,
    port: 43127,
    strictPort: true,
    allowedHosts: true,
    headers: {
      'Cache-Control': 'no-store',
    },
    watch: {
      // Writing the Compare library must not full-reload the preview.
      ignored: ['**/data/**', '**/src/config/compareLibrary.json'],
    },
  },
  preview: {
    host: true,
    port: 43127,
    strictPort: true,
    allowedHosts: true,
  },
})
