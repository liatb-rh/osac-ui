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
  /** When set, renders as a collapsible NavExpandable group instead of a link. */
  children?: NavItem[]
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
    groupLabel: 'Services',
    items: [
      // { id: 'workloads-dashboard',   label: 'Dashboard',        path: '/dashboard', icon: ThIcon,       roles: ['tenantUser','tenantAdmin', 'providerAdmin'] },
      {
        id: 'catalog-items',
        label: 'Catalog',
        path: '/catalog-items',
        icon: CubesIcon,
        roles: ['tenantUser', 'tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'vms-list',
        label: 'Virtual Machines',
        path: '/vms',
        icon: ServerIcon,
        roles: ['tenantUser', 'tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'baremetal',
        label: 'Bare Metal',
        path: '/baremetal',
        icon: ServerIcon,
        roles: ['tenantUser', 'tenantAdmin'],
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
    groupLabel: 'Resources',
    items: [
      {
        id: 'resources-network',
        label: 'Network',
        path: '',
        icon: NetworkIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
        children: [
          {
            id: 'admin-public-ips',
            label: 'Public IP Pools',
            path: '/resources/network/catalog/public-ips',
            icon: NetworkIcon,
            roles: ['tenantAdmin'],
          },
          {
            id: 'admin-catalog-items',
            label: 'Catalog Items',
            path: '/resources/network/catalog/admin-catalog-items',
            icon: CubesIcon,
            roles: ['tenantAdmin'],
          },
          {
            id: 'platform-public-ip-pools',
            label: 'Public IP Pools',
            path: '/resources/network/public-ip/public-ip-pools',
            icon: NetworkIcon,
            roles: ['providerAdmin'],
          },
          {
            id: 'platform-templates',
            label: 'Global Templates',
            path: '/resources/network/global-templates',
            icon: CubesIcon,
            roles: ['providerAdmin'],
          },
        ],
      },
      {
        id: 'provider-baremetal',
        label: 'Bare Metal Inventory',
        path: '/provider/baremetal',
        icon: ServerIcon,
        roles: ['providerAdmin'],
      },
    ],
  },
  {
    groupLabel: 'Deprecated',
    items: [
      {
        id: 'networks',
        label: 'Networks',
        path: '/networks',
        icon: NetworkIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'cluster-offerings',
        label: 'Cluster offerings',
        path: '/cluster-offerings',
        icon: ListIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
      {
        id: 'provider-net-classes',
        label: 'Network classes',
        path: '/provider/network-classes',
        icon: NetworkIcon,
        roles: ['providerAdmin'],
      },
      {
        id: 'admin-storage',
        label: 'Storage',
        path: '/admin/storage',
        icon: DatabaseIcon,
        roles: ['tenantAdmin', 'providerAdmin'],
      },
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

function filterItem(item: NavItem, role: OsacRole): NavItem | null {
  if (item.roles && !item.roles.includes(role)) return null
  if (item.children) {
    const children = item.children.filter((c) => !c.roles || c.roles.includes(role))
    return children.length > 0 ? { ...item, children } : null
  }
  return item
}

export function navRowsForRole(role: OsacRole): NavSection[] {
  return ALL_NAV.map((section) => ({
    ...section,
    items: section.items.flatMap((item) => {
      const filtered = filterItem(item, role)
      return filtered ? [filtered] : []
    }),
  })).filter((section) => section.items.length > 0)
}
