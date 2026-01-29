import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Development server configuration
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Development: point to local backend
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  
  // Build configuration for production
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
  },
  
  // Environment-specific API URL
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:8000/api'),
  },
})

