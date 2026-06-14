import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStorageBackend,
  deprovisionAgent,
  getOrgStorageStatus,
  listAgents,
  listOrgStorageStatuses,
  listStorageBackends,
  listStorageTiers,
  patchStorageTier,
  provisionAgent,
} from '../api/clusterClient'
import type { StorageBackend, StorageTier } from '@osac/api-contracts'
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

export function useAgent(id: string) {
  return useQuery({
    queryKey: [...clusterQueryKeys.agents, id],
    queryFn: () => listAgents(),
    select: (data) => data.items.find((a) => a.id === id),
    staleTime: 15_000,
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

export const storageBackendQueryKeys = {
  list: ['storage_backends'] as const,
  detail: (id: string) => ['storage_backends', id] as const,
}

export function useStorageBackends() {
  return useQuery({
    queryKey: storageBackendQueryKeys.list,
    queryFn: () => listStorageBackends(),
    staleTime: 30_000,
    select: (data) => data.items,
  })
}

export function useCreateStorageBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<StorageBackend, 'id' | 'metadata' | 'status'> & { name: string }) =>
      createStorageBackend(payload),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: storageBackendQueryKeys.list })
    },
  })
}

export const orgStorageQueryKeys = {
  list: ['org_storage_statuses'] as const,
  detail: (orgId: string) => ['org_storage_statuses', orgId] as const,
}

export function useOrgStorageStatuses() {
  return useQuery({
    queryKey: orgStorageQueryKeys.list,
    queryFn: () => listOrgStorageStatuses(),
    staleTime: 30_000,
    select: (data) => data.items,
  })
}

export function useOrgStorageStatus(orgId: string) {
  return useQuery({
    queryKey: orgStorageQueryKeys.detail(orgId),
    queryFn: () => getOrgStorageStatus(orgId),
    staleTime: 30_000,
    enabled: !!orgId,
  })
}
