import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'
import { resetMockVmStore } from './mock-vm-store.js'

describe('BFF mock mode (integration contract)', () => {
  afterEach(() => {
    resetMockVmStore()
  })

  it('GET /health reports mode=mock', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok', mode: 'mock' })
    await app.close()
  })

  it('GET /api/fulfillment/v1/capabilities matches stub shape (trustedTokenIssuers array)', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const res = await app.inject({ method: 'GET', url: '/api/fulfillment/v1/capabilities' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('authn')
    expect(Array.isArray(body.authn.trustedTokenIssuers)).toBe(true)
    await app.close()
  })

  it('GET /api/fulfillment/v1/compute_instance_templates returns page envelope', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const res = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instance_templates',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.size).toBe('number')
    expect(typeof body.total).toBe('number')
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    await app.close()
  })

  it('GET /api/fulfillment/v1/compute_instance_templates supports filter and paging', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const all = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instance_templates',
    })
    const total = all.json().total
    const filtered = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instance_templates?filter=rhel',
    })
    expect(filtered.statusCode).toBe(200)
    const fb = filtered.json()
    expect(fb.total).toBeLessThanOrEqual(total)
    expect(
      fb.items.every((it) => {
        const row = it as { title?: string; description?: string }
        const hay = `${row.title ?? ''} ${row.description ?? ''}`.toLowerCase()
        return hay.includes('rhel')
      }),
    ).toBe(true)

    const page = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instance_templates?limit=1&offset=0',
    })
    expect(page.statusCode).toBe(200)
    const pb = page.json()
    expect(pb.size).toBe(1)
    expect(pb.total).toBe(total)
    await app.close()
  })

  it('GET /api/fulfillment/v1/compute_instance_templates/:id returns template or 404', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const list = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instance_templates?limit=1',
    })
    const id = list.json().items[0]?.id
    expect(id).toBeTruthy()
    const ok = await app.inject({
      method: 'GET',
      url: `/api/fulfillment/v1/compute_instance_templates/${encodeURIComponent(id)}`,
    })
    expect(ok.statusCode).toBe(200)
    expect(ok.json().id).toBe(id)

    const missing = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instance_templates/__no_such_template__',
    })
    expect(missing.statusCode).toBe(404)
    await app.close()
  })

  it('PATCH /api/fulfillment/v1/compute_instances/:id stop updates mock VM state', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const list = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instances?limit=1',
    })
    const item = list.json().items[0]
    expect(item?.id).toBeTruthy()

    const patch = await app.inject({
      method: 'PATCH',
      url: `/api/fulfillment/v1/compute_instances/${encodeURIComponent(item.id)}`,
      payload: {
        spec: { run_strategy: 'Halted' },
        status: { state: 'COMPUTE_INSTANCE_STATE_STOPPED' },
      },
    })
    expect(patch.statusCode).toBe(200)
    const body = patch.json()
    expect(body.object.status.state).toBe('stopped')
    expect(body.object.spec.runStrategy).toBe('Halted')
    await app.close()
  })

  it('DELETE /api/fulfillment/v1/compute_instances/:id removes VM from mock store', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const list = await app.inject({
      method: 'GET',
      url: '/api/fulfillment/v1/compute_instances?limit=1',
    })
    const id = list.json().items[0]?.id
    expect(id).toBeTruthy()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/fulfillment/v1/compute_instances/${encodeURIComponent(id)}`,
    })
    expect(del.statusCode).toBe(200)

    const get = await app.inject({
      method: 'GET',
      url: `/api/fulfillment/v1/compute_instances/${encodeURIComponent(id)}`,
    })
    expect(get.statusCode).toBe(404)

    const missing = await app.inject({
      method: 'DELETE',
      url: '/api/fulfillment/v1/compute_instances/__no_such_vm__',
    })
    expect(missing.statusCode).toBe(404)
    await app.close()
  })

  it('GET /api/events/v1/events returns paginated mock feed', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const res = await app.inject({ method: 'GET', url: '/api/events/v1/events?limit=5&offset=0' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.size).toBe(5)
    expect(body.total).toBeGreaterThan(0)
    expect(body.items).toHaveLength(5)
    await app.close()
  })

  it('GET console access returns availability envelope', async () => {
    const app = await buildApp({ apiMode: 'mock', logger: false })
    const res = await app.inject({
      method: 'GET',
      url: '/api/osac/public/v1/console/CONSOLE_RESOURCE_TYPE_COMPUTE_INSTANCE/vm-1/access',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.available).toBe(true)
    expect(body.supportedTypes).toContain('serial')
    await app.close()
  })
})
