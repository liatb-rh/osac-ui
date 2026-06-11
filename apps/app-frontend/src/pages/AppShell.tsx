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
import { CatalogItemsPage } from './workloads'
import { ClusterDetailPage, ClustersPage, VmDetailPage, VmsPage } from './workloads'
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
  StorageTierDetailPage,
  StorageTiersPage,
} from './platform'
import { BaremetalDetailPage, BaremetalPage } from './baremetal'
import { NetworkClassesPage } from './infrastructure'
import {
  AdminCatalogItemsPage,
  ClusterOfferingDetailPage,
  ClusterOfferingsPage,
  NetworksPage,
  TenantAdminPublicIPPoolDetailPage,
  TenantAdminPublicIPPoolsPage,
} from './management'
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
        <Route path="/dashboard" element={<VmsPage />} />
        <Route path="/vms" element={<VmsPage />} />
        <Route path="/vms/:id" element={<VmDetailPage />} />
        <Route path="/catalog-items" element={<CatalogItemsPage />} />
        <Route path="/activities" element={<RecentActivitiesPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/clusters/:id" element={<ClusterDetailPage />} />
        <Route path="/cluster-offerings" element={<ClusterOfferingsPage />} />
        <Route path="/cluster-offerings/:id" element={<ClusterOfferingDetailPage />} />
        <Route path="/networks" element={<NetworksPage />} />
        <Route path="/admin/public-ips" element={<TenantAdminPublicIPPoolsPage />} />
        <Route path="/admin/public-ips/:id" element={<TenantAdminPublicIPPoolDetailPage />} />
        <Route path="/admin/catalog-items" element={<AdminCatalogItemsPage />} />
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
        <Route path="/storage-tiers" element={<StorageTiersPage />} />
        <Route path="/storage-tiers/:id" element={<StorageTierDetailPage />} />
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
        <Route path="/global-templates" element={<GlobalTemplatesPage />} />
        <Route path="/global-templates/:id" element={<GlobalTemplateDetailPage />} />
        <Route path="/provider/infrastructure" element={<ProviderInfraTopologyPage />} />
        <Route path="/provider/public-ip-pools" element={<ProviderPublicIPPoolsPage />} />
        <Route path="/provider/public-ip-pools/:id" element={<ProviderPublicIPPoolDetailPage />} />
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
