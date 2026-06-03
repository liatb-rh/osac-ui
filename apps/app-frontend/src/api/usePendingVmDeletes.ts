/**
 * flow: manage-virtual-machines
 * Optimistic **Deleting** badge from confirm until the VM is absent from compute_instances list.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComputeInstance } from '@osac/api-contracts'

export function usePendingVmDeletes(listedVms: ComputeInstance[]) {
  const pendingRef = useRef<Set<string>>(new Set())
  const [_pendingIds, setPendingIds] = useState<string[]>([])

  const sync = useCallback(() => {
    setPendingIds([...pendingRef.current])
  }, [])

  const markPendingDelete = useCallback(
    (vmId: string) => {
      pendingRef.current.add(vmId)
      sync()
    },
    [sync],
  )

  const clearPendingDelete = useCallback(
    (vmId: string) => {
      if (!pendingRef.current.delete(vmId)) return
      sync()
    },
    [sync],
  )

  useEffect(() => {
    if (pendingRef.current.size === 0) return
    const before = pendingRef.current.size
    for (const id of [...pendingRef.current]) {
      if (!listedVms.some((v) => v.id === id)) {
        pendingRef.current.delete(id)
      }
    }
    if (pendingRef.current.size !== before) sync()
  }, [listedVms, sync])

  const isPendingDelete = useCallback((vmId: string) => pendingRef.current.has(vmId), [])

  return {
    markPendingDelete,
    clearPendingDelete,
    isPendingDelete,
  }
}
