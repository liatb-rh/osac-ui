/**
 * Shared in-memory cluster store for mock BFF.
 * Pattern mirrors mock-vm-store.ts.
 *
 * Auto-transitions:
 *   CLUSTER_STATE_PROGRESSING → CLUSTER_STATE_READY after 60s
 *   CLUSTER_STATE_UPGRADING   → CLUSTER_STATE_READY after 90s (with updated version)
 */
import type {
  Agent,
  Cluster,
  ClusterCatalogItem,
  InventoryBackend,
  StorageTier,
} from '@osac/api-contracts'
import {
  DEMO_AGENTS,
  DEMO_CLUSTERS,
  DEMO_CLUSTER_CATALOG_ITEMS,
  DEMO_INVENTORY_BACKENDS,
  DEMO_STORAGE_TIERS,
} from '@osac/api-contracts'

// Deep-clone fixtures so in-memory mutations don't modify the imported constants.
function cloneAll<T>(items: T[]): T[] {
  return items.map((item) => JSON.parse(JSON.stringify(item)) as T)
}

export const clusterStore = new Map<string, Cluster>(cloneAll(DEMO_CLUSTERS).map((c) => [c.id, c]))

export const catalogItemStore = new Map<string, ClusterCatalogItem>(
  cloneAll(DEMO_CLUSTER_CATALOG_ITEMS).map((c) => [c.id, c]),
)

export const agentStore = new Map<string, Agent>(cloneAll(DEMO_AGENTS).map((a) => [a.id, a]))

export const inventoryBackendStore: InventoryBackend[] = cloneAll(DEMO_INVENTORY_BACKENDS)

export const storageTierStore = new Map<string, StorageTier>(
  cloneAll(DEMO_STORAGE_TIERS).map((t) => [t.id, t]),
)

// ---------------------------------------------------------------------------
// Auto-transition helpers
// ---------------------------------------------------------------------------

const PROGRESSING_DELAY_MS = 60_000
const UPGRADING_DELAY_MS = 90_000

export function scheduleClusterProgressing(clusterId: string): void {
  setTimeout(() => {
    const cluster = clusterStore.get(clusterId)
    if (!cluster) return
    if (cluster.status.state !== 'CLUSTER_STATE_PROGRESSING') return
    const catalogItem = catalogItemStore.get(cluster.spec.catalogItem ?? '')
    const initialVersion = catalogItem?.allowedVersions?.[0] ?? '4.17.3'
    clusterStore.set(clusterId, {
      ...cluster,
      status: {
        ...cluster.status,
        state: 'CLUSTER_STATE_READY',
        version: initialVersion,
        storageReady: true,
        apiUrl: `https://api.${cluster.metadata.name}.example.com:6443`,
        consoleUrl: `https://console-openshift-console.apps.${cluster.metadata.name}.example.com`,
        storage: {
          csiDriver: 'csi.vastdata.com',
          storageClasses: [
            { name: 'vast-standard', isDefault: true, parameters: { tier: 'standard' } },
          ],
        },
        network: {
          apiPublicIp: `203.0.113.${Math.floor(Math.random() * 200) + 50}`,
          ingressPublicIp: `203.0.113.${Math.floor(Math.random() * 200) + 50}`,
          dnsRecords: [
            `api.${cluster.metadata.name}.example.com`,
            `*.apps.${cluster.metadata.name}.example.com`,
          ],
        },
      },
    })
  }, PROGRESSING_DELAY_MS)
}

export function scheduleClusterUpgrade(clusterId: string, targetVersion: string): void {
  setTimeout(() => {
    const cluster = clusterStore.get(clusterId)
    if (!cluster) return
    if (cluster.status.state !== 'CLUSTER_STATE_UPGRADING') return
    clusterStore.set(clusterId, {
      ...cluster,
      status: {
        ...cluster.status,
        state: 'CLUSTER_STATE_READY',
        version: targetVersion,
        upgradeState: `Upgraded to ${targetVersion}`,
      },
    })
  }, UPGRADING_DELAY_MS)
}

// ---------------------------------------------------------------------------
// Kubeconfig generation
// ---------------------------------------------------------------------------

export function generateKubeconfig(cluster: Cluster): string {
  const apiUrl = cluster.status.apiUrl ?? `https://api.${cluster.metadata.name}.example.com:6443`
  const name = cluster.metadata.name
  return `apiVersion: v1
clusters:
- cluster:
    server: ${apiUrl}
    insecure-skip-tls-verify: true
  name: ${name}
contexts:
- context:
    cluster: ${name}
    user: admin
  name: ${name}
current-context: ${name}
kind: Config
preferences: {}
users:
- name: admin
  user:
    token: demo-token-${cluster.id}
`
}

export function resetMockClusterStore(): void {
  clusterStore.clear()
  for (const c of cloneAll(DEMO_CLUSTERS)) clusterStore.set(c.id, c)

  agentStore.clear()
  for (const a of cloneAll(DEMO_AGENTS)) agentStore.set(a.id, a)

  storageTierStore.clear()
  for (const t of cloneAll(DEMO_STORAGE_TIERS)) storageTierStore.set(t.id, t)
}
