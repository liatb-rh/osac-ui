import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createStorageBackend,
  createStorageTier,
  createStorageVolume,
  createVolumeSnapshot,
  deleteStorageBackend,
  deleteStorageTier,
  deleteStorageVolume,
  deleteVolumeSnapshot,
  deprovisionAgent,
  getOrgStorageStatus,
  getStorageBackend,
  getStorageVolume,
  listAgents,
  listOrgStorageStatuses,
  listStorageBackends,
  listStorageTiers,
  listStorageVolumes,
  listVolumeSnapshots,
  mountVolumeOnVm,
  patchStorageTier,
  provisionAgent,
  resizeStorageVolume,
  restoreVolumeSnapshot,
  unmountVolumeFromVm,
  updateStorageBackend,
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

export function useCreateStorageTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<StorageTier, 'id' | 'available'> & { name: string }) =>
      createStorageTier(payload),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: clusterQueryKeys.storageTiers })
    },
  })
}

export function useDeleteStorageTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStorageTier(id),
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

export function useStorageBackend(id: string) {
  return useQuery({
    queryKey: storageBackendQueryKeys.detail(id),
    queryFn: () => getStorageBackend(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useUpdateStorageBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<
        Pick<StorageBackend, 'endpoint' | 'credentialsSecretRef' | 'vipPool' | 'deploymentModel'>
      >
    }) => updateStorageBackend(id, patch),
    onSuccess: async (_data, { id }) => {
      await qc.refetchQueries({ queryKey: storageBackendQueryKeys.detail(id) })
      await qc.refetchQueries({ queryKey: storageBackendQueryKeys.list })
    },
  })
}

export function useDeleteStorageBackend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStorageBackend(id),
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

// ---------------------------------------------------------------------------
// Storage Volumes
// ---------------------------------------------------------------------------

export const volumeQueryKeys = {
  list: (orgId?: string) => ['storage_volumes', orgId ?? 'all'] as const,
  detail: (id: string) => ['storage_volumes', id] as const,
}

export function useStorageVolumes(orgId?: string) {
  return useQuery({
    queryKey: volumeQueryKeys.list(orgId),
    queryFn: () => listStorageVolumes(orgId),
    staleTime: 20_000,
    select: (data) => data.items,
  })
}

export function useStorageVolume(id: string) {
  return useQuery({
    queryKey: volumeQueryKeys.detail(id),
    queryFn: () => getStorageVolume(id),
    staleTime: 20_000,
    enabled: !!id,
  })
}

export function useCreateStorageVolume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      name: string
      orgId: string
      sizeGiB: number
      tierId: string
      accessMode?: 'ReadWriteOnce' | 'ReadWriteMany'
    }) => createStorageVolume(payload),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['storage_volumes'] })
    },
  })
}

export function useResizeStorageVolume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sizeGiB }: { id: string; sizeGiB: number }) =>
      resizeStorageVolume(id, sizeGiB),
    onSuccess: async (_data, { id }) => {
      await qc.refetchQueries({ queryKey: volumeQueryKeys.detail(id) })
    },
  })
}

export function useDeleteStorageVolume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStorageVolume(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['storage_volumes'] })
    },
  })
}

/** Mount a StorageVolume on a VM by adding it to VM spec.disks. */
export function useMountVolume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vmId, volumeId, device }: { vmId: string; volumeId: string; device?: string }) =>
      mountVolumeOnVm(vmId, volumeId, device),
    onSuccess: async (_data, { volumeId }) => {
      await qc.refetchQueries({ queryKey: volumeQueryKeys.detail(volumeId) })
      await qc.refetchQueries({ queryKey: ['storage_volumes'] })
      await qc.refetchQueries({ queryKey: ['compute_instances'] })
    },
  })
}

/** Unmount a StorageVolume from a VM by removing it from VM spec.disks. */
export function useUnmountVolume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vmId, volumeId }: { vmId: string; volumeId: string }) =>
      unmountVolumeFromVm(vmId, volumeId),
    onSuccess: async (_data, { volumeId }) => {
      await qc.refetchQueries({ queryKey: volumeQueryKeys.detail(volumeId) })
      await qc.refetchQueries({ queryKey: ['storage_volumes'] })
      await qc.refetchQueries({ queryKey: ['compute_instances'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Volume Snapshots — all nested under volumeId
// ---------------------------------------------------------------------------

export const snapshotQueryKeys = {
  list: (volumeId: string) => ['volume_snapshots', volumeId] as const,
}

export function useVolumeSnapshots(volumeId: string) {
  return useQuery({
    queryKey: snapshotQueryKeys.list(volumeId),
    queryFn: () => listVolumeSnapshots(volumeId),
    staleTime: 20_000,
    enabled: !!volumeId,
    select: (data) => data.items,
  })
}

export function useCreateVolumeSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      volumeId,
      name,
      snapshotClassName,
    }: {
      volumeId: string
      name: string
      snapshotClassName?: string
    }) => createVolumeSnapshot(volumeId, name, snapshotClassName),
    onSuccess: async (_data, { volumeId }) => {
      await qc.refetchQueries({ queryKey: snapshotQueryKeys.list(volumeId) })
    },
  })
}

export function useDeleteVolumeSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, volumeId }: { id: string; volumeId: string }) =>
      deleteVolumeSnapshot(volumeId, id),
    onSuccess: async (_data, { volumeId }) => {
      await qc.refetchQueries({ queryKey: snapshotQueryKeys.list(volumeId) })
    },
  })
}

export function useRestoreVolumeSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      volumeId,
      newVolumeName,
    }: {
      id: string
      volumeId: string
      newVolumeName?: string
    }) => restoreVolumeSnapshot(volumeId, id, newVolumeName),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['storage_volumes'] })
    },
  })
}
