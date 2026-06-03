import type { DemoShellRole } from '@osac/api-contracts'

export type NavRow =
  | { kind: 'link'; id: string; label: string; path: string }
  | {
      kind: 'expand'
      label: string
      groupId: string
      children: { id: string; label: string; path: string }[]
    }

const TENANT_USER_NAV: NavRow[] = [
  { kind: 'link', id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  {
    kind: 'expand',
    label: 'Virtual Machines',
    groupId: 'nav-tenant-vms',
    children: [
      { id: 'compute-vms', label: 'My List', path: '/vms' },
      { id: 'catalog', label: 'Templates', path: '/templates' },
    ],
  },
  {
    kind: 'expand',
    label: 'Clusters',
    groupId: 'nav-tenant-clusters',
    children: [
      { id: 'clusters', label: 'My List', path: '/clusters' },
    ],
  },
]

const TENANT_ADMIN_NAV: NavRow[] = [
  { kind: 'link', id: 'admin-dashboard', label: 'Dashboard', path: '/admin/dashboard' },
  {
    kind: 'expand',
    label: 'Management',
    groupId: 'nav-admin-mgmt',
    children: [
      { id: 'admin-users', label: 'Users', path: '/admin/users' },
      { id: 'admin-quota', label: 'Quota control', path: '/admin/quota' },
      { id: 'admin-templates', label: 'Template catalog', path: '/admin/templates' },
      { id: 'admin-cluster-offerings', label: 'Cluster offerings', path: '/admin/cluster-offerings' },
    ],
  },
  {
    kind: 'expand',
    label: 'Infrastructure',
    groupId: 'nav-admin-infra',
    children: [
      { id: 'admin-networks', label: 'Networks', path: '/admin/networks' },
      { id: 'admin-public-ips', label: 'Public IPs', path: '/admin/public-ips' },
      { id: 'admin-storage', label: 'Storage', path: '/admin/storage' },
    ],
  },
  {
    kind: 'expand',
    label: 'Organization',
    groupId: 'nav-admin-org',
    children: [
      { id: 'admin-org-settings', label: 'Organization settings', path: '/admin/org-settings' },
      { id: 'admin-org-security', label: 'Security & Compliance', path: '/admin/security' },
    ],
  },
]

const PROVIDER_ADMIN_NAV: NavRow[] = [
  { kind: 'link', id: 'provider-dashboard', label: 'Dashboard', path: '/provider/dashboard' },
  {
    kind: 'expand',
    label: 'Management',
    groupId: 'nav-provider-mgmt',
    children: [
      { id: 'provider-orgs', label: 'Tenant organizations', path: '/provider/organizations' },
      { id: 'provider-allocation', label: 'Resource allocation', path: '/provider/allocation' },
      { id: 'provider-templates', label: 'Global templates', path: '/provider/templates' },
      { id: 'provider-network-classes', label: 'Network classes', path: '/provider/network-classes' },
    ],
  },
  {
    kind: 'expand',
    label: 'CaaS',
    groupId: 'nav-provider-caas',
    children: [
      { id: 'provider-clusters', label: 'All Clusters', path: '/provider/clusters' },
      { id: 'provider-agents', label: 'Agents', path: '/provider/agents' },
      { id: 'provider-cluster-offerings', label: 'Cluster offerings', path: '/provider/cluster-offerings' },
      { id: 'provider-storage-tiers', label: 'Storage tiers', path: '/provider/storage-tiers' },
    ],
  },
  {
    kind: 'expand',
    label: 'System',
    groupId: 'nav-provider-system',
    children: [
      { id: 'provider-infra', label: 'Infrastructure', path: '/provider/infrastructure' },
      { id: 'provider-security', label: 'Roles & Identity', path: '/provider/security' },
      { id: 'provider-settings', label: 'Platform settings', path: '/provider/settings' },
    ],
  },
]

export const DEFAULT_EXPANDED_GROUP_IDS = [
  'nav-tenant-vms',
  'nav-tenant-clusters',
  'nav-admin-mgmt',
  'nav-admin-infra',
  'nav-admin-org',
  'nav-provider-mgmt',
  'nav-provider-caas',
  'nav-provider-system',
]

export function navRowsForRole(role: DemoShellRole): NavRow[] {
  if (role === 'providerAdmin') return PROVIDER_ADMIN_NAV
  if (role === 'tenantAdmin') return TENANT_ADMIN_NAV
  return TENANT_USER_NAV
}
