import { beforeEach, describe, expect, it } from 'vitest'
import type { ComputeInstance } from '@osac/api-contracts'
import { clearAllPostCreateWatches } from './postCreateWatchStore'
import {
  STILL_PROVISIONING_AFTER_MS,
  advancePostCreateWatch,
  createPostCreateWatch,
  matchesPendingCreation,
  resolveCreationDisplayState,
} from './pendingVmCreation'

describe('pendingVmCreation', () => {
  beforeEach(() => {
    clearAllPostCreateWatches()
  })

  it('matches by server id first', () => {
    const pending = {
      clientId: 'pending-vm-1',
      draft: { metadata: { name: 'alpha' } },
      serverId: 'vm-real-1',
      startedAtMs: 0,
    }
    const vm = { id: 'vm-real-1', metadata: { name: 'other' } } as ComputeInstance
    expect(matchesPendingCreation(pending, vm)).toBe(true)
  })

  it('matches by name when server id not set', () => {
    const pending = {
      clientId: 'pending-vm-2',
      draft: { metadata: { name: 'My VM' } },
      startedAtMs: 0,
    }
    const vm = { id: 'vm-x', metadata: { name: 'my vm' } } as ComputeInstance
    expect(matchesPendingCreation(pending, vm)).toBe(true)
  })

  it('switches to still_provisioning after long timeout', () => {
    const start = 1_000_000
    expect(resolveCreationDisplayState(start, start + STILL_PROVISIONING_AFTER_MS - 1)).toBe(
      'creating',
    )
    expect(resolveCreationDisplayState(start, start + STILL_PROVISIONING_AFTER_MS)).toBe(
      'still_provisioning',
    )
  })

  it('post-create: Creating placeholder → Starting in list → Running only after starting seen', () => {
    const t0 = 1_000_000
    const watch = createPostCreateWatch('vm-1', t0)
    expect(watch.displayOverride).toBe('starting')

    const r1 = advancePostCreateWatch('running', watch, t0 + 1000)
    expect(r1.clear).toBe(false)
    expect(r1.watch.displayOverride).toBe('starting')

    const r2 = advancePostCreateWatch('running', r1.watch, t0 + 2000)
    expect(r2.clear).toBe(false)
    expect(r2.watch.displayOverride).toBe('starting')

    const r3 = advancePostCreateWatch('starting', r2.watch, t0 + 3000)
    expect(r3.watch.seenStarting).toBe(true)

    const r4 = advancePostCreateWatch('running', r3.watch, t0 + 4000)
    expect(r4.clear).toBe(true)
    expect(r4.watch.displayOverride).toBe('running')
  })
})
