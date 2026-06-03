/**
 * flow: manage-virtual-machines
 * Immediate Starting / Stopping / Restarting badges; reconcile on each compute_instances list update.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { ComputeInstance } from '@osac/api-contracts'
import { PENDING_VM_LIST_POLL_MS, type PatchVmInput } from './hooks'
import {
  advancePendingPowerWatch,
  createPendingPowerWatch,
  resolveVmDisplayPowerState,
  shouldAdvanceRestartToStarting,
} from './vmPowerDisplay'
import {
  clearPowerPending,
  getPendingPowerAction,
  getPowerWatch,
  hasAnyPowerPending,
  isInRestartCycle,
  isRestartStartSent,
  listPendingPowerVmIds,
  markRestartStartSent,
  setPowerPending,
  setPowerWatch,
  subscribePowerPending,
  updatePowerPendingAction,
} from './vmPowerPendingStore'

type PatchMutate = (
  input: PatchVmInput,
  options?: {
    onError?: (error: Error) => void
  },
) => void

type UseVmPowerActionDisplayOptions = {
  /** Poll list while a power action is pending (PATCH does not refetch immediately). */
  refetchInstances?: () => Promise<unknown>
}

function powerPendingSnapshot(): string {
  return listPendingPowerVmIds()
    .map((id) => {
      const action = getPendingPowerAction(id)
      return `${id}:${action ?? ''}`
    })
    .join('|')
}

export function useVmPowerActionDisplay(
  vms: ComputeInstance[],
  patchMutate: PatchMutate,
  options: UseVmPowerActionDisplayOptions = {},
) {
  const { refetchInstances } = options
  const pendingSnapshot = useSyncExternalStore(
    subscribePowerPending,
    powerPendingSnapshot,
    powerPendingSnapshot,
  )

  const getDisplayState = useCallback((vm: ComputeInstance) => {
    return resolveVmDisplayPowerState(vm.status.state, getPendingPowerAction(vm.id))
  }, [])

  const isPowerActionPending = useCallback(
    (vmId: string) => getPendingPowerAction(vmId) != null,
    [],
  )

  const isRestarting = useCallback((vmId: string) => isInRestartCycle(vmId), [])

  useEffect(() => {
    if (!hasAnyPowerPending() || !refetchInstances) return
    const id = window.setInterval(() => {
      void refetchInstances()
    }, PENDING_VM_LIST_POLL_MS)
    return () => window.clearInterval(id)
  }, [refetchInstances, pendingSnapshot])

  useEffect(() => {
    if (!hasAnyPowerPending()) return

    for (const id of listPendingPowerVmIds()) {
      const action = getPendingPowerAction(id)
      if (!action) continue

      const vm = vms.find((v) => v.id === id)
      if (!vm) {
        clearPowerPending(id)
        continue
      }

      if (action === 'restarting') {
        if (vm.status.state === 'error') {
          clearPowerPending(id)
          continue
        }
        if (shouldAdvanceRestartToStarting(vm.status.state)) {
          if (!isRestartStartSent(id)) {
            markRestartStartSent(id)
            patchMutate(
              { id, powerAction: 'start' },
              {
                onError: () => {
                  clearPowerPending(id)
                },
              },
            )
          }
          if (getPendingPowerAction(id) === 'restarting') {
            updatePowerPendingAction(id, 'starting')
          }
        }
        continue
      }

      const watch = getPowerWatch(id) ?? createPendingPowerWatch()
      const { watch: nextWatch, clear } = advancePendingPowerWatch(action, vm.status.state, watch)
      setPowerWatch(id, nextWatch)
      if (clear) {
        clearPowerPending(id)
      }
    }
  }, [vms, patchMutate])

  const runPowerAction = useCallback(
    (vm: ComputeInstance, action: 'start' | 'stop' | 'restart') => {
      const id = vm.id
      if (action === 'restart') {
        setPowerPending(id, 'restarting', { restartCycle: true })
        patchMutate({ id, powerAction: 'stop' }, { onError: () => clearPowerPending(id) })
        return
      }
      if (action === 'start') {
        setPowerPending(id, 'starting')
        patchMutate({ id, powerAction: 'start' }, { onError: () => clearPowerPending(id) })
        return
      }
      setPowerPending(id, 'stopping')
      patchMutate({ id, powerAction: 'stop' }, { onError: () => clearPowerPending(id) })
    },
    [patchMutate],
  )

  return {
    getDisplayState,
    runPowerAction,
    isPowerActionPending,
    isRestarting,
  }
}
