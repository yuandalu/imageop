import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3080',
        changeOrigin: true
      },
      '/compressed': {
        target: 'http://localhost:3080',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
