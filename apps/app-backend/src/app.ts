/**
 * Composable Fastify app — used by src/index.ts (listen) and Vitest (inject).
 */
import Fastify, { type FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type FulfillmentUpstream, createFulfillmentUpstream } from './fulfillmentUpstream.js'
import { registerFulfillmentRoutes } from './routes/fulfillment.js'
import { registerEventsRoutes } from './routes/events.js'
import { registerConsoleRoutes } from './routes/console.js'
import { registerCreateVmWizardRoutes } from './routes/createVmWizard.js'
import type { FulfillmentProxyRouteConfig } from './routes/fulfillmentProxyConfig.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export interface BuildAppOptions {
  apiMode: string
  fulfillmentApiUrl?: string
  /** When true, register static + SPA fallback if ../public exists (production image). */
  enableSpaStatic?: boolean
  nodeEnv?: string
  logger?: FastifyServerOptions['logger']
  /** Override TLS + fetch for fulfillment upstream (Vitest). */
  fulfillmentUpstream?: FulfillmentUpstream
  /** OSAC_WORKAROUND_REMOVE(static-bearer): TEMP_FULFILLMENT_STATIC_BEARER; remove option when no longer injected. */
  tempFulfillmentStaticBearer?: string
}

export async function buildApp(options: BuildAppOptions) {
  const {
    apiMode,
    fulfillmentApiUrl,
    enableSpaStatic = false,
    nodeEnv = process.env.NODE_ENV,
    logger = false,
    tempFulfillmentStaticBearer,
  } = options

  const fulfillmentUpstream =
    options.fulfillmentUpstream ??
    createFulfillmentUpstream({
      // FULFILLMENT_TLS_CA_FILE may remain for on-prem PKI in production.
      tlsCaFile: process.env.FULFILLMENT_TLS_CA_FILE?.trim(),
      // OSAC_WORKAROUND_REMOVE(tls-insecure): maps TEMP_FULFILLMENT_TLS_INSECURE; remove branch when never needed.
      tlsInsecure: process.env.TEMP_FULFILLMENT_TLS_INSECURE === '1',
      nodeEnv,
    })

  const proxyRouteConfig: FulfillmentProxyRouteConfig = {
    apiMode,
    fulfillmentApiUrl,
    fulfillmentFetch: fulfillmentUpstream.fetch,
    tempFulfillmentStaticBearer,
  }

  const app = Fastify({ logger })

  app.addHook('onClose', async () => {
    await fulfillmentUpstream.close()
  })

  // OSAC_WORKAROUND_REMOVE(cors-refine): reflect=true allows any dev origin; tighten to explicit allowlist when hosting is fixed.
  await app.register(cors, {
    origin: nodeEnv === 'production' ? false : true,
    credentials: true,
  })

  app.get('/health', async () => ({ status: 'ok', mode: apiMode }))
  app.get('/ready', async () => ({ status: 'ready' }))

  await registerFulfillmentRoutes(app, proxyRouteConfig)
  await registerEventsRoutes(app, proxyRouteConfig)
  await registerConsoleRoutes(app, proxyRouteConfig)
  await registerCreateVmWizardRoutes(app)

  const spaDistDir = join(__dirname, '..', 'public')
  if (enableSpaStatic && existsSync(spaDistDir)) {
    await app.register(staticFiles, {
      root: spaDistDir,
      prefix: '/',
    })
    app.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html')
    })
  }

  return app
}
