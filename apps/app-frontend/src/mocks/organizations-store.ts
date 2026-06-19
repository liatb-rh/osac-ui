/**
 * Mock store for Organizations & Authentication (osac.iam.v1)
 * Mirrors osac-pilot ORGS / FIXTURES data, shaped to fulfillment-service proto fields.
 * Maps: Organization (private model) + IdentityProvider + AuthnCapabilities + BreakGlassCredentials + User
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IdpKind = 'OIDC' | 'LDAP' | 'SAML' | 'AD'
export type OrgState = 'SYNCED' | 'PENDING' | 'FAILED'
export type IdpPhase = 'READY' | 'ERROR' | 'UNKNOWN'

export interface OidcConfig {
  issuer: string
  authorization_url: string
  token_url: string
  jwks_url: string
  logout_url: string
  client_id: string
  client_secret: string
}

export interface LdapConfig {
  connection_url: string
  bind_dn: string
  bind_credential: string
  users_dn: string
  username_ldap_attribute: string
  vendor: string
}

export interface IdentityProvider {
  /** Primary key — NOT UUID. e.g. "northstar-corp-ldap" */
  name: string
  kind: IdpKind
  host: string
  config: OidcConfig | LdapConfig
  status: {
    phase: IdpPhase
    message: string
    last_probe: string
  }
  created_at: string
  version: string
}

export interface BreakGlassCredential {
  username: string
  last_rotated: string
}

export interface AuthnCapabilities {
  trusted_token_issuers: string[]
}

export interface MockUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'tenantAdmin' | 'tenantUser'
  mfa_enrolled: boolean
}

export interface OrgFixture {
  /** Organization.id (UUID) */
  id: string
  /** Organization.metadata.name */
  name: string
  /** Tenant slug (metadata.tenant) */
  tenant: string
  /** Keycloak realm slug */
  realm: string
  /** OrganizationStatus.state */
  state: OrgState
  /** OrganizationStatus.message */
  message?: string
  created_at: string
  creator: string
  labels: Record<string, string>
  idp: IdentityProvider
  authn: AuthnCapabilities
  break_glass: BreakGlassCredential[]
  users: MockUser[]
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const ORGANIZATIONS: OrgFixture[] = [
  {
    id: 'org-northstar',
    name: 'Northstar Bank',
    tenant: 'northstar',
    realm: 'northstar.osac',
    state: 'SYNCED',
    created_at: '2025-11-04T09:00:00Z',
    creator: 'avery.chen@osac.io',
    labels: { 'osac.io/region': 'eu-west', 'osac.io/tier': 'gold' },
    idp: {
      name: 'northstar-corp-ldap',
      kind: 'LDAP',
      host: 'ldap.northstar.internal',
      config: {
        connection_url: 'ldaps://ldap.northstar.internal:636',
        bind_dn: 'cn=osac-svc,ou=service,dc=northstar,dc=bank',
        bind_credential: '••••••••••••',
        users_dn: 'ou=people,dc=northstar,dc=bank',
        username_ldap_attribute: 'uid',
        vendor: 'rh-ds',
      } satisfies LdapConfig,
      status: { phase: 'READY', message: 'Bind successful · 48 users discovered', last_probe: '2m ago' },
      created_at: '2025-11-04T09:18:00Z',
      version: 'v3',
    },
    authn: { trusted_token_issuers: ['https://auth.osac.internal/realms/northstar.osac'] },
    break_glass: [
      { username: 'bg-admin-1', last_rotated: '2026-04-02T08:00:00Z' },
      { username: 'bg-admin-2', last_rotated: '2026-04-02T08:00:00Z' },
    ],
    users: [
      { id: 'u-1', first_name: 'Alice', last_name: 'Renner', email: 'alice@northstar.example', role: 'tenantAdmin', mfa_enrolled: true },
      { id: 'u-2', first_name: 'Carl', last_name: 'Yates', email: 'carl@northstar.example', role: 'tenantUser', mfa_enrolled: true },
      { id: 'u-3', first_name: 'Priya', last_name: 'Shah', email: 'priya@northstar.example', role: 'tenantUser', mfa_enrolled: false },
      { id: 'u-4', first_name: 'Tomas', last_name: 'Lund', email: 'tomas@northstar.example', role: 'tenantUser', mfa_enrolled: true },
      { id: 'u-5', first_name: 'Mei', last_name: 'Watanabe', email: 'mei@northstar.example', role: 'tenantUser', mfa_enrolled: false },
    ],
  },
  {
    id: 'org-bluestone',
    name: 'Bluestone Financial Group',
    tenant: 'evergreen',
    realm: 'bluestone.osac',
    state: 'SYNCED',
    created_at: '2025-12-19T11:40:00Z',
    creator: 'priya.raman@osac.io',
    labels: { 'osac.io/region': 'eu-north', 'osac.io/tier': 'silver' },
    idp: {
      name: 'bluestone-azure-oidc',
      kind: 'OIDC',
      host: 'login.microsoftonline.com/bluestone',
      config: {
        issuer: 'https://login.microsoftonline.com/bluestone/v2.0',
        authorization_url: 'https://login.microsoftonline.com/bluestone/oauth2/v2.0/authorize',
        token_url: 'https://login.microsoftonline.com/bluestone/oauth2/v2.0/token',
        jwks_url: 'https://login.microsoftonline.com/bluestone/discovery/v2.0/keys',
        logout_url: 'https://login.microsoftonline.com/bluestone/oauth2/v2.0/logout',
        client_id: 'osac-bluestone-prod',
        client_secret: '••••••••••••',
      } satisfies OidcConfig,
      status: { phase: 'READY', message: 'JWKS fetched · token exchange OK', last_probe: '4m ago' },
      created_at: '2025-12-19T11:50:00Z',
      version: 'v2',
    },
    authn: { trusted_token_issuers: ['https://auth.osac.internal/realms/bluestone.osac'] },
    break_glass: [
      { username: 'bg-admin-1', last_rotated: '2026-03-18T08:00:00Z' },
      { username: 'bg-admin-2', last_rotated: '2026-03-18T08:00:00Z' },
    ],
    users: [
      { id: 'u-6', first_name: 'Sofia', last_name: 'Leclaire', email: 'sofia@bluestone.fi', role: 'tenantAdmin', mfa_enrolled: true },
      { id: 'u-7', first_name: 'Markus', last_name: 'Virtanen', email: 'markus@bluestone.fi', role: 'tenantUser', mfa_enrolled: true },
      { id: 'u-8', first_name: 'Ingrid', last_name: 'Björk', email: 'ingrid@bluestone.fi', role: 'tenantUser', mfa_enrolled: false },
    ],
  },
  {
    id: 'org-aurora',
    name: 'Aurora Health',
    tenant: 'aurora',
    realm: 'aurora.osac',
    state: 'PENDING',
    message: 'JWKS retry 1/3 · 503 upstream',
    created_at: '2026-01-22T14:00:00Z',
    creator: 'lee.park@osac.io',
    labels: { 'osac.io/region': 'eu-central', 'osac.io/tier': 'silver' },
    idp: {
      name: 'aurora-health-oidc',
      kind: 'OIDC',
      host: 'auth.aurora.health',
      config: {
        issuer: 'https://auth.aurora.health/realms/staff',
        authorization_url: 'https://auth.aurora.health/realms/staff/protocol/openid-connect/auth',
        token_url: 'https://auth.aurora.health/realms/staff/protocol/openid-connect/token',
        jwks_url: 'https://auth.aurora.health/realms/staff/protocol/openid-connect/certs',
        logout_url: 'https://auth.aurora.health/realms/staff/protocol/openid-connect/logout',
        client_id: 'osac-aurora',
        client_secret: '••••••••••••',
      } satisfies OidcConfig,
      status: { phase: 'UNKNOWN', message: 'JWKS retry 1/3 · 503 upstream', last_probe: '1m ago' },
      created_at: '2026-01-22T14:10:00Z',
      version: 'v1',
    },
    authn: { trusted_token_issuers: ['https://auth.osac.internal/realms/aurora.osac'] },
    break_glass: [{ username: 'bg-admin-1', last_rotated: '2026-01-22T14:10:00Z' }],
    users: [
      { id: 'u-9', first_name: 'Dana', last_name: 'Ellison', email: 'dana@aurora.health', role: 'tenantAdmin', mfa_enrolled: true },
      { id: 'u-10', first_name: 'Ryo', last_name: 'Tanaka', email: 'ryo@aurora.health', role: 'tenantUser', mfa_enrolled: false },
    ],
  },
  {
    id: 'org-helix',
    name: 'Helix Logistics',
    tenant: 'helix',
    realm: 'helix.osac',
    state: 'FAILED',
    message: 'AD bind failed: LDAP error 49 (invalid credentials)',
    created_at: '2026-03-08T10:00:00Z',
    creator: 'ops@osac.io',
    labels: { 'osac.io/region': 'eu-west', 'osac.io/tier': 'bronze' },
    idp: {
      name: 'helix-ad',
      kind: 'AD',
      host: 'dc01.helix.local',
      config: {
        connection_url: 'ldap://dc01.helix.local:389',
        bind_dn: 'cn=osac-svc,cn=Users,dc=helix,dc=local',
        bind_credential: '••••••••••••',
        users_dn: 'cn=Users,dc=helix,dc=local',
        username_ldap_attribute: 'sAMAccountName',
        vendor: 'ad',
      } satisfies LdapConfig,
      status: { phase: 'ERROR', message: 'AD bind failed: LDAP error 49', last_probe: '30s ago' },
      created_at: '2026-03-08T10:05:00Z',
      version: 'v1',
    },
    authn: { trusted_token_issuers: ['https://auth.osac.internal/realms/helix.osac'] },
    break_glass: [
      { username: 'bg-admin-1', last_rotated: '2026-03-08T10:05:00Z' },
      { username: 'bg-admin-2', last_rotated: '2026-03-08T10:05:00Z' },
    ],
    users: [
      { id: 'u-11', first_name: 'Jonas', last_name: 'Eriksen', email: 'jonas@helix.logistics', role: 'tenantAdmin', mfa_enrolled: false },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getOrg(tenant: string): OrgFixture | undefined {
  return ORGANIZATIONS.find((o) => o.tenant === tenant)
}

export function isOidcConfig(config: OidcConfig | LdapConfig): config is OidcConfig {
  return 'issuer' in config
}

export function isLdapConfig(config: OidcConfig | LdapConfig): config is LdapConfig {
  return 'connection_url' in config
}

/** Map OrganizationStatus.state → StatusDot data-s value */
export function orgStateToStatus(state: OrgState): 'ready' | 'progressing' | 'failed' {
  if (state === 'SYNCED') return 'ready'
  if (state === 'PENDING') return 'progressing'
  return 'failed'
}

/** Map IdentityProvider.status.phase → StatusDot data-s value */
export function idpPhaseToStatus(phase: IdpPhase): 'ready' | 'progressing' | 'failed' {
  if (phase === 'READY') return 'ready'
  if (phase === 'UNKNOWN') return 'progressing'
  return 'failed'
}
