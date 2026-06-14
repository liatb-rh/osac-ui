import { useState } from 'react'
import { css } from '@emotion/css'
import { Button, EmptyState, EmptyStateBody, Label, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant, TextInput, Title } from '@patternfly/react-core'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import type { ComputeInstance, StorageVolume } from '@osac/api-contracts'
import { formatVmStorageGiBLine } from '@osac/api-contracts'
import { ObjectsTable } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import {
  useMountVolume,
  useStorageVolumes,
  useUnmountVolume,
} from '../../../hooks/useAgents'

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

const sectionTitleCss = css`
  margin-top: 24px;
  margin-bottom: 8px;
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

function MountVolumeModal({
  vmId,
  isOpen,
  onClose,
}: {
  vmId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [volumeId, setVolumeId] = useState('')
  const { mutate: mount, isPending } = useMountVolume()

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Mount volume on VM"
    >
      <ModalHeader title="Mount storage volume" />
      <ModalBody>
        <label>
          <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Volume ID</span>
          <TextInput value={volumeId} onChange={(_, v) => setVolumeId(v)} placeholder="vol-xxx" />
        </label>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={isPending}
          isDisabled={isPending || !volumeId}
          onClick={() => mount({ vmId, volumeId }, { onSuccess: onClose })}
        >
          Mount
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function VmStorageTab({ vm }: Props) {
  const storageGiB = formatVmStorageGiBLine(vm.spec)
  const hasDisk = !!vm.spec.bootDisk || storageGiB !== '—'
  const [attachOpen, setAttachOpen] = useState(false)

  const { data: allVolumes } = useStorageVolumes()
  const { mutate: unmount } = useUnmountVolume()

  const attachedVolumes = (allVolumes ?? []).filter((v) =>
    v.attachments.some((a) => a.vmId === vm.id),
  )

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

  const volumeColumns: ObjectsTableColumn<StorageVolume>[] = [
    { label: 'Name', dataLabel: 'Name', render: (v) => v.metadata.name },
    { label: 'Size', dataLabel: 'Size', render: (v) => `${v.sizeGiB} GiB` },
    { label: 'Tier', dataLabel: 'Tier', render: (v) => v.tierId },
    {
      label: 'Device',
      dataLabel: 'Device',
      render: (v) => {
        const att = v.attachments.find((a) => a.vmId === vm.id)
        return att ? <code>{att.device}</code> : '—'
      },
    },
    {
      screenReaderText: 'Unmount',
      isActionCell: true,
      render: (v) => (
        <Button
          variant="plain"
          aria-label="Unmount volume"
          onClick={() => unmount({ vmId: vm.id, volumeId: v.id })}
        >
          <TrashIcon />
        </Button>
      ),
    },
  ]

  return (
    <div className={tabPaddingCss}>
      {!hasDisk ? (
        <EmptyState variant="sm">
          <EmptyStateBody>No disk information available.</EmptyStateBody>
        </EmptyState>
      ) : (
        <ObjectsTable
          ariaLabel="VM disks"
          columns={DISK_COLUMNS}
          rows={rows}
          getRowKey={(r) => r.id}
        />
      )}

      <div className={sectionTitleCss}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title headingLevel="h3" size="md">
            Mounted volumes
          </Title>
          <Button variant="secondary" size="sm" onClick={() => setAttachOpen(true)}>
            Mount volume
          </Button>
        </div>
      </div>

      {attachedVolumes.length === 0 ? (
        <EmptyState variant="sm">
          <EmptyStateBody>No volumes mounted on this VM.</EmptyStateBody>
        </EmptyState>
      ) : (
        <ObjectsTable
          ariaLabel="Attached volumes"
          columns={volumeColumns}
          rows={attachedVolumes}
          getRowKey={(v) => v.id}
        />
      )}

      <MountVolumeModal vmId={vm.id} isOpen={attachOpen} onClose={() => setAttachOpen(false)} />
    </div>
  )
}
