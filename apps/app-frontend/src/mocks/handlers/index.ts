import { http, passthrough } from 'msw'
import { fulfillmentHandlers } from './fulfillment'
import { eventsHandlers } from './events'
import { consoleHandlers } from './console'
import { wizardHandlers } from './wizard'

// In MSW v2, `onUnhandledRequest` only controls logging — the service worker
// still calls its own fetch()-based passthrough for every unmatched request,
// which throws "Failed to fetch" when there is no real backend.
// This catch-all handler is placed LAST so it only fires for requests that
// no other handler matched. Returning the MSW `passthrough()` response helper
// tells the service worker to hand the request back to the browser's native
// network stack (Vite handles SPA navigation, static assets, HMR, etc.)
// without the service worker calling fetch() itself.
const passthroughHandler = http.all('*', () => passthrough())

export const handlers = [
  ...fulfillmentHandlers,
  ...eventsHandlers,
  ...consoleHandlers,
  ...wizardHandlers,
  passthroughHandler,
]
