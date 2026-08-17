import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production build lands directly in LearningQuest/dist, served by the local Python
// server alongside /api and /content -- copy the whole LearningQuest folder anywhere
// and it just runs, no Node required at runtime.
export default defineConfig({
  plugins: [react()],
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
