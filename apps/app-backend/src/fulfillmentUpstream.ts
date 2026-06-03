/**
 * Upstream HTTP(S) to fulfillment — scoped TLS options for private PKI (Undici Agent).
 *
 * OSAC_WORKAROUND_REMOVE(tls-insecure):
 * TEMP_FULFILLMENT_TLS_INSECURE is dev-only (curl -k equivalent); delete that path when all targets use proper CA trust.
 */
import { readFileSync } from 'node:fs'
import { Agent, fetch as undiciFetch } from 'undici'
import type { ConnectionOptions } from 'node:tls'

/**
 * Subset of `fetch` used by the BFF proxy.
 * OSAC_WORKAROUND_REMOVE(undici-types): casts below bridge Undici vs DOM types; simplify if packages align.
 */
export type FulfillmentUpstreamFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export interface FulfillmentUpstream {
  fetch: FulfillmentUpstreamFetch
  close: () => Promise<void>
}

export function createFulfillmentUpstream(options: {
  tlsCaFile?: string
  tlsInsecure: boolean
  nodeEnv?: string
}): FulfillmentUpstream {
  const { tlsCaFile, tlsInsecure, nodeEnv } = options
  const caPath = tlsCaFile?.trim()

  if (!caPath && !tlsInsecure) {
    return {
      fetch: globalThis.fetch.bind(globalThis) as FulfillmentUpstreamFetch,
      close: async () => {},
    }
  }

  if (tlsInsecure && nodeEnv === 'production') {
    throw new Error('TEMP_FULFILLMENT_TLS_INSECURE cannot be enabled when NODE_ENV is production.')
  }

  const connect: ConnectionOptions = {}
  if (caPath) {
    connect.ca = readFileSync(caPath)
  } else if (tlsInsecure) {
    // OSAC_WORKAROUND_REMOVE(tls-insecure)
    connect.rejectUnauthorized = false
  }

  const agent = new Agent({ connect })

  return {
    fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
      undiciFetch(
        input as never,
        { ...init, dispatcher: agent } as never,
      )) as unknown as FulfillmentUpstreamFetch,
    close: () => agent.close(),
  }
}
