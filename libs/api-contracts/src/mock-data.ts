import type {
  Agent,
  Cluster,
  ClusterCatalogItem,
  ClusterTemplate,
  ComputeInstance,
  DemoTenantId,
  InventoryBackend,
  NetworkClass,
  Organization,
  OsType,
  OsacEvent,
  PublicIP,
  PublicIPPool,
  RoleAssignment,
  SecurityGroup,
  StorageTier,
  Subnet,
  VirtualNetwork,
  VmPowerState,
} from './types.js'
import { normalizeComputeInstance } from './computeInstanceNormalize.js'

// ---------------------------------------------------------------------------
// Demo tenant metadata
// ---------------------------------------------------------------------------

export const DEMO_TENANT_LABEL: Record<DemoTenantId, string> = {
  northstar: 'Northstar Bank',
  evergreen: 'Bluestone Financial Group',
  vertexa: 'Vertexa Cloud Solutions',
}

export const DEMO_PROVIDER_ADMIN_DISPLAY_NAME = 'Alex Johnson'

export const DEMO_TENANT_DISPLAY_USER: Record<DemoTenantId, string> = {
  northstar: 'Casey Morgan',
  evergreen: 'Priya Nair',
  vertexa: 'Alex Johnson',
}

export const DEMO_TENANT_DISPLAY_ADMIN: Record<DemoTenantId, string> = {
  northstar: 'J. Lee',
  evergreen: 'Marcus Chen',
  vertexa: 'Alex Johnson',
}

export const DEMO_TENANT_LOGIN_EMAIL_USER: Record<DemoTenantId, string> = {
  northstar: 'cmorgan@northstarbank.com',
  evergreen: 'priya.nair@bluestonefinancial.com',
  vertexa: 'alex.johnson@vertexacloud.com',
}

export const DEMO_TENANT_LOGIN_EMAIL_ADMIN: Record<DemoTenantId, string> = {
  northstar: 'jlee@northstarbank.com',
  evergreen: 'marcus.chen@bluestonefinancial.com',
  vertexa: 'alex.johnson@vertexacloud.com',
}

export const DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL = 'alex.johnson@vertexacloud.com'

export function demoLoginEmailForRole(
  tenant: DemoTenantId,
  role: 'providerAdmin' | 'tenantAdmin' | 'tenantUser',
): string {
  if (role === 'tenantAdmin') return DEMO_TENANT_LOGIN_EMAIL_ADMIN[tenant]
  return DEMO_TENANT_LOGIN_EMAIL_USER[tenant]
}

export function demoOperatingModeLabel(
  role: 'providerAdmin' | 'tenantAdmin' | 'tenantUser',
): string {
  if (role === 'providerAdmin') return 'Provider console'
  if (role === 'tenantAdmin') return 'Tenant admin'
  return 'VMaaS workspace'
}

export interface TenantSovereignty {
  regionEmoji: string
  regionAriaLabel: string
  regionLine: string
  complianceLabels: { text: string; color: 'blue' | 'green' | 'orange' | 'grey' }[]
  egressNote?: string
}

export const DEMO_TENANT_SOVEREIGNTY: Record<DemoTenantId, TenantSovereignty> = {
  northstar: {
    regionEmoji: '🇺🇸',
    regionAriaLabel: 'United States',
    regionLine: 'US East — on-prem',
    complianceLabels: [
      { text: 'SOC 2', color: 'blue' },
      { text: 'PCI-DSS', color: 'green' },
    ],
    egressNote: 'No cross-border egress',
  },
  evergreen: {
    regionEmoji: '🇨🇦',
    regionAriaLabel: 'Canada',
    regionLine: 'CA Central — on-prem',
    complianceLabels: [
      { text: 'PIPEDA', color: 'blue' },
      { text: 'SOC 2', color: 'green' },
    ],
    egressNote: 'Data residency: Canada only',
  },
  vertexa: {
    regionEmoji: '🌐',
    regionAriaLabel: 'Multi-region',
    regionLine: 'Multi-region provider view',
    complianceLabels: [
      { text: 'ISO 27001', color: 'orange' },
      { text: 'SOC 2', color: 'blue' },
    ],
  },
}

// ---------------------------------------------------------------------------
// VM power counts per tenant
// ---------------------------------------------------------------------------

interface VmPowerCounts {
  running: number
  paused: number
  stopped: number
}

export const DEMO_VM_POWER_COUNTS: Record<DemoTenantId, VmPowerCounts> = {
  northstar: { running: 12, paused: 3, stopped: 5 },
  evergreen: { running: 8, paused: 1, stopped: 4 },
  vertexa: { running: 20, paused: 4, stopped: 9 },
}

export function demoVmPowerTotal(tenant: DemoTenantId): number {
  const c = DEMO_VM_POWER_COUNTS[tenant]
  return c.running + c.paused + c.stopped
}

// ---------------------------------------------------------------------------
// VM seed data builders
// ---------------------------------------------------------------------------

interface VmBlueprint {
  name: string
  os: OsType
  state: VmPowerState
  cores: number
  memoryGib: number
  subnet?: string
  ipAddress?: string
  description?: string
}

const NORTHSTAR_VMS: VmBlueprint[] = [
  {
    name: 'ns-banking-api-01',
    os: 'rhel',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'prod-east-1a',
    ipAddress: '10.10.1.11',
    description: 'Banking API gateway',
  },
  {
    name: 'ns-banking-api-02',
    os: 'rhel',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'prod-east-1a',
    ipAddress: '10.10.1.12',
    description: 'Banking API gateway (replica)',
  },
  {
    name: 'ns-db-primary',
    os: 'rhel',
    state: 'running',
    cores: 16,
    memoryGib: 64,
    subnet: 'db-east-1a',
    ipAddress: '10.10.2.10',
    description: 'PostgreSQL primary',
  },
  {
    name: 'ns-db-replica-01',
    os: 'rhel',
    state: 'running',
    cores: 16,
    memoryGib: 64,
    subnet: 'db-east-1b',
    ipAddress: '10.10.2.11',
    description: 'PostgreSQL read replica',
  },
  {
    name: 'ns-devops-jenkins',
    os: 'linux',
    state: 'running',
    cores: 4,
    memoryGib: 16,
    subnet: 'mgmt-east-1a',
    ipAddress: '10.10.3.5',
    description: 'CI/CD Jenkins',
  },
  {
    name: 'ns-compliance-scan',
    os: 'linux',
    state: 'running',
    cores: 2,
    memoryGib: 8,
    subnet: 'mgmt-east-1a',
    description: 'Compliance scanning workload',
  },
  {
    name: 'ns-web-frontend',
    os: 'linux',
    state: 'running',
    cores: 4,
    memoryGib: 8,
    subnet: 'prod-east-1b',
    ipAddress: '10.10.1.20',
    description: 'Customer portal frontend',
  },
  {
    name: 'ns-cache-redis',
    os: 'linux',
    state: 'running',
    cores: 2,
    memoryGib: 16,
    subnet: 'prod-east-1a',
    ipAddress: '10.10.1.30',
    description: 'Redis cache cluster',
  },
  {
    name: 'ns-analytics-01',
    os: 'linux',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'analytics-east-1a',
    description: 'Analytics pipeline node 1',
  },
  {
    name: 'ns-analytics-02',
    os: 'linux',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'analytics-east-1a',
    description: 'Analytics pipeline node 2',
  },
  {
    name: 'ns-monitoring',
    os: 'linux',
    state: 'running',
    cores: 4,
    memoryGib: 8,
    subnet: 'mgmt-east-1a',
    ipAddress: '10.10.3.10',
    description: 'Prometheus + Grafana',
  },
  {
    name: 'ns-fraud-detect',
    os: 'rhel',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'prod-east-1a',
    description: 'Fraud detection ML inference',
  },
  {
    name: 'ns-dev-sandbox-01',
    os: 'linux',
    state: 'paused',
    cores: 4,
    memoryGib: 8,
    subnet: 'dev-east-1a',
    description: 'Dev sandbox A',
  },
  {
    name: 'ns-dev-sandbox-02',
    os: 'windows',
    state: 'paused',
    cores: 4,
    memoryGib: 16,
    subnet: 'dev-east-1a',
    description: 'Dev sandbox B (Windows)',
  },
  {
    name: 'ns-staging-api',
    os: 'rhel',
    state: 'paused',
    cores: 8,
    memoryGib: 32,
    subnet: 'staging-east-1a',
    description: 'Staging API',
  },
  {
    name: 'ns-legacy-reports',
    os: 'windows',
    state: 'stopped',
    cores: 2,
    memoryGib: 8,
    subnet: 'legacy-east-1a',
    description: 'Legacy reporting server',
  },
  {
    name: 'ns-archive-storage',
    os: 'linux',
    state: 'stopped',
    cores: 2,
    memoryGib: 4,
    subnet: 'archive-east-1a',
    description: 'Archive data processor',
  },
  {
    name: 'ns-test-env-01',
    os: 'linux',
    state: 'stopped',
    cores: 4,
    memoryGib: 8,
    subnet: 'dev-east-1a',
    description: 'Test environment VM',
  },
  {
    name: 'ns-test-env-02',
    os: 'rhel',
    state: 'stopped',
    cores: 4,
    memoryGib: 8,
    subnet: 'dev-east-1a',
    description: 'Test environment VM 2',
  },
  {
    name: 'ns-decom-batch',
    os: 'linux',
    state: 'stopped',
    cores: 2,
    memoryGib: 4,
    subnet: 'legacy-east-1a',
    description: 'Decommissioned batch processor',
  },
]

const EVERGREEN_VMS: VmBlueprint[] = [
  {
    name: 'eg-api-gateway',
    os: 'rhel',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'prod-ca-1a',
    ipAddress: '192.168.1.10',
    description: 'API gateway',
  },
  {
    name: 'eg-core-banking',
    os: 'rhel',
    state: 'running',
    cores: 16,
    memoryGib: 64,
    subnet: 'prod-ca-1a',
    ipAddress: '192.168.1.11',
    description: 'Core banking service',
  },
  {
    name: 'eg-mobile-backend',
    os: 'linux',
    state: 'running',
    cores: 4,
    memoryGib: 16,
    subnet: 'prod-ca-1b',
    ipAddress: '192.168.1.20',
    description: 'Mobile banking backend',
  },
  {
    name: 'eg-db-postgres',
    os: 'rhel',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'db-ca-1a',
    ipAddress: '192.168.2.10',
    description: 'PostgreSQL database',
  },
  {
    name: 'eg-monitoring',
    os: 'linux',
    state: 'running',
    cores: 2,
    memoryGib: 8,
    subnet: 'mgmt-ca-1a',
    ipAddress: '192.168.3.5',
    description: 'Monitoring stack',
  },
  {
    name: 'eg-pipeda-audit',
    os: 'linux',
    state: 'running',
    cores: 2,
    memoryGib: 8,
    subnet: 'compliance-ca-1a',
    description: 'PIPEDA audit log processor',
  },
  {
    name: 'eg-ml-risk',
    os: 'linux',
    state: 'running',
    cores: 8,
    memoryGib: 32,
    subnet: 'prod-ca-1a',
    description: 'ML risk scoring',
  },
  {
    name: 'eg-cdn-origin',
    os: 'linux',
    state: 'running',
    cores: 2,
    memoryGib: 4,
    subnet: 'prod-ca-1b',
    ipAddress: '192.168.1.30',
    description: 'CDN origin server',
  },
  {
    name: 'eg-dev-sandbox',
    os: 'linux',
    state: 'paused',
    cores: 4,
    memoryGib: 8,
    subnet: 'dev-ca-1a',
    description: 'Dev sandbox',
  },
  {
    name: 'eg-staging',
    os: 'rhel',
    state: 'stopped',
    cores: 8,
    memoryGib: 16,
    subnet: 'staging-ca-1a',
    description: 'Staging environment',
  },
  {
    name: 'eg-dr-replica',
    os: 'rhel',
    state: 'stopped',
    cores: 8,
    memoryGib: 32,
    subnet: 'dr-ca-1a',
    description: 'Disaster recovery replica',
  },
  {
    name: 'eg-legacy-payroll',
    os: 'windows',
    state: 'stopped',
    cores: 4,
    memoryGib: 8,
    subnet: 'legacy-ca-1a',
    description: 'Legacy payroll system',
  },
  {
    name: 'eg-test-01',
    os: 'linux',
    state: 'stopped',
    cores: 2,
    memoryGib: 4,
    subnet: 'dev-ca-1a',
    description: 'Test VM 1',
  },
]

function fulfillmentProtoState(state: VmPowerState): string {
  const m: Record<VmPowerState, string> = {
    running: 'COMPUTE_INSTANCE_STATE_RUNNING',
    stopped: 'COMPUTE_INSTANCE_STATE_STOPPED',
    paused: 'COMPUTE_INSTANCE_STATE_PAUSED',
    starting: 'COMPUTE_INSTANCE_STATE_STARTING',
    deleting: 'COMPUTE_INSTANCE_STATE_DELETING',
    error: 'COMPUTE_INSTANCE_STATE_ERROR',
    stopping: 'COMPUTE_INSTANCE_STATE_STOPPING',
    creating: 'COMPUTE_INSTANCE_STATE_CREATING',
    restarting: 'COMPUTE_INSTANCE_STATE_RESTARTING',
    still_provisioning: 'COMPUTE_INSTANCE_STATE_STILL_PROVISIONING',
  }
  return m[state]
}

function mockImageWire(os: OsType): { source_type: string; source_ref: string } {
  if (os === 'windows') {
    return {
      source_type: 'SOURCE_TYPE_REGISTRY',
      source_ref: 'mcr.microsoft.com/windows/server:latest',
    }
  }
  if (os === 'rhel') {
    return {
      source_type: 'SOURCE_TYPE_REGISTRY',
      source_ref: 'registry.redhat.io/rhel9:latest',
    }
  }
  return {
    source_type: 'SOURCE_TYPE_REGISTRY',
    source_ref: 'docker.io/library/ubuntu:22.04',
  }
}

/** Seed VMs as fulfillment-shaped wire + normalize — matches PROTO_JSON path in dev. */
function buildVm(blueprint: VmBlueprint, tenant: DemoTenantId, index: number): ComputeInstance {
  const id = `vm-${tenant}-${index.toString().padStart(3, '0')}`
  const createdMs = Date.now() - (index + 1) * 86400000
  const bootGib = Math.max(32, blueprint.memoryGib * 2)
  const wire = {
    id,
    metadata: {
      name: blueprint.name,
      creation_timestamp: new Date(createdMs).toISOString(),
      tenants: [tenant],
      creators: ['demo-seed'],
      version: 1,
      labels: {},
    },
    spec: {
      template:
        blueprint.os === 'rhel'
          ? 'rhel-9-general'
          : blueprint.os === 'windows'
            ? 'windows-2022-general'
            : 'ubuntu-22-general',
      cores: blueprint.cores,
      memory_gib: blueprint.memoryGib,
      boot_disk: { size_gib: bootGib },
      subnet: blueprint.subnet,
      image: mockImageWire(blueprint.os),
      run_strategy: 'Always',
    },
    status: {
      state: fulfillmentProtoState(blueprint.state),
      ip_address: blueprint.ipAddress,
      conditions:
        index === 0
          ? [
              {
                type: 'CONDITION_TYPE_READY',
                status: 'CONDITION_STATUS_TRUE',
                reason: 'MinimumReplicasAvailable',
                message: 'Instance passed readiness checks.',
                last_transition_time: new Date(createdMs).toISOString(),
              },
            ]
          : [],
    },
    description: blueprint.description,
    os: blueprint.os,
    createdAtMs: createdMs,
  }
  return normalizeComputeInstance(wire)
}

export function buildVmsForTenant(tenant: DemoTenantId): ComputeInstance[] {
  const blueprints = tenant === 'northstar' ? NORTHSTAR_VMS : EVERGREEN_VMS
  return blueprints.map((b, i) => buildVm(b, tenant, i))
}

// ---------------------------------------------------------------------------
// VM templates
// ---------------------------------------------------------------------------

export const VM_TEMPLATES: ClusterTemplate[] = [
  {
    id: 'rhel-9-general',
    title: 'RHEL 9 — General Purpose',
    description: 'Red Hat Enterprise Linux 9 base image optimized for general workloads.',
    metadata: { name: 'rhel-9-general', createdAt: '2025-01-15T10:00:00Z' },
    workload: 'general',
    workloadProfile: 'high-performance',
    defaultCores: 2,
    defaultMemoryGib: 8,
    defaultBootDiskSizeGib: 40,
    tags: ['RHEL', 'Linux', 'General'],
    icon: 'rhel',
  },
  {
    id: 'rhel-9-database',
    title: 'RHEL 9 — Database Optimized',
    description: 'RHEL 9 configured for high-performance database workloads with tuned profile.',
    metadata: { name: 'rhel-9-database', createdAt: '2025-01-15T10:00:00Z' },
    workload: 'database',
    workloadProfile: 'data-processing',
    defaultCores: 8,
    defaultMemoryGib: 32,
    defaultBootDiskSizeGib: 128,
    tags: ['RHEL', 'Database', 'PostgreSQL', 'MySQL'],
    icon: 'rhel',
  },
  {
    id: 'rhel-9-web',
    title: 'RHEL 9 — Web Server',
    description: 'RHEL 9 with Nginx and standard web stack pre-installed.',
    metadata: { name: 'rhel-9-web', createdAt: '2025-01-20T10:00:00Z' },
    workload: 'web',
    workloadProfile: 'high-performance',
    defaultCores: 2,
    defaultMemoryGib: 4,
    defaultBootDiskSizeGib: 32,
    tags: ['RHEL', 'Web', 'Nginx'],
    icon: 'rhel',
  },
  {
    id: 'ubuntu-22-general',
    title: 'Ubuntu 22.04 LTS — General',
    description: 'Ubuntu 22.04 LTS base image for general Linux workloads.',
    metadata: { name: 'ubuntu-22-general', createdAt: '2025-02-01T10:00:00Z' },
    workload: 'general',
    workloadProfile: 'high-performance',
    defaultCores: 2,
    defaultMemoryGib: 4,
    defaultBootDiskSizeGib: 40,
    tags: ['Ubuntu', 'Linux', 'LTS'],
    icon: 'linux',
  },
  {
    id: 'ubuntu-22-devops',
    title: 'Ubuntu 22.04 LTS — DevOps',
    description: 'Ubuntu 22.04 with Docker, kubectl, and common DevOps tooling pre-installed.',
    metadata: { name: 'ubuntu-22-devops', createdAt: '2025-02-05T10:00:00Z' },
    workload: 'devops',
    workloadProfile: 'analytics',
    defaultCores: 4,
    defaultMemoryGib: 8,
    defaultBootDiskSizeGib: 64,
    tags: ['Ubuntu', 'Docker', 'Kubernetes', 'DevOps'],
    icon: 'linux',
  },
  {
    id: 'windows-server-2022',
    title: 'Windows Server 2022 — Standard',
    description: 'Windows Server 2022 Standard Edition for enterprise Windows workloads.',
    metadata: { name: 'windows-server-2022', createdAt: '2025-01-10T10:00:00Z' },
    workload: 'windows',
    workloadProfile: 'high-performance',
    defaultCores: 2,
    defaultMemoryGib: 8,
    defaultBootDiskSizeGib: 80,
    tags: ['Windows', 'Server', 'Enterprise'],
    icon: 'windows',
  },
  {
    id: 'windows-server-2022-sql',
    title: 'Windows Server 2022 — SQL Server',
    description: 'Windows Server 2022 with SQL Server Express pre-installed.',
    metadata: { name: 'windows-server-2022-sql', createdAt: '2025-01-12T10:00:00Z' },
    workload: 'database',
    workloadProfile: 'data-processing',
    defaultCores: 4,
    defaultMemoryGib: 16,
    defaultBootDiskSizeGib: 128,
    tags: ['Windows', 'SQL Server', 'Database'],
    icon: 'windows',
  },
  {
    id: 'ml-pytorch-rhel',
    title: 'ML Inference — PyTorch on RHEL',
    description: 'RHEL 9 with PyTorch, CUDA drivers, and NVIDIA container toolkit.',
    metadata: { name: 'ml-pytorch-rhel', createdAt: '2025-03-01T10:00:00Z' },
    workload: 'ml',
    workloadProfile: 'machine-learning',
    defaultCores: 8,
    defaultMemoryGib: 64,
    defaultBootDiskSizeGib: 256,
    tags: ['ML', 'PyTorch', 'RHEL', 'GPU'],
    icon: 'rhel',
  },
  {
    id: 'compliance-scanner',
    title: 'Compliance Scanner',
    description: 'Lightweight Linux VM with OpenSCAP and compliance scanning tooling.',
    metadata: { name: 'compliance-scanner', createdAt: '2025-02-15T10:00:00Z' },
    workload: 'compliance',
    workloadProfile: 'analytics',
    defaultCores: 2,
    defaultMemoryGib: 4,
    defaultBootDiskSizeGib: 24,
    tags: ['Compliance', 'OpenSCAP', 'Security', 'Linux'],
    icon: 'linux',
  },
]

// ---------------------------------------------------------------------------
// Users (for tenant admin user management)
// ---------------------------------------------------------------------------

export interface DemoUser {
  id: string
  name: string
  email: string
  role: 'tenantAdmin' | 'tenantUser'
  status: 'active' | 'inactive'
  lastLogin?: string
}

export const NORTHSTAR_USERS: DemoUser[] = [
  {
    id: 'u-ns-1',
    name: 'Casey Morgan',
    email: 'cmorgan@northstarbank.com',
    role: 'tenantUser',
    status: 'active',
    lastLogin: '2 hours ago',
  },
  {
    id: 'u-ns-2',
    name: 'J. Lee',
    email: 'jlee@northstarbank.com',
    role: 'tenantAdmin',
    status: 'active',
    lastLogin: '1 hour ago',
  },
  {
    id: 'u-ns-3',
    name: 'Sarah Kim',
    email: 'skim@northstarbank.com',
    role: 'tenantUser',
    status: 'active',
    lastLogin: 'Yesterday',
  },
  {
    id: 'u-ns-4',
    name: 'David Park',
    email: 'dpark@northstarbank.com',
    role: 'tenantUser',
    status: 'active',
    lastLogin: '3 days ago',
  },
  {
    id: 'u-ns-5',
    name: 'Monica Reyes',
    email: 'mreyes@northstarbank.com',
    role: 'tenantUser',
    status: 'inactive',
    lastLogin: '2 weeks ago',
  },
]

export const EVERGREEN_USERS: DemoUser[] = [
  {
    id: 'u-eg-1',
    name: 'Priya Nair',
    email: 'priya.nair@bluestonefinancial.com',
    role: 'tenantUser',
    status: 'active',
    lastLogin: '30 minutes ago',
  },
  {
    id: 'u-eg-2',
    name: 'Marcus Chen',
    email: 'marcus.chen@bluestonefinancial.com',
    role: 'tenantAdmin',
    status: 'active',
    lastLogin: '1 hour ago',
  },
  {
    id: 'u-eg-3',
    name: 'Aisha Patel',
    email: 'aisha.patel@bluestonefinancial.com',
    role: 'tenantUser',
    status: 'active',
    lastLogin: 'Today',
  },
  {
    id: 'u-eg-4',
    name: 'Tom Laurent',
    email: 'tom.laurent@bluestonefinancial.com',
    role: 'tenantUser',
    status: 'inactive',
    lastLogin: '1 month ago',
  },
]

// ---------------------------------------------------------------------------
// Recent activities (events)
// ---------------------------------------------------------------------------

export function buildRecentActivities(vms: ComputeInstance[], count = 20): OsacEvent[] {
  const eventTypes = [
    { type: 'VM started', severity: 'success' as const },
    { type: 'VM stopped', severity: 'info' as const },
    { type: 'VM restarted', severity: 'info' as const },
    { type: 'VM paused', severity: 'warning' as const },
    { type: 'VM provisioned', severity: 'success' as const },
    { type: 'VM power action failed', severity: 'danger' as const },
    { type: 'Snapshot created', severity: 'success' as const },
    { type: 'Template applied', severity: 'success' as const },
  ]
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const vm = vms[i % Math.max(vms.length, 1)]
    const et = eventTypes[i % eventTypes.length]
    return {
      id: `event-${i}`,
      type: et.type,
      timestamp: new Date(now - i * 7200000).toISOString(),
      message: vm ? `${et.type} for ${vm.metadata.name}` : et.type,
      severity: et.severity,
      relatedObjectRefs: vm ? [{ kind: 'ComputeInstance', id: vm.id, name: vm.metadata.name }] : [],
    }
  })
}

// ---------------------------------------------------------------------------
// Organizations (for provider admin)
// ---------------------------------------------------------------------------

export const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-northstar',
    metadata: { name: 'northstar', createdAt: '2024-03-15T00:00:00Z' },
    displayName: 'Northstar Bank',
    description: 'Financial services — US East region banking workloads.',
    status: 'active',
    vmCount: 20,
    clusterCount: 3,
    realm: 'northstar',
    idp: {
      type: 'OIDC',
      issuerUrl: 'https://sso.northstar-bank.internal/realms/northstar',
      clientId: 'osac-northstar',
      status: 'CONNECTED',
      lastHealthCheck: '2026-06-04T01:00:00Z',
    },
    tenantAdmins: [
      {
        id: 'ta-northstar-1',
        email: 'admin@northstar-bank.internal',
        isBreakGlass: false,
        createdAt: '2024-03-15T00:00:00Z',
      },
      {
        id: 'ta-northstar-bg',
        email: 'breakglass@northstar.osac.internal',
        isBreakGlass: true,
        createdAt: '2024-03-15T00:00:00Z',
      },
    ],
    projects: [
      {
        id: 'proj-northstar-default',
        name: 'default',
        openshiftNamespace: 'osac-org-northstar-project-default',
        createdAt: '2024-03-15T00:00:00Z',
      },
      {
        id: 'proj-northstar-prod',
        name: 'production',
        openshiftNamespace: 'osac-org-northstar-project-production',
        createdAt: '2024-06-01T00:00:00Z',
      },
    ],
  },
  {
    id: 'org-evergreen',
    metadata: { name: 'evergreen', createdAt: '2024-05-01T00:00:00Z' },
    displayName: 'Bluestone Financial Group',
    description: 'Canadian financial institution — PIPEDA-compliant cloud workspace.',
    status: 'active',
    vmCount: 13,
    clusterCount: 2,
    realm: 'evergreen',
    idp: {
      type: 'LDAP',
      issuerUrl: 'ldaps://ldap.bluestone.internal:636',
      status: 'DEGRADED',
      lastHealthCheck: '2026-06-03T18:30:00Z',
    },
    tenantAdmins: [
      {
        id: 'ta-evergreen-bg',
        email: 'breakglass@evergreen.osac.internal',
        isBreakGlass: true,
        createdAt: '2024-05-01T00:00:00Z',
      },
    ],
    projects: [
      {
        id: 'proj-evergreen-default',
        name: 'default',
        openshiftNamespace: 'osac-org-evergreen-project-default',
        createdAt: '2024-05-01T00:00:00Z',
      },
    ],
  },
]

export const DEMO_SYSTEM_ROLE_ASSIGNMENTS: RoleAssignment[] = [
  { subject: 'alex.johnson@vertexa.internal', role: 'cloud-provider-admin', source: 'break-glass' },
  { subject: 'ops-team', role: 'cloud-provider-reader', source: 'idp-group' },
  { subject: 'catalog-team', role: 'catalog-curator', source: 'idp-group' },
  { subject: 'maria.santos@vertexa.internal', role: 'cloud-provider-admin', source: 'idp-group' },
]

// ---------------------------------------------------------------------------
// Quota data (for tenant admin)
// ---------------------------------------------------------------------------

export interface QuotaEntry {
  resource: string
  used: number
  limit: number
  unit: string
}

export const DEMO_QUOTA: Record<'northstar' | 'evergreen', QuotaEntry[]> = {
  northstar: [
    { resource: 'vCPU', used: 124, limit: 200, unit: 'cores' },
    { resource: 'Memory', used: 580, limit: 1024, unit: 'GiB' },
    { resource: 'Storage', used: 14.2, limit: 50, unit: 'TiB' },
    { resource: 'Virtual Machines', used: 20, limit: 50, unit: 'VMs' },
    { resource: 'Public IPs', used: 4, limit: 10, unit: 'IPs' },
  ],
  evergreen: [
    { resource: 'vCPU', used: 82, limit: 128, unit: 'cores' },
    { resource: 'Memory', used: 312, limit: 512, unit: 'GiB' },
    { resource: 'Storage', used: 8.6, limit: 25, unit: 'TiB' },
    { resource: 'Virtual Machines', used: 13, limit: 30, unit: 'VMs' },
    { resource: 'Public IPs', used: 3, limit: 8, unit: 'IPs' },
  ],
}

// ---------------------------------------------------------------------------
// CaaS — Cluster Catalog Items
// ---------------------------------------------------------------------------

export const DEMO_CLUSTER_CATALOG_ITEMS: ClusterCatalogItem[] = [
  {
    id: 'ocp-standard',
    title: 'OpenShift Standard',
    description:
      'A standard OpenShift 4.17 cluster with 3 worker nodes. Ideal for development and staging workloads.',
    template: 'openshift-4-17',
    published: true,
    allowedVersions: ['4.17.3', '4.18.0'],
    fieldDefinitions: [
      {
        path: 'spec.node_sets.workers.size',
        displayName: 'Worker node count',
        editable: true,
        default: { '@type': 'type.googleapis.com/google.protobuf.Int32Value', value: 3 },
        validationSchema: '{"type":"integer","minimum":1,"maximum":10}',
      },
    ],
  },
  {
    id: 'ocp-gpu',
    title: 'OpenShift GPU-Accelerated',
    description:
      'OpenShift cluster with GPU worker nodes for AI/ML workloads. Includes NVIDIA GPU Operator pre-installed.',
    template: 'openshift-4-17-gpu',
    published: true,
    allowedVersions: ['4.17.3', '4.18.0'],
    fieldDefinitions: [
      {
        path: 'spec.node_sets.gpu-workers.size',
        displayName: 'GPU worker node count',
        editable: true,
        default: { '@type': 'type.googleapis.com/google.protobuf.Int32Value', value: 2 },
        validationSchema: '{"type":"integer","minimum":1,"maximum":4}',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// CaaS — Demo Clusters
// ---------------------------------------------------------------------------

export const DEMO_CLUSTERS: Cluster[] = [
  {
    id: 'cluster-northstar-prod-1',
    metadata: {
      name: 'northstar-prod-1',
      createdAt: '2026-05-01T08:00:00Z',
      tenants: ['northstar'],
    },
    spec: {
      catalogItem: 'ocp-standard',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 6 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 2 },
        infra: { hostType: 'baremetal-standard', size: 3 },
      },
      network: {
        virtualNetworkRef: 'vn-prod',
        subnetRef: 'sn-prod-1a',
        securityGroupRefs: ['sg-web', 'sg-mgmt'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_READY',
      version: '4.17.3',
      storageReady: true,
      apiUrl: 'https://api.northstar-prod-1.example.com:6443',
      consoleUrl: 'https://console-openshift-console.apps.northstar-prod-1.example.com',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 6 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 0 },
        infra: { hostType: 'baremetal-standard', size: 3 },
      },
      network: {
        apiPublicIp: '203.0.113.10',
        ingressPublicIp: '203.0.113.11',
        dnsRecords: ['api.northstar-prod-1.example.com', '*.apps.northstar-prod-1.example.com'],
      },
      storage: {
        csiDriver: 'csi.vastdata.com',
        storageClasses: [
          {
            name: 'vast-standard',
            tier: 'tier-standard',
            isDefault: true,
            parameters: { backend: 'vast-prod', qos: 'standard-qos' },
          },
          {
            name: 'vast-fast',
            tier: 'tier-fast',
            isDefault: false,
            parameters: { backend: 'vast-prod', qos: 'high-performance-qos' },
          },
          {
            name: 'vast-archive',
            tier: 'tier-archive',
            isDefault: false,
            parameters: { backend: 'vast-prod', qos: 'low-qos' },
          },
        ],
        volumeSnapshotClasses: [
          {
            name: 'vast-snapshot',
            driver: 'csi.vastdata.com',
            deletionPolicy: 'Delete',
            isDefault: true,
          },
          {
            name: 'vast-snapshot-retain',
            driver: 'csi.vastdata.com',
            deletionPolicy: 'Retain',
            isDefault: false,
          },
        ],
      },
      conditions: [
        {
          type: 'CLUSTER_CONDITION_TYPE_AVAILABLE',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'AsExpected',
          message: 'Cluster is available',
          lastTransitionTime: '2026-05-01T09:30:00Z',
        },
      ],
    },
  },
  {
    id: 'cluster-northstar-dev-1',
    metadata: {
      name: 'northstar-dev-1',
      createdAt: '2026-05-20T14:00:00Z',
      tenants: ['northstar'],
    },
    spec: {
      catalogItem: 'ocp-standard',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 3 },
        infra: { hostType: 'baremetal-standard', size: 2 },
      },
      network: {
        virtualNetworkRef: 'vn-dev',
        subnetRef: 'sn-dev-1a',
        securityGroupRefs: ['sg-mgmt'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_PROGRESSING',
      storageReady: false,
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 1 },
        infra: { hostType: 'baremetal-standard', size: 0 },
      },
      conditions: [],
    },
  },
  {
    id: 'cluster-evergreen-prod-1',
    metadata: {
      name: 'evergreen-prod-1',
      createdAt: '2026-04-15T10:00:00Z',
      tenants: ['evergreen'],
    },
    spec: {
      catalogItem: 'ocp-gpu',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 4 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 4 },
        infra: { hostType: 'baremetal-standard', size: 2 },
      },
      network: {
        virtualNetworkRef: 'vn-prod',
        subnetRef: 'sn-prod-1b',
        securityGroupRefs: ['sg-web', 'sg-db'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_READY',
      version: '4.17.3',
      storageReady: true,
      apiUrl: 'https://api.evergreen-prod-1.example.com:6443',
      consoleUrl: 'https://console-openshift-console.apps.evergreen-prod-1.example.com',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 4 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 2 },
        infra: { hostType: 'baremetal-standard', size: 2 },
      },
      network: {
        apiPublicIp: '203.0.113.20',
        ingressPublicIp: '203.0.113.21',
        dnsRecords: ['api.evergreen-prod-1.example.com', '*.apps.evergreen-prod-1.example.com'],
      },
      storage: {
        csiDriver: 'csi.vastdata.com',
        storageClasses: [
          {
            name: 'vast-standard',
            tier: 'tier-standard',
            isDefault: true,
            parameters: { backend: 'vast-prod', qos: 'standard-qos' },
          },
        ],
        volumeSnapshotClasses: [
          {
            name: 'vast-snapshot',
            driver: 'csi.vastdata.com',
            deletionPolicy: 'Delete',
            isDefault: true,
          },
        ],
      },
      conditions: [
        {
          type: 'CLUSTER_CONDITION_TYPE_AVAILABLE',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'AsExpected',
          message: 'Cluster is available',
          lastTransitionTime: '2026-04-15T11:30:00Z',
        },
      ],
    },
  },

  // ── CLUSTER_STATE_FAILED ────────────────────────────────────────────────────
  {
    id: 'cluster-vertexa-prod-1',
    metadata: {
      name: 'vertexa-prod-1',
      createdAt: '2026-05-28T09:00:00Z',
      tenants: ['vertexa'],
      creators: ['admin@vertexa.io'],
      labels: { env: 'production', team: 'platform' },
    },
    spec: {
      catalogItem: 'ocp-standard',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 4 },
        infra: { hostType: 'baremetal-standard', size: 2 },
      },
      network: {
        virtualNetworkRef: 'vn-prod',
        subnetRef: 'sn-prod-1a',
        securityGroupRefs: ['sg-web', 'sg-mgmt'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_FAILED',
      storageReady: false,
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 0 },
        infra: { hostType: 'baremetal-standard', size: 0 },
      },
      conditions: [
        {
          type: 'CLUSTER_CONDITION_TYPE_FAILED',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'InsufficientBaremetalCapacity',
          message:
            'Could not allocate baremetal hosts: no available hosts matching profile "baremetal-standard" in zone eu-west-1a. Quota exhausted or all hosts are in use.',
          lastTransitionTime: '2026-05-28T09:45:00Z',
        },
        {
          type: 'CLUSTER_CONDITION_TYPE_READY',
          status: 'CONDITION_STATUS_FALSE',
          reason: 'ProvisioningFailed',
          message: 'Cluster provisioning did not complete.',
          lastTransitionTime: '2026-05-28T09:45:00Z',
        },
      ],
    },
  },

  // ── CLUSTER_STATE_UPGRADING ─────────────────────────────────────────────────
  {
    id: 'cluster-northstar-staging-1',
    metadata: {
      name: 'northstar-staging-1',
      createdAt: '2026-04-10T11:00:00Z',
      tenants: ['northstar'],
      creators: ['ops@northstar.io'],
      labels: { env: 'staging' },
    },
    spec: {
      catalogItem: 'ocp-standard',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 3 },
        infra: { hostType: 'baremetal-standard', size: 2 },
      },
      network: {
        virtualNetworkRef: 'vn-dev',
        subnetRef: 'sn-dev-1a',
        securityGroupRefs: ['sg-mgmt'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_UPGRADING',
      version: '4.16.8',
      storageReady: true,
      apiUrl: 'https://api.northstar-staging-1.example.com:6443',
      consoleUrl: 'https://console-openshift-console.apps.northstar-staging-1.example.com',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 3 },
        infra: { hostType: 'baremetal-standard', size: 2 },
      },
      conditions: [
        {
          type: 'CLUSTER_CONDITION_TYPE_PROGRESSING',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'RollingUpdate',
          message:
            'Upgrading cluster from 4.16.8 to 4.17.3. Worker nodes rolling update in progress: 1 of 3 nodes updated.',
          lastTransitionTime: '2026-06-03T22:10:00Z',
        },
        {
          type: 'CLUSTER_CONDITION_TYPE_READY',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'AsExpected',
          message: 'Cluster API is reachable during upgrade.',
          lastTransitionTime: '2026-04-10T12:30:00Z',
        },
      ],
    },
  },

  // ── CLUSTER_STATE_UPGRADE_FAILED ────────────────────────────────────────────
  {
    id: 'cluster-evergreen-dev-1',
    metadata: {
      name: 'evergreen-dev-1',
      createdAt: '2026-03-20T08:00:00Z',
      tenants: ['evergreen'],
      creators: ['dev@evergreen.io'],
      labels: { env: 'dev', team: 'ml-platform' },
    },
    spec: {
      catalogItem: 'ocp-gpu',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 2 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 2 },
      },
      network: {
        virtualNetworkRef: 'vn-dev',
        subnetRef: 'sn-dev-1a',
        securityGroupRefs: ['sg-mgmt'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_UPGRADE_FAILED',
      version: '4.16.5',
      storageReady: false,
      storage: {
        csiDriver: 'csi.vastdata.com',
      },
      apiUrl: 'https://api.evergreen-dev-1.example.com:6443',
      consoleUrl: 'https://console-openshift-console.apps.evergreen-dev-1.example.com',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 2 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 2 },
      },
      conditions: [
        {
          type: 'CLUSTER_CONDITION_TYPE_FAILED',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'UpgradeOperatorTimeout',
          message:
            'Cluster upgrade to 4.17.3 failed: machine-config operator did not complete rollout within 60 minutes. Node "worker-2" is stuck in degraded state. Manual intervention may be required.',
          lastTransitionTime: '2026-06-01T14:22:00Z',
        },
        {
          type: 'CLUSTER_CONDITION_TYPE_DEGRADED',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'NodeDegraded',
          message: 'Node worker-2 is reporting NotReady: kubelet stopped posting node status.',
          lastTransitionTime: '2026-06-01T14:22:00Z',
        },
        {
          type: 'CLUSTER_CONDITION_TYPE_READY',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'AsExpected',
          message: 'Cluster API remains reachable.',
          lastTransitionTime: '2026-03-20T09:00:00Z',
        },
      ],
    },
  },

  // ── CLUSTER_STATE_READY (vertexa, multi-nodeset, healthy) ───────────────────
  {
    id: 'cluster-vertexa-ml-1',
    metadata: {
      name: 'vertexa-ml-1',
      createdAt: '2026-05-05T16:00:00Z',
      tenants: ['vertexa'],
      creators: ['ml-team@vertexa.io'],
      labels: { env: 'production', team: 'ml', workload: 'training' },
    },
    spec: {
      catalogItem: 'ocp-gpu',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 3 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 8 },
        infra: { hostType: 'baremetal-standard', size: 3 },
      },
      network: {
        virtualNetworkRef: 'vn-prod',
        subnetRef: 'sn-prod-1b',
        securityGroupRefs: ['sg-web', 'sg-mgmt'],
        podCidr: '10.128.0.0/14',
        serviceCidr: '172.30.0.0/16',
      },
    },
    status: {
      state: 'CLUSTER_STATE_READY',
      version: '4.17.3',
      storageReady: true,
      apiUrl: 'https://api.vertexa-ml-1.example.com:6443',
      consoleUrl: 'https://console-openshift-console.apps.vertexa-ml-1.example.com',
      nodeSets: {
        workers: { hostType: 'baremetal-standard', size: 3 },
        'gpu-workers': { hostType: 'baremetal-gpu', size: 8 },
        infra: { hostType: 'baremetal-standard', size: 3 },
      },
      network: {
        apiPublicIp: '203.0.113.40',
        ingressPublicIp: '203.0.113.41',
        dnsRecords: ['api.vertexa-ml-1.example.com', '*.apps.vertexa-ml-1.example.com'],
      },
      storage: {
        csiDriver: 'csi.vastdata.com',
        storageClasses: [
          {
            name: 'vast-standard',
            tier: 'tier-standard',
            isDefault: true,
            parameters: { backend: 'vast-prod', qos: 'standard-qos' },
          },
          {
            name: 'vast-fast',
            tier: 'tier-fast',
            isDefault: false,
            parameters: { backend: 'vast-prod', qos: 'high-performance-qos' },
          },
        ],
        volumeSnapshotClasses: [
          {
            name: 'vast-snapshot',
            driver: 'csi.vastdata.com',
            deletionPolicy: 'Retain',
            isDefault: true,
          },
        ],
      },
      conditions: [
        {
          type: 'CLUSTER_CONDITION_TYPE_READY',
          status: 'CONDITION_STATUS_TRUE',
          reason: 'AsExpected',
          message: 'Cluster is ready.',
          lastTransitionTime: '2026-05-05T17:30:00Z',
        },
      ],
    },
  },
]

// ---------------------------------------------------------------------------
// CaaS — Demo Agents
// ---------------------------------------------------------------------------

export const DEMO_AGENTS: Agent[] = [
  // northstar-prod-1: 3 provisioned workers
  {
    id: 'agent-001',
    metadata: { name: 'agent-001', createdAt: '2026-03-01T00:00:00Z' },
    state: 'AGENT_STATE_PROVISIONED',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: 'cluster-northstar-prod-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  {
    id: 'agent-002',
    metadata: { name: 'agent-002', createdAt: '2026-03-01T00:00:00Z' },
    state: 'AGENT_STATE_PROVISIONED',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: 'cluster-northstar-prod-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  {
    id: 'agent-003',
    metadata: { name: 'agent-003', createdAt: '2026-03-01T00:00:00Z' },
    state: 'AGENT_STATE_PROVISIONED',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: 'cluster-northstar-prod-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  // evergreen-prod-1: 2 GPU workers provisioned
  {
    id: 'agent-005',
    metadata: { name: 'agent-005', createdAt: '2026-04-01T00:00:00Z' },
    state: 'AGENT_STATE_PROVISIONED',
    hardwareProfile: 'baremetal-gpu-16c-128g-a100',
    clusterRef: 'cluster-evergreen-prod-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  {
    id: 'agent-006',
    metadata: { name: 'agent-006', createdAt: '2026-04-01T00:00:00Z' },
    state: 'AGENT_STATE_PROVISIONED',
    hardwareProfile: 'baremetal-gpu-16c-128g-a100',
    clusterRef: 'cluster-evergreen-prod-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  // northstar-staging-1: 1 provisioning in progress
  {
    id: 'agent-007',
    metadata: { name: 'agent-007', createdAt: '2026-06-03T08:00:00Z' },
    state: 'AGENT_STATE_PROVISIONING',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: 'cluster-northstar-staging-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  // vertexa-prod-1: 1 deprovisioning (cluster failed, being torn down)
  {
    id: 'agent-008',
    metadata: { name: 'agent-008', createdAt: '2026-05-10T00:00:00Z' },
    state: 'AGENT_STATE_DEPROVISIONING',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: 'cluster-vertexa-prod-1',
    inventoryBackend: 'aap-inventory-prod',
  },
  // Unassigned — available for provisioning
  {
    id: 'agent-004',
    metadata: { name: 'agent-004', createdAt: '2026-04-01T00:00:00Z' },
    state: 'AGENT_STATE_AVAILABLE',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: undefined,
    inventoryBackend: 'aap-inventory-prod',
  },
  {
    id: 'agent-009',
    metadata: { name: 'agent-009', createdAt: '2026-05-15T00:00:00Z' },
    state: 'AGENT_STATE_AVAILABLE',
    hardwareProfile: 'baremetal-gpu-16c-128g-a100',
    clusterRef: undefined,
    inventoryBackend: 'esi-inventory-prod',
  },
  // Unavailable — hardware fault
  {
    id: 'agent-010',
    metadata: { name: 'agent-010', createdAt: '2026-02-01T00:00:00Z' },
    state: 'AGENT_STATE_UNAVAILABLE',
    hardwareProfile: 'baremetal-standard-48c-192g',
    clusterRef: undefined,
    inventoryBackend: 'esi-inventory-prod',
  },
]

export const DEMO_INVENTORY_BACKENDS: InventoryBackend[] = [
  {
    id: 'aap-inventory-prod',
    name: 'AAP Inventory (Production)',
    status: 'CONNECTED',
    endpointUrl: 'https://aap.vertexa.internal/api/v2',
    lastSyncTime: '2026-06-03T17:00:00Z',
  },
  {
    id: 'esi-inventory-prod',
    name: 'ESI Inventory (Production)',
    status: 'DISCONNECTED',
    endpointUrl: 'https://esi.vertexa.internal/api/v1',
    lastSyncTime: '2026-06-02T09:30:00Z',
  },
]

// ---------------------------------------------------------------------------
// CaaS — Demo Storage Tiers
// ---------------------------------------------------------------------------

export const DEMO_STORAGE_TIERS: StorageTier[] = [
  {
    id: 'tier-standard',
    name: 'Standard',
    qosClass: 'standard-qos',
    vipPool: 'vip-pool-main',
    storageClassName: 'vast-standard',
    available: true,
    availableTenantIds: [],
  },
  {
    id: 'tier-fast',
    name: 'Fast',
    qosClass: 'high-performance-qos',
    vipPool: 'vip-pool-fast',
    storageClassName: 'vast-fast',
    available: true,
    availableTenantIds: ['northstar'],
  },
  {
    id: 'tier-archive',
    name: 'Archive',
    qosClass: 'low-qos',
    vipPool: 'vip-pool-archive',
    storageClassName: 'vast-archive',
    available: true,
    availableTenantIds: ['northstar'],
  },
]

// ---------------------------------------------------------------------------
// Demo networking resources
// ---------------------------------------------------------------------------

export const DEMO_VIRTUAL_NETWORKS: VirtualNetwork[] = [
  {
    id: 'vn-prod',
    metadata: { name: 'prod-network', createdAt: '2025-01-10T09:00:00Z' },
    spec: {
      networkClass: 'udn-net',
      ipv4Cidr: '10.0.0.0/16',
      capabilities: { enableIpv4: true },
    },
    status: { state: 'VIRTUAL_NETWORK_STATE_READY' },
  },
  {
    id: 'vn-dev',
    metadata: { name: 'dev-network', createdAt: '2025-02-15T11:00:00Z' },
    spec: {
      networkClass: 'udn-net',
      ipv4Cidr: '10.1.0.0/16',
      capabilities: { enableIpv4: true },
    },
    status: { state: 'VIRTUAL_NETWORK_STATE_READY' },
  },
  {
    id: 'vn-mgmt',
    metadata: { name: 'management-network', createdAt: '2025-03-01T08:00:00Z' },
    spec: {
      networkClass: 'phys-net',
      ipv4Cidr: '192.168.0.0/24',
      ipv6Cidr: 'fd00::/64',
      capabilities: { enableIpv4: true, enableIpv6: true, enableDualStack: true },
    },
    status: { state: 'VIRTUAL_NETWORK_STATE_READY' },
  },
]

export const DEMO_SUBNETS: Subnet[] = [
  {
    id: 'subnet-prod-a',
    metadata: { name: 'prod-subnet-a', createdAt: '2025-01-10T09:10:00Z' },
    spec: { virtualNetwork: 'vn-prod', ipv4Cidr: '10.0.1.0/24' },
    status: { state: 'SUBNET_STATE_READY' },
  },
  {
    id: 'subnet-prod-b',
    metadata: { name: 'prod-subnet-b', createdAt: '2025-01-10T09:15:00Z' },
    spec: { virtualNetwork: 'vn-prod', ipv4Cidr: '10.0.2.0/24' },
    status: { state: 'SUBNET_STATE_READY' },
  },
  {
    id: 'subnet-dev-a',
    metadata: { name: 'dev-subnet-a', createdAt: '2025-02-15T11:10:00Z' },
    spec: { virtualNetwork: 'vn-dev', ipv4Cidr: '10.1.1.0/24' },
    status: { state: 'SUBNET_STATE_READY' },
  },
  {
    id: 'subnet-mgmt-a',
    metadata: { name: 'mgmt-subnet-a', createdAt: '2025-03-01T08:10:00Z' },
    spec: { virtualNetwork: 'vn-mgmt', ipv4Cidr: '192.168.0.0/25', ipv6Cidr: 'fd00::1:0/112' },
    status: { state: 'SUBNET_STATE_READY' },
  },
]

export const DEMO_SECURITY_GROUPS: SecurityGroup[] = [
  {
    id: 'sg-web',
    metadata: { name: 'web-sg', createdAt: '2025-01-10T09:20:00Z' },
    spec: {
      virtualNetwork: 'vn-prod',
      ingress: [
        { protocol: 'PROTOCOL_TCP', portFrom: 80, portTo: 80, ipv4Cidr: '0.0.0.0/0' },
        { protocol: 'PROTOCOL_TCP', portFrom: 443, portTo: 443, ipv4Cidr: '0.0.0.0/0' },
        { protocol: 'PROTOCOL_TCP', portFrom: 22, portTo: 22, ipv4Cidr: '10.0.0.0/8' },
      ],
      egress: [{ protocol: 'PROTOCOL_ALL', ipv4Cidr: '0.0.0.0/0' }],
    },
    status: { state: 'SECURITY_GROUP_STATE_READY' },
  },
  {
    id: 'sg-db',
    metadata: { name: 'db-sg', createdAt: '2025-01-10T09:25:00Z' },
    spec: {
      virtualNetwork: 'vn-prod',
      ingress: [
        { protocol: 'PROTOCOL_TCP', portFrom: 5432, portTo: 5432, ipv4Cidr: '10.0.0.0/16' },
        { protocol: 'PROTOCOL_TCP', portFrom: 3306, portTo: 3306, ipv4Cidr: '10.0.0.0/16' },
      ],
      egress: [{ protocol: 'PROTOCOL_ALL', ipv4Cidr: '0.0.0.0/0' }],
    },
    status: { state: 'SECURITY_GROUP_STATE_READY' },
  },
  {
    id: 'sg-mgmt',
    metadata: { name: 'mgmt-sg', createdAt: '2025-03-01T08:20:00Z' },
    spec: {
      virtualNetwork: 'vn-mgmt',
      ingress: [
        { protocol: 'PROTOCOL_TCP', portFrom: 22, portTo: 22, ipv4Cidr: '0.0.0.0/0' },
        { protocol: 'PROTOCOL_ICMP', ipv4Cidr: '0.0.0.0/0' },
      ],
      egress: [{ protocol: 'PROTOCOL_ALL', ipv4Cidr: '0.0.0.0/0' }],
    },
    status: { state: 'SECURITY_GROUP_STATE_READY' },
  },
]

export const DEMO_NETWORK_CLASSES: NetworkClass[] = [
  {
    id: 'udn-net',
    metadata: { name: 'udn-net', createdAt: '2025-01-01T00:00:00Z' },
    title: 'UDN Network',
    description:
      'User-Defined Networks backed by OpenShift UDN. Provides tenant-isolated L3 networking with flexible CIDR allocation. Recommended for most workloads.',
    capabilities: { supportsIpv4: true, supportsIpv6: true, supportsDualStack: true },
    status: { state: 'NETWORK_CLASS_STATE_READY' },
    isDefault: true,
  },
  {
    id: 'phys-net',
    metadata: { name: 'phys-net', createdAt: '2025-01-01T00:00:00Z' },
    title: 'Physical Network',
    description:
      'Networks backed by physical network infrastructure. Provides high-performance connectivity for latency-sensitive workloads. Requires pre-provisioned VLANs.',
    capabilities: { supportsIpv4: true, supportsIpv6: true, supportsDualStack: true },
    status: { state: 'NETWORK_CLASS_STATE_READY' },
    isDefault: false,
  },
]

export interface PublicIPPoolGroupAssignment {
  group: string
  quota: number | null
  used: number
}

export interface PublicIPPoolExtended extends PublicIPPool {
  zone?: string
  groupAssignments?: PublicIPPoolGroupAssignment[]
  capacity?: number
  allocated?: number
  tenants?: string[]
}

export const DEMO_PUBLIC_IP_POOLS: PublicIPPoolExtended[] = [
  {
    id: 'pool-public-main',
    metadata: { name: 'main-pool', createdAt: '2025-01-01T00:00:00Z' },
    spec: { cidr: '203.0.113.0/24' },
    status: { state: 'READY', availableCount: 200 },
    zone: 'us-east-1',
    capacity: 254,
    allocated: 42,
    tenants: ['northstar', 'evergreen'],
    groupAssignments: [
      { group: 'northstar-prod', quota: 50, used: 18 },
      { group: 'northstar-dev', quota: 10, used: 4 },
      { group: 'evergreen-prod', quota: 30, used: 20 },
    ],
  },
  {
    id: 'pool-public-edge',
    metadata: { name: 'edge-pool', createdAt: '2025-06-01T00:00:00Z' },
    spec: { cidr: '198.51.100.0/26' },
    status: { state: 'READY', availableCount: 60 },
    zone: 'us-east-2',
    capacity: 62,
    allocated: 2,
    tenants: ['vertexa'],
    groupAssignments: [{ group: 'vertexa-edge', quota: null, used: 2 }],
  },
]

export const DEMO_PUBLIC_IPS: PublicIP[] = [
  {
    id: 'pip-1',
    metadata: { name: 'web-frontend-ip', createdAt: '2025-03-10T10:00:00Z' },
    spec: { pool: 'pool-public-main', computeInstance: 'ci-001' },
    status: {
      state: 'PUBLIC_IP_STATE_ATTACHED',
      address: '203.0.113.10',
      pool: 'pool-public-main',
    },
  },
  {
    id: 'pip-2',
    metadata: { name: 'spare-ip', createdAt: '2025-04-01T14:00:00Z' },
    spec: { pool: 'pool-public-main' },
    status: {
      state: 'PUBLIC_IP_STATE_ALLOCATED',
      address: '203.0.113.25',
      pool: 'pool-public-main',
    },
  },
  {
    id: 'pip-3',
    metadata: { name: 'pending-ip', createdAt: '2025-05-20T09:00:00Z' },
    spec: { pool: 'pool-public-edge' },
    status: { state: 'PUBLIC_IP_STATE_PENDING', pool: 'pool-public-edge' },
  },
]
