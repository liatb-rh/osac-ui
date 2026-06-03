/**
 * Session-scoped pending power-action state (survives route changes within the SPA).
 */
import {
  type PendingPowerWatch,
  type VmPendingPowerAction,
  createPendingPowerWatch,
} from './vmPowerDisplay'

export interface VmPowerPendingEntry {
  action: VmPendingPowerAction
  watch: PendingPowerWatch
  inRestartCycle: boolean
  restartStartSent: boolean
}

const pendingByVmId = new Map<string, VmPowerPendingEntry>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribePowerPending(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPendingPowerAction(vmId: string): VmPendingPowerAction | undefined {
  return pendingByVmId.get(vmId)?.action
}

export function getPowerWatch(vmId: string): PendingPowerWatch | undefined {
  return pendingByVmId.get(vmId)?.watch
}

export function setPowerWatch(vmId: string, watch: PendingPowerWatch): void {
  const entry = pendingByVmId.get(vmId)
  if (!entry) return
  pendingByVmId.set(vmId, { ...entry, watch })
  notify()
}

export function isInRestartCycle(vmId: string): boolean {
  return pendingByVmId.get(vmId)?.inRestartCycle ?? false
}

export function isRestartStartSent(vmId: string): boolean {
  return pendingByVmId.get(vmId)?.restartStartSent ?? false
}

export function markRestartStartSent(vmId: string): void {
  const entry = pendingByVmId.get(vmId)
  if (!entry) return
  pendingByVmId.set(vmId, { ...entry, restartStartSent: true })
  notify()
}

export function setPowerPending(
  vmId: string,
  action: VmPendingPowerAction,
  opts?: { restartCycle?: boolean },
): void {
  pendingByVmId.set(vmId, {
    action,
    watch: createPendingPowerWatch(),
    inRestartCycle: opts?.restartCycle ?? action === 'restarting',
    restartStartSent: false,
  })
  notify()
}

export function updatePowerPendingAction(vmId: string, action: VmPendingPowerAction): void {
  const entry = pendingByVmId.get(vmId)
  if (!entry) return
  pendingByVmId.set(vmId, { ...entry, action })
  notify()
}

export function clearPowerPending(vmId: string): void {
  if (pendingByVmId.delete(vmId)) notify()
}

export function listPendingPowerVmIds(): string[] {
  return [...pendingByVmId.keys()]
}

export function hasAnyPowerPending(): boolean {
  return pendingByVmId.size > 0
}

/** @internal test helper */
export function clearAllPowerPending(): void {
  if (pendingByVmId.size > 0) {
    pendingByVmId.clear()
    notify()
  }
}
