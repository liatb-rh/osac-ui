/**
 * BFF API client for Cluster resources.
 * All functions route through /api on the same origin.
 */
import type { Agent, Cluster, ClusterCatalogItem, PageOfT, StorageTier } from '@osac/api-contracts'
import { buildAuthHeaders } from './authToken'
import {
  normalizeAgent,
  normalizeCatalogItem,
  normalizeCatalogItemPage,
  normalizeCluster,
  normalizeClusterPage,
  normalizeStorageTier,
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
  const raw = await request<unknown>(`/agents/${encodeURIComponent(id)}/provision`, { method: 'POST', body: '{}' })
  return normalizeAgent(raw)
}

export async function deprovisionAgent(id: string): Promise<Agent> {
  const raw = await request<unknown>(`/agents/${encodeURIComponent(id)}/deprovision`, { method: 'POST', body: '{}' })
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

export async function patchStorageTier(id: string, patch: Partial<StorageTier>): Promise<StorageTier> {
  const raw = await request<unknown>(`/storage_tiers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return normalizeStorageTier(raw)
}

// Virtual network / subnet / security group CRUD moved to networkClient.ts
