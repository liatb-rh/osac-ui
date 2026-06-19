/**
 * flow: tenant-storage
 * route: /resources/storage/storage-volumes/:id
 */
import { css } from '@emotion/css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyState,
  EmptyStateBody,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
  TextInput,
} from '@patternfly/react-core'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon'
import {
  ActionRow,
  CustomTableLink,
  KpiHeader,
  ObjectsTable,
  PageLayout,
} from '@osac/ui-components'
import type { VolumeAttachment, VolumeSnapshot } from '@osac/api-contracts'
import {
  useCreateVolumeSnapshot,
  useDeleteStorageVolume,
  useDeleteVolumeSnapshot,
  useMountVolume,
  useResizeStorageVolume,
  useRestoreVolumeSnapshot,
  useStorageVolume,
  useUnmountVolume,
  useVolumeSnapshots,
} from '../../../hooks/useAgents'

// ── Styles ──────────────────────────────────────────────────────────────────

const breadcrumbCss = css`
  margin-bottom: 12px;
`

const tabContentCss = css`
  padding-top: 16px;
`

const STATE_COLOR: Record<string, 'green' | 'blue' | 'grey' | 'red' | 'orange'> = {
  available: 'green',
  'in-use': 'blue',
  creating: 'orange',
  deleting: 'grey',
  error: 'red',
  ready: 'green',
  restoring: 'orange',
}

const PHASE_COLOR: Record<string, 'green' | 'orange' | 'red' | 'grey'> = {
  Bound: 'green',
  Pending: 'orange',
  Released: 'grey',
  Failed: 'red',
}

// ── Mount on VM Modal ─────────────────────────────────────────────────────────

function MountOnVmModal({
  volumeId,
  isOpen,
  onClose,
}: {
  volumeId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [vmId, setVmId] = useState('')
  const [device, setDevice] = useState('/dev/vdb')
  const { mutate: mount, isPending } = useMountVolume()

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Mount volume on VM"
    >
      <ModalHeader
        title="Mount volume on VM"
        description="Adds this volume to the VM's spec.disks. The VM must be stopped or support hot-plug."
      />
      <ModalBody>
        <div style={{ display: 'grid', gap: 12 }}>
          <FormGroup label="VM ID" fieldId="mount-vmid" isRequired>
            <TextInput
              id="mount-vmid"
              value={vmId}
              onChange={(_, v) => setVmId(v)}
              placeholder="vm-abc123"
            />
          </FormGroup>
          <FormGroup label="Device path" fieldId="mount-device">
            <TextInput
              id="mount-device"
              value={device}
              onChange={(_, v) => setDevice(v)}
              placeholder="/dev/vdb"
            />
          </FormGroup>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={isPending}
          isDisabled={isPending || !vmId}
          onClick={() => mount({ vmId, volumeId, device }, { onSuccess: onClose })}
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

// ── Resize Modal ─────────────────────────────────────────────────────────────

function ResizeModal({
  volumeId,
  currentSize,
  isOpen,
  onClose,
}: {
  volumeId: string
  currentSize: number
  isOpen: boolean
  onClose: () => void
}) {
  const [sizeGiB, setSizeGiB] = useState(currentSize)
  const { mutate: resize, isPending } = useResizeStorageVolume()

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Resize volume"
    >
      <ModalHeader title="Resize volume" />
      <ModalBody>
        <FormGroup label="New size (GiB)" fieldId="resize-size" isRequired>
          <NumberInput
            id="resize-size"
            value={sizeGiB}
            min={currentSize}
            onMinus={() => setSizeGiB((v) => Math.max(currentSize, v - 10))}
            onPlus={() => setSizeGiB((v) => v + 10)}
            onChange={(e) => setSizeGiB(Number((e.target as HTMLInputElement).value))}
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={isPending}
          isDisabled={isPending || sizeGiB <= currentSize}
          onClick={() => resize({ id: volumeId, sizeGiB }, { onSuccess: onClose })}
        >
          Resize
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Create Snapshot Modal ─────────────────────────────────────────────────────

const SNAPSHOT_CLASSES = ['vast-snapshot', 'vast-snapshot-retain']

function CreateSnapshotModal({
  volumeId,
  isOpen,
  onClose,
}: {
  volumeId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [snapshotClassName, setSnapshotClassName] = useState(SNAPSHOT_CLASSES[0])
  const { mutate: createSnap, isPending } = useCreateVolumeSnapshot()

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Create snapshot"
    >
      <ModalHeader title="Create snapshot" />
      <ModalBody>
        <div style={{ display: 'grid', gap: 12 }}>
          <FormGroup label="Snapshot name" fieldId="snap-name" isRequired>
            <TextInput
              id="snap-name"
              value={name}
              onChange={(_, v) => setName(v)}
              placeholder="my-snapshot-2026"
            />
          </FormGroup>
          <FormGroup label="Snapshot class" fieldId="snap-class">
            <FormSelect
              id="snap-class"
              value={snapshotClassName}
              onChange={(_, v) => setSnapshotClassName(v)}
            >
              {SNAPSHOT_CLASSES.map((sc) => (
                <FormSelectOption key={sc} value={sc} label={sc} />
              ))}
            </FormSelect>
          </FormGroup>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={isPending}
          isDisabled={isPending || !name}
          onClick={() => createSnap({ volumeId, name, snapshotClassName }, { onSuccess: onClose })}
        >
          Create
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Restore Snapshot Modal ────────────────────────────────────────────────────

function RestoreSnapshotModal({
  snapshotId,
  volumeId,
  defaultName,
  restoreSize,
  isOpen,
  onClose,
}: {
  snapshotId: string
  volumeId: string
  defaultName: string
  restoreSize: number
  isOpen: boolean
  onClose: () => void
}) {
  const [newName, setNewName] = useState(`${defaultName}-restored`)
  const { mutate: restore, isPending } = useRestoreVolumeSnapshot()

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Restore snapshot"
    >
      <ModalHeader
        title="Restore snapshot"
        description={`A new volume (min ${restoreSize} GiB) will be created from this snapshot.`}
      />
      <ModalBody>
        <FormGroup label="New volume name" fieldId="restore-name" isRequired>
          <TextInput id="restore-name" value={newName} onChange={(_, v) => setNewName(v)} />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isLoading={isPending}
          isDisabled={isPending || !newName}
          onClick={() =>
            restore({ id: snapshotId, volumeId, newVolumeName: newName }, { onSuccess: onClose })
          }
        >
          Restore
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Snapshots Tab ─────────────────────────────────────────────────────────────

function SnapshotsTab({ volumeId }: { volumeId: string }) {
  const { data: snapshots, isLoading } = useVolumeSnapshots(volumeId)
  const { mutate: deleteSnap } = useDeleteVolumeSnapshot()
  const [createOpen, setCreateOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<VolumeSnapshot | null>(null)

  const columns = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (s: VolumeSnapshot) => s.metadata.name,
    },
    {
      label: 'Size',
      dataLabel: 'Size',
      render: (s: VolumeSnapshot) => `${s.sizeGiB} GiB`,
    },
    {
      label: 'Restore size',
      dataLabel: 'Restore size',
      render: (s: VolumeSnapshot) => `${s.restoreSize} GiB`,
    },
    {
      label: 'Snapshot class',
      dataLabel: 'Snapshot class',
      render: (s: VolumeSnapshot) =>
        s.snapshotClassName ? <code>{s.snapshotClassName}</code> : '—',
    },
    {
      label: 'Ready',
      dataLabel: 'Ready',
      render: (s: VolumeSnapshot) =>
        s.readyToUse ? (
          <Label color="green" isCompact>
            <CheckCircleIcon /> Ready
          </Label>
        ) : (
          <Label color="orange" isCompact>
            Not ready
          </Label>
        ),
    },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (s: VolumeSnapshot) => (
        <Label color={STATE_COLOR[s.status.state] ?? 'grey'} isCompact>
          {s.status.state}
        </Label>
      ),
    },
    {
      label: 'Created',
      dataLabel: 'Created',
      render: (s: VolumeSnapshot) => s.metadata.createdAt ?? '—',
    },
    {
      screenReaderText: 'Actions',
      isActionCell: true,
      render: (s: VolumeSnapshot) => (
        <span style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={!s.readyToUse}
            onClick={() => setRestoreTarget(s)}
          >
            Restore
          </Button>
          <Button
            variant="plain"
            aria-label="Delete snapshot"
            onClick={() => deleteSnap({ id: s.id, volumeId })}
          >
            <TrashIcon />
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div className={tabContentCss}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button variant="secondary" onClick={() => setCreateOpen(true)}>
          Create snapshot
        </Button>
      </div>
      {isLoading ? (
        <Spinner aria-label="Loading snapshots" />
      ) : (
        <ObjectsTable
          ariaLabel="Volume snapshots"
          columns={columns}
          rows={snapshots ?? []}
          getRowKey={(s) => s.id}
          defaultPageSize={10}
        />
      )}

      <CreateSnapshotModal
        volumeId={volumeId}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {restoreTarget && (
        <RestoreSnapshotModal
          snapshotId={restoreTarget.id}
          volumeId={volumeId}
          defaultName={restoreTarget.metadata.name}
          restoreSize={restoreTarget.restoreSize}
          isOpen={!!restoreTarget}
          onClose={() => setRestoreTarget(null)}
        />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VolumeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: volume, isLoading } = useStorageVolume(id!)
  const { mutate: deleteVol, isPending: isDeleting } = useDeleteStorageVolume()
  const { mutate: unmount } = useUnmountVolume()

  const [tab, setTab] = useState<string | number>('mounts')
  const [mountOpen, setMountOpen] = useState(false)
  const [resizeOpen, setResizeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return <PageLayout title="Volume" isLoading loadingLabel="Loading volume" />
  }

  if (!volume) {
    return (
      <PageLayout title="Volume not found">
        <EmptyState>
          <EmptyStateBody>No volume with ID &ldquo;{id}&rdquo; found.</EmptyStateBody>
        </EmptyState>
      </PageLayout>
    )
  }

  const isInUse = volume.status.state === 'in-use'

  const attachmentColumns = [
    {
      label: 'VM',
      dataLabel: 'VM',
      render: (a: VolumeAttachment) => (
        <CustomTableLink onClick={() => navigate(`/compute/vms/${a.vmId}`)}>
          {a.vmName}
        </CustomTableLink>
      ),
    },
    {
      label: 'Device',
      dataLabel: 'Device',
      render: (a: VolumeAttachment) => (a.device ? <code>{a.device}</code> : '—'),
    },
    {
      screenReaderText: 'Unmount',
      isActionCell: true,
      render: (a: VolumeAttachment) => (
        <Button
          variant="plain"
          aria-label="Unmount"
          onClick={() => unmount({ vmId: a.vmId, volumeId: volume.id })}
        >
          <TrashIcon />
        </Button>
      ),
    },
  ]

  return (
    <PageLayout
      title={
        <>
          {volume.metadata.name}{' '}
          <Label
            color={PHASE_COLOR[volume.phase] ?? 'grey'}
            isCompact
            style={{ marginLeft: 8, verticalAlign: 'middle' }}
          >
            {volume.phase}
          </Label>
        </>
      }
      description={
        <span>
          {volume.orgId} · Tier: {volume.tierId}
          {volume.storageClassName && (
            <>
              {' '}
              · StorageClass: <code>{volume.storageClassName}</code>
            </>
          )}{' '}
          · {volume.accessMode}
        </span>
      }
      actions={
        <Button variant="primary" onClick={() => setMountOpen(true)} isDisabled={isInUse}>
          Mount on VM
        </Button>
      }
    >
      <Breadcrumb className={breadcrumbCss}>
        <BreadcrumbItem
          render={() => (
            <Button
              variant="link"
              isInline
              onClick={() => navigate('/resources/storage/storage-volumes')}
            >
              Volumes
            </Button>
          )}
        />
        <BreadcrumbItem isActive>{volume.metadata.name}</BreadcrumbItem>
      </Breadcrumb>

      <KpiHeader
        items={[
          { label: 'Size (GiB)', value: volume.sizeGiB },
          { label: 'Mounts', value: volume.attachments.length },
          { label: 'Snapshots', value: 0 },
        ]}
      />

      <div style={{ marginBottom: 16 }}>
        <Label color={STATE_COLOR[volume.status.state] ?? 'grey'}>
          {volume.status.state === 'in-use' ? (
            <CheckCircleIcon style={{ marginRight: 4 }} />
          ) : volume.status.state === 'error' ? (
            <ExclamationCircleIcon style={{ marginRight: 4 }} />
          ) : null}
          {volume.status.state}
        </Label>
        {volume.status.message && (
          <span
            style={{
              marginLeft: 8,
              color: 'var(--pf-v5-global--Color--200)',
              fontSize: 'var(--pf-v5-global--FontSize--sm)',
            }}
          >
            {volume.status.message}
          </span>
        )}
      </div>

      <Tabs activeKey={tab} onSelect={(_, k) => setTab(k)} aria-label="Volume detail tabs">
        <Tab eventKey="mounts" title={<TabTitleText>Mounts</TabTitleText>}>
          <div className={tabContentCss}>
            <ObjectsTable
              ariaLabel="Volume mounts"
              columns={attachmentColumns}
              rows={volume.attachments}
              getRowKey={(a) => a.vmId}
            />
          </div>
        </Tab>

        <Tab eventKey="snapshots" title={<TabTitleText>Snapshots</TabTitleText>}>
          <SnapshotsTab volumeId={volume.id} />
        </Tab>
      </Tabs>

      <ActionRow
        title="Resize volume"
        body="Increase the volume size. Size can only grow, not shrink."
        cta="Resize"
        icon={<TrashIcon />}
        onClick={() => setResizeOpen(true)}
      />

      <ActionRow
        tone="danger"
        title="Delete volume"
        body={
          isInUse
            ? 'Unmount this volume from all VMs before deleting.'
            : 'Permanently delete this volume and all its data.'
        }
        cta="Delete volume"
        icon={<TrashIcon />}
        disabled={isInUse}
        onClick={() => setDeleteOpen(true)}
      />

      <MountOnVmModal volumeId={volume.id} isOpen={mountOpen} onClose={() => setMountOpen(false)} />
      <ResizeModal
        volumeId={volume.id}
        currentSize={volume.sizeGiB}
        isOpen={resizeOpen}
        onClose={() => setResizeOpen(false)}
      />

      <Modal
        variant={ModalVariant.small}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        aria-label="Confirm delete volume"
      >
        <ModalHeader title="Delete volume?" />
        <ModalBody>
          Are you sure you want to delete <strong>{volume.metadata.name}</strong>? This cannot be
          undone.
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            isLoading={isDeleting}
            isDisabled={isDeleting}
            onClick={() =>
              deleteVol(volume.id, {
                onSuccess: () => navigate('/resources/storage/storage-volumes'),
              })
            }
          >
            Delete
          </Button>
          <Button variant="link" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  )
}
