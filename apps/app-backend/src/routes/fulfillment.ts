/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string */
/**
 * BFF fulfillment routes — in OSAC_API_MODE=dev with FULFILLMENT_API_URL, proxy upstream; else mock.
 * Startup requires FULFILLMENT_API_URL when mode is dev (see assertFulfillmentDevReady in index.ts).
 *
 * Mock paths:
 *   GET  /api/fulfillment/v1/capabilities                       → mock capabilities
 *   GET  /api/fulfillment/v1/compute_instance_templates         → mock VM template list
 *   GET  /api/fulfillment/v1/compute_instance_templates/:id     → mock VM template detail
 *   GET  /api/fulfillment/v1/compute_instances                  → mock VM list
 *   GET  /api/fulfillment/v1/compute_instances/:id              → mock VM detail
 *   POST /api/fulfillment/v1/compute_instances                  → mock VM create
 *   PATCH /api/fulfillment/v1/compute_instances/:id             → mock VM update
 *   DELETE /api/fulfillment/v1/compute_instances/:id            → mock VM delete
 *   GET  /api/fulfillment/v1/organizations                      → mock org list
 *   GET  /api/fulfillment/v1/clusters                           → mock cluster list
 *   GET  /api/fulfillment/v1/clusters/:id                       → mock cluster detail
 *   POST /api/fulfillment/v1/clusters                           → mock cluster create
 *   PATCH /api/fulfillment/v1/clusters/:id                      → mock cluster update
 *   DELETE /api/fulfillment/v1/clusters/:id                     → mock cluster delete
 *   POST /api/fulfillment/v1/clusters/:id/upgrade               → mock cluster upgrade
 *   GET  /api/fulfillment/v1/clusters/:id/kubeconfig            → mock kubeconfig download
 *   GET  /api/fulfillment/v1/cluster_catalog_items              → mock catalog items
 *   GET  /api/fulfillment/v1/cluster_catalog_items/:id          → mock catalog item detail
 *   GET  /api/fulfillment/v1/agents                             → mock agents list
 *   POST /api/fulfillment/v1/agents/:id/provision               → mock agent provision
 *   POST /api/fulfillment/v1/agents/:id/deprovision             → mock agent deprovision
 *   GET  /api/fulfillment/v1/storage_tiers                      → mock storage tiers list
 *   PATCH /api/fulfillment/v1/storage_tiers/:id                 → mock storage tier update
 *   GET  /api/fulfillment/v1/storage_backends                   → mock storage backends list
 *   GET  /api/fulfillment/v1/storage_backends/:id               → mock storage backend detail
 *   POST /api/fulfillment/v1/storage_backends                   → mock storage backend register
 *   GET  /api/fulfillment/v1/org_storage_statuses               → mock org storage statuses list
 *   GET  /api/fulfillment/v1/org_storage_statuses/:orgId        → mock org storage status detail
 *   GET/POST/DELETE /api/fulfillment/v1/virtual_networks        → mock VN CRUD
 *   GET/POST/DELETE /api/fulfillment/v1/subnets                 → mock subnet CRUD
 *   GET/POST/DELETE /api/fulfillment/v1/security_groups         → mock SG CRUD
 *   GET  /api/fulfillment/v1/network_classes                    → mock NetworkClass list
 *   GET/POST/PATCH/DELETE /api/fulfillment/v1/public_ips        → mock PublicIP CRUD
 *   GET  /api/fulfillment/v1/public_ip_pools                    → mock PublicIPPool list
 *   GET/POST /api/fulfillment/v1/storage_volumes                → mock StorageVolume list/create
 *   GET/PATCH/DELETE /api/fulfillment/v1/storage_volumes/:id    → mock StorageVolume detail
 *   GET/POST /api/fulfillment/v1/storage_volumes/:id/snapshots  → mock VolumeSnapshot list/create
 *   DELETE /api/fulfillment/v1/storage_volumes/:volumeId/snapshots/:id          → mock snapshot delete
 *   POST /api/fulfillment/v1/storage_volumes/:volumeId/snapshots/:id/restore    → mock snapshot restore
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import {
  DEMO_NETWORK_CLASSES,
  DEMO_ORGANIZATIONS,
  DEMO_ORG_STORAGE_STATUSES,
  DEMO_PUBLIC_IPS,
  DEMO_PUBLIC_IP_POOLS,
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
  Cluster,
  ComputeInstance,
  NetworkClass,
  PublicIP,
  SecurityGroup,
  StorageBackend,
  StorageVolume,
  Subnet,
  VirtualNetwork,
  VolumeSnapshot,
} from '@osac/api-contracts'
import { vmStore } from '../mock-vm-store.js'
import {
  agentStore,
  catalogItemStore,
  clusterStore,
  generateKubeconfig,
  scheduleClusterProgressing,
  scheduleClusterUpgrade,
  storageTierStore,
} from '../mock-cluster-store.js'
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

  // ---------------------------------------------------------------------------
  // Clusters
  // ---------------------------------------------------------------------------

  app.get(`${prefix}/clusters`, async (req) => {
    const query = req.query as { filter?: string; limit?: string; offset?: string }
    const limit = parseInt(query.limit ?? '100', 10)
    const offset = parseInt(query.offset ?? '0', 10)
    const all = Array.from(clusterStore.values())
    const page = all.slice(offset, offset + limit)
    return { size: page.length, total: all.length, items: page }
  })

  app.get(`${prefix}/clusters/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const cluster = clusterStore.get(id)
    if (!cluster) return reply.status(404).send({ error: 'Not found' })
    return cluster
  })

  app.post(`${prefix}/clusters`, async (req, reply) => {
    const body = req.body as Partial<Cluster> | undefined
    if (!body || typeof body !== 'object') return reply.status(400).send({ error: 'Missing body' })
    const id = `cluster-${Date.now()}`
    const newCluster: Cluster = {
      id,
      metadata: {
        name: (body.metadata?.name as string) ?? `cluster-${id}`,
        createdAt: new Date().toISOString(),
        tenants: (body.metadata?.tenants as string[]) ?? [],
      },
      spec: { ...(body.spec ?? {}) },
      status: {
        state: 'CLUSTER_STATE_PROGRESSING',
        storageReady: false,
        nodeSets: {},
        conditions: [],
      },
    }
    clusterStore.set(id, newCluster)
    scheduleClusterProgressing(id)
    return newCluster
  })

  app.patch(`${prefix}/clusters/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = clusterStore.get(id)
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Partial<Cluster>
    const updated: Cluster = {
      ...existing,
      spec: { ...existing.spec, ...(body.spec ?? {}) },
      status: { ...existing.status, ...(body.status ?? {}) },
      metadata: { ...existing.metadata, ...(body.metadata ?? {}) },
    }
    clusterStore.set(id, updated)
    return updated
  })

  app.delete(`${prefix}/clusters/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    if (!clusterStore.has(id)) return reply.status(404).send({ error: 'Not found' })
    clusterStore.delete(id)
    return {}
  })

  app.post(`${prefix}/clusters/:id/upgrade`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const cluster = clusterStore.get(id)
    if (!cluster) return reply.status(404).send({ error: 'Not found' })
    if (cluster.status.state !== 'CLUSTER_STATE_READY') {
      return reply.status(400).send({ error: 'Cluster must be in READY state to upgrade' })
    }
    const body = req.body as { target_version?: string }
    const targetVersion = body?.target_version
    if (!targetVersion) return reply.status(400).send({ error: 'target_version is required' })

    const upgraded: Cluster = {
      ...cluster,
      status: {
        ...cluster.status,
        state: 'CLUSTER_STATE_UPGRADING',
        upgradeState: `Upgrading to ${targetVersion}`,
      },
    }
    clusterStore.set(id, upgraded)
    scheduleClusterUpgrade(id, targetVersion)
    return upgraded
  })

  app.get(`${prefix}/clusters/:id/kubeconfig`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const cluster = clusterStore.get(id)
    if (!cluster) return reply.status(404).send({ error: 'Not found' })
    if (cluster.status.state !== 'CLUSTER_STATE_READY') {
      return reply.status(400).send({ error: 'Cluster must be in READY state' })
    }
    const kubeconfig = generateKubeconfig(cluster)
    return reply
      .status(200)
      .header('Content-Type', 'application/yaml')
      .header(
        'Content-Disposition',
        `attachment; filename="kubeconfig-${cluster.metadata.name}.yaml"`,
      )
      .send(kubeconfig)
  })

  // ---------------------------------------------------------------------------
  // Cluster catalog items
  // ---------------------------------------------------------------------------

  app.get(`${prefix}/cluster_catalog_items`, async (req) => {
    const query = req.query as { filter?: string; limit?: string; offset?: string }
    const limit = parseInt(query.limit ?? '50', 10)
    const offset = parseInt(query.offset ?? '0', 10)
    const all = Array.from(catalogItemStore.values()).filter((c) => c.published)
    const page = all.slice(offset, offset + limit)
    return { size: page.length, total: all.length, items: page }
  })

  app.get(`${prefix}/cluster_catalog_items/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = catalogItemStore.get(id)
    if (!item) return reply.status(404).send({ error: 'Not found' })
    return item
  })

  // ---------------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------------

  app.get(`${prefix}/agents`, async (req) => {
    const query = req.query as { limit?: string; offset?: string }
    const limit = parseInt(query.limit ?? '100', 10)
    const offset = parseInt(query.offset ?? '0', 10)
    const all = Array.from(agentStore.values())
    const page = all.slice(offset, offset + limit)
    return { size: page.length, total: all.length, items: page }
  })

  app.post(`${prefix}/agents/:id/provision`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const agent = agentStore.get(id)
    if (!agent) return reply.status(404).send({ error: 'Not found' })
    if (agent.state !== 'AGENT_STATE_AVAILABLE') {
      return reply.status(400).send({ error: 'Agent must be in AVAILABLE state to provision' })
    }
    const updated = { ...agent, state: 'AGENT_STATE_PROVISIONING' as const }
    agentStore.set(id, updated)
    setTimeout(() => {
      const a = agentStore.get(id)
      if (a && a.state === 'AGENT_STATE_PROVISIONING') {
        agentStore.set(id, { ...a, state: 'AGENT_STATE_PROVISIONED' })
      }
    }, 5_000)
    return updated
  })

  app.post(`${prefix}/agents/:id/deprovision`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const agent = agentStore.get(id)
    if (!agent) return reply.status(404).send({ error: 'Not found' })
    if (agent.state !== 'AGENT_STATE_PROVISIONED') {
      return reply.status(400).send({ error: 'Agent must be in PROVISIONED state to deprovision' })
    }
    const updated = {
      ...agent,
      state: 'AGENT_STATE_DEPROVISIONING' as const,
      clusterRef: undefined,
    }
    agentStore.set(id, updated)
    setTimeout(() => {
      const a = agentStore.get(id)
      if (a && a.state === 'AGENT_STATE_DEPROVISIONING') {
        agentStore.set(id, { ...a, state: 'AGENT_STATE_AVAILABLE' })
      }
    }, 5_000)
    return updated
  })

  // ---------------------------------------------------------------------------
  // Storage tiers
  // ---------------------------------------------------------------------------

  app.get(`${prefix}/storage_tiers`, async () => {
    const items = Array.from(storageTierStore.values())
    return { size: items.length, total: items.length, items }
  })

  app.patch(`${prefix}/storage_tiers/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = storageTierStore.get(id)
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Partial<typeof existing>
    const updated = { ...existing, ...body }
    storageTierStore.set(id, updated)
    return updated
  })

  // ---------------------------------------------------------------------------
  // Storage backends
  // ---------------------------------------------------------------------------

  const storageBackendStore = new Map(DEMO_STORAGE_BACKENDS.map((b) => [b.id, b]))

  app.get(`${prefix}/storage_backends`, async () => {
    const items = Array.from(storageBackendStore.values())
    return { size: items.length, total: items.length, items }
  })

  app.get(`${prefix}/storage_backends/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const item = storageBackendStore.get(id)
    if (!item) return reply.status(404).send({ error: 'Not found' })
    return item
  })

  app.post(`${prefix}/storage_backends`, async (req, reply) => {
    const body = req.body as Partial<StorageBackend> | undefined
    if (!body || typeof body !== 'object') return reply.status(400).send({ error: 'Missing body' })
    const id = `backend-${Date.now()}`
    const newBackend: StorageBackend = {
      id,
      metadata: {
        name: (body.metadata?.name as string) ?? id,
        createdAt: new Date().toISOString(),
      },
      provider: body.provider ?? 'vast',
      deploymentModel: body.deploymentModel,
      endpoint: body.endpoint ?? '',
      credentialsSecretRef: body.credentialsSecretRef ?? '',
      vipPool: body.vipPool ?? '',
      status: { ready: false, conditions: [] },
    }
    storageBackendStore.set(id, newBackend)
    return reply.status(201).send(newBackend)
  })

  // ---------------------------------------------------------------------------
  // Org storage statuses
  // ---------------------------------------------------------------------------

  const orgStorageStatusStore = new Map(DEMO_ORG_STORAGE_STATUSES.map((s) => [s.orgId, s]))

  // ---------------------------------------------------------------------------
  // Storage Volumes
  // ---------------------------------------------------------------------------

  const bffVolumeStore = new Map<string, StorageVolume>(DEMO_STORAGE_VOLUMES.map((v) => [v.id, v]))
  const bffSnapshotStore = new Map<string, VolumeSnapshot>(
    DEMO_VOLUME_SNAPSHOTS.map((s) => [s.id, s]),
  )
  let bffVolIdCounter = 100
  function nextVolId(pfx: string): string {
    return `${pfx}-${++bffVolIdCounter}`
  }

  app.get(`${prefix}/storage_volumes`, async (req) => {
    const { orgId } = req.query as { orgId?: string }
    let items = Array.from(bffVolumeStore.values())
    if (orgId) items = items.filter((v) => v.orgId === orgId)
    return { size: items.length, total: items.length, items }
  })

  app.post(`${prefix}/storage_volumes`, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const meta = (body.metadata as Record<string, unknown>) ?? {}
    const id = nextVolId('vol')
    const tierId = String(body.tier_id ?? body.tierId ?? '')
    const tier = storageTierStore.get(tierId)
    const accessMode = String(body.access_mode ?? body.accessMode ?? 'ReadWriteOnce') as
      | 'ReadWriteOnce'
      | 'ReadWriteMany'
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
    bffVolumeStore.set(id, newVol)
    setTimeout(() => {
      const v = bffVolumeStore.get(id)
      if (v) bffVolumeStore.set(id, { ...v, phase: 'Bound', status: { state: 'available' } })
    }, 2000)
    return reply.status(201).send(newVol)
  })

  app.get(`${prefix}/storage_volumes/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const vol = bffVolumeStore.get(id)
    if (!vol) return reply.status(404).send({ error: 'Not found' })
    return vol
  })

  app.patch(`${prefix}/storage_volumes/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const vol = bffVolumeStore.get(id)
    if (!vol) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Record<string, unknown>
    const updated: StorageVolume = {
      ...vol,
      sizeGiB: Number(body.size_gi_b ?? body.sizeGiB ?? vol.sizeGiB),
    }
    bffVolumeStore.set(id, updated)
    return updated
  })

  app.delete(`${prefix}/storage_volumes/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    const vol = bffVolumeStore.get(id)
    if (!vol) return reply.status(404).send({ error: 'Not found' })
    if (vol.status.state === 'in-use') return reply.status(409).send({ error: 'Volume is in use' })
    bffVolumeStore.delete(id)
    return reply.status(204).send()
  })

  // Volume Snapshots — all nested under /storage_volumes/:volumeId/snapshots

  app.get(`${prefix}/storage_volumes/:volumeId/snapshots`, async (req) => {
    const { volumeId } = req.params as { volumeId: string }
    const items = Array.from(bffSnapshotStore.values()).filter((s) => s.volumeId === volumeId)
    return { size: items.length, total: items.length, items }
  })

  app.post(`${prefix}/storage_volumes/:volumeId/snapshots`, async (req, reply) => {
    const { volumeId } = req.params as { volumeId: string }
    const vol = bffVolumeStore.get(volumeId)
    if (!vol) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Record<string, unknown>
    const sid = nextVolId('snap')
    const newSnap: VolumeSnapshot = {
      id: sid,
      metadata: { name: String(body.name ?? sid), createdAt: new Date().toISOString() },
      volumeId,
      volumeName: vol.metadata.name,
      sizeGiB: vol.sizeGiB,
      snapshotClassName: String(
        body.snapshot_class_name ?? body.snapshotClassName ?? 'vast-snapshot',
      ),
      readyToUse: false,
      restoreSize: vol.sizeGiB,
      status: { state: 'creating' },
    }
    bffSnapshotStore.set(sid, newSnap)
    setTimeout(() => {
      const s = bffSnapshotStore.get(sid)
      if (s) bffSnapshotStore.set(sid, { ...s, readyToUse: true, status: { state: 'ready' } })
    }, 2000)
    return reply.status(201).send(newSnap)
  })

  app.delete(`${prefix}/storage_volumes/:volumeId/snapshots/:id`, async (req, reply) => {
    const { id } = req.params as { volumeId: string; id: string }
    if (!bffSnapshotStore.has(id)) return reply.status(404).send({ error: 'Not found' })
    bffSnapshotStore.delete(id)
    return reply.status(204).send()
  })

  app.post(`${prefix}/storage_volumes/:volumeId/snapshots/:id/restore`, async (req, reply) => {
    const { id } = req.params as { volumeId: string; id: string }
    const snap = bffSnapshotStore.get(id)
    if (!snap) return reply.status(404).send({ error: 'Not found' })
    const body = req.body as Record<string, unknown>
    const newId = nextVolId('vol')
    const srcVol = bffVolumeStore.get(snap.volumeId)
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
    bffVolumeStore.set(newId, restored)
    setTimeout(() => {
      const v = bffVolumeStore.get(newId)
      if (v) bffVolumeStore.set(newId, { ...v, phase: 'Bound', status: { state: 'available' } })
    }, 2000)
    return reply.status(201).send(restored)
  })

  app.get(`${prefix}/org_storage_statuses`, async () => {
    const items = Array.from(orgStorageStatusStore.values())
    return { size: items.length, total: items.length, items }
  })

  app.get(`${prefix}/org_storage_statuses/:orgId`, async (req, reply) => {
    const { orgId } = req.params as { orgId: string }
    const item = orgStorageStatusStore.get(orgId)
    if (!item) return reply.status(404).send({ error: 'Not found' })
    return item
  })

  // ---------------------------------------------------------------------------
  // Networking — in-memory stores (initialized from DEMO data)
  // ---------------------------------------------------------------------------

  const bffVnStore = new Map<string, VirtualNetwork>(DEMO_VIRTUAL_NETWORKS.map((vn) => [vn.id, vn]))
  const bffSubnetStore = new Map<string, Subnet>(DEMO_SUBNETS.map((s) => [s.id, s]))
  const bffSgStore = new Map<string, SecurityGroup>(DEMO_SECURITY_GROUPS.map((sg) => [sg.id, sg]))
  const bffNcStore = new Map<string, NetworkClass>(DEMO_NETWORK_CLASSES.map((nc) => [nc.id, nc]))
  const bffPipStore = new Map<string, PublicIP>(DEMO_PUBLIC_IPS.map((pip) => [pip.id, pip]))
  let bffIdCounter = 2000
  function nextBffId(prefix: string): string {
    return `${prefix}-${++bffIdCounter}`
  }

  // Virtual networks
  app.get(`${prefix}/virtual_networks`, async () => {
    const items = Array.from(bffVnStore.values())
    return { size: items.length, total: items.length, items }
  })
  app.get(`${prefix}/virtual_networks/:id`, async (req) => {
    const { id } = req.params as { id: string }
    const vn = bffVnStore.get(id)
    if (!vn) {
      req.server.httpErrors?.notFound()
      return
    }
    return vn
  })
  app.post(`${prefix}/virtual_networks`, async (req) => {
    const body = asNestedRecord(req.body)
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextBffId('vn')
    const vn: VirtualNetwork = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: {
        networkClass: spec.network_class ? String(spec.network_class) : undefined,
        ipv4Cidr: spec.ipv4_cidr ? String(spec.ipv4_cidr) : undefined,
        ipv6Cidr: spec.ipv6_cidr ? String(spec.ipv6_cidr) : undefined,
      },
      status: { state: 'VIRTUAL_NETWORK_STATE_READY' },
    }
    bffVnStore.set(id, vn)
    return vn
  })
  app.delete(`${prefix}/virtual_networks/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    bffVnStore.delete(id)
    for (const [sid, s] of bffSubnetStore) {
      if (s.spec.virtualNetwork === id) bffSubnetStore.delete(sid)
    }
    for (const [sgid, sg] of bffSgStore) {
      if (sg.spec.virtualNetwork === id) bffSgStore.delete(sgid)
    }
    return reply.code(204).send()
  })

  // Subnets
  app.get(`${prefix}/subnets`, async (req) => {
    const query = req.query as { virtual_network_id?: string }
    const all = Array.from(bffSubnetStore.values())
    const items = query.virtual_network_id
      ? all.filter((s) => s.spec.virtualNetwork === query.virtual_network_id)
      : all
    return { size: items.length, total: items.length, items }
  })
  app.get(`${prefix}/subnets/:id`, async (req) => {
    const { id } = req.params as { id: string }
    const s = bffSubnetStore.get(id)
    if (!s) {
      req.server.httpErrors?.notFound()
      return
    }
    return s
  })
  app.post(`${prefix}/subnets`, async (req) => {
    const body = asNestedRecord(req.body)
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextBffId('subnet')
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
    bffSubnetStore.set(id, subnet)
    return subnet
  })
  app.delete(`${prefix}/subnets/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    bffSubnetStore.delete(id)
    return reply.code(204).send()
  })

  // Security groups
  app.get(`${prefix}/security_groups`, async () => {
    const items = Array.from(bffSgStore.values())
    return { size: items.length, total: items.length, items }
  })
  app.get(`${prefix}/security_groups/:id`, async (req) => {
    const { id } = req.params as { id: string }
    const sg = bffSgStore.get(id)
    if (!sg) {
      req.server.httpErrors?.notFound()
      return
    }
    return sg
  })
  app.post(`${prefix}/security_groups`, async (req) => {
    const body = asNestedRecord(req.body)
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextBffId('sg')
    const sg: SecurityGroup = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: { virtualNetwork: String(spec.virtual_network ?? ''), ingress: [], egress: [] },
      status: { state: 'SECURITY_GROUP_STATE_READY' },
    }
    bffSgStore.set(id, sg)
    return sg
  })
  app.delete(`${prefix}/security_groups/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    bffSgStore.delete(id)
    return reply.code(204).send()
  })

  // Network classes (read-only)
  app.get(`${prefix}/network_classes`, async () => {
    const items = Array.from(bffNcStore.values())
    return { size: items.length, total: items.length, items }
  })

  // Public IPs
  app.get(`${prefix}/public_ips`, async () => {
    const items = Array.from(bffPipStore.values())
    return { size: items.length, total: items.length, items }
  })
  app.get(`${prefix}/public_ips/:id`, async (req) => {
    const { id } = req.params as { id: string }
    const pip = bffPipStore.get(id)
    if (!pip) {
      req.server.httpErrors?.notFound()
      return
    }
    return pip
  })
  app.post(`${prefix}/public_ips`, async (req) => {
    const body = asNestedRecord(req.body)
    const meta = asNestedRecord(body.metadata)
    const spec = asNestedRecord(body.spec)
    const id = nextBffId('pip')
    const pip: PublicIP = {
      id,
      metadata: { name: String(meta.name ?? ''), createdAt: new Date().toISOString() },
      spec: { pool: String(spec.pool ?? '') },
      status: {
        state: 'PUBLIC_IP_STATE_ALLOCATED',
        address: `203.0.113.${50 + (bffIdCounter % 200)}`,
        pool: String(spec.pool ?? ''),
      },
    }
    bffPipStore.set(id, pip)
    return pip
  })
  app.patch(`${prefix}/public_ips/:id`, async (req) => {
    const { id } = req.params as { id: string }
    const pip = bffPipStore.get(id)
    if (!pip) {
      req.server.httpErrors?.notFound()
      return
    }
    const body = asNestedRecord(req.body)
    const spec = asNestedRecord(body.spec)
    const newCi =
      spec.compute_instance === null ? undefined : (spec.compute_instance as string | undefined)
    const updated: PublicIP = {
      ...pip,
      spec: { ...pip.spec, computeInstance: newCi },
      status: {
        ...pip.status,
        state: newCi ? 'PUBLIC_IP_STATE_ATTACHED' : 'PUBLIC_IP_STATE_ALLOCATED',
      },
    }
    bffPipStore.set(id, updated)
    return updated
  })
  app.delete(`${prefix}/public_ips/:id`, async (req, reply) => {
    const { id } = req.params as { id: string }
    bffPipStore.delete(id)
    return reply.code(204).send()
  })

  // Public IP pools (read-only)
  app.get(`${prefix}/public_ip_pools`, async () => {
    const items = DEMO_PUBLIC_IP_POOLS
    return { size: items.length, total: items.length, items }
  })
}
