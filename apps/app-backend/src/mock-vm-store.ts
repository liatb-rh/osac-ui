/**
 * Shared in-memory VM store for mock BFF (fulfillment routes + create-vm-wizard finalize).
 */
import { type ComputeInstance, buildVmsForTenant } from '@osac/api-contracts'

const allMockVms: ComputeInstance[] = [
  ...buildVmsForTenant('northstar'),
  ...buildVmsForTenant('evergreen'),
]

export const vmStore = new Map<string, ComputeInstance>(allMockVms.map((vm) => [vm.id, vm]))

export function listMockVms(): ComputeInstance[] {
  return Array.from(vmStore.values())
}

/** Restore fixture VMs (mock mode tests that mutate the store should call in `afterEach` / `beforeEach`). */
export function resetMockVmStore(): void {
  vmStore.clear()
  for (const vm of allMockVms) {
    vmStore.set(vm.id, vm)
  }
}
