import { http, HttpResponse } from 'msw'
import {
  DEMO_ORGANIZATIONS,
  VM_TEMPLATES,
  normalizeComputeInstance,
} from '@osac/api-contracts'
import type { ComputeInstance } from '@osac/api-contracts'
import { vmStore } from '../vm-store'

const PREFIX = '/api/fulfillment/v1'

function asNestedRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export const fulfillmentHandlers = [
  // Capabilities
  http.get(`${PREFIX}/capabilities`, () =>
    HttpResponse.json({ authn: { trustedTokenIssuers: [] } }),
  ),

  // Templates list
  http.get(`${PREFIX}/compute_instance_templates`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const filter = url.searchParams.get('filter')?.toLowerCase() ?? ''
    const filtered = filter
      ? VM_TEMPLATES.filter(
          (t) =>
            t.title.toLowerCase().includes(filter) ||
            (t.description ?? '').toLowerCase().includes(filter),
        )
      : VM_TEMPLATES
    const page = filtered.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: filtered.length, items: page })
  }),

  // Template detail
  http.get(`${PREFIX}/compute_instance_templates/:id`, ({ params }) => {
    const tpl = VM_TEMPLATES.find((t) => t.id === params.id)
    if (!tpl) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(tpl)
  }),

  // VM list
  http.get(`${PREFIX}/compute_instances`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const filter = url.searchParams.get('filter')?.toLowerCase() ?? ''
    const all = Array.from(vmStore.values())
    const filtered = filter
      ? all.filter(
          (vm) =>
            vm.metadata.name.toLowerCase().includes(filter) ||
            vm.status.state.toLowerCase().includes(filter),
        )
      : all
    const page = filtered.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: filtered.length, items: page })
  }),

  // VM detail
  http.get(`${PREFIX}/compute_instances/:id`, ({ params }) => {
    const vm = vmStore.get(params.id as string)
    if (!vm) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(vm)
  }),

  // VM create
  http.post(`${PREFIX}/compute_instances`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown> | null
    if (!body || typeof body !== 'object')
      return HttpResponse.json({ error: 'Missing body' }, { status: 400 })
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
    return HttpResponse.json({ object: vm })
  }),

  // VM patch
  http.patch(`${PREFIX}/compute_instances/:id`, async ({ params, request }) => {
    const id = params.id as string
    const existing = vmStore.get(id)
    if (!existing) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = (await request.json()) as Partial<ComputeInstance>
    const merged = {
      ...existing,
      ...body,
      spec: { ...existing.spec, ...(body.spec ?? {}) },
      status: { ...existing.status, ...(body.status ?? {}) },
      metadata: { ...existing.metadata, ...(body.metadata ?? {}) },
    }
    const updated = normalizeComputeInstance(merged as unknown)
    vmStore.set(id, updated)
    return HttpResponse.json({ object: updated })
  }),

  // VM delete
  http.delete(`${PREFIX}/compute_instances/:id`, ({ params }) => {
    const id = params.id as string
    if (!vmStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    vmStore.delete(id)
    return HttpResponse.json({})
  }),

  // Organizations
  http.get(`${PREFIX}/organizations`, () =>
    HttpResponse.json({
      size: DEMO_ORGANIZATIONS.length,
      total: DEMO_ORGANIZATIONS.length,
      items: DEMO_ORGANIZATIONS,
    }),
  ),

  // Clusters
  http.get(`${PREFIX}/clusters`, () => {
    const items = DEMO_ORGANIZATIONS.map((o) => ({ id: o.id, name: o.displayName }))
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  // Virtual networks
  http.get(`${PREFIX}/virtual_networks`, () => {
    const items = [
      { id: 'vn-prod', name: 'prod-network', cidr: '10.10.0.0/16' },
      { id: 'vn-dev', name: 'dev-network', cidr: '10.20.0.0/16' },
      { id: 'vn-mgmt', name: 'mgmt-network', cidr: '10.30.0.0/16' },
    ]
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  // Subnets
  http.get(`${PREFIX}/subnets`, () => {
    const items = [
      { id: 'sn-prod-1a', name: 'prod-east-1a', cidr: '10.10.1.0/24' },
      { id: 'sn-prod-1b', name: 'prod-east-1b', cidr: '10.10.2.0/24' },
      { id: 'sn-dev-1a', name: 'dev-east-1a', cidr: '10.20.1.0/24' },
    ]
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  // Security groups
  http.get(`${PREFIX}/security_groups`, () => {
    const items = [
      { id: 'sg-web', name: 'web-servers', description: 'HTTP/HTTPS inbound' },
      { id: 'sg-db', name: 'database', description: 'DB port inbound from app tier' },
      { id: 'sg-mgmt', name: 'management', description: 'SSH from bastion only' },
    ]
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),
]
