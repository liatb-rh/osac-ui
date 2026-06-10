import { css } from '@emotion/css'
import { CopyIcon } from '@patternfly/react-icons/dist/esm/icons/copy-icon'
import { EditIcon } from '@patternfly/react-icons/dist/esm/icons/edit-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import type { ComputeInstance } from '@osac/api-contracts'
import { ActionRow } from '@osac/ui-components'

interface Props {
  vm: ComputeInstance
  onDelete: () => void
}

const stackCss = css`
  padding-top: var(--pf-t--global--spacer--md);
  display: flex;
  flex-direction: column;
  gap: var(--pf-t--global--spacer--md);
`

export function VmDangerZoneTab({ vm, onDelete }: Props) {
  return (
    <div className={stackCss}>
      <ActionRow
        icon={<EditIcon />}
        title="Rename virtual machine"
        body={`Change the display name of ${vm.metadata.name}.`}
        cta="Rename"
        disabled
      />
      <ActionRow
        icon={<CopyIcon />}
        title="Clone virtual machine"
        body="Create an identical copy of this VM with all its volumes."
        cta="Clone"
        disabled
      />
      <ActionRow
        icon={<TrashIcon />}
        title="Delete virtual machine"
        body="Permanently remove this VM and all attached volumes. This action cannot be undone."
        cta="Delete"
        tone="danger"
        onClick={onDelete}
      />
    </div>
  )
}
