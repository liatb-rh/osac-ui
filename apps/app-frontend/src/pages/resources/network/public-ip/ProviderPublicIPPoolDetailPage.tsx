/**
 * flow: provider-administration
 * step: pad_public_ip_pool_detail
 * route: /provider/public-ip-pools/:id
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageBreadcrumb,
  PageSection,
  Tab,
  TabTitleText,
  Tabs,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { DEMO_PUBLIC_IP_POOLS } from '@osac/api-contracts'
import { KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'
import { usePublicIPs } from '../../../../hooks/useNetworking'

function PoolStateLabel({ state }: { state?: string }) {
  if (state === 'READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'PENDING')
    return (
      <Label color="orange" isCompact>
        Pending
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      {state ?? 'Unknown'}
    </Label>
  )
}

export function ProviderPublicIPPoolDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: publicIPs = [] } = usePublicIPs()

  const pool = DEMO_PUBLIC_IP_POOLS.find((p) => p.id === id)

  const [activeTab, setActiveTab] = useState<string>('overview')
  const [assignTenantOpen, setAssignTenantOpen] = useState(false)
  const [newTenant, setNewTenant] = useState('')
  const [localTenants, setLocalTenants] = useState<string[]>([])

  if (!pool) {
    return (
      <PageSection isFilled>
        <p>
          Pool not found: <code>{id}</code>
        </p>
        <Button variant="link" onClick={() => navigate('/resources/network/public-ip/public-ip-pools')}>
          Back to Public IP Pools
        </Button>
      </PageSection>
    )
  }

  const allTenants = [...(pool.tenants ?? []), ...localTenants]
  const allocations = publicIPs.filter((ip) => ip.spec.pool === pool.id)
  const capacity = pool.capacity ?? pool.status.availableCount ?? 0
  const allocated = pool.allocated ?? 0

  function handleAssignTenant() {
    if (!newTenant.trim()) return
    setLocalTenants((prev) => [...prev, newTenant.trim()])
    setNewTenant('')
    setAssignTenantOpen(false)
  }

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem component="button" onClick={() => navigate('/resources/network/public-ip/public-ip-pools')}>
            Public IP Pools
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{pool.metadata.name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection>
        <PageHeader
          title={pool.metadata.name}
          description={[pool.spec.cidr, pool.zone].filter(Boolean).join(' · ')}
          actions={
            <>
              <PoolStateLabel state={pool.status.state} />
              {allTenants.length > 0 && (
                <LabelGroup style={{ marginLeft: 8 }}>
                  {allTenants.map((t) => (
                    <Label key={t} color="blue" isCompact>
                      {t}
                    </Label>
                  ))}
                </LabelGroup>
              )}
            </>
          }
        />

        <KpiHeader
          items={[
            { label: 'Capacity', value: String(capacity) },
            {
              label: 'Allocated',
              value: String(allocated),
              hint:
                capacity > 0
                  ? `${Math.round((allocated / capacity) * 100)}% utilization`
                  : undefined,
            },
            { label: 'Tenants', value: String(allTenants.length) },
            { label: 'Created', value: pool.metadata.createdAt?.split('T')[0] ?? '—' },
          ]}
        />
      </PageSection>

      <PageSection isFilled>
        <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList isCompact columnModifier={{ default: '2Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Pool ID</DescriptionListTerm>
                  <DescriptionListDescription>{pool.id}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{pool.spec.cidr ?? '—'}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Zone</DescriptionListTerm>
                  <DescriptionListDescription>{pool.zone ?? '—'}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pool.metadata.createdAt ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Allocation rule</DescriptionListTerm>
                  <DescriptionListDescription>
                    First-available sequential
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <PoolStateLabel state={pool.status.state} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>

          <Tab eventKey="tenants" title={<TabTitleText>Tenant Assignments</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <Button variant="secondary" size="sm" onClick={() => setAssignTenantOpen(true)}>
                  Assign tenant
                </Button>
              </div>
              {allTenants.length === 0 ? (
                <EmptyState>
                  <EmptyStateBody>No tenants assigned to this pool yet.</EmptyStateBody>
                </EmptyState>
              ) : (
                <ObjectsTable
                  ariaLabel="Tenant assignments"
                  rows={allTenants.map((t) => ({ tenant: t }))}
                  getRowKey={(r) => r.tenant}
                  columns={[
                    { label: 'Tenant', render: (r) => r.tenant },
                    {
                      label: 'Group assignments',
                      render: (r) =>
                        String(
                          pool.groupAssignments?.filter((g) => g.group.startsWith(r.tenant))
                            .length ?? 0,
                        ),
                    },
                    {
                      label: 'Allocations',
                      render: () => String(allocations.length),
                    },
                    {
                      isActionCell: true,
                      render: (r) => (
                        <ActionsColumn
                          items={[
                            {
                              title: 'Revoke',
                              isDisabled: allocations.length > 0,
                              onClick: () =>
                                setLocalTenants((prev) => prev.filter((t) => t !== r.tenant)),
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </Tab>

          <Tab eventKey="allocations" title={<TabTitleText>Allocations</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              {allocations.length === 0 ? (
                <EmptyState>
                  <EmptyStateBody>No IPs allocated from this pool yet.</EmptyStateBody>
                </EmptyState>
              ) : (
                <ObjectsTable
                  ariaLabel="Pool allocations"
                  rows={allocations}
                  getRowKey={(r) => r.id}
                  columns={[
                    { label: 'Address', render: (r) => <code>{r.status.address ?? '—'}</code> },
                    {
                      label: 'State',
                      render: (r) => {
                        const s = r.status.state ?? ''
                        if (s === 'PUBLIC_IP_STATE_ATTACHED')
                          return (
                            <Label color="green" isCompact>
                              Attached
                            </Label>
                          )
                        if (s === 'PUBLIC_IP_STATE_ALLOCATED')
                          return (
                            <Label color="blue" isCompact>
                              Allocated
                            </Label>
                          )
                        return (
                          <Label color="grey" isCompact>
                            {s}
                          </Label>
                        )
                      },
                    },
                    { label: 'Attached to', render: (r) => r.spec.computeInstance ?? '—' },
                    { label: 'Owner', render: () => '—' },
                  ]}
                />
              )}
            </div>
          </Tab>
        </Tabs>
      </PageSection>

      <Modal
        isOpen={assignTenantOpen}
        onClose={() => setAssignTenantOpen(false)}
        variant="small"
        aria-label="Assign tenant"
      >
        <ModalHeader title="Assign tenant" />
        <ModalBody>
          <Form>
            <FormGroup label="Tenant" fieldId="at-tenant" isRequired>
              <TextInput
                id="at-tenant"
                value={newTenant}
                onChange={(_, v) => setNewTenant(v)}
                placeholder="e.g. northstar"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleAssignTenant} isDisabled={!newTenant.trim()}>
            Assign
          </Button>
          <Button variant="link" onClick={() => setAssignTenantOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
