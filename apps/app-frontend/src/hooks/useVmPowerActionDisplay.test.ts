import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComputeInstance } from '@osac/api-contracts'
import { clearAllPowerPending } from '../api/vmPowerPendingStore'
import { useVmPowerActionDisplay } from './useVmPowerActionDisplay'

function vm(id: string, state: ComputeInstance['status']['state']): ComputeInstance {
  return {
    id,
    metadata: { name: id },
    spec: {},
    status: { state },
  }
}

describe('useVmPowerActionDisplay', () => {
  beforeEach(() => {
    clearAllPowerPending()
  })

  it('shows Stopping immediately then clears when API returns stopped', async () => {
    const patchMutate = vi.fn()
    const { result, rerender } = renderHook(
      ({ vms }: { vms: ComputeInstance[] }) => useVmPowerActionDisplay(vms, patchMutate),
      { initialProps: { vms: [vm('a', 'running')] } },
    )

    act(() => {
      result.current.runPowerAction(vm('a', 'running'), 'stop')
    })
    expect(result.current.getDisplayState(vm('a', 'running'))).toBe('stopping')

    rerender({ vms: [vm('a', 'running')] })
    expect(result.current.getDisplayState(vm('a', 'running'))).toBe('stopping')

    rerender({ vms: [vm('a', 'stopping')] })
    expect(result.current.getDisplayState(vm('a', 'stopping'))).toBe('stopping')

    rerender({ vms: [vm('a', 'stopped')] })
    await waitFor(() => {
      expect(result.current.getDisplayState(vm('a', 'stopped'))).toBe('stopped')
    })
  })

  it('restart: Restarting while API still running, Starting after stopped, done on running', async () => {
    const patchMutate = vi.fn()
    const { result, rerender } = renderHook(
      ({ vms }: { vms: ComputeInstance[] }) => useVmPowerActionDisplay(vms, patchMutate),
      { initialProps: { vms: [vm('a', 'running')] } },
    )

    act(() => {
      result.current.runPowerAction(vm('a', 'running'), 'restart')
    })
    expect(patchMutate).toHaveBeenCalledWith(
      { id: 'a', powerAction: 'stop' },
      expect.objectContaining({ onError: expect.any(Function) }),
    )
    expect(result.current.getDisplayState(vm('a', 'running'))).toBe('restarting')

    rerender({ vms: [vm('a', 'running')] })
    expect(result.current.getDisplayState(vm('a', 'running'))).toBe('restarting')

    rerender({ vms: [vm('a', 'stopped')] })
    await waitFor(() => {
      expect(result.current.getDisplayState(vm('a', 'stopped'))).toBe('starting')
    })
    expect(patchMutate).toHaveBeenCalledWith(
      { id: 'a', powerAction: 'start' },
      expect.objectContaining({ onError: expect.any(Function) }),
    )

    rerender({ vms: [vm('a', 'running')] })
    expect(result.current.getDisplayState(vm('a', 'running'))).toBe('starting')

    rerender({ vms: [vm('a', 'starting')] })
    rerender({ vms: [vm('a', 'running')] })
    await waitFor(() => {
      expect(result.current.getDisplayState(vm('a', 'running'))).toBe('running')
    })
    expect(result.current.isRestarting('a')).toBe(false)
  })
})
