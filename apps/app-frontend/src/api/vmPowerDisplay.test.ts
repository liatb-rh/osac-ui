import { describe, expect, it } from 'vitest'
import {
  advancePendingPowerWatch,
  createPendingPowerWatch,
  resolveVmDisplayPowerState,
  shouldAdvanceRestartToStarting,
} from './vmPowerDisplay'

describe('vmPowerDisplay', () => {
  it('resolveVmDisplayPowerState overlays pending actions', () => {
    expect(resolveVmDisplayPowerState('stopped', 'starting')).toBe('starting')
    expect(resolveVmDisplayPowerState('running', 'stopping')).toBe('stopping')
    expect(resolveVmDisplayPowerState('stopped', 'restarting')).toBe('restarting')
    expect(resolveVmDisplayPowerState('running', undefined)).toBe('running')
  })

  it('advancePendingPowerWatch ignores premature running after start', () => {
    let watch = createPendingPowerWatch()

    const r1 = advancePendingPowerWatch('starting', 'running', watch)
    expect(r1.clear).toBe(false)
    watch = r1.watch

    const r2 = advancePendingPowerWatch('starting', 'starting', watch)
    expect(r2.watch.seenApiStarting).toBe(true)

    const r3 = advancePendingPowerWatch('starting', 'running', r2.watch)
    expect(r3.clear).toBe(true)
  })

  it('advancePendingPowerWatch clears stop after seen stopping', () => {
    const watch = createPendingPowerWatch()

    const r1 = advancePendingPowerWatch('stopping', 'stopping', watch)
    const r2 = advancePendingPowerWatch('stopping', 'stopped', r1.watch)
    expect(r2.clear).toBe(true)
  })

  it('shouldAdvanceRestartToStarting only on stopped', () => {
    expect(shouldAdvanceRestartToStarting('stopped')).toBe(true)
    expect(shouldAdvanceRestartToStarting('running')).toBe(false)
  })
})
