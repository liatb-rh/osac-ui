/**
 * flow: provider-administration
 * step: pad_storage_backend_detail
 * route: /resources/storage/storage-backends/:id
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon'
import { EditIcon } from '@patternfly/react-icons/dist/esm/icons/edit-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { ActionRow, ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import type { StorageTier } from '@osac/api-contracts'
import {
  useDeleteStorageBackend,
  useStorageBackends,
  useStorageTiers,
  useUpdateStorageBackend,
} from '../../../hooks/useAgents'

// ── Styles ───────────────────────────────────────────────────────────────────

const breadcrumbCss = css`
  margin-bottom: 12px;
`

const gridCss = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const conditionRowCss = css`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid var(--pf-v5-global--BorderColor--100);

  &:last-child {
    border-bottom: none;
  }
`

const conditionTypeCss = css`
  font-weight: var(--pf-v5-global--FontWeight--semi-bold);
  min-width: 140px;
  font-size: var(--pf-v5-global--FontSize--sm);
`

const conditionMsgCss = css`
  font-size: var(--pf-v5-global--FontSize--sm);
  color: var(--pf-v5-global--Color--200);
`

const DEPLOYMENT_LABELS: Record<string, string> = {
  ova: 'OVA (Virtual Appliance)',
  'voc-aws': 'VoC on AWS',
  moc: 'MOC (Mass Open Cloud)',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function StorageBackendDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: backends, isLoading } = useStorageBackends()
  const { data: tiers } = useStorageTiers()
  const { mutate: updateBackend, isPending: isUpdating } = useUpdateStorageBackend()
  const { mutate: deleteBackend, isPending: isDeleting } = useDeleteStorageBackend()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const backend = backends?.find((b) => b.id === id)
  const linkedTiers = tiers?.filter((t) => t.storageBackendId === id) ?? []

  const [editEndpoint, setEditEndpoint] = useState('')
  const [editVipPool, setEditVipPool] = useState('')
  const [editCredsSecret, setEditCredsSecret] = useState('')

  if (isLoading) {
    return <PageLayout title="Storage Backend" isLoading loadingLabel="Loading backend" />
  }

  if (!backend) {
    return (
      <PageLayout title="Backend not found">
        <EmptyState>
          <Title headingLevel="h4" size="lg">Backend not found</Title>
          <EmptyStateBody>No storage backend with ID &ldquo;{id}&rdquo; exists.</EmptyStateBody>
        </EmptyState>
      </PageLayout>
    )
  }

  const ready = backend.status?.ready ?? false
  const conditions = backend.status?.conditions ?? []

  const tierColumns: ObjectsTableColumn<StorageTier>[] = [
    { label: 'Name',      dataLabel: 'Name',      render: (t) => t.name },
    {
      label: 'Protocol', dataLabel: 'Protocol',
      render: (t) => t.protocol ? <Label color="teal" isCompact>{t.protocol}</Label> : '—',
    },
    { label: 'QoS class', dataLabel: 'QoS class', render: (t) => t.qosClass ?? '—' },
    { label: 'VIP pool',  dataLabel: 'VIP pool',  render: (t) => t.vipPool ?? '—' },
    {
      label: 'Available', dataLabel: 'Available',
      render: (t) => (
        <Label color={t.available ? 'green' : 'grey'} isCompact>
          {t.available ? 'yes' : 'no'}
        </Label>
      ),
    },
  ]

  function openEdit() {
    if (!backend) return
    setEditEndpoint(backend.endpoint)
    setEditVipPool(backend.vipPool ?? '')
    setEditCredsSecret(backend.credentialsSecretRef)
    setEditOpen(true)
  }

  return (
    <PageLayout
      title={backend.metadata.name}
      description={`Provider: ${backend.provider} · Endpoint: ${backend.endpoint}`}
      actions={
        <Button variant="secondary" icon={<EditIcon />} onClick={openEdit}>
          Edit
        </Button>
      }
    >
        <div className={breadcrumbCss}>
          <Breadcrumb>
            <BreadcrumbItem onClick={() => navigate('/resources/storage/storage-backends')} to="#">
              Storage Backends
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{backend.metadata.name}</BreadcrumbItem>
          </Breadcrumb>
        </div>

        <div className={gridCss}>
          {/* Details card */}
          <Card>
            <CardTitle>Details</CardTitle>
            <CardBody>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={ready ? 'green' : 'red'}
                      icon={ready ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
                      isCompact
                    >
                      {ready ? 'Ready' : 'Degraded'}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Provider</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="blue" isCompact>{backend.provider}</Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Deployment model</DescriptionListTerm>
                  <DescriptionListDescription>
                    {backend.deploymentModel
                      ? (DEPLOYMENT_LABELS[backend.deploymentModel] ?? backend.deploymentModel)
                      : '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Endpoint</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{backend.endpoint}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Credentials secret</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{backend.credentialsSecretRef}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>VIP pool</DescriptionListTerm>
                  <DescriptionListDescription>{backend.vipPool}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {backend.metadata.createdAt ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>

          {/* Conditions card */}
          <Card>
            <CardTitle>Conditions</CardTitle>
            <CardBody>
              {conditions.length === 0 ? (
                <p style={{ color: 'var(--pf-v5-global--Color--200)', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
                  No conditions reported.
                </p>
              ) : (
                <div>
                  {conditions.map((c, i) => (
                    <div key={i} className={conditionRowCss}>
                      <span className={conditionTypeCss}>{c.type}</span>
                      <Label
                        color={c.status === 'True' ? 'green' : c.status === 'False' ? 'red' : 'grey'}
                        isCompact
                      >
                        {c.status}
                      </Label>
                      {c.reason && (
                        <span style={{ fontStyle: 'italic', fontSize: 'var(--pf-v5-global--FontSize--sm)', color: 'var(--pf-v5-global--Color--200)' }}>
                          {c.reason}
                        </span>
                      )}
                      {c.message && <span className={conditionMsgCss}>{c.message}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Linked tiers */}
        <Card style={{ marginTop: 16 }}>
          <CardTitle>Storage Tiers using this backend</CardTitle>
          <CardBody>
            {linkedTiers.length === 0 ? (
              <p style={{ color: 'var(--pf-v5-global--Color--200)', fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
                No tiers reference this backend.
              </p>
            ) : (
              <ObjectsTable
                ariaLabel="Linked tiers"
                columns={tierColumns}
                rows={linkedTiers}
                getRowKey={(t) => t.id}
              />
            )}
          </CardBody>
        </Card>
        <ActionRow
          tone="danger"
          title="Deregister backend"
          body={
            linkedTiers.length > 0
              ? `${linkedTiers.length} tier(s) reference this backend. Remove them first.`
              : 'Permanently remove this storage backend from OSAC.'
          }
          cta="Deregister backend"
          icon={<TrashIcon />}
          disabled={linkedTiers.length > 0}
          onClick={() => setDeleteOpen(true)}
        />

      {/* Edit modal */}
      <Modal
        variant={ModalVariant.small}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        aria-label="Edit storage backend"
      >
        <ModalHeader title="Edit storage backend" />
        <ModalBody>
          <Form>
            <FormGroup label="Endpoint" fieldId="be-endpoint">
              <TextInput
                id="be-endpoint"
                value={editEndpoint}
                onChange={(_, v) => setEditEndpoint(v)}
              />
            </FormGroup>
            <FormGroup label="VIP Pool" fieldId="be-vip">
              <TextInput
                id="be-vip"
                value={editVipPool}
                onChange={(_, v) => setEditVipPool(v)}
              />
            </FormGroup>
            <FormGroup label="Credentials secret ref" fieldId="be-creds">
              <TextInput
                id="be-creds"
                value={editCredsSecret}
                onChange={(_, v) => setEditCredsSecret(v)}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            isLoading={isUpdating}
            isDisabled={isUpdating}
            onClick={() =>
              updateBackend(
                {
                  id: id!,
                  patch: {
                    endpoint: editEndpoint,
                    vipPool: editVipPool,
                    credentialsSecretRef: editCredsSecret,
                  },
                },
                { onSuccess: () => setEditOpen(false) },
              )
            }
          >
            Save
          </Button>
          <Button variant="link" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Deregister confirmation modal */}
      <Modal
        variant={ModalVariant.small}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        aria-label="Confirm deregister backend"
      >
        <ModalHeader title="Deregister storage backend?" />
        <ModalBody>
          Are you sure you want to deregister <strong>{backend.metadata.name}</strong>? This cannot
          be undone.
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            isLoading={isDeleting}
            isDisabled={isDeleting}
            onClick={() =>
              deleteBackend(id!, { onSuccess: () => navigate('/resources/storage/storage-backends') })
            }
          >
            Deregister
          </Button>
          <Button variant="link" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  )
}
