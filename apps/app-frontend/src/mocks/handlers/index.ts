import { http, HttpResponse, passthrough } from 'msw'
import { fulfillmentHandlers } from './fulfillment'
import { eventsHandlers } from './events'
import { consoleHandlers } from './console'
import { wizardHandlers } from './wizard'

// In MSW v2, `onUnhandledRequest` only controls logging — the service worker
// still calls its own fetch()-based passthrough for every unmatched request,
// which throws "Failed to fetch" when there is no real backend.
// Two-tier catch-all:
//  1. /api/* requests that slipped through all specific handlers return 503 so
//     React Query gets a proper HTTP error instead of a network failure.
//  2. Everything else (Vite HMR, static assets, etc.) is truly passed through
//     to the browser's native network stack.
const apiCatchAll = http.all('/api/*', ({ request }) => {
  console.warn('[MSW] Unhandled API request:', request.url)
  return HttpResponse.json({ error: 'Not implemented in MSW' }, { status: 503 })
})
const passthroughHandler = http.all('*', () => passthrough())

export const handlers = [
  ...fulfillmentHandlers,
  ...eventsHandlers,
  ...consoleHandlers,
  ...wizardHandlers,
  apiCatchAll,
  passthroughHandler,
]
