/**
 * Fail-fast checks before the BFF binds — avoids half-configured OSAC_API_MODE=dev.
 */

export function assertFulfillmentDevReady(
  apiMode: string,
  fulfillmentApiUrl: string | undefined,
): void {
  if (apiMode !== 'dev') return
  const base = fulfillmentApiUrl?.trim()
  if (!base) {
    throw new Error(
      'OSAC_API_MODE=dev requires a non-empty FULFILLMENT_API_URL (base URL of the fulfillment gateway, e.g. https://fulfillment.example.com).',
    )
  }
  let parsed: URL
  try {
    parsed = new URL(base)
  } catch {
    throw new Error(`FULFILLMENT_API_URL is not a valid URL: ${base}`)
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`FULFILLMENT_API_URL must use http: or https: (got ${parsed.protocol}).`)
  }
}
