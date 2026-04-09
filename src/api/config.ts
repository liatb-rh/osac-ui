export interface AppConfig {
  keycloakUrl: string
  keycloakRealm: string
  oidcClientId: string
  fulfillmentApiUrl: string
  namespace: string
  genericTemplateId: string
}

let cachedConfig: AppConfig | null = null

function isStandaloneMock(): boolean {
  return import.meta.env.VITE_STANDALONE_MOCK === 'true'
}

function buildStandaloneConfig(): AppConfig {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return {
    keycloakUrl: origin,
    keycloakRealm: 'standalone',
    oidcClientId: 'standalone-mock',
    fulfillmentApiUrl: origin,
    namespace: 'standalone',
    genericTemplateId: 'osac.templates.ocp_virt_vm',
  }
}

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  if (isStandaloneMock()) {
    cachedConfig = buildStandaloneConfig()
    return cachedConfig
  }

  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`)
  }

  cachedConfig = await response.json()
  return cachedConfig!
}

export async function getGenericTemplateId(): Promise<string> {
  const config = await getConfig()
  return config.genericTemplateId
}
