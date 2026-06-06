import { css } from '@emotion/css'
import { EmptyState, EmptyStateBody, Label } from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import { formatVmStorageGiBLine } from '@osac/api-contracts'
import { OcTable } from '@osac/ui-components'
import type { OcTableColumn } from '@osac/ui-components'

interface Props {
  vm: ComputeInstance
}

interface DiskRow {
  id: string
  disk: string
  bus: string
  tier: string
  tierColor: 'yellow' | 'grey'
  size: string
  iops: string
  pvc: string
}

const tabPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const DISK_COLUMNS: OcTableColumn<DiskRow>[] = [
  { label: 'Disk', dataLabel: 'Disk', render: (r) => r.disk },
  { label: 'Bus', dataLabel: 'Bus', render: (r) => r.bus },
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
  { label: 'IOPS', dataLabel: 'IOPS', render: (r) => r.iops },
  { label: 'Backing PVC', dataLabel: 'Backing PVC', render: (r) => <code>{r.pvc}</code> },
]

export function VmStorageTab({ vm }: Props) {
  const storageGiB = formatVmStorageGiBLine(vm.spec)
  const hasDisk = !!vm.spec.bootDisk || storageGiB !== '—'

  const rows: DiskRow[] = hasDisk
    ? [
        {
          id: 'boot',
          disk: 'boot',
          bus: 'virtio',
          tier: 'gold',
          tierColor: 'yellow',
          size: storageGiB,
          iops: '100k',
          pvc: `${vm.metadata.name}-root`,
        },
        ...(vm.spec.additionalDisks ?? []).map((_, i) => ({
          id: `data-0${i + 1}`,
          disk: `data-0${i + 1}`,
          bus: 'virtio',
          tier: 'silver',
          tierColor: 'grey' as const,
          size: '500 GiB',
          iops: '30k',
          pvc: `${vm.metadata.name}-data-0${i + 1}`,
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
        <OcTable
          ariaLabel="Storage volumes"
          columns={DISK_COLUMNS}
          rows={rows}
          getRowKey={(r) => r.id}
        />
      )}
    </div>
  )
}
