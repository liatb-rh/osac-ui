/**
 * Mock store for RBAC Management (provider admin)
 * Mirrors osac-pilot app.provider.rbac.tsx SYSTEM_ROLES / ORG_ROLES / GROUPS / MEMBER_POOL.
 * Maps to fulfillment-service proto: Role, RoleBinding (spec.role + spec.groups[]).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Keycloak-style role IDs aligned to fulfillment-service Role names */
export type RbacScopeId =
  | 'cloud-provider-admin'
  | 'cloud-provider-reader'
  | 'tenant-admin'
  | 'tenant-reader'
  | 'tenant-user'

export interface RbacRole {
  id: RbacScopeId
  label: string
  scope: 'system' | 'org'
  description: string
  /** True = edit-permissions action disabled */
  readOnly?: boolean
}

export interface GroupMapping {
  id: string
  /** Full Keycloak group path, e.g. "/northstar/platform-admins" */
  kcGroup: string
  /** Keycloak realm slug, e.g. "northstar.osac" */
  realm: string
  mappedRole: RbacScopeId
}

export interface RbacMember {
  name: string
  email: string
  group: string
  realm: string
}

export interface PermissionCategory {
  label: string
  permissions: string[]
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const SYSTEM_ROLES: RbacRole[] = [
  {
    id: 'cloud-provider-admin',
    label: 'Cloud Provider Admin',
    scope: 'system',
    description: 'Full platform governance — tenants, infrastructure, RBAC, catalog, storage.',
  },
  {
    id: 'cloud-provider-reader',
    label: 'Cloud Provider Reader',
    scope: 'system',
    description: 'Read-only view of all platform resources and tenant status.',
    readOnly: true,
  },
]

export const ORG_ROLES: RbacRole[] = [
  {
    id: 'tenant-admin',
    label: 'Tenant Admin',
    scope: 'org',
    description: 'Manage users, quota, network, storage, and cluster offerings within a tenant.',
  },
  {
    id: 'tenant-reader',
    label: 'Tenant Reader',
    scope: 'org',
    description: 'Read-only access to tenant resources — no provisioning actions.',
    readOnly: true,
  },
  {
    id: 'tenant-user',
    label: 'Tenant User',
    scope: 'org',
    description: 'Provision and operate VMs, clusters, and bare metal within a tenant.',
  },
]

export const ALL_ROLES: RbacRole[] = [...SYSTEM_ROLES, ...ORG_ROLES]

// ---------------------------------------------------------------------------
// Group → Role mappings
// ---------------------------------------------------------------------------

export const GROUP_MAPPINGS: GroupMapping[] = [
  {
    id: 'gm-1',
    kcGroup: '/osac-system/provider-admins',
    realm: 'vertexa.osac',
    mappedRole: 'cloud-provider-admin',
  },
  {
    id: 'gm-2',
    kcGroup: '/osac-system/platform-readers',
    realm: 'vertexa.osac',
    mappedRole: 'cloud-provider-reader',
  },
  {
    id: 'gm-3',
    kcGroup: '/northstar/platform-admins',
    realm: 'northstar.osac',
    mappedRole: 'tenant-admin',
  },
  {
    id: 'gm-4',
    kcGroup: '/evergreen/platform-admins',
    realm: 'bluestone.osac',
    mappedRole: 'tenant-admin',
  },
  {
    id: 'gm-5',
    kcGroup: '/northstar/dev-team',
    realm: 'northstar.osac',
    mappedRole: 'tenant-user',
  },
  {
    id: 'gm-6',
    kcGroup: '/evergreen/dev-team',
    realm: 'bluestone.osac',
    mappedRole: 'tenant-user',
  },
  {
    id: 'gm-7',
    kcGroup: '/aurora/platform-admins',
    realm: 'aurora.osac',
    mappedRole: 'tenant-admin',
  },
  {
    id: 'gm-8',
    kcGroup: '/helix/platform-admins',
    realm: 'helix.osac',
    mappedRole: 'tenant-admin',
  },
]

// ---------------------------------------------------------------------------
// Member pool  (Keycloak group path → members)
// ---------------------------------------------------------------------------

export const MEMBER_POOL: Record<string, RbacMember[]> = {
  '/osac-system/provider-admins': [
    {
      name: 'Alex Johnson',
      email: 'alex.johnson@vertexacloud.com',
      group: '/osac-system/provider-admins',
      realm: 'vertexa.osac',
    },
    {
      name: 'Priya Raman',
      email: 'priya.raman@osac.io',
      group: '/osac-system/provider-admins',
      realm: 'vertexa.osac',
    },
  ],
  '/osac-system/platform-readers': [
    {
      name: 'Lee Park',
      email: 'lee.park@osac.io',
      group: '/osac-system/platform-readers',
      realm: 'vertexa.osac',
    },
  ],
  '/northstar/platform-admins': [
    {
      name: 'J. Lee',
      email: 'jlee@northstarbank.com',
      group: '/northstar/platform-admins',
      realm: 'northstar.osac',
    },
    {
      name: 'Alice Renner',
      email: 'alice@northstar.example',
      group: '/northstar/platform-admins',
      realm: 'northstar.osac',
    },
  ],
  '/evergreen/platform-admins': [
    {
      name: 'Marcus Chen',
      email: 'marcus.chen@bluestonefinancial.com',
      group: '/evergreen/platform-admins',
      realm: 'bluestone.osac',
    },
    {
      name: 'Sofia Leclaire',
      email: 'sofia@bluestone.fi',
      group: '/evergreen/platform-admins',
      realm: 'bluestone.osac',
    },
  ],
  '/northstar/dev-team': [
    {
      name: 'Casey Morgan',
      email: 'cmorgan@northstarbank.com',
      group: '/northstar/dev-team',
      realm: 'northstar.osac',
    },
    {
      name: 'Carl Yates',
      email: 'carl@northstar.example',
      group: '/northstar/dev-team',
      realm: 'northstar.osac',
    },
    {
      name: 'Priya Shah',
      email: 'priya@northstar.example',
      group: '/northstar/dev-team',
      realm: 'northstar.osac',
    },
    {
      name: 'Tomas Lund',
      email: 'tomas@northstar.example',
      group: '/northstar/dev-team',
      realm: 'northstar.osac',
    },
  ],
  '/evergreen/dev-team': [
    {
      name: 'Priya Nair',
      email: 'priya.nair@bluestonefinancial.com',
      group: '/evergreen/dev-team',
      realm: 'bluestone.osac',
    },
    {
      name: 'Markus Virtanen',
      email: 'markus@bluestone.fi',
      group: '/evergreen/dev-team',
      realm: 'bluestone.osac',
    },
  ],
  '/aurora/platform-admins': [
    {
      name: 'Dana Ellison',
      email: 'dana@aurora.health',
      group: '/aurora/platform-admins',
      realm: 'aurora.osac',
    },
  ],
  '/helix/platform-admins': [
    {
      name: 'Jonas Eriksen',
      email: 'jonas@helix.logistics',
      group: '/helix/platform-admins',
      realm: 'helix.osac',
    },
  ],
}

// ---------------------------------------------------------------------------
// Permission categories  (7 groups mirroring osac-pilot PERMISSION_CATEGORIES)
// ---------------------------------------------------------------------------

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    label: 'Compute — Virtual Machines',
    permissions: [
      'view_vms',
      'create_vm',
      'delete_vm',
      'vm_power_on',
      'vm_power_off',
      'vm_restart',
      'vm_console_access',
    ],
  },
  {
    label: 'Compute — Bare Metal',
    permissions: ['view_baremetal', 'request_baremetal', 'release_baremetal'],
  },
  {
    label: 'Compute — Clusters (CaaS)',
    permissions: [
      'view_clusters',
      'create_cluster',
      'delete_cluster',
      'upgrade_cluster',
      'manage_cluster_catalog',
    ],
  },
  {
    label: 'Networking',
    permissions: [
      'view_networks',
      'manage_networks',
      'view_public_ips',
      'manage_public_ips',
      'manage_security_groups',
    ],
  },
  {
    label: 'Storage',
    permissions: [
      'view_storage',
      'manage_storage',
      'view_storage_tiers',
      'manage_storage_tiers',
      'manage_storage_backends',
    ],
  },
  {
    label: 'Identity & Access',
    permissions: [
      'view_shell',
      'manage_users',
      'manage_rbac',
      'manage_organizations',
      'manage_tenants',
    ],
  },
  {
    label: 'Platform Administration',
    permissions: [
      'manage_agents',
      'manage_infra',
      'view_audit_log',
      'manage_catalog',
      'manage_quota',
    ],
  },
]

// All permissions as a flat set for reference
export const ALL_PERMISSIONS = new Set(PERMISSION_CATEGORIES.flatMap((c) => c.permissions))

// ---------------------------------------------------------------------------
// Built-in role → permission seeds (mirrors osac-pilot ROLE_PERMISSIONS)
// ---------------------------------------------------------------------------

const PROVIDER_ADMIN_PERMS: Set<string> = new Set([
  'view_vms',
  'create_vm',
  'delete_vm',
  'vm_power_on',
  'vm_power_off',
  'vm_restart',
  'vm_console_access',
  'view_baremetal',
  'request_baremetal',
  'release_baremetal',
  'view_clusters',
  'create_cluster',
  'delete_cluster',
  'upgrade_cluster',
  'manage_cluster_catalog',
  'view_networks',
  'manage_networks',
  'view_public_ips',
  'manage_public_ips',
  'manage_security_groups',
  'view_storage',
  'manage_storage',
  'view_storage_tiers',
  'manage_storage_tiers',
  'manage_storage_backends',
  'view_shell',
  'manage_users',
  'manage_rbac',
  'manage_organizations',
  'manage_tenants',
  'manage_agents',
  'manage_infra',
  'view_audit_log',
  'manage_catalog',
  'manage_quota',
])

const PROVIDER_READER_PERMS: Set<string> = new Set([
  'view_vms',
  'view_baremetal',
  'view_clusters',
  'view_networks',
  'view_public_ips',
  'view_storage',
  'view_storage_tiers',
  'view_shell',
  'view_audit_log',
])

const TENANT_ADMIN_PERMS: Set<string> = new Set([
  'view_vms',
  'create_vm',
  'delete_vm',
  'vm_power_on',
  'vm_power_off',
  'vm_restart',
  'view_baremetal',
  'request_baremetal',
  'release_baremetal',
  'view_clusters',
  'create_cluster',
  'delete_cluster',
  'upgrade_cluster',
  'view_networks',
  'manage_networks',
  'view_public_ips',
  'manage_public_ips',
  'manage_security_groups',
  'view_storage',
  'manage_storage',
  'view_storage_tiers',
  'view_shell',
  'manage_users',
  'view_audit_log',
  'manage_catalog',
  'manage_quota',
])

const TENANT_READER_PERMS: Set<string> = new Set([
  'view_vms',
  'view_baremetal',
  'view_clusters',
  'view_networks',
  'view_public_ips',
  'view_storage',
  'view_storage_tiers',
  'view_shell',
])

const TENANT_USER_PERMS: Set<string> = new Set([
  'view_vms',
  'create_vm',
  'delete_vm',
  'vm_power_on',
  'vm_power_off',
  'vm_restart',
  'vm_console_access',
  'view_baremetal',
  'request_baremetal',
  'release_baremetal',
  'view_clusters',
  'create_cluster',
  'delete_cluster',
  'upgrade_cluster',
  'view_networks',
  'view_public_ips',
  'manage_public_ips',
  'manage_security_groups',
  'view_storage',
  'manage_storage',
  'view_storage_tiers',
  'view_shell',
])

export const ROLE_PERMISSIONS: Record<RbacScopeId, Set<string>> = {
  'cloud-provider-admin': PROVIDER_ADMIN_PERMS,
  'cloud-provider-reader': PROVIDER_READER_PERMS,
  'tenant-admin': TENANT_ADMIN_PERMS,
  'tenant-reader': TENANT_READER_PERMS,
  'tenant-user': TENANT_USER_PERMS,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns all members bound to a role via the group mapping table */
export function membersForRole(roleId: RbacScopeId): RbacMember[] {
  return GROUP_MAPPINGS.filter((g) => g.mappedRole === roleId).flatMap(
    (g) => MEMBER_POOL[g.kcGroup] ?? [],
  )
}

/** Member count for a role (derived, consistent with membersForRole) */
export function memberCountForRole(roleId: RbacScopeId): number {
  return membersForRole(roleId).length
}

export function roleLabel(id: RbacScopeId): string {
  return ALL_ROLES.find((r) => r.id === id)?.label ?? id
}

/** Safe typed accessor for MEMBER_POOL — avoids no-unsafe-member-access on string index */
export function membersForGroup(kcGroup: string): RbacMember[] {
  const entries = Object.entries(MEMBER_POOL)
  const found = entries.find(([k]) => k === kcGroup)
  return found ? found[1] : []
}
