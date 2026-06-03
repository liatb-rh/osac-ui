import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Cluster } from '@osac/api-contracts'
import { createCluster } from './clusterClient'
import { clusterQueryKeys } from './useClustersList'

export function useCreateCluster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Cluster>) => createCluster(payload),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['clusters'] })
    },
  })
}
