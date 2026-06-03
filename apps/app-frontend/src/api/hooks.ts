import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClusterTemplate, ComputeInstance } from '@osac/api-contracts'
import {
  type ListComputeInstancesParams,
  createComputeInstance,
  deleteComputeInstance,
  listComputeInstanceTemplates,
  listComputeInstances,
  patchComputeInstance,
  patchComputeInstancePower,
} from './client'
import type { ComputeInstancePowerAction } from '@osac/api-contracts'
import { upsertComputeInstanceInCache } from './computeInstancesCache'

/** Poll VM list so CLI / out-of-band server changes update dashboard + My VMs without a full reload. */
const COMPUTE_INSTANCES_REFETCH_MS = 30_000
/** While create/power/delete pending UI is active, refresh list more often than the default interval. */
export const PENDING_VM_LIST_POLL_MS = 10_000
/** Templates change less often than VM state; still refresh catalog / wizard. */
const COMPUTE_INSTANCE_TEMPLATES_REFETCH_MS = 60_000

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const queryKeys = {
  computeInstances: (params?: ListComputeInstancesParams) =>
    ['compute_instances', params ?? {}] as const,
  /** Shared VM template list — CatalogPage + wizard TemplateStep (template-catalog-wizard-api-alignment). */
  computeInstanceTemplates: ['compute_instance_templates'] as const,
}

/** Refetch every active `compute_instances` query (list + dashboard KPIs) after mutations. */
export function refetchComputeInstancesQueries(qc: QueryClient) {
  return qc.refetchQueries({ queryKey: ['compute_instances'] })
}

// ---------------------------------------------------------------------------
// Compute instances
// ---------------------------------------------------------------------------

export function useComputeInstances(params: ListComputeInstancesParams = {}) {
  return useQuery({
    queryKey: queryKeys.computeInstances(params),
    queryFn: () => listComputeInstances(params),
    staleTime: 30_000,
    /** Refetch when My VMs remounts so navigation does not show a pre-action cached list. */
    refetchOnMount: 'always',
    refetchInterval: COMPUTE_INSTANCES_REFETCH_MS,
    refetchIntervalInBackground: false,
    select: (data) => data.items,
  })
}

export type ProvisionVmInput = {
  vm: Partial<ComputeInstance>
  /** When true, POST body must include `spec.template`; other set `spec` fields are still serialized. */
  specTemplateOnly?: boolean
}

export function useProvisionVm() {
  return useMutation({
    mutationFn: ({ vm, specTemplateOnly }: ProvisionVmInput) =>
      createComputeInstance(vm, specTemplateOnly ? { specTemplateOnly: true } : undefined),
    /** List updates via usePendingVmCreations polled refetch; avoid caching premature `running`. */
  })
}

export type PatchVmInput =
  | { id: string; patch: Partial<ComputeInstance> }
  | { id: string; powerAction: ComputeInstancePowerAction }

export function usePatchVm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PatchVmInput) =>
      'powerAction' in input
        ? patchComputeInstancePower(input.id, input.powerAction)
        : patchComputeInstance(input.id, input.patch),
    onSuccess: async (updated, input) => {
      /** Power actions use pending badges + polled list; immediate refetch/upsert shows stale terminal state. */
      if ('powerAction' in input) return
      upsertComputeInstanceInCache(qc, updated)
      await refetchComputeInstancesQueries(qc)
    },
  })
}

export function useDeleteVm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteComputeInstance(id),
    onSuccess: async () => {
      /** Keep VM in cache until list omits it; pending delete overlay until then. */
      await refetchComputeInstancesQueries(qc)
    },
  })
}

export function useComputeInstanceTemplates() {
  return useQuery({
    queryKey: queryKeys.computeInstanceTemplates,
    queryFn: () => listComputeInstanceTemplates({}),
    staleTime: 60_000,
    refetchInterval: COMPUTE_INSTANCE_TEMPLATES_REFETCH_MS,
    refetchIntervalInBackground: false,
    select: (data) => data.items,
  })
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Returns (running, paused, stopped) counts derived from a VM list */
export function useVmPowerCounts(params: ListComputeInstancesParams = {}) {
  return useQuery({
    queryKey: queryKeys.computeInstances(params),
    queryFn: () => listComputeInstances(params),
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchInterval: COMPUTE_INSTANCES_REFETCH_MS,
    refetchIntervalInBackground: false,
    select: (data) => {
      const counts = { running: 0, paused: 0, stopped: 0, total: data.items.length }
      for (const vm of data.items) {
        const s = vm.status.state
        if (s === 'running') counts.running++
        else if (s === 'paused') counts.paused++
        else if (s === 'stopped') counts.stopped++
      }
      return counts
    },
  })
}

// Re-export template type for convenience
export type { ComputeInstance, ClusterTemplate }
