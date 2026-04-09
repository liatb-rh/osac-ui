import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import express from 'express'
import { createMockApiRouters } from './server/mock-api.js'
import { registerCatalogApi } from './server/catalog-api.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const standaloneMock = env.VITE_STANDALONE_MOCK === 'true'

  return {
  plugins: [
    react(),
    standaloneMock && {
      name: 'osac-standalone-mock-api',
      configureServer(server) {
        const app = express()
        app.use(express.json({ limit: '2mb' }))
        const { fulfillment, private: privateRouter } = createMockApiRouters()
        app.use('/api/fulfillment/v1', fulfillment)
        app.use('/api/private/v1', privateRouter)
        registerCatalogApi(app)
        server.middlewares.use(app)
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'patternfly': ['@patternfly/react-core', '@patternfly/react-icons'],
          'i18n': ['i18next', 'react-i18next'],
        },
      },
    },
    // Increase chunk size warning limit since we're using code splitting
    chunkSizeWarningLimit: 600,
  },
  }
})
