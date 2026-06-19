/**
 * flow: tenant-storage
 * route: /resources/storage/storage-volumes
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { CustomTableLink, ObjectsTable, PageLayout } from '@osac/ui-components'
import type { Cluster, StorageVolume, VolumeAccessMode } from '@osac/api-contracts'
import {
  useCreateStorageVolume,
  useStorageTiers,
  useStorageVolumes,
} from '../../../hooks/useAgents'
import { useClustersList } from '../../../hooks/useClustersList'

const STATE_COLOR: Record<string, 'green' | 'blue' | 'grey' | 'red' | 'orange'> = {
  available: 'green',
  'in-use': 'blue',
  creating: 'orange',
  deleting: 'grey',
  error: 'red',
}

const PHASE_COLOR: Record<string, 'green' | 'orange' | 'red' | 'grey'> = {
  Bound: 'green',
  Pending: 'orange',
  Released: 'grey',
  Failed: 'red',
}

// ── Create Volume Wizard ───────────────────────────────────────────────────

function CreateVolumeWizard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: tiers } = useStorageTiers()
  const { data: clusters = [] } = useClustersList()
  const { mutate: createVolume, isPending } = useCreateStorageVolume()

  const [name, setName] = useState('')
  const [clusterRef, setClusterRef] = useState('')
  const [tierId, setTierId] = useState('')
  const [accessMode, setAccessMode] = useState<VolumeAccessMode>('ReadWriteOnce')
  const [sizeGiB, setSizeGiB] = useState(100)

  const selectedTier = tiers?.find((t) => t.id === tierId)
  const selectedCluster = clusters.find((c: Cluster) => c.id === clusterRef)
  // Derive orgId from the selected cluster's tenant metadata
  const orgId = (selectedCluster?.metadata?.labels?.['osac.io/org-id'] ?? clusterRef) || ''

  function handleCreate() {
    createVolume({ name, orgId, sizeGiB, tierId, accessMode }, { onSuccess: onClose })
  }

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Create storage volume"
    >
      <ModalHeader
        title="Create storage volume"
        description="Provisions a PersistentVolumeClaim (PVC) on the selected cluster using the chosen StorageClass."
      />
      <ModalBody>
        <Wizard height={500} onClose={onClose} onSave={handleCreate}>
          <WizardStep name="Identity" id="vol-id">
            <Form>
              <FormGroup label="Volume name" fieldId="vn-name" isRequired>
                <input
                  id="vn-name"
                  className="pf-v5-c-form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-data-volume"
                />
              </FormGroup>
              <FormGroup label="Target cluster" fieldId="vn-cluster" isRequired>
                <FormSelect
                  id="vn-cluster"
                  value={clusterRef}
                  onChange={(_, v) => setClusterRef(v)}
                >
                  <FormSelectOption value="" label="— Select cluster —" />
                  {clusters.map((c: Cluster) => (
                    <FormSelectOption
                      key={c.id}
                      value={c.id}
                      label={`${c.metadata.name} (${c.status?.state ?? 'unknown'})`}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Storage tier" fieldId="vn-tier" isRequired>
                <FormSelect id="vn-tier" value={tierId} onChange={(_, v) => setTierId(v)}>
                  <FormSelectOption value="" label="— Select tier —" />
                  {(tiers ?? []).map((t) => (
                    <FormSelectOption
                      key={t.id}
                      value={t.id}
                      label={`${t.name}${t.storageClassName ? ` · ${t.storageClassName}` : ''}${t.protocol ? ` (${t.protocol})` : ''}`}
                    />
                  ))}
                </FormSelect>
              </FormGroup>
              <FormGroup label="Access mode" fieldId="vn-access">
                <FormSelect
                  id="vn-access"
                  value={accessMode}
                  onChange={(_, v) => setAccessMode(v as VolumeAccessMode)}
                >
                  <FormSelectOption
                    value="ReadWriteOnce"
                    label="ReadWriteOnce (RWO) — single node, block storage"
                  />
                  <FormSelectOption
                    value="ReadWriteMany"
                    label="ReadWriteMany (RWX) — multi-node, NFS / shared storage"
                  />
                </FormSelect>
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep name="Capacity" id="vol-capacity">
            <Form>
              <FormGroup label="Size (GiB)" fieldId="vn-size" isRequired>
                <NumberInput
                  id="vn-size"
                  value={sizeGiB}
                  min={1}
                  onMinus={() => setSizeGiB((v) => Math.max(1, v - 10))}
                  onPlus={() => setSizeGiB((v) => v + 10)}
                  onChange={(e) => setSizeGiB(Number((e.target as HTMLInputElement).value))}
                />
              </FormGroup>
            </Form>
          </WizardStep>

          <WizardStep
            name="Review"
            id="vol-review"
            footer={{
              nextButtonText: isPending ? 'Creating…' : 'Create volume',
              isNextDisabled: isPending || !name || !tierId || !clusterRef,
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <p>
                <strong>Name:</strong> {name || '—'}
              </p>
              <p>
                <strong>Cluster:</strong> {selectedCluster?.metadata.name ?? (clusterRef || '—')}
              </p>
              <p>
                <strong>Tier:</strong> {(selectedTier?.name ?? tierId) || '—'}
              </p>
              <p>
                <strong>StorageClass:</strong>{' '}
                {selectedTier?.storageClassName ? (
                  <code>{selectedTier.storageClassName}</code>
                ) : (
                  <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>
                )}
              </p>
              <p>
                <strong>VolumeSnapshotClass:</strong>{' '}
                {selectedTier?.storageClassName ? (
                  <code>{selectedTier.storageClassName}-snap</code>
                ) : (
                  <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>
                )}
              </p>
              <p>
                <strong>Access mode:</strong> {accessMode}
              </p>
              <p>
                <strong>Size:</strong> {sizeGiB} GiB
              </p>
            </div>
          </WizardStep>
        </Wizard>
      </ModalBody>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function VolumesPage() {
  const navigate = useNavigate()
  const { data: volumes, isLoading } = useStorageVolumes()
  const [createOpen, setCreateOpen] = useState(false)

  const columns = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (v: StorageVolume) => (
        <CustomTableLink onClick={() => navigate(`/resources/storage/storage-volumes/${v.id}`)}>
          {v.metadata.name}
        </CustomTableLink>
      ),
    },
    {
      label: 'Size',
      dataLabel: 'Size',
      render: (v: StorageVolume) => `${v.sizeGiB} GiB`,
    },
    {
      label: 'StorageClass',
      dataLabel: 'StorageClass',
      render: (v: StorageVolume) =>
        v.storageClassName ? (
          <code>{v.storageClassName}</code>
        ) : (
          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</span>
        ),
    },
    {
      label: 'Access mode',
      dataLabel: 'Access mode',
      render: (v: StorageVolume) => (
        <Label color={v.accessMode === 'ReadWriteMany' ? 'blue' : 'grey'} isCompact>
          {v.accessMode === 'ReadWriteMany' ? 'RWX' : 'RWO'}
        </Label>
      ),
    },
    {
      label: 'Phase',
      dataLabel: 'Phase',
      render: (v: StorageVolume) => (
        <Label color={PHASE_COLOR[v.phase] ?? 'grey'} isCompact>
          {v.phase}
        </Label>
      ),
    },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (v: StorageVolume) => (
        <Label color={STATE_COLOR[v.status.state] ?? 'grey'} isCompact>
          {v.status.state}
        </Label>
      ),
    },
    {
      label: 'Cluster',
      dataLabel: 'Cluster',
      render: (v: StorageVolume) => (v.clusterRef ? <code>{v.clusterRef}</code> : v.orgId),
    },
    {
      label: 'Mounted on',
      dataLabel: 'Mounted on',
      render: (v: StorageVolume) =>
        v.attachments.length > 0 ? v.attachments.map((a) => a.vmName).join(', ') : '—',
    },
  ]

  return (
    <PageLayout
      title="Volumes"
      description="PersistentVolumeClaims (PVCs) managed independently of VMs. Create, mount, and snapshot volumes per storage tier."
      isLoading={isLoading}
      loadingLabel="Loading volumes"
      actions={
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          Create volume
        </Button>
      }
    >
      <ObjectsTable
        ariaLabel="Storage volumes"
        columns={columns}
        rows={volumes ?? []}
        getRowKey={(v) => v.id}
        onRowClick={(v) => navigate(`/resources/storage/storage-volumes/${v.id}`)}
        defaultPageSize={10}
      />

      <CreateVolumeWizard isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </PageLayout>
  )
}
