/**
 * BFF API client for Networking resources.
 * Covers VirtualNetwork, Subnet, SecurityGroup, NetworkClass, PublicIP, PublicIPPool.
 */
import type {
  NetworkClass,
  PageOfT,
  PublicIP,
  PublicIPPool,
  SecurityGroup,
  Subnet,
  VirtualNetwork,
} from '@osac/api-contracts'
import {
  normalizeNetworkClass,
  normalizePublicIP,
  normalizePublicIPPool,
  normalizeSecurityGroup,
  normalizeSubnet,
  normalizeVirtualNetwork,
} from '@osac/api-contracts'
import { buildAuthHeaders } from './authToken'

const BASE = '/api/fulfillment/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: buildAuthHeaders({ 'Content-Type': 'application/json', ...init?.headers }),
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${body || res.statusText}`)
  }
  const ct = res.headers.get('content-type') ?? ''
  if (res.status === 204 || res.status === 205 || !ct.includes('application/json')) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// VirtualNetwork
// ---------------------------------------------------------------------------

export async function listVirtualNetworks(): Promise<PageOfT<VirtualNetwork>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/virtual_networks')
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizeVirtualNetwork) }
}

export async function getVirtualNetwork(id: string): Promise<VirtualNetwork> {
  const raw = await request<unknown>(`/virtual_networks/${id}`)
  return normalizeVirtualNetwork(raw)
}

export interface CreateVirtualNetworkParams {
  name: string
  networkClass?: string
  ipv4Cidr?: string
  ipv6Cidr?: string
}

export async function createVirtualNetwork(
  params: CreateVirtualNetworkParams,
): Promise<VirtualNetwork> {
  const raw = await request<unknown>('/virtual_networks', {
    method: 'POST',
    body: JSON.stringify({
      metadata: { name: params.name },
      spec: {
        network_class: params.networkClass,
        ipv4_cidr: params.ipv4Cidr,
        ipv6_cidr: params.ipv6Cidr,
        capabilities: {
          enable_ipv4: !!params.ipv4Cidr,
          enable_ipv6: !!params.ipv6Cidr,
          enable_dual_stack: !!(params.ipv4Cidr && params.ipv6Cidr),
        },
      },
    }),
  })
  return normalizeVirtualNetwork(raw)
}

export async function deleteVirtualNetwork(id: string): Promise<void> {
  await request<void>(`/virtual_networks/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Subnet
// ---------------------------------------------------------------------------

export async function listSubnets(virtualNetworkId?: string): Promise<PageOfT<Subnet>> {
  const qs = virtualNetworkId ? `?virtual_network_id=${encodeURIComponent(virtualNetworkId)}` : ''
  const raw = await request<{ size: number; total: number; items: unknown[] }>(`/subnets${qs}`)
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizeSubnet) }
}

export interface CreateSubnetParams {
  name: string
  virtualNetworkId: string
  ipv4Cidr?: string
  ipv6Cidr?: string
}

export async function createSubnet(params: CreateSubnetParams): Promise<Subnet> {
  const raw = await request<unknown>('/subnets', {
    method: 'POST',
    body: JSON.stringify({
      metadata: { name: params.name },
      spec: {
        virtual_network: params.virtualNetworkId,
        ipv4_cidr: params.ipv4Cidr,
        ipv6_cidr: params.ipv6Cidr,
      },
    }),
  })
  return normalizeSubnet(raw)
}

export async function deleteSubnet(id: string): Promise<void> {
  await request<void>(`/subnets/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// SecurityGroup
// ---------------------------------------------------------------------------

export async function listSecurityGroups(): Promise<PageOfT<SecurityGroup>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/security_groups')
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizeSecurityGroup) }
}

export interface CreateSecurityGroupParams {
  name: string
  virtualNetworkId: string
}

export async function createSecurityGroup(
  params: CreateSecurityGroupParams,
): Promise<SecurityGroup> {
  const raw = await request<unknown>('/security_groups', {
    method: 'POST',
    body: JSON.stringify({
      metadata: { name: params.name },
      spec: {
        virtual_network: params.virtualNetworkId,
        ingress: [],
        egress: [],
      },
    }),
  })
  return normalizeSecurityGroup(raw)
}

export async function deleteSecurityGroup(id: string): Promise<void> {
  await request<void>(`/security_groups/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// NetworkClass (read-only)
// ---------------------------------------------------------------------------

export async function listNetworkClasses(): Promise<PageOfT<NetworkClass>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/network_classes')
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizeNetworkClass) }
}

// ---------------------------------------------------------------------------
// PublicIP
// ---------------------------------------------------------------------------

export async function listPublicIPs(): Promise<PageOfT<PublicIP>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/public_ips')
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizePublicIP) }
}

export interface AllocatePublicIPParams {
  name: string
  poolId: string
}

export async function createPublicIP(params: AllocatePublicIPParams): Promise<PublicIP> {
  const raw = await request<unknown>('/public_ips', {
    method: 'POST',
    body: JSON.stringify({
      metadata: { name: params.name },
      spec: { pool: params.poolId },
    }),
  })
  return normalizePublicIP(raw)
}

export async function updatePublicIP(
  id: string,
  computeInstanceId: string | null,
): Promise<PublicIP> {
  const raw = await request<unknown>(`/public_ips/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      spec: { compute_instance: computeInstanceId },
    }),
  })
  return normalizePublicIP(raw)
}

export async function deletePublicIP(id: string): Promise<void> {
  await request<void>(`/public_ips/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// PublicIPPool (read-only — used by allocate modal)
// ---------------------------------------------------------------------------

export async function listPublicIPPools(): Promise<PageOfT<PublicIPPool>> {
  const raw = await request<{ size: number; total: number; items: unknown[] }>('/public_ip_pools')
  return { size: raw.size, total: raw.total, items: raw.items.map(normalizePublicIPPool) }
}
