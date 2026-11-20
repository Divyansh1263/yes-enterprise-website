import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8788'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https')
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https')
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https')
      },
      '/uploads': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https')
      }
    }
  }
})

