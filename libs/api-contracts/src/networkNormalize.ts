/**
 * Wire → UI model normalization for Networking resources.
 * Wire format uses snake_case keys; UI model uses camelCase.
 * Mirrors osac.public.v1 proto definitions for VirtualNetwork, Subnet,
 * SecurityGroup, NetworkClass, PublicIP, and PublicIPPool.
 */
import type {
  NetworkClass,
  NetworkClassCapabilities,
  NetworkClassState,
  Protocol,
  PublicIP,
  PublicIPPool,
  PublicIPSpec,
  PublicIPState,
  PublicIPStatus,
  ResourceMetadata,
  SecurityGroup,
  SecurityGroupSpec,
  SecurityGroupState,
  SecurityGroupStatus,
  SecurityRule,
  Subnet,
  SubnetSpec,
  SubnetState,
  SubnetStatus,
  VirtualNetwork,
  VirtualNetworkCapabilities,
  VirtualNetworkSpec,
  VirtualNetworkState,
  VirtualNetworkStatus,
} from './types.js'

type WireRecord = Record<string, unknown>

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function bool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

function arr<T>(v: unknown, mapFn: (item: unknown) => T): T[] {
  return Array.isArray(v) ? v.map(mapFn) : []
}

function obj(v: unknown): WireRecord {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as WireRecord) : {}
}

// ---------------------------------------------------------------------------

function normalizeResourceMetadata(wire: unknown): ResourceMetadata {
  const w = obj(wire)
  return {
    name: str(w.name) ?? '',
    labels: obj(w.labels) as Record<string, string>,
    createdAt: str(w.created_at ?? w.createdAt),
    updatedAt: str(w.updated_at ?? w.updatedAt),
  }
}

// ---------------------------------------------------------------------------
// VirtualNetwork
// ---------------------------------------------------------------------------

function normalizeVirtualNetworkCapabilities(wire: unknown): VirtualNetworkCapabilities {
  const w = obj(wire)
  return {
    enableIpv4: bool(w.enable_ipv4 ?? w.enableIpv4),
    enableIpv6: bool(w.enable_ipv6 ?? w.enableIpv6),
    enableDualStack: bool(w.enable_dual_stack ?? w.enableDualStack),
  }
}

function normalizeVirtualNetworkSpec(wire: unknown): VirtualNetworkSpec {
  const w = obj(wire)
  return {
    networkClass: str(w.network_class ?? w.networkClass),
    ipv4Cidr: str(w.ipv4_cidr ?? w.ipv4Cidr),
    ipv6Cidr: str(w.ipv6_cidr ?? w.ipv6Cidr),
    capabilities: normalizeVirtualNetworkCapabilities(w.capabilities),
  }
}

function normalizeVirtualNetworkStatus(wire: unknown): VirtualNetworkStatus {
  const w = obj(wire)
  return {
    state: (str(w.state) ?? 'VIRTUAL_NETWORK_STATE_UNSPECIFIED') as VirtualNetworkState,
    message: str(w.message),
  }
}

export function normalizeVirtualNetwork(wire: unknown): VirtualNetwork {
  const w = obj(wire)
  return {
    id: str(w.id) ?? '',
    metadata: normalizeResourceMetadata(w.metadata),
    spec: normalizeVirtualNetworkSpec(w.spec),
    status: normalizeVirtualNetworkStatus(w.status),
  }
}

// ---------------------------------------------------------------------------
// Subnet
// ---------------------------------------------------------------------------

function normalizeSubnetSpec(wire: unknown): SubnetSpec {
  const w = obj(wire)
  return {
    virtualNetwork: str(w.virtual_network ?? w.virtualNetwork) ?? '',
    ipv4Cidr: str(w.ipv4_cidr ?? w.ipv4Cidr),
    ipv6Cidr: str(w.ipv6_cidr ?? w.ipv6Cidr),
  }
}

function normalizeSubnetStatus(wire: unknown): SubnetStatus {
  const w = obj(wire)
  return {
    state: (str(w.state) ?? 'SUBNET_STATE_UNSPECIFIED') as SubnetState,
    message: str(w.message),
  }
}

export function normalizeSubnet(wire: unknown): Subnet {
  const w = obj(wire)
  return {
    id: str(w.id) ?? '',
    metadata: normalizeResourceMetadata(w.metadata),
    spec: normalizeSubnetSpec(w.spec),
    status: normalizeSubnetStatus(w.status),
  }
}

// ---------------------------------------------------------------------------
// SecurityGroup
// ---------------------------------------------------------------------------

function normalizeSecurityRule(wire: unknown): SecurityRule {
  const w = obj(wire)
  return {
    protocol: (str(w.protocol) ?? 'PROTOCOL_UNSPECIFIED') as Protocol,
    portFrom: num(w.port_from ?? w.portFrom),
    portTo: num(w.port_to ?? w.portTo),
    ipv4Cidr: str(w.ipv4_cidr ?? w.ipv4Cidr),
    ipv6Cidr: str(w.ipv6_cidr ?? w.ipv6Cidr),
  }
}

function normalizeSecurityGroupSpec(wire: unknown): SecurityGroupSpec {
  const w = obj(wire)
  return {
    virtualNetwork: str(w.virtual_network ?? w.virtualNetwork) ?? '',
    ingress: arr(w.ingress, normalizeSecurityRule),
    egress: arr(w.egress, normalizeSecurityRule),
  }
}

function normalizeSecurityGroupStatus(wire: unknown): SecurityGroupStatus {
  const w = obj(wire)
  return {
    state: (str(w.state) ?? 'SECURITY_GROUP_STATE_UNSPECIFIED') as SecurityGroupState,
    message: str(w.message),
  }
}

export function normalizeSecurityGroup(wire: unknown): SecurityGroup {
  const w = obj(wire)
  return {
    id: str(w.id) ?? '',
    metadata: normalizeResourceMetadata(w.metadata),
    spec: normalizeSecurityGroupSpec(w.spec),
    status: normalizeSecurityGroupStatus(w.status),
  }
}

// ---------------------------------------------------------------------------
// NetworkClass
// ---------------------------------------------------------------------------

function normalizeNetworkClassCapabilities(wire: unknown): NetworkClassCapabilities {
  const w = obj(wire)
  return {
    supportsIpv4: bool(w.supports_ipv4 ?? w.supportsIpv4),
    supportsIpv6: bool(w.supports_ipv6 ?? w.supportsIpv6),
    supportsDualStack: bool(w.supports_dual_stack ?? w.supportsDualStack),
  }
}

export function normalizeNetworkClass(wire: unknown): NetworkClass {
  const w = obj(wire)
  const statusW = obj(w.status)
  return {
    id: str(w.id) ?? '',
    metadata: normalizeResourceMetadata(w.metadata),
    title: str(w.title) ?? '',
    description: str(w.description),
    capabilities: normalizeNetworkClassCapabilities(w.capabilities),
    status: {
      state: (str(statusW.state) ?? 'NETWORK_CLASS_STATE_UNSPECIFIED') as NetworkClassState,
      message: str(statusW.message),
    },
    isDefault: bool(w.is_default ?? w.isDefault),
  }
}

// ---------------------------------------------------------------------------
// PublicIP
// ---------------------------------------------------------------------------

function normalizePublicIPSpec(wire: unknown): PublicIPSpec {
  const w = obj(wire)
  return {
    pool: str(w.pool) ?? '',
    computeInstance: str(w.compute_instance ?? w.computeInstance) || undefined,
  }
}

function normalizePublicIPStatus(wire: unknown): PublicIPStatus {
  const w = obj(wire)
  return {
    state: (str(w.state) ?? 'PUBLIC_IP_STATE_UNSPECIFIED') as PublicIPState,
    message: str(w.message),
    address: str(w.address),
    pool: str(w.pool),
  }
}

export function normalizePublicIP(wire: unknown): PublicIP {
  const w = obj(wire)
  return {
    id: str(w.id) ?? '',
    metadata: normalizeResourceMetadata(w.metadata),
    spec: normalizePublicIPSpec(w.spec),
    status: normalizePublicIPStatus(w.status),
  }
}

// ---------------------------------------------------------------------------
// PublicIPPool
// ---------------------------------------------------------------------------

export function normalizePublicIPPool(wire: unknown): PublicIPPool {
  const w = obj(wire)
  const specW = obj(w.spec)
  const statusW = obj(w.status)
  return {
    id: str(w.id) ?? '',
    metadata: normalizeResourceMetadata(w.metadata),
    spec: { cidr: str(specW.cidr) },
    status: {
      state: str(statusW.state),
      availableCount: num(statusW.available_count ?? statusW.availableCount),
    },
  }
}
