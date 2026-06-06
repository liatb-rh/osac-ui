import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ComputeInstance } from '@osac/api-contracts'
import { usePendingVmDeletes } from './usePendingVmDeletes'

function vm(id: string): ComputeInstance {
  return {
    id,
    metadata: { name: id },
    spec: {},
    status: { state: 'running' },
  }
}

describe('usePendingVmDeletes', () => {
  it('marks deleting until VM leaves the list', () => {
    const { result, rerender } = renderHook(
      ({ listed }: { listed: ComputeInstance[] }) => usePendingVmDeletes(listed),
      { initialProps: { listed: [vm('a')] } },
    )

    act(() => {
      result.current.markPendingDelete('a')
    })
    expect(result.current.isPendingDelete('a')).toBe(true)

    rerender({ listed: [vm('a')] })
    expect(result.current.isPendingDelete('a')).toBe(true)

    rerender({ listed: [] })
    expect(result.current.isPendingDelete('a')).toBe(false)
  })

  it('clears on explicit error rollback', () => {
    const { result } = renderHook(() => usePendingVmDeletes([vm('b')]))

    act(() => {
      result.current.markPendingDelete('b')
    })
    expect(result.current.isPendingDelete('b')).toBe(true)

    act(() => {
      result.current.clearPendingDelete('b')
    })
    expect(result.current.isPendingDelete('b')).toBe(false)
  })
})
