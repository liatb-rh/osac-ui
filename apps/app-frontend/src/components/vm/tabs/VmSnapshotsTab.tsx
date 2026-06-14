import { useState } from 'react'
import { css } from '@emotion/css'
import {
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  TextInput,
} from '@patternfly/react-core'
import { CameraIcon } from '@patternfly/react-icons/dist/esm/icons/camera-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import type { ComputeInstance, VolumeSnapshot } from '@osac/api-contracts'
import { ObjectsTable } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import {
  useCreateVolumeSnapshot,
  useDeleteVolumeSnapshot,
  useStorageVolumes,
  useVolumeSnapshots,
} from '../../../hooks/useAgents'

interface Props {
  vm: ComputeInstance
}

const tabPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const headerFlexCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const sectionTitleCss = css`
  margin: 0;
  font-weight: 600;
`

const STATE_COLOR: Record<string, 'green' | 'gold' | 'red' | 'grey'> = {
  ready: 'green',
  creating: 'gold',
  error: 'red',
  restoring: 'gold',
}

function SnapshotsForVolume({
  volumeId,
  vmId,
}: {
  volumeId: string
  vmId: string
}) {
  const { data: snapshots, isLoading } = useVolumeSnapshots(volumeId)
  const { mutate: createSnap, isPending: isCreating } = useCreateVolumeSnapshot()
  const { mutate: deleteSnap } = useDeleteVolumeSnapshot()
  const [createOpen, setCreateOpen] = useState(false)
  const [snapName, setSnapName] = useState('')

  const columns: ObjectsTableColumn<VolumeSnapshot>[] = [
    { label: 'Name', dataLabel: 'Name', render: (s) => s.metadata.name },
    { label: 'Size', dataLabel: 'Size', render: (s) => `${s.sizeGiB} GiB` },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (s) => (
        <Label color={STATE_COLOR[s.status.state] ?? 'grey'} isCompact>
          {s.status.state}
        </Label>
      ),
    },
    { label: 'Created', dataLabel: 'Created', render: (s) => s.metadata.createdAt ?? '—' },
    {
      screenReaderText: 'Delete',
      isActionCell: true,
      render: (s) => (
        <Button
          variant="plain"
          aria-label="Delete snapshot"
          onClick={() => deleteSnap({ id: s.id, volumeId })}
        >
          <TrashIcon />
        </Button>
      ),
    },
  ]

  if (isLoading) return <Spinner size="sm" aria-label="Loading snapshots" />

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          icon={<CameraIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Create snapshot
        </Button>
      </div>
      <ObjectsTable
        ariaLabel={`Snapshots for volume ${volumeId}`}
        columns={columns}
        rows={snapshots ?? []}
        getRowKey={(s) => s.id}
      />
      <Modal
        variant={ModalVariant.small}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        aria-label="Create snapshot"
      >
        <ModalHeader title="Create snapshot" />
        <ModalBody>
          <label>
            <span style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
              Snapshot name
            </span>
            <TextInput
              value={snapName}
              onChange={(_, v) => setSnapName(v)}
              placeholder="snap-name"
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            isLoading={isCreating}
            isDisabled={isCreating || !snapName}
            onClick={() =>
              createSnap({ volumeId, name: snapName }, { onSuccess: () => setCreateOpen(false) })
            }
          >
            Create
          </Button>
          <Button variant="link" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export function VmSnapshotsTab({ vm }: Props) {
  const { data: allVolumes } = useStorageVolumes()

  const attachedVolumes = (allVolumes ?? []).filter((v) =>
    v.attachments.some((a) => a.vmId === vm.id),
  )

  return (
    <div className={tabPaddingCss}>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        className={headerFlexCss}
      >
        <FlexItem>
          <Content component="p" className={sectionTitleCss}>
            Volume snapshots
          </Content>
        </FlexItem>
      </Flex>

      {attachedVolumes.length === 0 ? (
        <EmptyState variant="sm">
          <EmptyStateBody>
            No volumes attached to this VM. Attach a storage volume to create snapshots.
          </EmptyStateBody>
        </EmptyState>
      ) : (
        attachedVolumes.map((v) => (
          <div key={v.id} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 'var(--pf-v5-global--FontSize--sm)',
                color: 'var(--pf-v5-global--Color--200)',
              }}
            >
              {v.metadata.name} ({v.sizeGiB} GiB)
            </div>
            <SnapshotsForVolume volumeId={v.id} vmId={vm.id} />
          </div>
        ))
      )}
    </div>
  )
}
