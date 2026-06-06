import type { Agent, Cluster, ClusterCatalogItem, StorageTier } from '@osac/api-contracts'
import {
  DEMO_AGENTS,
  DEMO_CLUSTER_CATALOG_ITEMS,
  DEMO_CLUSTERS,
  DEMO_STORAGE_TIERS,
} from '@osac/api-contracts'

function cloneAll<T>(items: T[]): T[] {
  return items.map((item) => JSON.parse(JSON.stringify(item)) as T)
}

export const clusterStore = new Map<string, Cluster>(cloneAll(DEMO_CLUSTERS).map((c) => [c.id, c]))

export const catalogItemStore = new Map<string, ClusterCatalogItem>(
  cloneAll(DEMO_CLUSTER_CATALOG_ITEMS).map((c) => [c.id, c]),
)

export const agentStore = new Map<string, Agent>(cloneAll(DEMO_AGENTS).map((a) => [a.id, a]))

export const storageTierStore = new Map<string, StorageTier>(
  cloneAll(DEMO_STORAGE_TIERS).map((t) => [t.id, t]),
)

const PROGRESSING_DELAY_MS = 20_000
const STORAGE_PROVISIONING_DELAY_MS = 30_000
const UPGRADING_DELAY_MS = 30_000

export function scheduleClusterProgressing(clusterId: string): void {
  // Phase 1: cluster compute becomes READY, storage provisioning begins (storageReady: false)
  setTimeout(() => {
    const cluster = clusterStore.get(clusterId)
    if (!cluster || cluster.status.state !== 'CLUSTER_STATE_PROGRESSING') return
    const catalogItem = catalogItemStore.get(cluster.spec.catalogItem ?? '')
    const initialVersion = catalogItem?.allowedVersions?.[0] ?? '4.17.3'
    clusterStore.set(clusterId, {
      ...cluster,
      status: {
        ...cluster.status,
        state: 'CLUSTER_STATE_READY',
        version: initialVersion,
        storageReady: false,
        apiUrl: `https://api.${cluster.metadata.name}.example.com:6443`,
        consoleUrl: `https://console-openshift-console.apps.${cluster.metadata.name}.example.com`,
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
    // Phase 2: VAST CSI driver + StorageClasses ready (storageReady: true)
    scheduleStorageProvisioning(clusterId)
  }, PROGRESSING_DELAY_MS)
}

export function scheduleStorageProvisioning(clusterId: string): void {
  setTimeout(() => {
    const cluster = clusterStore.get(clusterId)
    if (!cluster || cluster.status.state !== 'CLUSTER_STATE_READY') return
    clusterStore.set(clusterId, {
      ...cluster,
      status: {
        ...cluster.status,
        storageReady: true,
        storage: {
          csiDriver: 'csi.vastdata.com',
          storageClasses: [
            {
              name: 'vast-standard',
              tier: 'tier-standard',
              isDefault: true,
              parameters: { backend: 'vast-prod', qos: 'standard-qos' },
            },
          ],
          volumeSnapshotClasses: [
            {
              name: 'vast-snapshot',
              driver: 'csi.vastdata.com',
              deletionPolicy: 'Delete',
              isDefault: true,
            },
          ],
        },
      },
    })
  }, STORAGE_PROVISIONING_DELAY_MS)
}

export function scheduleClusterUpgrade(clusterId: string, targetVersion: string): void {
  setTimeout(() => {
    const cluster = clusterStore.get(clusterId)
    if (!cluster || cluster.status.state !== 'CLUSTER_STATE_UPGRADING') return
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
