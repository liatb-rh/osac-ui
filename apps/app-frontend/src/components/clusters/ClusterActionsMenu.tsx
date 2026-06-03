import { useState } from 'react'
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core'
import { EllipsisVIcon } from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon'
import type { Cluster } from '@osac/api-contracts'

interface ClusterActionsMenuProps {
  cluster: Cluster
  canUpgrade: boolean
  canDelete: boolean
  onViewDetails: () => void
  onUpgrade: () => void
  onDelete: () => void
}

export function ClusterActionsMenu({
  cluster,
  canUpgrade,
  canDelete,
  onViewDetails,
  onUpgrade,
  onDelete,
}: ClusterActionsMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dropdown
      isOpen={open}
      onOpenChange={setOpen}
      toggle={(ref) => (
        <MenuToggle
          ref={ref}
          variant="plain"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Actions for ${cluster.metadata.name}`}
        >
          <EllipsisVIcon />
        </MenuToggle>
      )}
      popperProps={{ position: 'right' }}
    >
      <DropdownList>
        <DropdownItem
          value="details"
          onClick={() => {
            onViewDetails()
            setOpen(false)
          }}
        >
          View details
        </DropdownItem>
        <DropdownItem
          value="upgrade"
          isDisabled={!canUpgrade}
          onClick={() => {
            if (!canUpgrade) return
            onUpgrade()
            setOpen(false)
          }}
        >
          Upgrade
        </DropdownItem>
        <DropdownItem
          value="delete"
          isDisabled={!canDelete}
          onClick={() => {
            if (!canDelete) return
            onDelete()
            setOpen(false)
          }}
        >
          Delete
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  )
}
