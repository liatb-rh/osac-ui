/**
 * BFF fulfillment routes — in OSAC_API_MODE=dev with FULFILLMENT_API_URL, proxy upstream; else mock.
 * Startup requires FULFILLMENT_API_URL when mode is dev (see assertFulfillmentDevReady in index.ts).
 *
 * Mock paths:
 *   GET  /api/fulfillment/v1/capabilities           → mock capabilities
 *   GET  /api/fulfillment/v1/compute_instance_templates     → mock VM template list
 *   GET  /api/fulfillment/v1/compute_instance_templates/:id → mock VM template detail
 *   GET  /api/fulfillment/v1/compute_instances       → mock VM list
 *   GET  /api/fulfillment/v1/compute_instances/:id   → mock VM detail
 *   POST /api/fulfillment/v1/compute_instances       → mock VM create
 *   PATCH /api/fulfillment/v1/compute_instances/:id  → mock VM update
 *   DELETE /api/fulfillment/v1/compute_instances/:id → mock VM delete
 *   GET  /api/fulfillment/v1/organizations           → mock org list
 *   GET  /api/fulfillment/v1/clusters                → mock cluster list
 *   GET  /api/fulfillment/v1/virtual_networks        → mock VN list
 *   GET  /api/fulfillment/v1/subnets                 → mock subnet list
 *   GET  /api/fulfillment/v1/security_groups         → mock SG list
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { DEMO_ORGANIZATIONS, VM_TEMPLATES, normalizeComputeInstance } from '@osac/api-contracts'
import type { ComputeInstance } from '@osac/api-contracts'
import { vmStore } from '../mock-vm-store.js'
import type { FulfillmentProxyRouteConfig } from './fulfillmentProxyConfig.js'
import { proxyToUpstream } from './upstreamProxy.js'

function asNestedRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function vmTemplatesListPage(req: FastifyRequest): {
  size: number
  total: number
  items: typeof VM_TEMPLATES
} {
  const query = req.query as { filter?: string; limit?: string; offset?: string }
  const limit = parseInt(query.limit ?? '50', 10)
  const offset = parseInt(query.offset ?? '0', 10)
  const filter = query.filter?.toLowerCase() ?? ''
  const filtered = filter
    ? VM_TEMPLATES.filter(
        (t) =>
          t.title.toLowerCase().includes(filter) ||
          (t.description ?? '').toLowerCase().includes(filter),
      )
    : VM_TEMPLATES
  const page = filtered.slice(offset, offset + limit)
  return { size: page.length, total: filtered.length, items: page }
}

export async function registerFulfillmentRoutes(
  app: FastifyInstance,
  config: FulfillmentProxyRouteConfig,
) {
  const { apiMode, fulfillmentApiUrl, fulfillmentFetch, tempFulfillmentStaticBearer } = config
  const prefix = '/api/fulfillment/v1'

  if (apiMode === 'dev' && fulfillmentApiUrl) {
    // Dev upstream proxy (see upstreamProxy.ts for OSAC_WORKAROUND_REMOVE: buffer body, static bearer, etc.).
    app.all(`${prefix}/*`, async (req, reply) => {
      await proxyToUpstream(req, reply, fulfillmentApiUrl, {
        fetchImpl: fulfillmentFetch,
        staticBearer: tempFulfillmentStaticBearer,
      })
    })
    return
  }

  // -------------------------------------------------------------------------
  // Mock handlers
  // -------------------------------------------------------------------------

  app.get(`${prefix}/capabilities`, async () => ({
    authn: {
      trustedTokenIssuers: [],
    },
  }))

  app.get(`${prefix}/compute_instance_templates`, async (req) => vmTemplatesListPage(req))

  app.get(`${prefix}/compute_instance_templates/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const tpl = VM_TEMPLATES.find((t) => t.id === id)
    if (!tpl) return reply.status(404).send({ error: 'Not found' })
    return tpl
  })

  app.get(`${prefix}/compute_instances`, async (req) => {
    const query = req.query as { filter?: string; limit?: string; offset?: string }
    const limit = parseInt(query.limit ?? '100', 10)
    const offset = parseInt(query.offset ?? '0', 10)
    const filter = query.filter?.toLowerCase() ?? ''
    const all = Array.from(vmStore.values())
    const filtered = filter
      ? all.filter(
          (vm) =>
            vm.metadata.name.toLowerCase().includes(filter) ||
            vm.status.state.toLowerCase().includes(filter),
        )
      : all
    const page = filtered.slice(offset, offset + limit)
    return { size: page.length, total: filtered.length, items: page }
  })

  app.get(`${prefix}/compute_instances/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const vm = vmStore.get(id)
    if (!vm) return reply.status(404).send({ error: 'Not found' })
    return vm
  })

  app.post(`${prefix}/compute_instances`, async (req, reply) => {
    const body = req.body as Record<string, unknown> | undefined
    if (!body || typeof body !== 'object') return reply.status(400).send({ error: 'Missing body' })
    /** Match live gateway: bare ComputeInstance JSON. Accept legacy `{ object }` for older clients/tests. */
    const incoming =
      'object' in body && body.object && typeof body.object === 'object'
        ? (body.object as Record<string, unknown>)
        : body
    const merged = {
      ...incoming,
      id: `vm-created-${Date.now()}`,
      metadata: {
        ...asNestedRecord(incoming.metadata),
        creation_timestamp: new Date().toISOString(),
      },
      spec: { ...asNestedRecord(incoming.spec) },
      status: {
        state: 'COMPUTE_INSTANCE_STATE_STARTING',
        ...asNestedRecord(incoming.status),
      },
    }
    const vm = normalizeComputeInstance(merged)
    vmStore.set(vm.id, vm)
    return { object: vm }
  })

  app.patch(`${prefix}/compute_instances/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = vmStore.get(id)
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Partial<ComputeInstance>
    const merged = {
      ...existing,
      ...body,
      spec: { ...existing.spec, ...(body.spec ?? {}) },
      status: { ...existing.status, ...(body.status ?? {}) },
      metadata: { ...existing.metadata, ...(body.metadata ?? {}) },
    }
    const updated = normalizeComputeInstance(merged as unknown)
    vmStore.set(id, updated)
    return { object: updated }
  })

  app.delete(`${prefix}/compute_instances/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    if (!vmStore.has(id)) return reply.status(404).send({ error: 'Not found' })
    vmStore.delete(id)
    return {}
  })

  app.get(`${prefix}/organizations`, async () => {
    return {
      size: DEMO_ORGANIZATIONS.length,
      total: DEMO_ORGANIZATIONS.length,
      items: DEMO_ORGANIZATIONS,
    }
  })

  app.get(`${prefix}/clusters`, async () => {
    return {
      size: 2,
      total: 2,
      items: DEMO_ORGANIZATIONS.map((o) => ({ id: o.id, name: o.displayName })),
    }
  })

  app.get(`${prefix}/virtual_networks`, async () => {
    const items = [
      { id: 'vn-prod', name: 'prod-network', cidr: '10.10.0.0/16' },
      { id: 'vn-dev', name: 'dev-network', cidr: '10.20.0.0/16' },
      { id: 'vn-mgmt', name: 'mgmt-network', cidr: '10.30.0.0/16' },
    ]
    return { size: items.length, total: items.length, items }
  })

  app.get(`${prefix}/subnets`, async () => {
    const items = [
      { id: 'sn-prod-1a', name: 'prod-east-1a', cidr: '10.10.1.0/24' },
      { id: 'sn-prod-1b', name: 'prod-east-1b', cidr: '10.10.2.0/24' },
      { id: 'sn-dev-1a', name: 'dev-east-1a', cidr: '10.20.1.0/24' },
    ]
    return { size: items.length, total: items.length, items }
  })

  app.get(`${prefix}/security_groups`, async () => {
    const items = [
      { id: 'sg-web', name: 'web-servers', description: 'HTTP/HTTPS inbound' },
      { id: 'sg-db', name: 'database', description: 'DB port inbound from app tier' },
      { id: 'sg-mgmt', name: 'management', description: 'SSH from bastion only' },
    ]
    return { size: items.length, total: items.length, items }
  })
}
