import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { OsacRole, DemoTenantId } from '@osac/api-contracts'
import { demoLoginEmailForRole } from '@osac/api-contracts'
import { clearAccessToken } from '../api/authToken'

// ---------------------------------------------------------------------------
// Query-param helpers (run once at startup)
// ---------------------------------------------------------------------------

function readOsacEntry(): { tenant: DemoTenantId; role: OsacRole } | null {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search)
  const raw = p.get('osac-entry')?.trim().toLowerCase() ?? ''
  const map: Record<string, { tenant: DemoTenantId; role: OsacRole }> = {
    'northstar-user': { tenant: 'northstar', role: 'tenantUser' },
    'northstar-admin': { tenant: 'northstar', role: 'tenantAdmin' },
    'evergreen-user': { tenant: 'evergreen', role: 'tenantUser' },
    'evergreen-admin': { tenant: 'evergreen', role: 'tenantAdmin' },
  }
  return map[raw] ?? null
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface TopologyVmDetailRequest {
  vmId: string
  seq: number
}

interface SessionContextValue {
  selectedTenant: DemoTenantId | null
  role: OsacRole
  isLoggedIn: boolean
  isLoginLoading: boolean
  isDarkTheme: boolean
  topologyDetailRequest: TopologyVmDetailRequest | null
  loginEmail: string
  // Actions
  selectProviderAdmin: () => void
  selectTenantPersona: (tenant: DemoTenantId, role: OsacRole) => void
  loginSuccess: (email: string, password: string) => void
  logout: () => void
  setIsDarkTheme: (dark: boolean) => void
  openTopologyDetailRequest: (vmId: string) => void
  clearTopologyDetailRequest: () => void
  /** One-shot for cold `?osac-entry=` loads; Welcome uses this so Back from sign-in is not trapped. */
  consumeInitialOsacEntryDeepLinkRedirect: () => boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SessionProviderProps {
  children: ReactNode
  onNavigateAfterLogin: (role: OsacRole) => void
  onNavigateToWelcome: () => void
}

export function SessionProvider({
  children,
  onNavigateAfterLogin,
  onNavigateToWelcome,
}: SessionProviderProps) {
  const osacEntry = useRef(readOsacEntry())
  const osacEntryWelcomeRedirectConsumedRef = useRef(false)

  const [selectedTenant, setSelectedTenant] = useState<DemoTenantId | null>(
    () => osacEntry.current?.tenant ?? null,
  )
  const [role, setRole] = useState<OsacRole>(() => osacEntry.current?.role ?? 'tenantUser')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [topologyDetailRequest, setTopologyDetailRequest] =
    useState<TopologyVmDetailRequest | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Remove osac-entry from URL on first render
  useState(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    if (!p.has('osac-entry')) return
    p.delete('osac-entry')
    const qs = p.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  })

  // Theme sync to DOM
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('pf-v6-theme-dark', isDarkTheme)
    root.dataset.osacTheme = isDarkTheme ? 'dark' : 'light'
  }, [isDarkTheme])

  const loginEmail = selectedTenant ? demoLoginEmailForRole(selectedTenant, role) : ''

  const selectProviderAdmin = useCallback(() => {
    setSelectedTenant('vertexa')
    setRole('providerAdmin')
  }, [])

  const selectTenantPersona = useCallback((tenant: DemoTenantId, r: OsacRole) => {
    if (tenant === 'vertexa') return
    setSelectedTenant(tenant)
    setRole(r)
  }, [])

  const loginSuccess = useCallback(
    (_email: string, _password: string) => {
      setIsLoginLoading(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setIsLoginLoading(false)
        setIsLoggedIn(true)
        onNavigateAfterLogin(role)
      }, 2000)
    },
    [onNavigateAfterLogin, role],
  )

  const logout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    clearAccessToken()
    setIsLoggedIn(false)
    setIsLoginLoading(false)
    setSelectedTenant(null)
    setRole('tenantUser')
    setTopologyDetailRequest(null)
    onNavigateToWelcome()
  }, [onNavigateToWelcome])

  const openTopologyDetailRequest = useCallback((vmId: string) => {
    setTopologyDetailRequest((prev) => ({ vmId, seq: (prev?.seq ?? 0) + 1 }))
  }, [])

  const clearTopologyDetailRequest = useCallback(() => setTopologyDetailRequest(null), [])

  const consumeInitialOsacEntryDeepLinkRedirect = useCallback(() => {
    if (!osacEntry.current) return false
    if (osacEntryWelcomeRedirectConsumedRef.current) return false
    osacEntryWelcomeRedirectConsumedRef.current = true
    return true
  }, [])

  return (
    <SessionContext.Provider
      value={{
        selectedTenant,
        role,
        isLoggedIn,
        isLoginLoading,
        isDarkTheme,
        topologyDetailRequest,
        loginEmail,
        selectProviderAdmin,
        selectTenantPersona,
        loginSuccess,
        logout,
        setIsDarkTheme,
        openTopologyDetailRequest,
        clearTopologyDetailRequest,
        consumeInitialOsacEntryDeepLinkRedirect,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
