import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deprovisionAgent, listAgents, listStorageTiers, patchStorageTier, provisionAgent } from './clusterClient'
import type { StorageTier } from '@osac/api-contracts'
import { clusterQueryKeys } from './useClustersList'

export function useAgents() {
  return useQuery({
    queryKey: clusterQueryKeys.agents,
    queryFn: () => listAgents(),
    staleTime: 15_000,
    refetchOnMount: 'always',
    select: (data) => data.items,
  })
}

export function useProvisionAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => provisionAgent(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: clusterQueryKeys.agents })
    },
  })
}

export function useDeprovisionAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deprovisionAgent(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: clusterQueryKeys.agents })
    },
  })
}

export function useStorageTiers() {
  return useQuery({
    queryKey: clusterQueryKeys.storageTiers,
    queryFn: () => listStorageTiers(),
    staleTime: 30_000,
    select: (data) => data.items,
  })
}

export function usePatchStorageTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<StorageTier> }) =>
      patchStorageTier(id, patch),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: clusterQueryKeys.storageTiers })
    },
  })
}
