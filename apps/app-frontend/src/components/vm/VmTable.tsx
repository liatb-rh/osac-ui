/**
 * flow: manage-virtual-machines
 * step: mvm_list_view
 */
import { css } from '@emotion/css'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'
import { resolveVmOsForUi } from '@osac/api-contracts'
import { VmStatusLabel } from '@osac/ui-components'
import { VmActionsMenu } from './VmActionsMenu'

interface VmTableProps {
  vms: ComputeInstance[]
  getState: (vm: ComputeInstance) => VmPowerState
  onSelect: (vm: ComputeInstance) => void
  onPower: (vm: ComputeInstance, action: 'start' | 'stop' | 'restart') => void
  isRestarting?: (vm: ComputeInstance) => boolean
  isPowerActionPending?: (vm: ComputeInstance) => boolean
  isPendingCreation?: (vm: ComputeInstance) => boolean
  onDelete?: (vm: ComputeInstance) => void
  /* RESTORE when fulfillment supports clone: onClone?: (vm: ComputeInstance) => void */
}

const osCellCss = css`
  text-transform: capitalize;
`

export function VmTable({
  vms,
  getState,
  onSelect,
  onPower,
  isRestarting,
  isPowerActionPending,
  isPendingCreation,
  onDelete,
}: VmTableProps) {
  return (
    <Table aria-label="Virtual machines" variant="compact">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Status</Th>
          <Th>OS</Th>
          <Th>vCPU</Th>
          <Th>Memory</Th>
          <Th>IP</Th>
          <Th aria-label="Actions" />
        </Tr>
      </Thead>
      <Tbody>
        {vms.map((vm) => {
          const state = getState(vm)
          const pending = isPendingCreation?.(vm) ?? false
          const locked = pending || state === 'deleting'
          return (
            <Tr
              key={vm.id}
              isClickable={!locked}
              onRowClick={locked ? undefined : () => onSelect(vm)}
            >
              <Td dataLabel="Name">{vm.metadata.name}</Td>
              <Td dataLabel="Status">
                <VmStatusLabel state={state} />
              </Td>
              <Td dataLabel="OS" className={osCellCss}>
                {resolveVmOsForUi(vm)}
              </Td>
              <Td dataLabel="vCPU">{vm.spec.cores ?? '—'}</Td>
              <Td dataLabel="Memory">
                {vm.spec.memoryGib != null ? `${vm.spec.memoryGib} GiB` : '—'}
              </Td>
              <Td dataLabel="IP">{locked ? '—' : (vm.status.ipAddress ?? '—')}</Td>
              <Td dataLabel="Actions" isActionCell>
                {locked ? null : (
                  <div onClick={(e) => e.stopPropagation()}>
                    <VmActionsMenu
                      vm={vm}
                      effectiveState={state}
                      isRestarting={isRestarting?.(vm)}
                      isPowerActionPending={isPowerActionPending?.(vm)}
                      onPower={(a) => onPower(vm, a)}
                      {...(onDelete ? { onDelete: () => onDelete(vm) } : {})}
                    />
                  </div>
                )}
              </Td>
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
