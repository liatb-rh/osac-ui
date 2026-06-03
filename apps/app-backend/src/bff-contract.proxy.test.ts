import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from './app.js'

const UPSTREAM = 'https://fulfillment.test.example'

/** Integration tests for the dev proxy, including OSAC_WORKAROUND_REMOVE(static-bearer) paths. */
describe('BFF dev proxy (integration contract)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('forwards GET /api/fulfillment/v1/* to FULFILLMENT_API_URL with Authorization', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(`${UPSTREAM}/api/fulfillment/v1/capabilities`)
      expect(init?.headers).toBeDefined()
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer test-jwt')
      return new Response(JSON.stringify({ authn: { trustedTokenIssuers: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/capabilities',
      headers: { authorization: 'Bearer test-jwt' },
    })
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.headers['content-type']).toContain('application/json')
    await app.close()
  })

  it('forwards PATCH /api/fulfillment/v1/compute_instances/:id to upstream with Authorization', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(`${UPSTREAM}/api/fulfillment/v1/compute_instances/vm-stop-1`)
      expect(init?.method).toBe('PATCH')
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer test-jwt')
      const body = JSON.parse(String(init?.body)) as { spec: { run_strategy: string } }
      expect(body.spec.run_strategy).toBe('Halted')
      return new Response(
        JSON.stringify({
          object: { id: 'vm-stop-1', status: { state: 'COMPUTE_INSTANCE_STATE_STOPPED' } },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
    })
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/fulfillment/v1/compute_instances/vm-stop-1',
      headers: { authorization: 'Bearer test-jwt', 'content-type': 'application/json' },
      payload: {
        spec: { run_strategy: 'Halted' },
        status: { state: 'COMPUTE_INSTANCE_STATE_STOPPED' },
      },
    })
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('forwards DELETE /api/fulfillment/v1/compute_instances/:id to upstream with Authorization', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(`${UPSTREAM}/api/fulfillment/v1/compute_instances/vm-del-1`)
      expect(init?.method).toBe('DELETE')
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer test-jwt')
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
    })
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/fulfillment/v1/compute_instances/vm-del-1',
      headers: { authorization: 'Bearer test-jwt' },
    })
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('forwards GET /api/events/v1/* to upstream', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ items: [], size: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/v1/events',
      headers: { authorization: 'Bearer t' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [eventsUrl] = fetchMock.mock.calls[0] as unknown as [string]
    expect(String(eventsUrl)).toBe(`${UPSTREAM}/api/events/v1/events`)
    await app.close()
  })

  it('forwards GET /api/osac/public/v1/* to upstream', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ available: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/osac/public/v1/console/CONSOLE_RESOURCE_TYPE_COMPUTE_INSTANCE/x/access',
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    const [consoleUrl] = fetchMock.mock.calls[0] as unknown as [string]
    expect(String(consoleUrl)).toBe(
      `${UPSTREAM}/api/osac/public/v1/console/CONSOLE_RESOURCE_TYPE_COMPUTE_INSTANCE/x/access`,
    )
    await app.close()
  })

  it('proxies non-JSON upstream responses without parsing (status + content-type)', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response('not-json', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/events/v1/events',
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/plain')
    // light-my-request does not aggregate Node streams from reply.send(Readable); assert wiring only.
    expect(fetchMock).toHaveBeenCalled()
    await app.close()
  })

  it('TEMP_FULFILLMENT_STATIC_BEARER fills Authorization when client omits it (not on GET capabilities)', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toContain(`${UPSTREAM}/api/fulfillment/v1/organizations`)
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer static-dev')
      return new Response(JSON.stringify({ items: [], size: 0, total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
      tempFulfillmentStaticBearer: 'static-dev',
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/organizations',
    })
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('does not send TEMP_FULFILLMENT_STATIC_BEARER on GET /api/fulfillment/v1/capabilities', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBeNull()
      return new Response(JSON.stringify({ authn: { trustedTokenIssuers: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
      tempFulfillmentStaticBearer: 'static-dev',
    })
    await app.inject({ method: 'GET', url: '/api/fulfillment/v1/capabilities' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('TEMP_FULFILLMENT_STATIC_BEARER replaces empty Bearer from client', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer static-dev')
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
      tempFulfillmentStaticBearer: 'static-dev',
    })
    await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/organizations',
      headers: { authorization: 'Bearer ' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('TEMP_FULFILLMENT_STATIC_BEARER_FORCE replaces client Bearer on non-capabilities routes', async () => {
    const prev = process.env.TEMP_FULFILLMENT_STATIC_BEARER_FORCE
    process.env.TEMP_FULFILLMENT_STATIC_BEARER_FORCE = '1'
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer static-dev')
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
      tempFulfillmentStaticBearer: 'static-dev',
    })
    try {
      await app.inject({
        method: 'GET',
        url: '/api/fulfillment/v1/organizations',
        headers: { authorization: 'Bearer from-client' },
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      if (prev === undefined) delete process.env.TEMP_FULFILLMENT_STATIC_BEARER_FORCE
      else process.env.TEMP_FULFILLMENT_STATIC_BEARER_FORCE = prev
      await app.close()
    }
  })

  it('does not override client Authorization when TEMP_FULFILLMENT_STATIC_BEARER is set', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers as HeadersInit)
      expect(headers.get('Authorization')).toBe('Bearer from-client')
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const app = await buildApp({
      apiMode: 'dev',
      fulfillmentApiUrl: UPSTREAM,
      logger: false,
      tempFulfillmentStaticBearer: 'static-dev',
    })
    await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/capabilities',
      headers: { authorization: 'Bearer from-client' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })
})
