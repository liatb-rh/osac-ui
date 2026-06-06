import type { ComponentType } from 'react'
import { CloudIcon } from '@patternfly/react-icons/dist/esm/icons/cloud-icon'
import { CogIcon } from '@patternfly/react-icons/dist/esm/icons/cog-icon'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { DatabaseIcon } from '@patternfly/react-icons/dist/esm/icons/database-icon'
import { ListIcon } from '@patternfly/react-icons/dist/esm/icons/list-icon'
import { NetworkIcon } from '@patternfly/react-icons/dist/esm/icons/network-icon'
import { OutlinedClockIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-clock-icon'
import { ServerIcon } from '@patternfly/react-icons/dist/esm/icons/server-icon'
import type { OsacRole } from '@osac/api-contracts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string
  label: string
  path: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: ComponentType<any>
  /** Roles that can see this item. Undefined = visible to all roles. */
  roles?: OsacRole[]
}

export interface NavSection {
  /** Rendered as a NavGroup title. Omit for an untitled top section. */
  groupLabel?: string
  items: NavItem[]
}

// ---------------------------------------------------------------------------
// Master nav list — single source of truth for all roles.
// Each item declares which roles can see it; navRowsForRole filters at
// call time so items always appear in the same canonical position.
// ---------------------------------------------------------------------------

const ALL_NAV: NavSection[] = [
  {
    groupLabel: 'Workloads',
    items: [
      // { id: 'workloads-dashboard',   label: 'Dashboard',        path: '/dashboard', icon: ThIcon,       roles: ['tenantUser','tenantAdmin', 'providerAdmin'] },
      {
        id: 'vms-list',
        label: 'Virtual Machines',
        path: '/vms',
        icon: ServerIcon,
        roles: ['tenantUser', 'tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'catalog',
        label: 'Template Catalog',
        path: '/templates',
        icon: CubesIcon,
        roles: ['tenantUser', 'tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'clusters',
        label: 'Clusters',
        path: '/clusters',
        icon: CloudIcon,
        roles: ['tenantUser', 'tenantAdmin', 'providerAdmin'],
      },
    ],
  },
  {
    groupLabel: 'Administration',
    items: [
      {
        id: 'cluster-offerings',
        label: 'Cluster offerings',
        path: '/cluster-offerings',
        icon: ListIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'networks',
        label: 'Networks',
        path: '/networks',
        icon: NetworkIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'provider-net-classes',
        label: 'Network classes',
        path: '/provider/network-classes',
        icon: NetworkIcon,
        roles: ['providerAdmin'],
      },
    ],
  },

  {
    groupLabel: 'Infrastructure',
    items: [
      {
        id: 'admin-public-ips',
        label: 'Public IPs',
        path: '/admin/public-ips',
        icon: NetworkIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'admin-storage',
        label: 'Storage',
        path: '/admin/storage',
        icon: DatabaseIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
    ],
  },
  {
    groupLabel: 'Platform',
    items: [
      {
        id: 'platform-storage-tiers',
        label: 'Storage Tiers',
        path: '/storage-tiers',
        icon: DatabaseIcon,
        roles: ['providerAdmin'],
      },
      {
        id: 'platform-agents',
        label: 'Agents',
        path: '/agents',
        icon: CogIcon,
        roles: ['providerAdmin'],
      },
      {
        id: 'platform-templates',
        label: 'Global Templates',
        path: '/global-templates',
        icon: CubesIcon,
        roles: ['providerAdmin'],
      },
    ],
  },
  {
    groupLabel: 'Account',
    items: [
      {
        id: 'activities',
        label: 'Recent Activity',
        path: '/activities',
        icon: OutlinedClockIcon,
        roles: ['tenantUser'],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export function navRowsForRole(role: OsacRole): NavSection[] {
  return ALL_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((section) => section.items.length > 0)
}
