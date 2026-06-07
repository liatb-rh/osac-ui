import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isMsw = process.env.VITE_MSW === 'true'
const base = process.env.VITE_BASE_URL ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@osac/api-contracts': resolve(__dirname, '../../libs/api-contracts/src/index.ts'),
      '@osac/ui-components': resolve(__dirname, '../../libs/ui-components/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    // OSAC_WORKAROUND_REMOVE(vite-dev-proxy): extra /health + /ready targets; drop if the SPA only hits /api or BFF serves same origin in dev.
    // Proxy is disabled in standalone (VITE_MSW=true) mode — MSW intercepts all /api requests in the browser.
    proxy: isMsw
      ? {}
      : {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/health': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/ready': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
  },
  optimizeDeps: {
    include: ['@patternfly/react-charts > victory-core'],
  },
  build: {
    outDir: isMsw ? 'dist' : '../app-backend/public',
    emptyOutDir: true,
  },
})
