import { describe, expect, it } from 'vitest'
import {
  formatConditionStatusForDisplay,
  mapFulfillmentComputeStateToVmPower,
  normalizeComputeInstance,
  normalizeComputeInstancePage,
  protoJsonAnyInt32,
  serializeComputeInstanceForCreate,
  serializeComputeInstancePowerPatch,
  serializeTemplateParametersWire,
  totalStorageGiBFromSpec,
} from '@osac/api-contracts'

/** Fixture aligned with docs/specs/backend-fulfillment.yaml compute_instances_wire_format_and_ui */
const wireVm = {
  id: 'ci-wire-1',
  metadata: {
    name: 'demo-vm',
    creation_timestamp: '2026-05-01T12:00:00Z',
    tenants: ['shared'],
    creators: ['system'],
    version: 2,
    labels: { env: 'test' },
  },
  spec: {
    template: 'rhel-9-general',
    cores: 4,
    memory_gib: 8,
    boot_disk: { size_gib: 64 },
    additional_disks: [{ size_gib: 100 }],
    subnet: '550e8400-e29b-41d4-a716-446655440000',
    image: {
      source_type: 'SOURCE_TYPE_REGISTRY',
      source_ref: 'registry.redhat.io/rhel9:latest',
    },
    run_strategy: 'Always',
  },
  status: {
    state: 'COMPUTE_INSTANCE_STATE_RUNNING',
    ip_address: '10.0.1.5',
    conditions: [
      {
        type: 'CONDITION_TYPE_READY',
        status: 'CONDITION_STATUS_FALSE',
        reason: 'Waiting',
        message: 'Scheduling',
        last_transition_time: '2026-05-01T11:00:00Z',
      },
    ],
  },
}

describe('normalizeComputeInstance', () => {
  it('maps PROTO_JSON snake_case + enums to ComputeInstance', () => {
    const vm = normalizeComputeInstance(wireVm)
    expect(vm.id).toBe('ci-wire-1')
    expect(vm.metadata.name).toBe('demo-vm')
    expect(vm.metadata.createdAt).toBe('2026-05-01T12:00:00Z')
    expect(vm.metadata.tenants).toEqual(['shared'])
    expect(vm.metadata.creators).toEqual(['system'])
    expect(vm.metadata.version).toBe(2)
    expect(vm.spec.cores).toBe(4)
    expect(vm.spec.memoryGib).toBe(8)
    expect(vm.spec.template).toBe('rhel-9-general')
    expect(vm.spec.runStrategy).toBe('Always')
    expect(vm.spec.subnet).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(vm.status.state).toBe('running')
    expect(vm.status.ipAddress).toBe('10.0.1.5')
    expect(vm.os).toBe('rhel')
    expect(vm.status.conditions).toHaveLength(1)
    expect(vm.status.conditions?.[0].type).toBe('CONDITION_TYPE_READY')
    expect(vm.status.conditions?.[0].lastTransitionTime).toBe('2026-05-01T11:00:00Z')
    expect(vm.status.conditions?.[0].reason).toBe('Waiting')
    expect(vm.status.conditions?.[0].message).toBe('Scheduling')
  })

  it('maps COMPUTE_INSTANCE_STATE_STOPPING to stopping', () => {
    const vm = normalizeComputeInstance({
      ...wireVm,
      status: { ...wireVm.status, state: 'COMPUTE_INSTANCE_STATE_STOPPING' },
    })
    expect(vm.status.state).toBe('stopping')
  })

  it('maps unknown state to error', () => {
    const vm = normalizeComputeInstance({
      ...wireVm,
      status: { ...wireVm.status, state: 'COMPUTE_INSTANCE_STATE_UNKNOWN_X' },
    })
    expect(vm.status.state).toBe('error')
  })

  it('accepts legacy camelCase mock shape', () => {
    const legacy = {
      id: 'legacy-1',
      metadata: { name: 'x', createdAt: '2026-01-01T00:00:00Z' },
      spec: { cores: 2, memoryGib: 4 },
      status: { state: 'paused', ipAddress: '1.2.3.4' },
    }
    const vm = normalizeComputeInstance(legacy)
    expect(vm.status.state).toBe('paused')
    expect(vm.spec.memoryGib).toBe(4)
    expect(vm.status.ipAddress).toBe('1.2.3.4')
  })

  it('maps legacy run_strategy RUN_STRATEGY_* to Always / Halted', () => {
    const always = normalizeComputeInstance({
      ...wireVm,
      spec: { ...wireVm.spec, run_strategy: 'RUN_STRATEGY_ALWAYS' },
    })
    expect(always.spec.runStrategy).toBe('Always')
    const halted = normalizeComputeInstance({
      ...wireVm,
      spec: { ...wireVm.spec, run_strategy: 'RUN_STRATEGY_HALTED' },
    })
    expect(halted.spec.runStrategy).toBe('Halted')
  })

  it('totalStorageGiBFromSpec sums boot + additional', () => {
    const vm = normalizeComputeInstance(wireVm)
    expect(totalStorageGiBFromSpec(vm.spec)).toBe(164)
  })
})

describe('normalizeComputeInstancePage', () => {
  it('normalizes items array', () => {
    const page = normalizeComputeInstancePage({
      size: 1,
      total: 99,
      items: [wireVm],
    })
    expect(page.items).toHaveLength(1)
    expect(page.items[0].metadata.name).toBe('demo-vm')
    expect(page.total).toBe(99)
    expect(page.size).toBe(1)
  })
})

describe('mapFulfillmentComputeStateToVmPower', () => {
  it('covers spec enum strings', () => {
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_RUNNING')).toBe('running')
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_STOPPED')).toBe('stopped')
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_PAUSED')).toBe('paused')
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_STARTING')).toBe('starting')
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_STOPPING')).toBe('stopping')
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_DELETING')).toBe('deleting')
    expect(mapFulfillmentComputeStateToVmPower('COMPUTE_INSTANCE_STATE_ERROR')).toBe('error')
  })
})

describe('serializeComputeInstanceForCreate', () => {
  it('serializes ComputeInstance at JSON root with snake_case spec + proto state', () => {
    const vm = normalizeComputeInstance(wireVm)
    const body = serializeComputeInstanceForCreate(vm)
    expect(body.id).toBe('ci-wire-1')
    expect(body.metadata).toMatchObject({
      name: 'demo-vm',
      creation_timestamp: '2026-05-01T12:00:00Z',
      tenants: ['shared'],
      creators: ['system'],
      version: 2,
      labels: { env: 'test' },
    })
    expect(body.spec).toMatchObject({
      template: 'rhel-9-general',
      cores: 4,
      memory_gib: 8,
      boot_disk: { size_gib: 64 },
      additional_disks: [{ size_gib: 100 }],
      subnet: '550e8400-e29b-41d4-a716-446655440000',
      image: {
        source_type: 'SOURCE_TYPE_REGISTRY',
        source_ref: 'registry.redhat.io/rhel9:latest',
      },
      run_strategy: 'Always',
    })
    expect(body.status).toEqual({ state: 'COMPUTE_INSTANCE_STATE_RUNNING' })
    expect(body).not.toHaveProperty('description')
    expect(body).not.toHaveProperty('os')
  })

  it('with specTemplateOnly requires template and still serializes other spec fields', () => {
    const vm = normalizeComputeInstance(wireVm)
    const body = serializeComputeInstanceForCreate(vm, { specTemplateOnly: true })
    expect(body.spec).toMatchObject({
      template: 'rhel-9-general',
      cores: 4,
      memory_gib: 8,
      boot_disk: { size_gib: 64 },
      additional_disks: [{ size_gib: 100 }],
      subnet: '550e8400-e29b-41d4-a716-446655440000',
      image: {
        source_type: 'SOURCE_TYPE_REGISTRY',
        source_ref: 'registry.redhat.io/rhel9:latest',
      },
      run_strategy: 'Always',
    })
    expect(body.metadata).toBeDefined()
    expect(body.status).toEqual({ state: 'COMPUTE_INSTANCE_STATE_RUNNING' })
  })

  it('with specTemplateOnly includes template_parameters as ProtoJSON Any', () => {
    const vm = normalizeComputeInstance({
      ...wireVm,
      spec: {
        ...wireVm.spec,
        template_parameters: {
          cpu_count: 4,
          mem_gib: protoJsonAnyInt32(8),
        },
      },
    })
    const body = serializeComputeInstanceForCreate(vm, { specTemplateOnly: true })
    expect(body.spec).toMatchObject({
      template: 'rhel-9-general',
      cores: 4,
      memory_gib: 8,
      boot_disk: { size_gib: 64 },
      template_parameters: {
        cpu_count: {
          '@type': 'type.googleapis.com/google.protobuf.Int32Value',
          value: 4,
        },
        mem_gib: {
          '@type': 'type.googleapis.com/google.protobuf.Int32Value',
          value: 8,
        },
      },
    })
  })

  it('with specTemplateOnly wraps boolean template_parameters and keeps boot_disk', () => {
    const vm = normalizeComputeInstance({
      ...wireVm,
      spec: {
        ...wireVm.spec,
        template_parameters: {
          example_flag: true,
          other_flag: false,
        },
      },
    })
    const body = serializeComputeInstanceForCreate(vm, { specTemplateOnly: true })
    const spec = body.spec as Record<string, unknown>
    expect(spec.boot_disk).toEqual({ size_gib: 64 })
    expect(spec.template_parameters).toEqual({
      example_flag: {
        '@type': 'type.googleapis.com/google.protobuf.BoolValue',
        value: true,
      },
      other_flag: {
        '@type': 'type.googleapis.com/google.protobuf.BoolValue',
        value: false,
      },
    })
  })

  it('serializeTemplateParametersWire passes through existing Any objects', () => {
    const any = {
      '@type': 'type.googleapis.com/google.protobuf.StringValue',
      value: 'x',
    }
    expect(serializeTemplateParametersWire({ region: any })).toEqual({ region: any })
  })

  it('with specTemplateOnly omits spec when template id is missing (no silent fallback to full spec)', () => {
    const vm = normalizeComputeInstance({
      ...wireVm,
      spec: { ...wireVm.spec, template: undefined },
    })
    const body = serializeComputeInstanceForCreate(vm, { specTemplateOnly: true })
    expect(body.spec).toBeUndefined()
  })
})

describe('serializeComputeInstancePowerPatch', () => {
  it('stop sends Halted run_strategy and STOPPED state', () => {
    expect(serializeComputeInstancePowerPatch('stop')).toEqual({
      spec: { run_strategy: 'Halted' },
      status: { state: 'COMPUTE_INSTANCE_STATE_STOPPED' },
    })
  })

  it('start sends Always run_strategy and RUNNING state', () => {
    expect(serializeComputeInstancePowerPatch('start')).toEqual({
      spec: { run_strategy: 'Always' },
      status: { state: 'COMPUTE_INSTANCE_STATE_RUNNING' },
    })
  })

  it('restart sends restart_requested_at', () => {
    const body = serializeComputeInstancePowerPatch('restart')
    expect(body.spec).toBeDefined()
    expect(typeof (body.spec as { restart_requested_at?: string }).restart_requested_at).toBe(
      'string',
    )
  })
})

describe('formatConditionStatusForDisplay', () => {
  it('maps CONDITION_STATUS_* to readable labels', () => {
    expect(formatConditionStatusForDisplay('CONDITION_STATUS_TRUE')).toBe('True')
    expect(formatConditionStatusForDisplay('CONDITION_STATUS_FALSE')).toBe('False')
  })
})
