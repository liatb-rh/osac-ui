/**
 * Wire → UI model normalization for Cluster resources.
 * Wire format uses snake_case keys and CLUSTER_STATE_* enum strings.
 * UI model uses camelCase.
 */
import type {
  Agent,
  Cluster,
  ClusterCatalogItem,
  ClusterCondition,
  ClusterFieldDefinition,
  ClusterNodeSet,
  ClusterSpec,
  ClusterSpecNetwork,
  ClusterState,
  ClusterStatus,
  ClusterStatusNetwork,
  ClusterStorageStatus,
  PageOfT,
  StorageTier,
  VolumeSnapshotClass,
} from '@osac/api-contracts'

type WireRecord = Record<string, unknown>

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function bool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

function arr<T>(v: unknown, mapFn: (item: unknown) => T): T[] {
  return Array.isArray(v) ? v.map(mapFn) : []
}

function obj(v: unknown): WireRecord {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as WireRecord) : {}
}

// ---------------------------------------------------------------------------

function normalizeNodeSet(wire: unknown): ClusterNodeSet {
  const w = obj(wire)
  return {
    hostType: str(w.host_type ?? w.hostType),
    size: typeof w.size === 'number' ? w.size : 0,
  }
}

function normalizeNodeSets(wire: unknown): Record<string, ClusterNodeSet> {
  const w = obj(wire)
  const result: Record<string, ClusterNodeSet> = {}
  for (const [key, val] of Object.entries(w)) {
    result[key] = normalizeNodeSet(val)
  }
  return result
}

function normalizeSpecNetwork(wire: unknown): ClusterSpecNetwork {
  const w = obj(wire)
  return {
    podCidr: str(w.pod_cidr ?? w.podCidr),
    serviceCidr: str(w.service_cidr ?? w.serviceCidr),
    virtualNetworkRef: str(w.virtual_network_ref ?? w.virtualNetworkRef),
    subnetRef: str(w.subnet_ref ?? w.subnetRef),
    securityGroupRefs: Array.isArray(w.security_group_refs ?? w.securityGroupRefs)
      ? ((w.security_group_refs ?? w.securityGroupRefs) as string[])
      : undefined,
  }
}

function normalizeSpec(wire: unknown): ClusterSpec {
  const w = obj(wire)
  return {
    catalogItem: str(w.catalog_item ?? w.catalogItem),
    template: str(w.template),
    templateParameters: obj(w.template_parameters ?? w.templateParameters) as Record<
      string,
      unknown
    >,
    nodeSets: normalizeNodeSets(w.node_sets ?? w.nodeSets),
    releaseImage: str(w.release_image ?? w.releaseImage),
    sshPublicKey: str(w.ssh_public_key ?? w.sshPublicKey),
    network: w.network ? normalizeSpecNetwork(w.network) : undefined,
  }
}

function normalizeCondition(wire: unknown): ClusterCondition {
  const w = obj(wire)
  return {
    type: str(w.type) ?? '',
    status: str(w.status) ?? '',
    reason: str(w.reason),
    message: str(w.message),
    lastTransitionTime: str(w.last_transition_time ?? w.lastTransitionTime),
  }
}

function normalizeStatusNetwork(wire: unknown): ClusterStatusNetwork {
  const w = obj(wire)
  return {
    apiPublicIp: str(w.api_public_ip ?? w.apiPublicIp),
    ingressPublicIp: str(w.ingress_public_ip ?? w.ingressPublicIp),
    dnsRecords: Array.isArray(w.dns_records ?? w.dnsRecords)
      ? ((w.dns_records ?? w.dnsRecords) as string[])
      : undefined,
  }
}

function normalizeStorageStatus(wire: unknown): ClusterStorageStatus {
  const w = obj(wire)
  return {
    csiDriver: str(w.csi_driver ?? w.csiDriver),
    storageClasses: arr(w.storage_classes ?? w.storageClasses, (sc) => {
      const s = obj(sc)
      return {
        name: str(s.name) ?? '',
        tier: str(s.tier),
        isDefault: bool(s.is_default ?? s.isDefault),
        parameters: obj(s.parameters) as Record<string, string>,
      }
    }),
    volumeSnapshotClasses: arr(
      w.volume_snapshot_classes ?? w.volumeSnapshotClasses,
      (vsc): VolumeSnapshotClass => {
        const v = obj(vsc)
        return {
          name: str(v.name) ?? '',
          driver: str(v.driver),
          deletionPolicy: str(v.deletion_policy ?? v.deletionPolicy),
          isDefault: bool(v.is_default ?? v.isDefault),
        }
      },
    ),
  }
}

function normalizeStatus(wire: unknown): ClusterStatus {
  const w = obj(wire)
  return {
    state: (str(w.state) ?? 'CLUSTER_STATE_UNSPECIFIED') as ClusterState,
    conditions: arr(w.conditions, normalizeCondition),
    apiUrl: str(w.api_url ?? w.apiUrl),
    consoleUrl: str(w.console_url ?? w.consoleUrl),
    nodeSets: normalizeNodeSets(w.node_sets ?? w.nodeSets),
    version: str(w.version),
    upgradeState: str(w.upgrade_state ?? w.upgradeState),
    storageReady: bool(w.storage_ready ?? w.storageReady),
    storage: w.storage ? normalizeStorageStatus(w.storage) : undefined,
    network: w.network ? normalizeStatusNetwork(w.network) : undefined,
  }
}

export function normalizeCluster(wire: unknown): Cluster {
  const w = obj(wire)
  const meta = obj(w.metadata)
  return {
    id: str(w.id) ?? '',
    metadata: {
      name: str(meta.name) ?? '',
      createdAt: str(meta.creation_timestamp ?? meta.createdAt),
      version: typeof meta.version === 'number' ? meta.version : undefined,
      labels: meta.labels as Record<string, string> | undefined,
      creators: Array.isArray(meta.creators) ? (meta.creators as string[]) : undefined,
      tenants: Array.isArray(meta.tenants) ? (meta.tenants as string[]) : undefined,
    },
    spec: normalizeSpec(w.spec),
    status: normalizeStatus(w.status),
  }
}

export function normalizeClusterPage(wire: unknown): PageOfT<Cluster> {
  const w = obj(wire)
  return {
    size: typeof w.size === 'number' ? w.size : 0,
    total: typeof w.total === 'number' ? w.total : 0,
    items: arr(w.items, normalizeCluster),
  }
}

// ---------------------------------------------------------------------------
// ClusterCatalogItem normalization
// ---------------------------------------------------------------------------

function normalizeFieldDefinition(wire: unknown): ClusterFieldDefinition {
  const w = obj(wire)
  return {
    path: str(w.path) ?? '',
    displayName: str(w.display_name ?? w.displayName) ?? '',
    editable: bool(w.editable) ?? true,
    default: w.default,
    validationSchema: str(w.validation_schema ?? w.validationSchema),
  }
}

export function normalizeCatalogItem(wire: unknown): ClusterCatalogItem {
  const w = obj(wire)
  const meta = obj(w.metadata)
  return {
    id: str(w.id) ?? '',
    metadata: meta.name
      ? {
          name: str(meta.name) ?? '',
          createdAt: str(meta.creation_timestamp ?? meta.createdAt),
        }
      : undefined,
    title: str(w.title) ?? '',
    description: str(w.description),
    template: str(w.template),
    published: bool(w.published) ?? false,
    allowedVersions: Array.isArray(w.allowed_versions ?? w.allowedVersions)
      ? ((w.allowed_versions ?? w.allowedVersions) as string[])
      : undefined,
    fieldDefinitions: arr(w.field_definitions ?? w.fieldDefinitions, normalizeFieldDefinition),
  }
}

export function normalizeCatalogItemPage(wire: unknown): PageOfT<ClusterCatalogItem> {
  const w = obj(wire)
  return {
    size: typeof w.size === 'number' ? w.size : 0,
    total: typeof w.total === 'number' ? w.total : 0,
    items: arr(w.items, normalizeCatalogItem),
  }
}

// ---------------------------------------------------------------------------
// Agent normalization (pass-through for mock; already camelCase)
// ---------------------------------------------------------------------------

export function normalizeAgent(wire: unknown): Agent {
  const w = obj(wire)
  const meta = obj(w.metadata)
  return {
    id: str(w.id) ?? '',
    metadata: meta.name
      ? { name: str(meta.name) ?? '', createdAt: str(meta.creation_timestamp ?? meta.createdAt) }
      : undefined,
    state: (str(w.state) ?? 'AGENT_STATE_UNAVAILABLE') as Agent['state'],
    hardwareProfile: str(w.hardware_profile ?? w.hardwareProfile),
    clusterRef: str(w.cluster_ref ?? w.clusterRef),
    inventoryBackend: str(w.inventory_backend ?? w.inventoryBackend),
  }
}

// ---------------------------------------------------------------------------
// StorageTier normalization
// ---------------------------------------------------------------------------

export function normalizeStorageTier(wire: unknown): StorageTier {
  const w = obj(wire)
  const rawTenantIds = w.available_tenant_ids ?? w.availableTenantIds
  return {
    id: str(w.id) ?? '',
    name: str(w.name) ?? '',
    qosClass: str(w.qos_class ?? w.qosClass),
    vipPool: str(w.vip_pool ?? w.vipPool),
    storageClassName: str(w.storage_class_name ?? w.storageClassName),
    available: bool(w.available) ?? false,
    availableTenantIds: Array.isArray(rawTenantIds) ? (rawTenantIds as string[]) : [],
  }
}
