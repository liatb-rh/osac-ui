import { useQuery } from '@tanstack/react-query'
import { listClusters } from './clusterClient'
import type { ListClustersParams } from './clusterClient'

export const PENDING_CLUSTER_LIST_POLL_MS = 15_000

export const clusterQueryKeys = {
  list: (params?: ListClustersParams) => ['clusters', params ?? {}] as const,
  detail: (id: string) => ['clusters', id] as const,
  catalogItems: ['cluster_catalog_items'] as const,
  virtualNetworks: ['virtual_networks'] as const,
  subnets: (virtualNetworkId?: string) => ['subnets', virtualNetworkId ?? ''] as const,
  securityGroups: ['security_groups'] as const,
  agents: ['agents'] as const,
  storageTiers: ['storage_tiers'] as const,
}

export function useClustersList(params: ListClustersParams = {}) {
  return useQuery({
    queryKey: clusterQueryKeys.list(params),
    queryFn: () => listClusters(params),
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const hasPending = items.some(
        (c) =>
          c.status.state === 'CLUSTER_STATE_PROGRESSING' ||
          c.status.state === 'CLUSTER_STATE_UPGRADING' ||
          (c.status.state === 'CLUSTER_STATE_READY' && c.status.storageReady !== true),
      )
      return hasPending ? PENDING_CLUSTER_LIST_POLL_MS : false
    },
    refetchIntervalInBackground: false,
    select: (data) => data.items,
  })
}
