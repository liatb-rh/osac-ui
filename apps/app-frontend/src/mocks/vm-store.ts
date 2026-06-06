import { buildVmsForTenant, type ComputeInstance } from '@osac/api-contracts'

const seedVms = (): ComputeInstance[] => [
  ...buildVmsForTenant('northstar'),
  ...buildVmsForTenant('evergreen'),
]

export const vmStore = new Map<string, ComputeInstance>(seedVms().map((vm) => [vm.id, vm]))

export function resetMockVmStore(): void {
  vmStore.clear()
  for (const vm of seedVms()) vmStore.set(vm.id, vm)
}
