import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { reticle } from '@reticlehq/vite-plugin';

const API = 'http://localhost:6969'
const proxy = {
  '/api': { target: API, changeOrigin: true, secure: false },
  '/swagger-ui': { target: API, changeOrigin: true },
  '/v3/api-docs': { target: API, changeOrigin: true },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [reticle(), react()],
  server: { port: 5173, proxy },
  // Serves dist/ as static files. Expose this over a tunnel instead of the dev
  // server: 4 requests per page load vs ~180 unbundled modules.
  preview: { port: 4173, proxy },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
