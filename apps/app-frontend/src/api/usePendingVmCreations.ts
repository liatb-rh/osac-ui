/**
 * flow: manage-virtual-machines
 * Placeholder VMs on My VMs until compute_instances includes the VM; then post-create display until status stabilizes.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'
import { PENDING_VM_LIST_POLL_MS } from './hooks'
import {
  deletePostCreateWatch,
  getPostCreateWatch,
  listPostCreateWatchIds,
  setPostCreateWatch,
} from './postCreateWatchStore'
import {
  type PendingVmCreation,
  advancePostCreateWatch,
  createPendingVmClientId,
  createPostCreateWatch,
  matchesPendingCreation,
  pendingToComputeInstance,
  resolveCreationDisplayState,
} from './pendingVmCreation'

type UsePendingVmCreationsOptions = {
  refetchInstances?: () => Promise<unknown>
}

export function usePendingVmCreations(
  listedVms: ComputeInstance[],
  options: UsePendingVmCreationsOptions = {},
) {
  const { refetchInstances } = options
  const pendingRef = useRef<PendingVmCreation[]>([])
  const [pending, setPending] = useState<PendingVmCreation[]>([])
  const [watchedVmIds, setWatchedVmIds] = useState<string[]>(() => listPostCreateWatchIds())
  const [, tick] = useState(0)

  const syncPending = useCallback(() => {
    setPending([...pendingRef.current])
  }, [])

  const syncWatched = useCallback(() => {
    setWatchedVmIds(listPostCreateWatchIds())
  }, [])

  const registerPending = useCallback(
    (draft: Partial<ComputeInstance>) => {
      const clientId = createPendingVmClientId()
      pendingRef.current = [...pendingRef.current, { clientId, draft, startedAtMs: Date.now() }]
      syncPending()
      return clientId
    },
    [syncPending],
  )

  const noteCreateSuccess = useCallback(
    (clientId: string, serverId: string) => {
      const entry = pendingRef.current.find((p) => p.clientId === clientId)
      if (entry) entry.serverId = serverId
      syncPending()
    },
    [syncPending],
  )

  const dismissPending = useCallback(
    (clientId: string) => {
      pendingRef.current = pendingRef.current.filter((p) => p.clientId !== clientId)
      syncPending()
    },
    [syncPending],
  )

  const hasActiveProvisioning = pending.length > 0 || watchedVmIds.length > 0

  useEffect(() => {
    if (!hasActiveProvisioning || !refetchInstances) return
    const id = window.setInterval(() => {
      void refetchInstances()
    }, PENDING_VM_LIST_POLL_MS)
    return () => window.clearInterval(id)
  }, [hasActiveProvisioning, refetchInstances])

  useEffect(() => {
    let changed = false

    for (const p of [...pendingRef.current]) {
      const vm = listedVms.find((v) => matchesPendingCreation(p, v))
      if (!vm) continue
      pendingRef.current = pendingRef.current.filter((x) => x.clientId !== p.clientId)
      if (!getPostCreateWatch(vm.id)) {
        setPostCreateWatch(createPostCreateWatch(vm.id, p.startedAtMs))
      }
      changed = true
    }

    for (const vmId of listPostCreateWatchIds()) {
      const vm = listedVms.find((v) => v.id === vmId)
      if (!vm) continue
      const watch = getPostCreateWatch(vmId)
      if (!watch) continue
      const { watch: next, clear } = advancePostCreateWatch(vm.status.state, watch)
      if (clear) {
        deletePostCreateWatch(vmId)
      } else {
        setPostCreateWatch(next)
      }
      changed = true
    }

    if (changed) {
      syncPending()
      syncWatched()
    }
  }, [listedVms, syncPending, syncWatched])

  useEffect(() => {
    if (!hasActiveProvisioning) return
    const id = window.setInterval(() => tick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [hasActiveProvisioning])

  const pendingInstances = useCallback(() => pending.map(pendingToComputeInstance), [pending])

  const getCreationDisplayState = useCallback(
    (clientId: string) => {
      const entry = pending.find((p) => p.clientId === clientId)
      if (!entry) return 'creating' as const
      return resolveCreationDisplayState(entry.startedAtMs)
    },
    [pending],
  )

  const getPostCreateDisplayState = useCallback((vm: ComputeInstance): VmPowerState | undefined => {
    return getPostCreateWatch(vm.id)?.displayOverride
  }, [])

  const isPostCreateWatched = useCallback((vmId: string) => getPostCreateWatch(vmId) != null, [])

  return {
    registerPending,
    noteCreateSuccess,
    dismissPending,
    pendingInstances,
    getCreationDisplayState,
    getPostCreateDisplayState,
    isPostCreateWatched,
    hasPending: pending.length > 0,
  }
}
