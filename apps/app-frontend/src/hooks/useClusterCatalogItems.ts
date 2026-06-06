import { useQuery } from '@tanstack/react-query'
import { listClusterCatalogItems } from '../api/clusterClient'
import { clusterQueryKeys } from './useClustersList'

export function useClusterCatalogItems(options?: { includeUnpublished?: boolean }) {
  const includeUnpublished = options?.includeUnpublished ?? false
  return useQuery({
    queryKey: [...clusterQueryKeys.catalogItems, { includeUnpublished }],
    queryFn: () => listClusterCatalogItems({ includeUnpublished }),
    staleTime: 60_000,
    select: (data) => data.items,
  })
}

// Re-export network hooks so existing callers (CreateClusterModal, etc.) keep working.
export { useSecurityGroups, useSubnets, useVirtualNetworks } from './useNetworking'
