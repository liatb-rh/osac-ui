/**
 * flow: application-shell-session
 * step: shell_primary_workspace
 *
 * Authenticated application shell — masthead, sidebar nav (role-based), breadcrumb.
 */
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Page, PageSection } from '@patternfly/react-core'

import {
  DEMO_PROVIDER_ADMIN_DISPLAY_NAME,
  DEMO_TENANT_DISPLAY_ADMIN,
  DEMO_TENANT_DISPLAY_USER,
  DEMO_TENANT_SOVEREIGNTY,
} from '@osac/api-contracts'
import { PlaceholderPage } from '@osac/ui-components'
import { useSession } from '../contexts/SessionContext'

// Pages
import { RecentActivitiesPage } from './RecentActivitiesPage'
import { SparsePlaceholderPage } from './SparsePlaceholderPage'
import { CatalogItemsPage } from './services'
import { ClusterDetailPage, ClustersPage, VmDetailPage, VmsPage } from './services'
import {
  AgentDetailPage,
  BaremetalHostDetailPage,
  BaremetalInventoryPage,
  GlobalTemplateDetailPage,
  GlobalTemplatesPage,
  InfrastructureAgentsPage,
  ProviderInfraTopologyPage,
  ProviderPublicIPPoolDetailPage,
  ProviderPublicIPPoolsPage,
  StorageBackendDetailPage,
  StorageBackendsPage,
  StoragePage,
  StorageTierDetailPage,
  StorageTiersPage,
  VolumeDetailPage,
  VolumesPage,
} from './resources'
import { BaremetalDetailPage, BaremetalPage } from './services/baremetal'
import { NetworkClassesPage } from './infrastructure'
import {
  AdminCatalogItemDetailPage,
  AdminCatalogItemsPage,
  ClusterOfferingDetailPage,
  ClusterOfferingsPage,
  OrganizationsPage,
  PublicIpPoolDetailsPage,
  PublicIpPoolsPage,
  TenantDetailPage,
  UsersPage,
} from './administration'
import { NetworksPage, SubnetDetailPage, VirtualNetworkDetailPage } from './resources/network'
import { ShellBreadcrumb } from './shell/ShellBreadcrumb'
import { ShellMasthead } from './shell/ShellMasthead'
import { ShellSidebar } from './shell/ShellSidebar'
import { navRowsForRole } from './shell/shellNav'
import {
  ADMIN_PLACEHOLDER_ROUTES,
  PROVIDER_PLACEHOLDER_ROUTES,
  defaultRouteForRole,
} from './shell/shellRoutes'

// ---------------------------------------------------------------------------
// AppShell component
// ---------------------------------------------------------------------------

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedTenant, role, isDarkTheme, setIsDarkTheme, logout } = useSession()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const isRecentActivities = location.pathname === '/activities'

  const navRows = useMemo(() => navRowsForRole(role), [role])
  const handleSidebarNavigate = useCallback(
    (path: string) => {
      const isReselect = path === location.pathname
      navigate(path, {
        replace: isReselect,
        state: {
          navReselect: isReselect,
          navSelectSeq: Date.now(),
        },
      })
    },
    [location.pathname, navigate],
  )

  const displayName = useMemo(() => {
    if (!selectedTenant) return ''
    if (role === 'providerAdmin') return DEMO_PROVIDER_ADMIN_DISPLAY_NAME
    if (role === 'tenantAdmin') return DEMO_TENANT_DISPLAY_ADMIN[selectedTenant]
    return DEMO_TENANT_DISPLAY_USER[selectedTenant]
  }, [role, selectedTenant])

  const sovereignty = selectedTenant ? DEMO_TENANT_SOVEREIGNTY[selectedTenant] : null
  const masthead = (
    <ShellMasthead
      selectedTenant={selectedTenant}
      role={role}
      displayName={displayName}
      sovereignty={sovereignty}
      isUserMenuOpen={isUserMenuOpen}
      setIsUserMenuOpen={setIsUserMenuOpen}
      onLogout={logout}
      onOpenActivities={() => navigate('/activities')}
    />
  )

  const sidebar = (
    <ShellSidebar
      navRows={navRows}
      pathname={location.pathname}
      onNavigate={handleSidebarNavigate}
      isDarkTheme={isDarkTheme}
      setIsDarkTheme={setIsDarkTheme}
      onLogout={logout}
    />
  )

  const breadcrumb = (
    <ShellBreadcrumb isRecentActivities={isRecentActivities} role={role} onNavigate={navigate} />
  )

  // ---------------------------------------------------------------------------
  // Main content routes
  // ---------------------------------------------------------------------------

  const defaultRoute = defaultRouteForRole(role)

  return (
    <Page masthead={masthead} sidebar={sidebar} breadcrumb={breadcrumb} isManagedSidebar>
      <Routes>
        {/* Tenant user routes */}
        <Route path="/dashboard" element={<Navigate to="/catalog-items" replace />} />
        <Route path="/vms" element={<VmsPage />} />
        <Route path="/vms/:id" element={<VmDetailPage />} />
        <Route path="/catalog-items" element={<CatalogItemsPage />} />
        <Route path="/activities" element={<RecentActivitiesPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/clusters/:id" element={<ClusterDetailPage />} />
        <Route path="/cluster-offerings" element={<ClusterOfferingsPage />} />
        <Route path="/cluster-offerings/:id" element={<ClusterOfferingDetailPage />} />
        <Route path="/networks" element={<NetworksPage />} />
        <Route path="/networks/virtual-networks/:id" element={<VirtualNetworkDetailPage />} />
        <Route path="/networks/subnets/:id" element={<SubnetDetailPage />} />
        <Route path="/resources/network/catalog/public-ips" element={<PublicIpPoolsPage />} />
        <Route
          path="/resources/network/catalog/public-ips/:id"
          element={<PublicIpPoolDetailsPage />}
        />
        <Route
          path="/resources/network/catalog/admin-catalog-items"
          element={<AdminCatalogItemsPage />}
        />
        <Route
          path="/resources/network/catalog/admin-catalog-items/new"
          element={<AdminCatalogItemDetailPage />}
        />
        <Route
          path="/resources/network/catalog/admin-catalog-items/:id"
          element={<AdminCatalogItemDetailPage />}
        />
        {ADMIN_PLACEHOLDER_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <PageWrapper>
                <PlaceholderPage title={route.title} lede={route.lede} />
              </PageWrapper>
            }
          />
        ))}
        <Route path="/agents" element={<InfrastructureAgentsPage />} />
        <Route path="/agents/:id" element={<AgentDetailPage />} />
        <Route path="/resources/storage/storage-tiers" element={<StorageTiersPage />} />
        <Route path="/resources/storage/storage-tiers/:id" element={<StorageTierDetailPage />} />
        <Route path="/resources/storage/storage-backends" element={<StorageBackendsPage />} />
        <Route
          path="/resources/storage/storage-backends/:id"
          element={<StorageBackendDetailPage />}
        />
        <Route path="/resources/storage" element={<StoragePage />} />
        <Route path="/resources/storage/storage-volumes" element={<VolumesPage />} />
        <Route path="/resources/storage/storage-volumes/:id" element={<VolumeDetailPage />} />
        {/* Administration: providerAdmin */}
        <Route path="/provider/organizations" element={<OrganizationsPage />} />
        <Route
          path="/provider/tenants"
          element={<Navigate to="/provider/organizations" replace />}
        />
        <Route path="/provider/tenants/:id" element={<TenantDetailPage />} />
        {/* Administration: tenantAdmin */}
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/provider/network-classes" element={<NetworkClassesPage />} />
        {PROVIDER_PLACEHOLDER_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <PageWrapper>
                <PlaceholderPage title={route.title} lede={route.lede} />
              </PageWrapper>
            }
          />
        ))}
        <Route path="/resources/network/global-templates" element={<GlobalTemplatesPage />} />
        <Route
          path="/resources/network/global-templates/:id"
          element={<GlobalTemplateDetailPage />}
        />
        <Route path="/provider/infrastructure" element={<ProviderInfraTopologyPage />} />
        <Route
          path="/resources/network/public-ip/public-ip-pools"
          element={<ProviderPublicIPPoolsPage />}
        />
        <Route
          path="/resources/network/public-ip/public-ip-pools/:id"
          element={<ProviderPublicIPPoolDetailPage />}
        />
        <Route path="/baremetal" element={<BaremetalPage />} />
        <Route path="/baremetal/:name" element={<BaremetalDetailPage />} />
        <Route path="/provider/baremetal" element={<BaremetalInventoryPage />} />
        <Route path="/provider/baremetal/:id" element={<BaremetalHostDetailPage />} />

        {/* Fallback */}
        <Route
          path="*"
          element={
            role === 'tenantUser' ? (
              <SparsePlaceholderPage />
            ) : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />
      </Routes>
    </Page>
  )
}

function PageWrapper({ children }: { children: ReactNode }) {
  return <PageSection>{children}</PageSection>
}
