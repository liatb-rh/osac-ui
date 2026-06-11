/**
 * flow: tenant-administration
 * step: tad_public_ip_pool_detail
 * route: /admin/public-ips/:id
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
  Form,
  FormGroup,
  Label,
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
import { usePublicIPs } from '../../hooks/useNetworking'

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

export function TenantAdminPublicIPPoolDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: publicIPs = [] } = usePublicIPs()

  const pool = DEMO_PUBLIC_IP_POOLS.find((p) => p.id === id)

  const [activeTab, setActiveTab] = useState<string>('overview')
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupQuota, setNewGroupQuota] = useState('')
  const [localGroups, setLocalGroups] = useState<
    { group: string; quota: number | null; used: number }[]
  >([])

  if (!pool) {
    return (
      <PageSection isFilled>
        <p>
          Pool not found: <code>{id}</code>
        </p>
        <Button variant="link" onClick={() => navigate('/admin/public-ips')}>
          Back to Public IP Pools
        </Button>
      </PageSection>
    )
  }

  const allGroups = [...(pool.groupAssignments ?? []), ...localGroups]
  const poolAllocations = publicIPs.filter((ip) => ip.spec.pool === pool.id)

  function handleAddGroup() {
    if (!newGroupName.trim()) return
    const quota = newGroupQuota.trim() ? Number(newGroupQuota) : null
    setLocalGroups((prev) => [...prev, { group: newGroupName.trim(), quota, used: 0 }])
    setNewGroupName('')
    setNewGroupQuota('')
    setAddGroupOpen(false)
  }

  function handleRemoveGroup(groupName: string) {
    setLocalGroups((prev) => prev.filter((g) => g.group !== groupName))
  }

  const attached = poolAllocations.filter(
    (ip) => ip.status.state === 'PUBLIC_IP_STATE_ATTACHED',
  ).length

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem component="button" onClick={() => navigate('/admin/public-ips')}>
            Public IP Pools
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{pool.metadata.name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection>
        <PageHeader
          title={pool.metadata.name}
          description={[pool.spec.cidr, pool.zone].filter(Boolean).join(' · ')}
          actions={<PoolStateLabel state={pool.status.state} />}
        />

        <KpiHeader
          items={[
            { label: 'User groups', value: String(allGroups.length) },
            {
              label: 'Tenant allocations',
              value: String(poolAllocations.length),
              hint: `${attached} attached`,
            },
            { label: 'Available IPs', value: String(pool.status.availableCount ?? '—') },
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
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <PoolStateLabel state={pool.status.state} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Ownership</DescriptionListTerm>
                  <DescriptionListDescription>
                    Assigned by cloud provider admin
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>

          <Tab eventKey="groups" title={<TabTitleText>User Group Assignments</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <Button variant="secondary" size="sm" onClick={() => setAddGroupOpen(true)}>
                  Add group
                </Button>
              </div>
              <ObjectsTable
                ariaLabel="User group assignments"
                rows={allGroups}
                getRowKey={(r) => r.group}
                columns={[
                  {
                    label: 'User group',
                    render: (r) => (
                      <Label color="blue" isCompact>
                        {r.group}
                      </Label>
                    ),
                  },
                  {
                    label: 'Quota',
                    render: (r) => (r.quota != null ? String(r.quota) : 'Unlimited'),
                  },
                  { label: 'Used', render: (r) => String(r.used) },
                  {
                    isActionCell: true,
                    render: (r) => (
                      <ActionsColumn
                        items={[{ title: 'Remove', onClick: () => handleRemoveGroup(r.group) }]}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </Tab>

          <Tab eventKey="allocations" title={<TabTitleText>Tenant Allocations</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <ObjectsTable
                ariaLabel="Tenant allocations"
                rows={poolAllocations}
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
                  { label: 'Created', render: (r) => r.metadata.createdAt ?? '—' },
                ]}
              />
            </div>
          </Tab>
        </Tabs>
      </PageSection>

      <Modal
        isOpen={addGroupOpen}
        onClose={() => setAddGroupOpen(false)}
        variant="small"
        aria-label="Add user group"
      >
        <ModalHeader title="Add user group" />
        <ModalBody>
          <Form>
            <FormGroup label="Group name" fieldId="ag-group" isRequired>
              <TextInput
                id="ag-group"
                value={newGroupName}
                onChange={(_, v) => setNewGroupName(v)}
                placeholder="e.g. northstar-prod"
              />
            </FormGroup>
            <FormGroup label="Quota (IPs)" fieldId="ag-quota">
              <TextInput
                id="ag-quota"
                value={newGroupQuota}
                onChange={(_, v) => setNewGroupQuota(v)}
                placeholder="Leave blank for unlimited"
                type="number"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleAddGroup} isDisabled={!newGroupName.trim()}>
            Add
          </Button>
          <Button variant="link" onClick={() => setAddGroupOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
