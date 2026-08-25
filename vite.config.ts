import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Shape Lab — local gymnastics coaching prototype
// Default port 43127 avoids clashing with common 3000/5173 setups.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 43127,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 43127,
    strictPort: true,
  },
})
