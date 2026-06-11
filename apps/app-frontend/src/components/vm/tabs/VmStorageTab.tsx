import { css } from '@emotion/css'
import { EmptyState, EmptyStateBody, Label } from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import { formatVmStorageGiBLine } from '@osac/api-contracts'
import { ObjectsTable } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'

interface Props {
  vm: ComputeInstance
}

interface DiskRow {
  id: string
  disk: string
  tier: string
  tierColor: 'yellow' | 'grey'
  size: string
}

const tabPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const DISK_COLUMNS: ObjectsTableColumn<DiskRow>[] = [
  { label: 'Disk', dataLabel: 'Disk', render: (r) => r.disk },
  {
    label: 'Tier',
    dataLabel: 'Tier',
    render: (r) => (
      <Label color={r.tierColor} isCompact>
        {r.tier}
      </Label>
    ),
  },
  { label: 'Size', dataLabel: 'Size', render: (r) => r.size },
]

export function VmStorageTab({ vm }: Props) {
  const storageGiB = formatVmStorageGiBLine(vm.spec)
  const hasDisk = !!vm.spec.bootDisk || storageGiB !== '—'

  const rows: DiskRow[] = hasDisk
    ? [
        {
          id: 'boot',
          disk: 'boot',
          tier: 'gold',
          tierColor: 'yellow',
          size: storageGiB,
        },
        ...(vm.spec.additionalDisks ?? []).map((_, i) => ({
          id: `data-0${i + 1}`,
          disk: `data-0${i + 1}`,
          tier: 'silver',
          tierColor: 'grey' as const,
          size: '500 GiB',
        })),
      ]
    : []

  return (
    <div className={tabPaddingCss}>
      {!hasDisk ? (
        <EmptyState variant="sm">
          <EmptyStateBody>No disk information available.</EmptyStateBody>
        </EmptyState>
      ) : (
        <ObjectsTable
          ariaLabel="Storage volumes"
          columns={DISK_COLUMNS}
          rows={rows}
          getRowKey={(r) => r.id}
        />
      )}
    </div>
  )
}
