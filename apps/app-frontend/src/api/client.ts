/**
 * BFF API client — always routes through /api on the same origin.
 * Vite dev server proxies /api → backend:3001.
 * In production the BFF serves both the SPA and the API.
 */
import type {
  ClusterTemplate,
  ComputeInstance,
  FulfillmentCapabilities,
  PageOfT,
} from '@osac/api-contracts'
import {
  type ComputeInstancePowerAction,
  type SerializeComputeInstanceForCreateOptions,
  normalizeComputeInstance,
  normalizeComputeInstancePage,
  normalizeComputeInstanceTemplate,
  normalizeComputeInstanceTemplatePage,
  serializeComputeInstanceForCreate,
  serializeComputeInstancePowerPatch,
} from '@osac/api-contracts'
import { buildAuthHeaders } from './authToken'

const BASE = '/api/fulfillment/v1'

async function parseJson(res: Response): Promise<unknown> {
  return res.json()
}

/** POST/PATCH fulfillment returns `{ object }` for some resources; GET returns the resource directly. */
function unwrapFulfillmentObject(data: unknown): unknown {
  if (data && typeof data === 'object' && data !== null && 'object' in data) {
    const o = (data as { object?: unknown }).object
    if (o !== undefined) return o
  }
  return data
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

export function getFulfillmentCapabilities(): Promise<FulfillmentCapabilities> {
  return request<FulfillmentCapabilities>('/capabilities')
}

// ---------------------------------------------------------------------------
// Compute instances (normalized wire → ComputeInstance)
// ---------------------------------------------------------------------------

export interface ListComputeInstancesParams {
  filter?: string
  limit?: number
  offset?: number
}

export async function listComputeInstances(
  params: ListComputeInstancesParams = {},
): Promise<PageOfT<ComputeInstance>> {
  const q = new URLSearchParams()
  if (params.filter) q.set('filter', params.filter)
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const qs = q.toString()
  const path = `/compute_instances${qs ? `?${qs}` : ''}`
  const res = await fetch(`${BASE}${path}`, {
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  return normalizeComputeInstancePage(await parseJson(res))
}

export async function getComputeInstance(id: string): Promise<ComputeInstance> {
  const res = await fetch(`${BASE}/compute_instances/${encodeURIComponent(id)}`, {
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  return normalizeComputeInstance(await parseJson(res))
}

export async function createComputeInstance(
  vm: Partial<ComputeInstance>,
  opts?: SerializeComputeInstanceForCreateOptions,
): Promise<ComputeInstance> {
  const res = await fetch(`${BASE}/compute_instances`, {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    /** Fulfillment HTTP unmarshals **ComputeInstance** at root (not `{ "object": … }`). */
    body: JSON.stringify(serializeComputeInstanceForCreate(vm, opts)),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  const raw = unwrapFulfillmentObject(await parseJson(res))
  if (raw == null || typeof raw !== 'object')
    throw new Error('API: missing object in create response')
  return normalizeComputeInstance(raw)
}

export async function patchComputeInstance(
  id: string,
  patch: Partial<ComputeInstance>,
): Promise<ComputeInstance> {
  const res = await fetch(`${BASE}/compute_instances/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  const raw = unwrapFulfillmentObject(await parseJson(res))
  if (raw == null || typeof raw !== 'object')
    throw new Error('API: missing object in patch response')
  return normalizeComputeInstance(raw)
}

export async function patchComputeInstancePower(
  id: string,
  action: ComputeInstancePowerAction,
): Promise<ComputeInstance> {
  const res = await fetch(`${BASE}/compute_instances/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(serializeComputeInstancePowerPatch(action)),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  const raw = unwrapFulfillmentObject(await parseJson(res))
  if (raw == null || typeof raw !== 'object')
    throw new Error('API: missing object in patch response')
  return normalizeComputeInstance(raw)
}

export async function deleteComputeInstance(id: string): Promise<void> {
  const res = await fetch(`${BASE}/compute_instances/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    /** No Content-Type without a body — Fastify rejects empty JSON bodies (FST_ERR_CTP_EMPTY_JSON_BODY). */
    headers: buildAuthHeaders(),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
}

// ---------------------------------------------------------------------------
// Compute instance templates (VM catalog + wizard; template-catalog-wizard-api-alignment)
// ---------------------------------------------------------------------------

export interface ListComputeInstanceTemplatesParams {
  filter?: string
  limit?: number
  offset?: number
}

export async function listComputeInstanceTemplates(
  params: ListComputeInstanceTemplatesParams = {},
): Promise<PageOfT<ClusterTemplate>> {
  const q = new URLSearchParams()
  if (params.filter) q.set('filter', params.filter)
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  const qs = q.toString()
  const path = `/compute_instance_templates${qs ? `?${qs}` : ''}`
  const res = await fetch(`${BASE}${path}`, {
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  return normalizeComputeInstanceTemplatePage(await parseJson(res))
}

export async function getComputeInstanceTemplate(id: string): Promise<ClusterTemplate> {
  const res = await fetch(`${BASE}/compute_instance_templates/${encodeURIComponent(id)}`, {
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  return normalizeComputeInstanceTemplate(await parseJson(res))
}
