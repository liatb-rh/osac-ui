/**
 * BFF API client for Cluster resources.
 * All functions route through /api on the same origin.
 */
import type {
  Agent,
  Cluster,
  ClusterCatalogItem,
  ComputeInstance,
  OrgStorageStatus,
  PageOfT,
  StorageBackend,
  StorageTier,
  StorageVolume,
  VolumeSnapshot,
} from '@osac/api-contracts'
import { buildAuthHeaders } from './authToken'
import {
  normalizeAgent,
  normalizeCatalogItem,
  normalizeCatalogItemPage,
  normalizeCluster,
  normalizeClusterPage,
  normalizeOrgStorageStatus,
  normalizeStorageBackend,
  normalizeStorageTier,
  normalizeStorageVolume,
  normalizeVolumeSnapshot,
} from './clusterNormalize'

const BASE = '/api/fulfillment/v1'

async function parseJson(res: Response): Promise<unknown> {
  return res.json()
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: buildAuthHeaders({ 'Content-Type': 'application/json', ...init?.headers }),
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  return (await parseJson(res)) as T
}

// ---------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------

export interface ListClustersParams {
  filter?: string
  limit?: number
  offset?: number
}

export async function listClusters(params: ListClustersParams = {}): Promise<PageOfT<Cluster>> {
  const q = new URLSearchParams()
  if (params.filter) q.set('filter', params.filter)
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const qs = q.toString()
  const raw = await request<unknown>(`/clusters${qs ? `?${qs}` : ''}`)
  return normalizeClusterPage(raw)
}

export async function getCluster(id: string): Promise<Cluster> {
  const raw = await request<unknown>(`/clusters/${encodeURIComponent(id)}`)
  return normalizeCluster(raw)
}

export async function createCluster(payload: Partial<Cluster>): Promise<Cluster> {
  const raw = await request<unknown>('/clusters', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeCluster(raw)
}

export async function patchCluster(id: string, patch: Partial<Cluster>): Promise<Cluster> {
  const raw = await request<unknown>(`/clusters/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return normalizeCluster(raw)
}

export async function deleteCluster(id: string): Promise<void> {
  await fetch(`${BASE}/clusters/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`API ${res.status}: ${body || res.statusText}`)
    }
  })
}

export async function upgradeCluster(id: string, targetVersion: string): Promise<Cluster> {
  const raw = await request<unknown>(`/clusters/${encodeURIComponent(id)}/upgrade`, {
    method: 'POST',
    body: JSON.stringify({ target_version: targetVersion }),
  })
  return normalizeCluster(raw)
}

export async function downloadKubeconfig(id: string): Promise<string> {
  const res = await fetch(`${BASE}/clusters/${encodeURIComponent(id)}/kubeconfig`, {
    headers: buildAuthHeaders(),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  return res.text()
}

// ---------------------------------------------------------------------------
// Cluster catalog items
// ---------------------------------------------------------------------------

export async function listClusterCatalogItems(
  options: { includeUnpublished?: boolean } = {},
): Promise<PageOfT<ClusterCatalogItem>> {
  const qs = options.includeUnpublished ? '?include_unpublished=true' : ''
  const raw = await request<unknown>(`/cluster_catalog_items${qs}`)
  return normalizeCatalogItemPage(raw)
}

export async function getClusterCatalogItem(id: string): Promise<ClusterCatalogItem> {
  const raw = await request<unknown>(`/cluster_catalog_items/${encodeURIComponent(id)}`)
  return normalizeCatalogItem(raw)
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function listAgents(): Promise<PageOfT<Agent>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/agents')
  return {
    size: raw.size,
    total: raw.total,
    items: raw.items.map(normalizeAgent),
  }
}

export async function provisionAgent(id: string): Promise<Agent> {
  const raw = await request<unknown>(`/agents/${encodeURIComponent(id)}/provision`, {
    method: 'POST',
    body: '{}',
  })
  return normalizeAgent(raw)
}

export async function deprovisionAgent(id: string): Promise<Agent> {
  const raw = await request<unknown>(`/agents/${encodeURIComponent(id)}/deprovision`, {
    method: 'POST',
    body: '{}',
  })
  return normalizeAgent(raw)
}

// ---------------------------------------------------------------------------
// Storage tiers
// ---------------------------------------------------------------------------

export async function listStorageTiers(): Promise<PageOfT<StorageTier>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/storage_tiers')
  return {
    size: raw.size,
    total: raw.total,
    items: raw.items.map(normalizeStorageTier),
  }
}

export async function patchStorageTier(
  id: string,
  patch: Partial<StorageTier>,
): Promise<StorageTier> {
  const raw = await request<unknown>(`/storage_tiers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return normalizeStorageTier(raw)
}

export async function createStorageTier(
  payload: Omit<StorageTier, 'id' | 'available'> & { name: string },
): Promise<StorageTier> {
  const raw = await request<unknown>('/storage_tiers', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      qos_class: payload.qosClass,
      protocol: payload.protocol,
      storage_class_name: payload.storageClassName,
      vip_pool: payload.vipPool,
      storage_backend_id: payload.storageBackendId,
    }),
  })
  return normalizeStorageTier(raw)
}

export async function deleteStorageTier(id: string): Promise<void> {
  await request<void>(`/storage_tiers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Storage backends (Phase 3)
// ---------------------------------------------------------------------------

export async function listStorageBackends(): Promise<PageOfT<StorageBackend>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/storage_backends')
  return {
    size: raw.size,
    total: raw.total,
    items: raw.items.map(normalizeStorageBackend),
  }
}

export async function getStorageBackend(id: string): Promise<StorageBackend> {
  const raw = await request<unknown>(`/storage_backends/${encodeURIComponent(id)}`)
  return normalizeStorageBackend(raw)
}

export async function createStorageBackend(
  payload: Omit<StorageBackend, 'id' | 'metadata' | 'status'> & { name: string },
): Promise<StorageBackend> {
  const raw = await request<unknown>('/storage_backends', {
    method: 'POST',
    body: JSON.stringify({
      metadata: { name: payload.name },
      provider: payload.provider,
      deployment_model: payload.deploymentModel,
      endpoint: payload.endpoint,
      credentials_secret_ref: payload.credentialsSecretRef,
      vip_pool: payload.vipPool,
    }),
  })
  return normalizeStorageBackend(raw)
}

export async function updateStorageBackend(
  id: string,
  patch: Partial<Pick<StorageBackend, 'endpoint' | 'credentialsSecretRef' | 'vipPool' | 'deploymentModel'>>,
): Promise<StorageBackend> {
  const raw = await request<unknown>(`/storage_backends/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      endpoint: patch.endpoint,
      credentials_secret_ref: patch.credentialsSecretRef,
      vip_pool: patch.vipPool,
      deployment_model: patch.deploymentModel,
    }),
  })
  return normalizeStorageBackend(raw)
}

export async function deleteStorageBackend(id: string): Promise<void> {
  await request<void>(`/storage_backends/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Org storage statuses (Phase 2)
// ---------------------------------------------------------------------------

export async function listOrgStorageStatuses(): Promise<PageOfT<OrgStorageStatus>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>(
    '/org_storage_statuses',
  )
  return {
    size: raw.size,
    total: raw.total,
    items: raw.items.map(normalizeOrgStorageStatus),
  }
}

export async function getOrgStorageStatus(orgId: string): Promise<OrgStorageStatus> {
  const raw = await request<unknown>(`/org_storage_statuses/${encodeURIComponent(orgId)}`)
  return normalizeOrgStorageStatus(raw)
}

// ---------------------------------------------------------------------------
// Storage Volumes (Phase 3)
// ---------------------------------------------------------------------------

export async function listStorageVolumes(orgId?: string): Promise<PageOfT<StorageVolume>> {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
  const raw = await request<{ size: number; total: number; items: unknown[] }>(
    `/storage_volumes${qs}`,
  )
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizeStorageVolume) }
}

export async function getStorageVolume(id: string): Promise<StorageVolume> {
  const raw = await request<unknown>(`/storage_volumes/${encodeURIComponent(id)}`)
  return normalizeStorageVolume(raw)
}

export async function createStorageVolume(payload: {
  name: string
  orgId: string
  sizeGiB: number
  tierId: string
  accessMode?: 'ReadWriteOnce' | 'ReadWriteMany'
}): Promise<StorageVolume> {
  const raw = await request<unknown>('/storage_volumes', {
    method: 'POST',
    body: JSON.stringify({
      metadata: { name: payload.name },
      org_id: payload.orgId,
      size_gi_b: payload.sizeGiB,
      tier_id: payload.tierId,
      access_mode: payload.accessMode ?? 'ReadWriteOnce',
    }),
  })
  return normalizeStorageVolume(raw)
}

export async function resizeStorageVolume(id: string, sizeGiB: number): Promise<StorageVolume> {
  const raw = await request<unknown>(`/storage_volumes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sizeGiB }),
  })
  return normalizeStorageVolume(raw)
}

export async function deleteStorageVolume(id: string): Promise<void> {
  await request<void>(`/storage_volumes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Mount a volume on a VM by PATCHing the VM's spec.disks list. */
export async function mountVolumeOnVm(
  vmId: string,
  volumeId: string,
  device?: string,
): Promise<ComputeInstance> {
  const current = await request<ComputeInstance>(`/compute_instances/${encodeURIComponent(vmId)}`)
  const existingDisks = (current as { spec?: { disks?: unknown[] } }).spec?.disks ?? []
  const raw = await request<unknown>(`/compute_instances/${encodeURIComponent(vmId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      spec: {
        disks: [...existingDisks, { pvc_ref: volumeId, device: device ?? '/dev/vdb' }],
      },
    }),
  })
  return raw as ComputeInstance
}

/** Unmount a volume from a VM by removing the disk entry from spec.disks. */
export async function unmountVolumeFromVm(
  vmId: string,
  volumeId: string,
): Promise<ComputeInstance> {
  const current = await request<ComputeInstance>(`/compute_instances/${encodeURIComponent(vmId)}`)
  const existingDisks = (current as { spec?: { disks?: Array<{ pvc_ref?: string }> } }).spec?.disks ?? []
  const raw = await request<unknown>(`/compute_instances/${encodeURIComponent(vmId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      spec: {
        disks: existingDisks.filter((d) => d.pvc_ref !== volumeId),
      },
    }),
  })
  return raw as ComputeInstance
}

// ---------------------------------------------------------------------------
// Volume Snapshots (Phase 4) — all paths nested under /storage_volumes/:volumeId
// ---------------------------------------------------------------------------

export async function listVolumeSnapshots(volumeId: string): Promise<PageOfT<VolumeSnapshot>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>(
    `/storage_volumes/${encodeURIComponent(volumeId)}/snapshots`,
  )
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizeVolumeSnapshot) }
}

export async function createVolumeSnapshot(
  volumeId: string,
  name: string,
  snapshotClassName?: string,
): Promise<VolumeSnapshot> {
  const raw = await request<unknown>(`/storage_volumes/${encodeURIComponent(volumeId)}/snapshots`, {
    method: 'POST',
    body: JSON.stringify({ name, snapshot_class_name: snapshotClassName }),
  })
  return normalizeVolumeSnapshot(raw)
}

export async function deleteVolumeSnapshot(volumeId: string, id: string): Promise<void> {
  await request<void>(
    `/storage_volumes/${encodeURIComponent(volumeId)}/snapshots/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function restoreVolumeSnapshot(
  volumeId: string,
  id: string,
  newVolumeName?: string,
): Promise<StorageVolume> {
  const raw = await request<unknown>(
    `/storage_volumes/${encodeURIComponent(volumeId)}/snapshots/${encodeURIComponent(id)}/restore`,
    {
      method: 'POST',
      body: JSON.stringify({ name: newVolumeName }),
    },
  )
  return normalizeStorageVolume(raw)
}

// Virtual network / subnet / security group CRUD moved to networkClient.ts
