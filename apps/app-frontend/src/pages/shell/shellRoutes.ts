import type { DemoShellRole } from '@osac/api-contracts'

export interface ShellPlaceholderRoute {
  path: string
  title: string
  lede: string
}

export const ADMIN_PLACEHOLDER_ROUTES: ShellPlaceholderRoute[] = [
  {
    path: '/admin/storage',
    title: 'Storage',
    lede: 'Disk pools, snapshots, and backup policies for your tenant.',
  },
  {
    path: '/admin/org-settings',
    title: 'Organization settings',
    lede: 'Branding, identity providers, and tenant-wide defaults.',
  },
  {
    path: '/admin/security',
    title: 'Security & Compliance',
    lede: 'Audit logs, policy packs, and compliance reporting.',
  },
]

export const PROVIDER_PLACEHOLDER_ROUTES: ShellPlaceholderRoute[] = [
  {
    path: '/provider/allocation',
    title: 'Resource allocation',
    lede: 'Capacity pools, region quotas, and fair-share limits across tenants.',
  },
  {
    path: '/provider/settings',
    title: 'Platform settings',
    lede: 'Feature flags, integrations, maintenance windows, and API endpoints.',
  },
]

export function defaultRouteForRole(role: DemoShellRole): string {
  if (role === 'providerAdmin') return '/provider/dashboard'
  if (role === 'tenantAdmin') return '/admin/dashboard'
  return '/dashboard'
}
