import { http, HttpResponse } from 'msw'
import {
  DEMO_NETWORK_CLASSES,
  DEMO_ORGANIZATIONS,
  DEMO_ORG_STORAGE_STATUSES,
  DEMO_PUBLIC_IP_POOLS,
  DEMO_PUBLIC_IPS,
  DEMO_SECURITY_GROUPS,
  DEMO_STORAGE_BACKENDS,
  DEMO_STORAGE_VOLUMES,
  DEMO_SUBNETS,
  DEMO_VIRTUAL_NETWORKS,
  DEMO_VOLUME_SNAPSHOTS,
  VM_TEMPLATES,
  normalizeComputeInstance,
} from '@osac/api-contracts'
import type {
  BareMetalInstanceCatalogItem,
  ComputeInstance,
  FulfillmentBareMetalInstance,
  NetworkClass,
  OrgStorageStatus,
  PublicIP,
  SecurityGroup,
  StorageBackend,
  StorageDeploymentModel,
  StorageProtocol,
  StorageProvider,
  StorageTier,
  StorageVolume,
  Subnet,
  VirtualNetwork,
  VolumeSnapshot,
} from '@osac/api-contracts'
import { vmStore } from '../vm-store'
import {
  agentStore,
  catalogItemStore,
  clusterStore,
  generateKubeconfig,
  scheduleClusterProgressing,
  scheduleClusterUpgrade,
  storageTierStore,
} from '../cluster-store'

// ---------------------------------------------------------------------------
// Bare metal in-memory stores
// ---------------------------------------------------------------------------

const DEMO_BM_CATALOG_ITEMS: BareMetalInstanceCatalogItem[] = [
  {
    id: 'bm-cat-standard',
    metadata: { name: 'bm-cat-standard' },
    title: 'Standard 2× AMD EPYC',
    description: '2× AMD EPYC 7452 — 32 cores, 256 GiB RAM, 2× 1.92 TB SSD',
    published: true,
  },
  {
    id: 'bm-cat-gpu',
    metadata: { name: 'bm-cat-gpu' },
    title: 'GPU Accelerated (A100)',
    description: '2× NVIDIA A100 80 GB — 64 cores, 512 GiB RAM, 4× 3.84 TB NVMe',
    published: true,
  },
  {
    id: 'bm-cat-high-mem',
    metadata: { name: 'bm-cat-high-mem' },
    title: 'High Memory 6 TB',
    description: '4× Intel Xeon Platinum — 128 cores, 6 TB RAM, 8× 960 GB SSD',
    published: true,
  },
]

const bmCatalogStore = new Map<string, BareMetalInstanceCatalogItem>(
  DEMO_BM_CATALOG_ITEMS.map((i) => [i.id, i]),
)

const bmInstanceStore = new Map<string, FulfillmentBareMetalInstance>()

// ---------------------------------------------------------------------------
// In-memory networking stores (initialized from DEMO data)
// ---------------------------------------------------------------------------

const volumeStore = new Map<string, StorageVolume>(DEMO_STORAGE_VOLUMES.map((v) => [v.id, v]))
const snapshotStore = new Map<string, VolumeSnapshot>(DEMO_VOLUME_SNAPSHOTS.map((s) => [s.id, s]))

const vnStore = new Map<string, VirtualNetwork>(DEMO_VIRTUAL_NETWORKS.map((vn) => [vn.id, vn]))
const subnetStore = new Map<string, Subnet>(DEMO_SUBNETS.map((s) => [s.id, s]))
const sgStore = new Map<string, SecurityGroup>(DEMO_SECURITY_GROUPS.map((sg) => [sg.id, sg]))
const networkClassStore = new Map<string, NetworkClass>(
  DEMO_NETWORK_CLASSES.map((nc) => [nc.id, nc]),
)
const publicIPStore = new Map<string, PublicIP>(DEMO_PUBLIC_IPS.map((pip) => [pip.id, pip]))
const storageBackendStore = new Map<string, StorageBackend>(
  DEMO_STORAGE_BACKENDS.map((b) => [b.id, b]),
)
const orgStorageStatusStore = new Map<string, OrgStorageStatus>(
  DEMO_ORG_STORAGE_STATUSES.map((s) => [s.orgId, s]),
)

let _idCounter = 1000
function nextId(prefix: string): string {
  return `${prefix}-${++_idCounter}`
}

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

  // ---------------------------------------------------------------------------
  // Clusters
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/clusters`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const all = Array.from(clusterStore.values())
    const page = all.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: all.length, items: page })
  }),

  http.get(`${PREFIX}/clusters/:id`, ({ params }) => {
    const cluster = clusterStore.get(params.id as string)
    if (!cluster) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(cluster)
  }),

  http.post(`${PREFIX}/clusters`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const id = `cluster-${Date.now()}`
    const cluster = {
      id,
      metadata: {
        name: (asNestedRecord(body.metadata).name as string) ?? id,
        createdAt: new Date().toISOString(),
      },
      spec: body.spec ?? {},
      status: { state: 'CLUSTER_STATE_PROGRESSING', conditions: [] },
    }
    clusterStore.set(id, cluster as Parameters<typeof clusterStore.set>[1])
    scheduleClusterProgressing(id)
    return HttpResponse.json(cluster, { status: 201 })
  }),

  http.patch(`${PREFIX}/clusters/:id`, async ({ params, request }) => {
    const id = params.id as string
    const existing = clusterStore.get(id)
    if (!existing) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    const updated = {
      ...existing,
      spec: { ...existing.spec, ...asNestedRecord(body.spec) },
      metadata: { ...existing.metadata, ...asNestedRecord(body.metadata) },
    }
    clusterStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.delete(`${PREFIX}/clusters/:id`, ({ params }) => {
    const id = params.id as string
    if (!clusterStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    clusterStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${PREFIX}/clusters/:id/upgrade`, async ({ params, request }) => {
    const id = params.id as string
    const cluster = clusterStore.get(id)
    if (!cluster) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = (await request.json()) as { target_version?: string }
    const targetVersion = body.target_version ?? ''
    const upgraded = {
      ...cluster,
      status: {
        ...cluster.status,
        state: 'CLUSTER_STATE_UPGRADING' as const,
        upgradeState: `Upgrading to ${targetVersion}`,
      },
    }
    clusterStore.set(id, upgraded)
    scheduleClusterUpgrade(id, targetVersion)
    return HttpResponse.json(upgraded)
  }),

  http.get(`${PREFIX}/clusters/:id/kubeconfig`, ({ params }) => {
    const cluster = clusterStore.get(params.id as string)
    if (!cluster) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return new HttpResponse(generateKubeconfig(cluster), {
      headers: { 'Content-Type': 'application/yaml' },
    })
  }),

  // ---------------------------------------------------------------------------
  // Cluster catalog items
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/cluster_catalog_items`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const includeUnpublished = url.searchParams.get('include_unpublished') === 'true'
    const all = Array.from(catalogItemStore.values()).filter(
      (c) => includeUnpublished || c.published,
    )
    const page = all.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: all.length, items: page })
  }),

  http.get(`${PREFIX}/cluster_catalog_items/:id`, ({ params }) => {
    const item = catalogItemStore.get(params.id as string)
    if (!item) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  // ---------------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/agents`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const all = Array.from(agentStore.values())
    const page = all.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: all.length, items: page })
  }),

  http.post(`${PREFIX}/agents/:id/provision`, ({ params }) => {
    const id = params.id as string
    const agent = agentStore.get(id)
    if (!agent) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = { ...agent, state: 'AGENT_STATE_AVAILABLE' as const }
    agentStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.post(`${PREFIX}/agents/:id/deprovision`, ({ params }) => {
    const id = params.id as string
    const agent = agentStore.get(id)
    if (!agent) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = { ...agent, state: 'AGENT_STATE_UNAVAILABLE' as const, clusterRef: undefined }
    agentStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  // ---------------------------------------------------------------------------
  // Storage tiers
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/storage_tiers`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const all = Array.from(storageTierStore.values())
    const page = all.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: all.length, items: page })
  }),

  http.patch(`${PREFIX}/storage_tiers/:id`, async ({ params, request }) => {
    const id = params.id as string
    const tier = storageTierStore.get(id)
    if (!tier) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = (await request.json()) as Record<string, unknown>
    const updated = { ...tier, ...body }
    storageTierStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.post(`${PREFIX}/storage_tiers`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const id = nextId('tier')
    const newTier: StorageTier = {
      id,
      name: String(body.name ?? id),
      qosClass: body.qos_class ? String(body.qos_class) : undefined,
      protocol: body.protocol as StorageProtocol | undefined,
      storageClassName: body.storage_class_name ? String(body.storage_class_name) : undefined,
      vipPool: body.vip_pool ? String(body.vip_pool) : undefined,
      storageBackendId: body.storage_backend_id ? String(body.storage_backend_id) : undefined,
      available: true,
    }
    storageTierStore.set(id, newTier)
    return HttpResponse.json(newTier, { status: 201 })
  }),

  http.delete(`${PREFIX}/storage_tiers/:id`, ({ params }) => {
    const id = params.id as string
    if (!storageTierStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    storageTierStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Storage backends
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/storage_backends`, () => {
    const items = Array.from(storageBackendStore.values())
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.get(`${PREFIX}/storage_backends/:id`, ({ params }) => {
    const item = storageBackendStore.get(params.id as string)
    if (!item) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post(`${PREFIX}/storage_backends`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const meta = asNestedRecord(body.metadata)
    const id = nextId('backend')
    const newBackend: StorageBackend = {
      id,
      metadata: { name: String(meta.name ?? id), createdAt: new Date().toISOString() },
      provider: (body.provider as StorageProvider) ?? 'vast',
      deploymentModel: body.deployment_model as StorageDeploymentModel | undefined,
      endpoint: String(body.endpoint ?? ''),
      credentialsSecretRef: String(body.credentials_secret_ref ?? body.credentialsSecretRef ?? ''),
      vipPool: String(body.vip_pool ?? body.vipPool ?? ''),
      status: { ready: false, conditions: [] },
    }
    storageBackendStore.set(id, newBackend)
    return HttpResponse.json(newBackend, { status: 201 })
  }),

  http.patch(`${PREFIX}/storage_backends/:id`, async ({ params, request }) => {
    const id = params.id as string
    const backend = storageBackendStore.get(id)
    if (!backend) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = asNestedRecord(await request.json())
    const updated: StorageBackend = {
      ...backend,
      endpoint: body.endpoint ? String(body.endpoint) : backend.endpoint,
      credentialsSecretRef: body.credentials_secret_ref
        ? String(body.credentials_secret_ref)
        : backend.credentialsSecretRef,
      vipPool: body.vip_pool ? String(body.vip_pool) : backend.vipPool,
      deploymentModel: body.deployment_model
        ? (body.deployment_model as StorageDeploymentModel)
        : backend.deploymentModel,
    }
    storageBackendStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.delete(`${PREFIX}/storage_backends/:id`, ({ params }) => {
    const id = params.id as string
    if (!storageBackendStore.has(id))
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    storageBackendStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Org storage statuses
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/org_storage_statuses`, () => {
    const items = Array.from(orgStorageStatusStore.values())
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.get(`${PREFIX}/org_storage_statuses/:orgId`, ({ params }) => {
    const item = orgStorageStatusStore.get(params.orgId as string)
    if (!item) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  // ---------------------------------------------------------------------------
  // Storage Volumes
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/storage_volumes`, ({ request }) => {
    const url = new URL(request.url)
    const orgId = url.searchParams.get('orgId')
    let items = Array.from(volumeStore.values())
    if (orgId) items = items.filter((v) => v.orgId === orgId)
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.post(`${PREFIX}/storage_volumes`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const meta = asNestedRecord(body.metadata)
    const id = nextId('vol')
    const tierId = String(body.tier_id ?? body.tierId ?? '')
    const tier = storageTierStore.get(tierId)
    const accessMode = String(body.access_mode ?? body.accessMode ?? 'ReadWriteOnce') as 'ReadWriteOnce' | 'ReadWriteMany'
    const newVol: StorageVolume = {
      id,
      metadata: { name: String(meta.name ?? id), createdAt: new Date().toISOString() },
      orgId: String(body.org_id ?? body.orgId ?? ''),
      sizeGiB: Number(body.size_gi_b ?? body.sizeGiB ?? 10),
      tierId,
      storageClassName: tier?.storageClassName,
      accessMode,
      clusterRef: String(body.cluster_ref ?? body.clusterRef ?? ''),
      phase: 'Pending',
      attachments: [],
      status: { state: 'creating' },
    }
    volumeStore.set(id, newVol)
    setTimeout(() => {
      const v = volumeStore.get(id)
      if (v) volumeStore.set(id, { ...v, phase: 'Bound', status: { state: 'available' } })
    }, 2000)
    return HttpResponse.json(newVol, { status: 201 })
  }),

  http.get(`${PREFIX}/storage_volumes/:id`, ({ params }) => {
    const vol = volumeStore.get(params.id as string)
    if (!vol) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(vol)
  }),

  http.patch(`${PREFIX}/storage_volumes/:id`, async ({ params, request }) => {
    const id = params.id as string
    const vol = volumeStore.get(id)
    if (!vol) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = asNestedRecord(await request.json())
    const updated: StorageVolume = {
      ...vol,
      sizeGiB: Number(body.size_gi_b ?? body.sizeGiB ?? vol.sizeGiB),
    }
    volumeStore.set(id, updated)
    return HttpResponse.json(updated)
  }),

  http.delete(`${PREFIX}/storage_volumes/:id`, ({ params }) => {
    const id = params.id as string
    const vol = volumeStore.get(id)
    if (!vol) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    if (vol.status.state === 'in-use')
      return HttpResponse.json({ error: 'Volume is in use' }, { status: 409 })
    volumeStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Volume Snapshots — all nested under /storage_volumes/:volumeId/snapshots
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/storage_volumes/:volumeId/snapshots`, ({ params }) => {
    const volId = params.volumeId as string
    const items = Array.from(snapshotStore.values()).filter((s) => s.volumeId === volId)
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.post(`${PREFIX}/storage_volumes/:volumeId/snapshots`, async ({ params, request }) => {
    const volId = params.volumeId as string
    const vol = volumeStore.get(volId)
    if (!vol) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = asNestedRecord(await request.json())
    const sid = nextId('snap')
    const newSnap: VolumeSnapshot = {
      id: sid,
      metadata: { name: String(body.name ?? sid), createdAt: new Date().toISOString() },
      volumeId: volId,
      volumeName: vol.metadata.name,
      sizeGiB: vol.sizeGiB,
      snapshotClassName: String(body.snapshot_class_name ?? body.snapshotClassName ?? 'vast-snapshot'),
      readyToUse: false,
      restoreSize: vol.sizeGiB,
      status: { state: 'creating' },
    }
    snapshotStore.set(sid, newSnap)
    setTimeout(() => {
      const s = snapshotStore.get(sid)
      if (s) snapshotStore.set(sid, { ...s, readyToUse: true, status: { state: 'ready' } })
    }, 2000)
    return HttpResponse.json(newSnap, { status: 201 })
  }),

  http.delete(`${PREFIX}/storage_volumes/:volumeId/snapshots/:id`, ({ params }) => {
    const id = params.id as string
    if (!snapshotStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    snapshotStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${PREFIX}/storage_volumes/:volumeId/snapshots/:id/restore`, async ({ params, request }) => {
    const id = params.id as string
    const snap = snapshotStore.get(id)
    if (!snap) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = asNestedRecord(await request.json())
    const newId = nextId('vol')
    const srcVol = volumeStore.get(snap.volumeId)
    const restored: StorageVolume = {
      id: newId,
      metadata: {
        name: String(body.name ?? `${snap.metadata.name}-restored`),
        createdAt: new Date().toISOString(),
      },
      orgId: srcVol?.orgId ?? '',
      sizeGiB: snap.restoreSize,
      tierId: srcVol?.tierId ?? '',
      storageClassName: srcVol?.storageClassName,
      accessMode: srcVol?.accessMode ?? 'ReadWriteOnce',
      clusterRef: srcVol?.clusterRef,
      phase: 'Pending',
      attachments: [],
      status: { state: 'creating' },
    }
    volumeStore.set(newId, restored)
    setTimeout(() => {
      const v = volumeStore.get(newId)
      if (v) volumeStore.set(newId, { ...v, phase: 'Bound', status: { state: 'available' } })
    }, 2000)
    return HttpResponse.json(restored, { status: 201 })
  }),

  // ---------------------------------------------------------------------------
  // Virtual networks
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/virtual_networks`, () => {
    const items = Array.from(vnStore.values())
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.get(`${PREFIX}/virtual_networks/:id`, ({ params }) => {
    const vn = vnStore.get(params.id as string)
    if (!vn) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(vn)
  }),

  http.post(`${PREFIX}/virtual_networks`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextId('vn')
    const vn: VirtualNetwork = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: {
        networkClass: spec.network_class ? String(spec.network_class) : undefined,
        ipv4Cidr: spec.ipv4_cidr ? String(spec.ipv4_cidr) : undefined,
        ipv6Cidr: spec.ipv6_cidr ? String(spec.ipv6_cidr) : undefined,
      },
      status: { state: 'VIRTUAL_NETWORK_STATE_PENDING' },
    }
    vnStore.set(id, vn)
    // Transition to READY after short delay (mock only)
    setTimeout(() => {
      const existing = vnStore.get(id)
      if (existing)
        vnStore.set(id, { ...existing, status: { state: 'VIRTUAL_NETWORK_STATE_READY' } })
    }, 2000)
    return HttpResponse.json(vn, { status: 201 })
  }),

  http.delete(`${PREFIX}/virtual_networks/:id`, ({ params }) => {
    const id = params.id as string
    if (!vnStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    vnStore.delete(id)
    // Cascade: remove subnets and SGs belonging to this VN
    for (const [sid, s] of subnetStore) {
      if (s.spec.virtualNetwork === id) subnetStore.delete(sid)
    }
    for (const [sgid, sg] of sgStore) {
      if (sg.spec.virtualNetwork === id) sgStore.delete(sgid)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Subnets
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/subnets`, ({ request }) => {
    const url = new URL(request.url)
    const vnId = url.searchParams.get('virtual_network_id')
    const all = Array.from(subnetStore.values())
    const items = vnId ? all.filter((s) => s.spec.virtualNetwork === vnId) : all
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.get(`${PREFIX}/subnets/:id`, ({ params }) => {
    const s = subnetStore.get(params.id as string)
    if (!s) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(s)
  }),

  http.post(`${PREFIX}/subnets`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextId('subnet')
    const subnet: Subnet = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: {
        virtualNetwork: String(spec.virtual_network ?? ''),
        ipv4Cidr: spec.ipv4_cidr ? String(spec.ipv4_cidr) : undefined,
        ipv6Cidr: spec.ipv6_cidr ? String(spec.ipv6_cidr) : undefined,
      },
      status: { state: 'SUBNET_STATE_READY' },
    }
    subnetStore.set(id, subnet)
    return HttpResponse.json(subnet, { status: 201 })
  }),

  http.delete(`${PREFIX}/subnets/:id`, ({ params }) => {
    const id = params.id as string
    if (!subnetStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    subnetStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Security groups
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/security_groups`, () => {
    const items = Array.from(sgStore.values())
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.get(`${PREFIX}/security_groups/:id`, ({ params }) => {
    const sg = sgStore.get(params.id as string)
    if (!sg) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(sg)
  }),

  http.post(`${PREFIX}/security_groups`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextId('sg')
    const sg: SecurityGroup = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: {
        virtualNetwork: String(spec.virtual_network ?? ''),
        ingress: [],
        egress: [],
      },
      status: { state: 'SECURITY_GROUP_STATE_READY' },
    }
    sgStore.set(id, sg)
    return HttpResponse.json(sg, { status: 201 })
  }),

  http.delete(`${PREFIX}/security_groups/:id`, ({ params }) => {
    const id = params.id as string
    if (!sgStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    sgStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Network classes (read-only)
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/network_classes`, () => {
    const items = Array.from(networkClassStore.values())
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  // ---------------------------------------------------------------------------
  // Public IPs
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/public_ips`, () => {
    const items = Array.from(publicIPStore.values())
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  http.get(`${PREFIX}/public_ips/:id`, ({ params }) => {
    const pip = publicIPStore.get(params.id as string)
    if (!pip) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(pip)
  }),

  http.post(`${PREFIX}/public_ips`, async ({ request }) => {
    const body = asNestedRecord(await request.json())
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextId('pip')
    const pip: PublicIP = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: { pool: String(spec.pool ?? '') },
      status: { state: 'PUBLIC_IP_STATE_PENDING', pool: String(spec.pool ?? '') },
    }
    publicIPStore.set(id, pip)
    // Transition to ALLOCATED after short delay
    setTimeout(() => {
      const existing = publicIPStore.get(id)
      if (existing) {
        publicIPStore.set(id, {
          ...existing,
          status: {
            ...existing.status,
            state: 'PUBLIC_IP_STATE_ALLOCATED',
            address: `203.0.113.${50 + (_idCounter % 200)}`,
          },
        })
      }
    }, 3000)
    return HttpResponse.json(pip, { status: 201 })
  }),

  http.patch(`${PREFIX}/public_ips/:id`, async ({ params, request }) => {
    const pip = publicIPStore.get(params.id as string)
    if (!pip) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const body = asNestedRecord(await request.json())
    const spec = asNestedRecord(body.spec)
    const newComputeInstance =
      spec.compute_instance === null ? undefined : (spec.compute_instance as string | undefined)
    const newState = newComputeInstance
      ? ('PUBLIC_IP_STATE_ATTACHED' as const)
      : ('PUBLIC_IP_STATE_ALLOCATED' as const)
    const updated: PublicIP = {
      ...pip,
      spec: { ...pip.spec, computeInstance: newComputeInstance },
      status: { ...pip.status, state: newState },
    }
    publicIPStore.set(pip.id, updated)
    return HttpResponse.json(updated)
  }),

  http.delete(`${PREFIX}/public_ips/:id`, ({ params }) => {
    const id = params.id as string
    if (!publicIPStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    publicIPStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------------------------------------------------------------------------
  // Public IP pools (read-only)
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/public_ip_pools`, () => {
    const items = DEMO_PUBLIC_IP_POOLS
    return HttpResponse.json({ size: items.length, total: items.length, items })
  }),

  // ---------------------------------------------------------------------------
  // Bare metal instance catalog items (read-only)
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/bare_metal_instance_catalog_items`, ({ request }) => {
    const url = new URL(request.url)
    const includeUnpublished = url.searchParams.get('include_unpublished') === 'true'
    const all = Array.from(bmCatalogStore.values()).filter(
      (i) => includeUnpublished || i.published,
    )
    return HttpResponse.json({ size: all.length, total: all.length, items: all })
  }),

  http.get(`${PREFIX}/bare_metal_instance_catalog_items/:id`, ({ params }) => {
    const item = bmCatalogStore.get(params.id as string)
    if (!item) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  // ---------------------------------------------------------------------------
  // Bare metal instances
  // ---------------------------------------------------------------------------

  http.get(`${PREFIX}/bare_metal_instances`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
    const all = Array.from(bmInstanceStore.values())
    const page = all.slice(offset, offset + limit)
    return HttpResponse.json({ size: page.length, total: all.length, items: page })
  }),

  http.get(`${PREFIX}/bare_metal_instances/:id`, ({ params }) => {
    const item = bmInstanceStore.get(params.id as string)
    if (!item) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post(`${PREFIX}/bare_metal_instances`, async ({ request }) => {
    const body = asNestedRecord(await request.json() as unknown)
    const incoming = 'object' in body && body.object ? asNestedRecord(body.object) : body
    const meta = asNestedRecord(incoming.metadata)
    const spec = asNestedRecord(incoming.spec)
    const id = nextId('bm')
    const instance: FulfillmentBareMetalInstance = {
      id,
      metadata: {
        name: String(meta.name ?? id),
        createdAt: new Date().toISOString(),
      },
      spec: {
        catalogItem: String(spec.catalog_item ?? ''),
        sshKey: spec.ssh_key ? String(spec.ssh_key) : undefined,
        userData: spec.user_data ? String(spec.user_data) : undefined,
      },
      status: { state: 'BARE_METAL_INSTANCE_STATE_PROVISIONING' },
    }
    bmInstanceStore.set(id, instance)
    // Simulate async state transition to PROVISIONING then ACTIVE
    setTimeout(() => {
      const existing = bmInstanceStore.get(id)
      if (existing)
        bmInstanceStore.set(id, { ...existing, status: { state: 'BARE_METAL_INSTANCE_STATE_PROVISIONING' } })
    }, 3000)
    setTimeout(() => {
      const existing = bmInstanceStore.get(id)
      if (existing)
        bmInstanceStore.set(id, { ...existing, status: { state: 'BARE_METAL_INSTANCE_STATE_RUNNING' } })
    }, 12000)
    return HttpResponse.json({ object: instance }, { status: 201 })
  }),

  http.delete(`${PREFIX}/bare_metal_instances/:id`, ({ params }) => {
    const id = params.id as string
    if (!bmInstanceStore.has(id)) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    bmInstanceStore.delete(id)
    return new HttpResponse(null, { status: 204 })
  }),
]
