import { describe, expect, it } from 'vitest'
import {
  normalizeComputeInstanceTemplate,
  normalizeComputeInstanceTemplatePage,
} from '@osac/api-contracts'

describe('normalizeComputeInstanceTemplate', () => {
  it('maps snake_case wire fields to ClusterTemplate', () => {
    const t = normalizeComputeInstanceTemplate({
      id: 'tpl-1',
      title: 'Test',
      description: 'Desc',
      metadata: { name: 'tpl-1', creation_timestamp: '2025-01-01T00:00:00Z' },
      workload_profile: 'TEMPLATE_WORKLOAD_PROFILE_MACHINE_LEARNING',
      default_cores: 4,
      default_memory_gib: 16,
      tags: ['a', 'b'],
      icon: 'linux',
    })
    expect(t.id).toBe('tpl-1')
    expect(t.metadata.createdAt).toBe('2025-01-01T00:00:00Z')
    expect(t.workloadProfile).toBe('machine-learning')
    expect(t.defaultCores).toBe(4)
    expect(t.defaultMemoryGib).toBe(16)
    expect(t.tags).toEqual(['a', 'b'])
  })

  it('maps defaults.boot_disk.size_gib to defaultBootDiskSizeGib', () => {
    const t = normalizeComputeInstanceTemplate({
      id: 'tpl-disk',
      title: 'Disky',
      metadata: { name: 'tpl-disk' },
      defaults: { boot_disk: { size_gib: 64 } },
    })
    expect(t.defaultBootDiskSizeGib).toBe(64)
  })

  it('maps spec_defaults.boot_disk.size_gib when defaults omit boot_disk', () => {
    const t = normalizeComputeInstanceTemplate({
      id: 'osac.templates.ocp_virt_vm',
      title: 'Simple ComputeInstance Template',
      metadata: { name: 'osac.templates.ocp_virt_vm' },
      spec_defaults: {
        cores: 2,
        memory_gib: 2,
        boot_disk: { size_gib: 10 },
      },
    })
    expect(t.defaultBootDiskSizeGib).toBe(10)
    expect(t.defaultCores).toBe(2)
    expect(t.defaultMemoryGib).toBe(2)
  })

  it('normalizes page envelope', () => {
    const page = normalizeComputeInstanceTemplatePage({
      size: 1,
      total: 10,
      items: [
        {
          id: 'x',
          title: 'X',
          metadata: { name: 'x' },
        },
      ],
    })
    expect(page.total).toBe(10)
    expect(page.items).toHaveLength(1)
    expect(page.items[0].title).toBe('X')
  })
})
