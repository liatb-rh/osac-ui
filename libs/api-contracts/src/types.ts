// ---------------------------------------------------------------------------
// Shared domain types aligned to backend-fulfillment.yaml
// ---------------------------------------------------------------------------

export interface Metadata {
  name: string
  version?: number
  labels?: Record<string, string>
  /** RFC3339 — mapped from wire `creation_timestamp`. */
  createdAt?: string
  /** Wire: creators[] */
  creators?: string[]
  /** Tenancy scope from upstream */
  tenants?: string[]
}

export interface PageOfT<T> {
  size: number
  total: number
  items: T[]
}

export interface ListQuery {
  offset?: number
  limit?: number
  filter?: string
  order?: string
}

// ---------------------------------------------------------------------------
// Compute instances (VMs)
// ---------------------------------------------------------------------------

export type VmPowerState =
  | 'running'
  | 'stopped'
  | 'paused'
  | 'starting'
  | 'stopping'
  | 'restarting'
  | 'deleting'
  | 'error'
  /** Client-only: wizard POST submitted, VM not yet in list (My VMs placeholder). */
  | 'creating'
  /** Client-only: list still missing VM after long wait (My VMs placeholder). */
  | 'still_provisioning'

/** One NIC attachment — subnet + security groups must be READY and same VNet. */
export interface NetworkAttachment {
  subnet: string
  securityGroups: string[]
}

export interface ComputeInstanceSpec {
  template?: string
  /** Template param values (ProtoJSON Any map). The create-from-template wizard does not populate this; use top-level `spec` fields instead. */
  templateParameters?: Record<string, unknown>
  cores?: number
  memoryGib?: number
  image?: Record<string, unknown>
  bootDisk?: Record<string, unknown>
  additionalDisks?: Record<string, unknown>[]
  /** Fulfillment `run_strategy`: `Always` | `Halted` on REST wire; legacy `RUN_STRATEGY_*` strings are normalized on read. */
  runStrategy?: string
  sshKey?: string
  userData?: string
  /** Network interface attachments (backend-fulfillment: network_attachments). At least one required on create. */
  networkAttachments?: NetworkAttachment[]
  /** @deprecated Use networkAttachments[0].subnet. Kept for read normalisation of legacy wire responses. */
  subnet?: string
  /** @deprecated Use networkAttachments[0].securityGroups. Kept for read normalisation of legacy wire responses. */
  securityGroups?: string[]
  restartRequestedAt?: string
}

export interface ComputeInstanceCondition {
  type: string
  /** Wire may carry CONDITION_STATUS_*; UI formats via formatConditionStatusForDisplay */
  status: string
  reason?: string
  message?: string
  /** Mapped from wire last_transition_time */
  lastTransitionTime?: string
}

export interface ComputeInstanceStatus {
  state: VmPowerState
  conditions?: ComputeInstanceCondition[]
  ipAddress?: string
  lastRestartedAt?: string
}

export interface ComputeInstance {
  id: string
  metadata: Metadata
  spec: ComputeInstanceSpec
  status: ComputeInstanceStatus
  /** UI-level fields not in proto but useful for demo */
  description?: string
  os?: OsType
  createdAtMs?: number
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface ClusterTemplateSummary {
  id: string
  title: string
  description?: string
}

export type TemplateWorkloadProfile =
  | 'high-performance'
  | 'analytics'
  | 'machine-learning'
  | 'data-processing'

export interface ClusterTemplate extends ClusterTemplateSummary {
  metadata: Metadata
  spec?: Record<string, unknown>
  status?: Record<string, unknown>
  /** UI extras */
  workload?: string
  /** Wizard: filter chip and card footer label (maps to display string in app). */
  workloadProfile?: TemplateWorkloadProfile
  /** Demo defaults for card summary and BFF template finalize spec.cores / memoryGib. */
  defaultCores?: number
  defaultMemoryGib?: number
  /** From fulfillment **defaults** / **spec_defaults**.boot_disk.size_gib (GiB) for cards and wizard boot disk default. */
  defaultBootDiskSizeGib?: number
  tags?: string[]
  /** OS family for icon + filter: rhel | windows | linux */
  icon?: string
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface OsacEvent {
  id: string
  type: string
  timestamp: string
  relatedObjectRefs?: { kind: string; id: string; name?: string }[]
  message?: string
  severity?: 'info' | 'warning' | 'danger' | 'success'
}

// ---------------------------------------------------------------------------
// Organizations & Identity
// ---------------------------------------------------------------------------

export type IdpType = 'LDAP' | 'ActiveDirectory' | 'OIDC' | 'SAML'
export type IdpStatus = 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED' | 'UNCONFIGURED'

export interface IdentityProvider {
  type: IdpType
  /** OIDC issuer URL or LDAP host endpoint */
  issuerUrl?: string
  /** OIDC client ID only */
  clientId?: string
  status: IdpStatus
  lastHealthCheck?: string
}

export interface OrgProject {
  id: string
  name: string
  /** e.g. osac-org-northstar-project-default */
  openshiftNamespace: string
  createdAt: string
}

export interface TenantAdmin {
  id: string
  email: string
  /** true = stored directly in Keycloak, not routed via org IdP */
  isBreakGlass: boolean
  createdAt: string
}

export type OsacSystemRole = 'cloud-provider-admin' | 'cloud-provider-reader' | 'catalog-curator'
export type OsacOrgRole = 'tenant-admin' | 'tenant-reader' | 'tenant-user'

export interface RoleAssignment {
  /** User email or IdP group name */
  subject: string
  role: OsacSystemRole | OsacOrgRole
  source: 'break-glass' | 'idp-group'
}

export interface Organization {
  id: string
  metadata: Metadata
  displayName: string
  description?: string
  status?: string
  vmCount?: number
  /** Keycloak realm name for this organization */
  realm?: string
  idp?: IdentityProvider
  tenantAdmins?: TenantAdmin[]
  projects?: OrgProject[]
  clusterCount?: number
}

// ---------------------------------------------------------------------------
// Console access
// ---------------------------------------------------------------------------

export interface ConsoleAccess {
  available: boolean
  reason?: string
  supportedTypes?: string[]
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface TrustedTokenIssuer {
  issuerUrl: string
}

export interface FulfillmentCapabilities {
  authn: {
    trustedTokenIssuers: TrustedTokenIssuer[]
  }
}

// ---------------------------------------------------------------------------
// RBAC / Session types
// ---------------------------------------------------------------------------

export type DemoTenantId = 'vertexa' | 'northstar' | 'evergreen'
export type OsacRole = 'providerAdmin' | 'tenantAdmin' | 'tenantUser'
export type OsType = 'rhel' | 'windows' | 'linux'

// ---------------------------------------------------------------------------
// Networking resources (proto-aligned)
// ---------------------------------------------------------------------------

export interface ResourceMetadata {
  name: string
  labels?: Record<string, string>
  createdAt?: string
  updatedAt?: string
}

export type VirtualNetworkState =
  | 'VIRTUAL_NETWORK_STATE_UNSPECIFIED'
  | 'VIRTUAL_NETWORK_STATE_PENDING'
  | 'VIRTUAL_NETWORK_STATE_READY'
  | 'VIRTUAL_NETWORK_STATE_FAILED'

export interface VirtualNetworkCapabilities {
  enableIpv4?: boolean
  enableIpv6?: boolean
  enableDualStack?: boolean
}

export interface VirtualNetworkSpec {
  networkClass?: string
  ipv4Cidr?: string
  ipv6Cidr?: string
  capabilities?: VirtualNetworkCapabilities
}

export interface VirtualNetworkStatus {
  state: VirtualNetworkState
  message?: string
}

export interface VirtualNetwork {
  id: string
  metadata: ResourceMetadata
  spec: VirtualNetworkSpec
  status: VirtualNetworkStatus
}

export type SubnetState =
  | 'SUBNET_STATE_UNSPECIFIED'
  | 'SUBNET_STATE_PENDING'
  | 'SUBNET_STATE_READY'
  | 'SUBNET_STATE_FAILED'
  | 'SUBNET_STATE_DELETING'
  | 'SUBNET_STATE_DELETE_FAILED'

export interface SubnetSpec {
  virtualNetwork: string
  ipv4Cidr?: string
  ipv6Cidr?: string
}

export interface SubnetStatus {
  state: SubnetState
  message?: string
}

export interface Subnet {
  id: string
  metadata: ResourceMetadata
  spec: SubnetSpec
  status: SubnetStatus
}

export type Protocol =
  | 'PROTOCOL_UNSPECIFIED'
  | 'PROTOCOL_TCP'
  | 'PROTOCOL_UDP'
  | 'PROTOCOL_ICMP'
  | 'PROTOCOL_ALL'

export interface SecurityRule {
  protocol: Protocol
  portFrom?: number
  portTo?: number
  ipv4Cidr?: string
  ipv6Cidr?: string
}

export type SecurityGroupState =
  | 'SECURITY_GROUP_STATE_UNSPECIFIED'
  | 'SECURITY_GROUP_STATE_PENDING'
  | 'SECURITY_GROUP_STATE_READY'
  | 'SECURITY_GROUP_STATE_FAILED'
  | 'SECURITY_GROUP_STATE_DELETING'
  | 'SECURITY_GROUP_STATE_DELETE_FAILED'

export interface SecurityGroupSpec {
  virtualNetwork: string
  ingress?: SecurityRule[]
  egress?: SecurityRule[]
}

export interface SecurityGroupStatus {
  state: SecurityGroupState
  message?: string
}

export interface SecurityGroup {
  id: string
  metadata: ResourceMetadata
  spec: SecurityGroupSpec
  status: SecurityGroupStatus
}

export type NetworkClassState =
  | 'NETWORK_CLASS_STATE_UNSPECIFIED'
  | 'NETWORK_CLASS_STATE_PENDING'
  | 'NETWORK_CLASS_STATE_READY'
  | 'NETWORK_CLASS_STATE_FAILED'

export interface NetworkClassCapabilities {
  supportsIpv4?: boolean
  supportsIpv6?: boolean
  supportsDualStack?: boolean
}

export interface NetworkClass {
  id: string
  metadata: ResourceMetadata
  title: string
  description?: string
  capabilities: NetworkClassCapabilities
  status: { state: NetworkClassState; message?: string }
  isDefault?: boolean
}

export type PublicIPState =
  | 'PUBLIC_IP_STATE_UNSPECIFIED'
  | 'PUBLIC_IP_STATE_PENDING'
  | 'PUBLIC_IP_STATE_ALLOCATED'
  | 'PUBLIC_IP_STATE_ATTACHING'
  | 'PUBLIC_IP_STATE_ATTACHED'
  | 'PUBLIC_IP_STATE_RELEASING'
  | 'PUBLIC_IP_STATE_FAILED'

export interface PublicIPSpec {
  pool: string
  computeInstance?: string
}

export interface PublicIPStatus {
  state: PublicIPState
  message?: string
  address?: string
  pool?: string
}

export interface PublicIP {
  id: string
  metadata: ResourceMetadata
  spec: PublicIPSpec
  status: PublicIPStatus
}

export interface PublicIPPool {
  id: string
  metadata: ResourceMetadata
  spec: { cidr?: string }
  status: { state?: string; availableCount?: number }
}

// ---------------------------------------------------------------------------
// Clusters (CaaS)
// ---------------------------------------------------------------------------

export type ClusterState =
  | 'CLUSTER_STATE_PROGRESSING'
  | 'CLUSTER_STATE_READY'
  | 'CLUSTER_STATE_FAILED'
  | 'CLUSTER_STATE_UPGRADING'
  | 'CLUSTER_STATE_UPGRADE_FAILED'
  | 'CLUSTER_STATE_UNSPECIFIED'

export interface ClusterNodeSet {
  hostType?: string
  size: number
}

export interface ClusterSpecNetwork {
  podCidr?: string
  serviceCidr?: string
  virtualNetworkRef?: string
  subnetRef?: string
  securityGroupRefs?: string[]
}

export interface ClusterSpec {
  catalogItem?: string
  template?: string
  templateParameters?: Record<string, unknown>
  nodeSets?: Record<string, ClusterNodeSet>
  releaseImage?: string
  sshPublicKey?: string
  network?: ClusterSpecNetwork
}

export interface ClusterCondition {
  type: string
  status: string
  reason?: string
  message?: string
  lastTransitionTime?: string
}

export interface ClusterStatusNetwork {
  apiPublicIp?: string
  ingressPublicIp?: string
  dnsRecords?: string[]
}

export interface ClusterStorageClass {
  name: string
  /** StorageTier id this class was created for (e.g. "fast", "standard", "archive"). */
  tier?: string
  isDefault?: boolean
  parameters?: Record<string, string>
}

export interface VolumeSnapshotClass {
  name: string
  driver?: string
  /** "Retain" or "Delete" */
  deletionPolicy?: string
  isDefault?: boolean
}

export interface ClusterStorageStatus {
  csiDriver?: string
  storageClasses?: ClusterStorageClass[]
  volumeSnapshotClasses?: VolumeSnapshotClass[]
}

export interface ClusterStatus {
  state: ClusterState
  conditions?: ClusterCondition[]
  apiUrl?: string
  consoleUrl?: string
  nodeSets?: Record<string, ClusterNodeSet>
  version?: string
  upgradeState?: string
  storageReady?: boolean
  storage?: ClusterStorageStatus
  network?: ClusterStatusNetwork
}

export interface Cluster {
  id: string
  metadata: Metadata
  spec: ClusterSpec
  status: ClusterStatus
}

export interface ClusterFieldDefinition {
  path: string
  displayName: string
  editable: boolean
  default?: unknown
  validationSchema?: string
}

export interface ClusterCatalogItem {
  id: string
  metadata?: Metadata
  title: string
  description?: string
  template?: string
  published: boolean
  allowedVersions?: string[]
  fieldDefinitions?: ClusterFieldDefinition[]
}

// ---------------------------------------------------------------------------
// Agents (CaaS infrastructure)
// ---------------------------------------------------------------------------

export type AgentState =
  | 'AGENT_STATE_AVAILABLE'
  | 'AGENT_STATE_PROVISIONING'
  | 'AGENT_STATE_PROVISIONED'
  | 'AGENT_STATE_DEPROVISIONING'
  | 'AGENT_STATE_UNAVAILABLE'

export interface Agent {
  id: string
  metadata?: Metadata
  state: AgentState
  hardwareProfile?: string
  clusterRef?: string
  inventoryBackend?: string
}

export interface InventoryBackend {
  id: string
  name: string
  status: 'CONNECTED' | 'DISCONNECTED'
  endpointUrl?: string
  lastSyncTime?: string
}

// ---------------------------------------------------------------------------
// Storage tiers (CaaS VAST storage)
// ---------------------------------------------------------------------------

export interface StorageTier {
  id: string
  name: string
  qosClass?: string
  vipPool?: string
  storageClassName?: string
  available: boolean
  /** Tenant IDs for which this tier is enabled. Empty = available to all tenants. */
  availableTenantIds?: string[]
}

// ---------------------------------------------------------------------------
// Bare Metal Instances (fulfillment-service)
// ---------------------------------------------------------------------------

export type BareMetalInstanceState =
  | 'BARE_METAL_INSTANCE_STATE_UNSPECIFIED'
  | 'BARE_METAL_INSTANCE_STATE_PENDING'
  | 'BARE_METAL_INSTANCE_STATE_PROVISIONING'
  | 'BARE_METAL_INSTANCE_STATE_ACTIVE'
  | 'BARE_METAL_INSTANCE_STATE_DEPROVISIONING'
  | 'BARE_METAL_INSTANCE_STATE_FAILED'
  | 'BARE_METAL_INSTANCE_STATE_DELETING'

export interface FulfillmentBareMetalInstanceSpec {
  /** ID of the BareMetalInstanceCatalogItem that defines the hardware offering. Required on create. */
  catalogItem: string
  sshKey?: string
  userData?: string
  runStrategy?: string
}

export interface FulfillmentBareMetalInstanceStatus {
  state: BareMetalInstanceState
  message?: string
}

/** A bare metal instance provisioned via the fulfillment-service REST API. */
export interface FulfillmentBareMetalInstance {
  id: string
  metadata: ResourceMetadata
  spec: FulfillmentBareMetalInstanceSpec
  status: FulfillmentBareMetalInstanceStatus
}

export interface BareMetalInstanceCatalogItem {
  id: string
  metadata?: ResourceMetadata
  title: string
  description?: string
  published: boolean
}
