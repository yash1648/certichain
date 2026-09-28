import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { reticle } from '@reticlehq/vite-plugin';
// https://vite.dev/config/
export default defineConfig({
  plugins: [reticle(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:6969',
        changeOrigin: true,
        secure: false,
      },
      '/swagger-ui': {
        target: 'http://localhost:6969',
        changeOrigin: true,
      },
      '/v3/api-docs': {
        target: 'http://localhost:6969',
        changeOrigin: true,
      }
    }
  }
})
