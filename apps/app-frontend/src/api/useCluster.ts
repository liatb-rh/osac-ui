import { useQuery } from '@tanstack/react-query'
import { getCluster } from './clusterClient'
import { clusterQueryKeys } from './useClustersList'

export function useCluster(id: string | null) {
  return useQuery({
    queryKey: clusterQueryKeys.detail(id ?? ''),
    queryFn: () => getCluster(id!),
    enabled: !!id,
    staleTime: 15_000,
    refetchOnMount: 'always',
  })
}
