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
import { useSession } from '../../contexts/SessionContext'

// Pages
import {
  CatalogPage,
  DashboardPage,
  RecentActivitiesPage,
  TenantSparsePlaceholderPage,
  VmListPage,
} from '../tenant'
import {
  AdminClusterOfferingsPage,
  AdminDashboardPage,
  AdminNetworksPage,
  AdminPublicIPsPage,
  AdminQuotaPage,
  AdminUsersPage,
} from '../admin'
import {
  ProviderAdminDashboardPage,
  ProviderAgentManagementPage,
  ProviderAllClustersPage,
  ProviderInfraTopologyPage,
  ProviderNetworkClassesPage,
  ProviderOrgDetailPage,
  ProviderRbacPage,
  ProviderStorageTiersPage,
  ProviderTenantOrgsPage,
} from '../provider'
import { ClustersPage } from '../../components/clusters/ClustersPage'
import { ClusterDetailPage } from '../../components/clusters/ClusterDetailPage'
import { ShellBreadcrumb } from './ShellBreadcrumb'
import { ShellMasthead } from './ShellMasthead'
import { ShellSidebar } from './ShellSidebar'
import { DEFAULT_EXPANDED_GROUP_IDS, navRowsForRole } from './shellNav'
import {
  ADMIN_PLACEHOLDER_ROUTES,
  PROVIDER_PLACEHOLDER_ROUTES,
  defaultRouteForRole,
} from './shellRoutes'

// ---------------------------------------------------------------------------
// AppShell component
// ---------------------------------------------------------------------------

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedTenant, role, isDarkTheme, setIsDarkTheme, logout, openTopologyDetailRequest } =
    useSession()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(DEFAULT_EXPANDED_GROUP_IDS),
  )

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

  const toggleGroup = useCallback((groupId: string, expanded: boolean) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (expanded) next.add(groupId)
      else next.delete(groupId)
      return next
    })
  }, [])

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
      expandedGroups={expandedGroups}
      onToggleGroup={toggleGroup}
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/vms/*" element={<VmListPage />} />
        <Route path="/templates" element={<CatalogPage />} />
        <Route path="/activities" element={<RecentActivitiesPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/clusters/:id" element={<ClusterDetailPage />} />

        {/* Tenant admin routes */}
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/quota" element={<AdminQuotaPage />} />
        <Route path="/admin/templates" element={<CatalogPage />} />
        <Route path="/admin/cluster-offerings" element={<AdminClusterOfferingsPage />} />
        <Route
          path="/admin/networks"
          element={<AdminNetworksPage onOpenVmDetail={openTopologyDetailRequest} />}
        />
        <Route path="/admin/public-ips" element={<AdminPublicIPsPage />} />
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

        {/* Provider admin routes */}
        <Route path="/provider/dashboard" element={<ProviderAdminDashboardPage />} />
        <Route path="/provider/organizations" element={<ProviderTenantOrgsPage />} />
        <Route path="/provider/organizations/:id" element={<ProviderOrgDetailPage />} />
        <Route path="/provider/security" element={<ProviderRbacPage />} />
        <Route path="/provider/clusters" element={<ProviderAllClustersPage />} />
        <Route path="/provider/agents" element={<ProviderAgentManagementPage />} />
        <Route path="/provider/cluster-offerings" element={<AdminClusterOfferingsPage role="providerAdmin" />} />
        <Route path="/provider/storage-tiers" element={<ProviderStorageTiersPage />} />
        <Route path="/provider/network-classes" element={<ProviderNetworkClassesPage />} />
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
        <Route path="/provider/templates" element={<CatalogPage isProviderGlobal />} />
        <Route path="/provider/infrastructure" element={<ProviderInfraTopologyPage />} />

        {/* Fallback */}
        <Route
          path="*"
          element={
            role === 'tenantUser' ? (
              <TenantSparsePlaceholderPage />
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
