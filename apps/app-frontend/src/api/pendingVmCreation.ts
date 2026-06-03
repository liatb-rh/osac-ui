/**
 * flow: manage-virtual-machines
 * Client-side VM placeholders after create wizard until compute_instances list includes the VM.
 */
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'

export const PENDING_VM_CLIENT_ID_PREFIX = 'pending-vm-'

/** Before switching badge from Creating → Still provisioning (30 minutes). */
export const STILL_PROVISIONING_AFTER_MS = 30 * 60 * 1000

export interface PendingVmCreation {
  clientId: string
  draft: Partial<ComputeInstance>
  serverId?: string
  startedAtMs: number
}

export function isPendingVmClientId(id: string): boolean {
  return id.startsWith(PENDING_VM_CLIENT_ID_PREFIX)
}

export function createPendingVmClientId(): string {
  return `${PENDING_VM_CLIENT_ID_PREFIX}${crypto.randomUUID()}`
}

export function matchesPendingCreation(pending: PendingVmCreation, vm: ComputeInstance): boolean {
  if (pending.serverId && vm.id === pending.serverId) return true
  const pendingName = pending.draft.metadata?.name?.trim().toLowerCase()
  const listedName = vm.metadata.name?.trim().toLowerCase()
  return Boolean(pendingName && listedName && pendingName === listedName)
}

export function pendingToComputeInstance(pending: PendingVmCreation): ComputeInstance {
  const { draft, clientId } = pending
  return {
    id: clientId,
    metadata: {
      name: draft.metadata?.name ?? 'New virtual machine',
      ...draft.metadata,
    },
    spec: draft.spec ?? {},
    status: { state: 'stopped' },
    description: draft.description,
    os: draft.os,
  }
}

export function resolveCreationDisplayState(startedAtMs: number, nowMs = Date.now()): VmPowerState {
  return nowMs - startedAtMs >= STILL_PROVISIONING_AFTER_MS ? 'still_provisioning' : 'creating'
}

/** Tracks a VM after it first appears in the list until provisioning reaches running after starting. */
export interface PostCreateWatch {
  vmId: string
  startedAtMs: number
  seenStarting: boolean
  displayOverride: VmPowerState
}

export function createPostCreateWatch(vmId: string, startedAtMs: number): PostCreateWatch {
  return {
    vmId,
    startedAtMs,
    seenStarting: false,
    /** In-list phase: Creating placeholder is done; show Starting until API confirms starting → running. */
    displayOverride: 'starting',
  }
}

function postCreateInProgressDisplay(watch: PostCreateWatch, nowMs: number): VmPowerState {
  if (nowMs - watch.startedAtMs >= STILL_PROVISIONING_AFTER_MS) {
    return 'still_provisioning'
  }
  return 'starting'
}

/**
 * Reconcile post-create display when the VM is in the list (e.g. stale running before starting → running).
 * Never clear on `running` until `starting` has been seen on a list poll.
 */
export function advancePostCreateWatch(
  apiState: VmPowerState,
  watch: PostCreateWatch,
  nowMs = Date.now(),
): { watch: PostCreateWatch; clear: boolean } {
  if (apiState === 'error') {
    return { watch: { ...watch, displayOverride: 'error' }, clear: true }
  }

  if (apiState === 'starting' || apiState === 'stopping') {
    return {
      watch: {
        ...watch,
        seenStarting: true,
        displayOverride: 'starting',
      },
      clear: false,
    }
  }

  if (apiState === 'running') {
    if (watch.seenStarting) {
      return { watch: { ...watch, displayOverride: 'running' }, clear: true }
    }
    return {
      watch: { ...watch, displayOverride: postCreateInProgressDisplay(watch, nowMs) },
      clear: false,
    }
  }

  if (apiState === 'stopped' || apiState === 'paused') {
    return {
      watch: {
        ...watch,
        displayOverride: postCreateInProgressDisplay(watch, nowMs),
      },
      clear: false,
    }
  }

  return {
    watch: { ...watch, displayOverride: postCreateInProgressDisplay(watch, nowMs) },
    clear: false,
  }
}
