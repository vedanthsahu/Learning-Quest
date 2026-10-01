import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// Production build lands directly in LearningQuest/dist, served by the local Python
// server alongside /api and /content -- copy the whole LearningQuest folder anywhere
// and it just runs, no Node required at runtime.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The space flight (src/flight) keeps the "@/lib/..." imports of the
    // space-portfolio code it was adapted from.
    alias: { '@': fileURLToPath(new URL('./src/flight', import.meta.url)) },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8642',
      '/content': 'http://localhost:8642',
    },
  },
})
