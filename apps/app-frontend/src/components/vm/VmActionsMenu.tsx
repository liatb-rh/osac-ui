import { EllipsisVIcon } from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon'
import { useState } from 'react'
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core'
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'

interface VmActionsMenuProps {
  vm: ComputeInstance
  effectiveState?: VmPowerState
  /** True while stop→wait-for-stopped→start restart orchestration is in progress for this VM. */
  isRestarting?: boolean
  /** True while a pending Starting/Stopping/Restarting badge is active for this VM. */
  isPowerActionPending?: boolean
  onPower: (action: 'start' | 'stop' | 'restart') => void
  onDelete?: () => void
  /* RESTORE when fulfillment supports clone — expose onClone?: () => void */
  /* RESTORE when fulfillment supports migrate — expose onMigrate?: () => void */
}

export function VmActionsMenu({
  vm,
  effectiveState,
  isRestarting = false,
  isPowerActionPending = false,
  onPower,
  onDelete,
}: VmActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const state = effectiveState ?? vm.status.state

  const pending = isPowerActionPending || isRestarting
  const canStart = state === 'stopped' && !pending
  const canStop = (state === 'running' || state === 'paused') && !pending
  const canRestart = (state === 'running' || state === 'paused') && !isRestarting && !pending
  const canDelete = typeof onDelete === 'function' && state !== 'deleting' && state !== 'starting'

  return (
    <Dropdown
      isOpen={open}
      onOpenChange={setOpen}
      toggle={(ref) => (
        <MenuToggle
          ref={ref}
          variant="plain"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Actions for ${vm.metadata.name}`}
        >
          <EllipsisVIcon />
        </MenuToggle>
      )}
      popperProps={{ position: 'right' }}
    >
      <DropdownList>
        <DropdownItem
          value="start"
          isDisabled={!canStart}
          onClick={() => {
            if (!canStart) return
            onPower('start')
            setOpen(false)
          }}
        >
          Start
        </DropdownItem>
        <DropdownItem
          value="stop"
          isDisabled={!canStop}
          onClick={() => {
            if (!canStop) return
            onPower('stop')
            setOpen(false)
          }}
        >
          Stop
        </DropdownItem>
        <DropdownItem
          value="restart"
          isDisabled={!canRestart}
          onClick={() => {
            if (!canRestart) return
            onPower('restart')
            setOpen(false)
          }}
        >
          Restart
        </DropdownItem>
        {/* RESTORE Clone when fulfillment supports clone:
        <DropdownItem value="clone" onClick={() => { onClone?.(); setOpen(false) }}>Clone</DropdownItem>
        */}
        {/* RESTORE Migrate when fulfillment supports migrate:
        <DropdownItem value="migrate" onClick={() => { onMigrate?.(); setOpen(false) }}>Migrate</DropdownItem>
        */}
        <DropdownItem
          value="delete"
          isDisabled={!canDelete}
          onClick={() => {
            if (!canDelete) return
            onDelete?.()
            setOpen(false)
          }}
        >
          Delete
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  )
}
