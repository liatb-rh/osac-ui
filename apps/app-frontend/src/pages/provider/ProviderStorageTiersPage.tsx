/**
 * flow: provider-administration
 * step: pad_storage_tiers
 * route: /provider/storage-tiers
 */
import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { StorageTier } from '@osac/api-contracts'
import { useStorageTiers, usePatchStorageTier } from '../../api/useAgents'
import { useClustersList } from '../../api/useClustersList'
import { ClusterStatusLabel } from '../../components/clusters/ClusterStatusLabel'
import { PageHeader } from '../../components/layout'

const DEMO_TENANTS = [
  { id: 'northstar', label: 'Northstar Bank' },
  { id: 'evergreen', label: 'Bluestone Financial Group' },
]

function enabledForLabel(tier: StorageTier): string {
  const ids = tier.availableTenantIds ?? []
  if (ids.length === 0) return 'All tenants'
  if (ids.length === 1) return '1 tenant'
  return `${ids.length} tenants`
}

export function ProviderStorageTiersPage() {
  const { data: tiers, isLoading, error, refetch } = useStorageTiers()
  const { data: clusters } = useClustersList()
  const { mutate: patchTier } = usePatchStorageTier()

  const [editingTier, setEditingTier] = useState<StorageTier | null>(null)
  const [editValues, setEditValues] = useState<Partial<StorageTier>>({})
  const [tenantSelectOpen, setTenantSelectOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleToggleAvailable(tier: StorageTier, available: boolean) {
    patchTier(
      { id: tier.id, patch: { available } },
      {
        onSuccess: () => {
          setSuccessMsg(`Tier "${tier.name}" ${available ? 'enabled' : 'disabled'}.`)
          setTimeout(() => setSuccessMsg(null), 4000)
        },
      },
    )
  }

  function handleEdit(tier: StorageTier) {
    setEditingTier(tier)
    setEditValues({
      name: tier.name,
      qosClass: tier.qosClass,
      vipPool: tier.vipPool,
      storageClassName: tier.storageClassName,
      availableTenantIds: tier.availableTenantIds ?? [],
    })
    setTenantSelectOpen(false)
  }

  function handleSaveEdit() {
    if (!editingTier) return
    patchTier(
      { id: editingTier.id, patch: editValues },
      {
        onSuccess: () => {
          setSuccessMsg(`Tier "${editingTier.name}" updated.`)
          setTimeout(() => setSuccessMsg(null), 4000)
          setEditingTier(null)
        },
      },
    )
  }

  function toggleTenantId(tenantId: string) {
    const current = editValues.availableTenantIds ?? []
    const next = current.includes(tenantId)
      ? current.filter((id) => id !== tenantId)
      : [...current, tenantId]
    setEditValues((p) => ({ ...p, availableTenantIds: next }))
  }

  function removeTenantChip(tenantId: string) {
    setEditValues((p) => ({
      ...p,
      availableTenantIds: (p.availableTenantIds ?? []).filter((id) => id !== tenantId),
    }))
  }

  return (
    <PageSection>
      <PageHeader
        title="Storage Tiers"
        subtitle="Manage VAST storage tier definitions for cluster persistent storage."
      />

      {successMsg && (
        <Alert variant="success" title={successMsg} isInline style={{ marginBottom: '1rem' }} />
      )}
      {error && (
        <Alert variant="danger" title="Failed to load storage tiers." isInline style={{ marginBottom: '1rem' }}>
          <Button variant="link" isInline onClick={() => refetch()}>Retry</Button>
        </Alert>
      )}

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardTitle>
          VAST Environment Status
          <Label color="green" style={{ marginLeft: '0.5rem' }}>Connected</Label>
        </CardTitle>
        <CardBody>
          <DescriptionList isCompact isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Endpoint</DescriptionListTerm>
              <DescriptionListDescription style={{ fontFamily: 'monospace' }}>
                https://vast.vertexa.internal/api
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>VAST Version</DescriptionListTerm>
              <DescriptionListDescription>5.2.0</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Last Sync</DescriptionListTerm>
              <DescriptionListDescription>
                {new Date().toLocaleString()}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>

      {isLoading && <Spinner aria-label="Loading storage tiers" />}

      {!isLoading && (
        <>
          <Title headingLevel="h2" size="lg" style={{ marginBottom: '1rem' }}>Storage Tiers</Title>
          <Table aria-label="Storage tiers" variant="compact" style={{ marginBottom: '2rem' }}>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>QoS Class</Th>
                <Th>VIP Pool</Th>
                <Th>StorageClass Name</Th>
                <Th>
                  <Tooltip content="Number of tenants this tier is enabled for. 'All tenants' means no tenant restriction is set.">
                    <span>Enabled For</span>
                  </Tooltip>
                </Th>
                <Th>Available</Th>
                <Th aria-label="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {(tiers ?? []).map((tier) => (
                <Tr key={tier.id}>
                  <Td dataLabel="Name"><strong>{tier.name}</strong></Td>
                  <Td dataLabel="QoS Class">{tier.qosClass ?? '—'}</Td>
                  <Td dataLabel="VIP Pool">{tier.vipPool ?? '—'}</Td>
                  <Td dataLabel="StorageClass Name"><code>{tier.storageClassName ?? '—'}</code></Td>
                  <Td dataLabel="Enabled For">
                    <Label color="blue" isCompact>
                      {enabledForLabel(tier)}
                    </Label>
                  </Td>
                  <Td dataLabel="Available">
                    <Switch
                      id={`tier-avail-${tier.id}`}
                      isChecked={tier.available}
                      onChange={(_e, checked) => handleToggleAvailable(tier, checked)}
                      aria-label={`Toggle availability for tier ${tier.name}`}
                    />
                  </Td>
                  <Td dataLabel="Actions">
                    <Button variant="link" isInline onClick={() => handleEdit(tier)}>Edit</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Title headingLevel="h2" size="lg" style={{ marginBottom: '1rem' }}>Per-Cluster Storage Readiness</Title>
          <Table aria-label="Cluster storage readiness" variant="compact">
            <Thead>
              <Tr>
                <Th>Cluster Name</Th>
                <Th>Tenant</Th>
                <Th>Compute State</Th>
                <Th>
                  <Tooltip content='"Provisioning" means the cluster is compute-ready but CSI driver and StorageClasses are still being installed.'>
                    <span>Storage Readiness</span>
                  </Tooltip>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {(clusters ?? []).map((cluster) => (
                <Tr key={cluster.id}>
                  <Td dataLabel="Cluster Name">{cluster.metadata.name}</Td>
                  <Td dataLabel="Tenant">{cluster.metadata.tenants?.[0] ?? '—'}</Td>
                  <Td dataLabel="Compute State">
                    <ClusterStatusLabel state={cluster.status.state} />
                  </Td>
                  <Td dataLabel="Storage Readiness">
                    {cluster.status.storageReady === true ? (
                      <Label color="green">Ready</Label>
                    ) : cluster.status.storageReady === false ? (
                      <Label color="blue" icon={<Spinner size="sm" aria-label="Storage provisioning" />}>
                        Provisioning
                      </Label>
                    ) : (
                      <Label color="grey">Not provisioned</Label>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}

      {editingTier && (
        <Modal
          isOpen
          onClose={() => setEditingTier(null)}
          variant="small"
          aria-labelledby="edit-tier-title"
        >
          <ModalHeader title={`Edit tier — ${editingTier.name}`} labelId="edit-tier-title" />
          <ModalBody>
            <Form>
              <FormGroup label="Name" fieldId="tier-name">
                <TextInput
                  id="tier-name"
                  value={editValues.name ?? ''}
                  onChange={(_e, v) => setEditValues((p) => ({ ...p, name: v }))}
                />
              </FormGroup>
              <FormGroup label="QoS Class" fieldId="tier-qos">
                <TextInput
                  id="tier-qos"
                  value={editValues.qosClass ?? ''}
                  onChange={(_e, v) => setEditValues((p) => ({ ...p, qosClass: v }))}
                />
              </FormGroup>
              <FormGroup label="VIP Pool" fieldId="tier-vip">
                <TextInput
                  id="tier-vip"
                  value={editValues.vipPool ?? ''}
                  onChange={(_e, v) => setEditValues((p) => ({ ...p, vipPool: v }))}
                />
              </FormGroup>
              <FormGroup label="StorageClass Name" fieldId="tier-sc">
                <TextInput
                  id="tier-sc"
                  value={editValues.storageClassName ?? ''}
                  onChange={(_e, v) => setEditValues((p) => ({ ...p, storageClassName: v }))}
                />
              </FormGroup>
              <FormGroup label="Tenant Availability" fieldId="tier-tenants">
                <HelperText style={{ marginBottom: '0.5rem' }}>
                  <HelperTextItem>
                    Select which tenants have access to this tier. Leave empty to allow all tenants.
                  </HelperTextItem>
                </HelperText>
                <Select
                  id="tier-tenants"
                  isOpen={tenantSelectOpen}
                  onOpenChange={setTenantSelectOpen}
                  toggle={(ref) => (
                    <MenuToggle
                      ref={ref}
                      onClick={() => setTenantSelectOpen((o) => !o)}
                      isExpanded={tenantSelectOpen}
                      style={{ width: '100%' }}
                    >
                      {(editValues.availableTenantIds ?? []).length === 0
                        ? 'All tenants'
                        : `${(editValues.availableTenantIds ?? []).length} selected`}
                    </MenuToggle>
                  )}
                >
                  <SelectList>
                    {DEMO_TENANTS.map((t) => (
                      <SelectOption
                        key={t.id}
                        value={t.id}
                        hasCheckbox
                        isSelected={(editValues.availableTenantIds ?? []).includes(t.id)}
                        onClick={() => toggleTenantId(t.id)}
                      >
                        {t.label}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
                {(editValues.availableTenantIds ?? []).length > 0 && (
                  <LabelGroup style={{ marginTop: '0.5rem' }} aria-label="Selected tenants">
                    {(editValues.availableTenantIds ?? []).map((id) => {
                      const tenant = DEMO_TENANTS.find((t) => t.id === id)
                      return (
                        <Label
                          key={id}
                          onClose={() => removeTenantChip(id)}
                          closeBtnAriaLabel={`Remove ${tenant?.label ?? id}`}
                        >
                          {tenant?.label ?? id}
                        </Label>
                      )
                    })}
                  </LabelGroup>
                )}
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleSaveEdit}>Save</Button>
            <Button variant="link" onClick={() => setEditingTier(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  )
}
