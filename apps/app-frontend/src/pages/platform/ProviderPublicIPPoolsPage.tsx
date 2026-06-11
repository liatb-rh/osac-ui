/**
 * flow: provider-administration
 * step: pad_public_ip_pools
 * route: /provider/public-ip-pools
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Form,
  FormGroup,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { PublicIPPoolExtended } from '@osac/api-contracts'
import { KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { usePublicIPPools, usePublicIPs } from '../../hooks/useNetworking'

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

export function ProviderPublicIPPoolsPage() {
  const navigate = useNavigate()
  const { data: pools = [] } = usePublicIPPools()
  const { data: publicIPs = [] } = usePublicIPs()

  const extPools = pools as PublicIPPoolExtended[]
  const [localPools, setLocalPools] = useState<PublicIPPoolExtended[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [newPoolName, setNewPoolName] = useState('')
  const [newPoolCidr, setNewPoolCidr] = useState('')
  const [newPoolZone, setNewPoolZone] = useState('')

  const allPools = [...extPools, ...localPools]

  const readyPools = allPools.filter((p) => p.status.state === 'READY').length
  const totalCapacity = allPools.reduce(
    (s, p) => s + (p.capacity ?? p.status.availableCount ?? 0),
    0,
  )
  const totalAllocated = allPools.reduce((s, p) => s + (p.allocated ?? 0), 0)
  const tenantsServed = new Set(allPools.flatMap((p) => p.tenants ?? [])).size

  function poolAllocations(pool: PublicIPPoolExtended) {
    return publicIPs.filter((ip) => ip.spec.pool === pool.id)
  }

  function handleCreatePool() {
    if (!newPoolName.trim() || !newPoolCidr.trim()) return
    const pool: PublicIPPoolExtended = {
      id: `pool-${Date.now()}`,
      metadata: { name: newPoolName.trim(), createdAt: new Date().toISOString() },
      spec: { cidr: newPoolCidr.trim() },
      status: { state: 'READY', availableCount: 0 },
      zone: newPoolZone.trim() || undefined,
      capacity: 0,
      allocated: 0,
      tenants: [],
      groupAssignments: [],
    }
    setLocalPools((prev) => [...prev, pool])
    setNewPoolName('')
    setNewPoolCidr('')
    setNewPoolZone('')
    setCreateOpen(false)
  }

  const columns: ObjectsTableColumn<PublicIPPoolExtended>[] = [
    { label: 'Name', render: (p) => <strong>{p.metadata.name}</strong> },
    { label: 'CIDR', render: (p) => <code>{p.spec.cidr ?? '—'}</code> },
    { label: 'Zone', render: (p) => p.zone ?? '—' },
    { label: 'Status', render: (p) => <PoolStateLabel state={p.status.state} /> },
    {
      label: 'Utilization',
      render: (p) => {
        const cap = p.capacity ?? 0
        const alloc = p.allocated ?? 0
        return cap > 0 ? `${alloc} / ${cap}` : '—'
      },
    },
    {
      label: 'Tenants',
      render: (p) => {
        const tenants = p.tenants ?? []
        if (!tenants.length) return '—'
        return (
          <LabelGroup numLabels={3}>
            {tenants.map((t) => (
              <Label key={t} color="blue" isCompact>
                {t}
              </Label>
            ))}
          </LabelGroup>
        )
      },
    },
    {
      isActionCell: true,
      render: (p) => (
        <ActionsColumn
          items={[
            { title: 'View details', onClick: () => navigate(`/provider/public-ip-pools/${p.id}`) },
            {
              title: 'Delete',
              isDisabled: poolAllocations(p).length > 0,
              onClick: () => setLocalPools((prev) => prev.filter((lp) => lp.id !== p.id)),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Public IP Pools"
        description="Manage global public IP pools, tenant assignments, and allocation visibility."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setCreateOpen(true)}>
            Create pool
          </Button>
        }
      />

      <KpiHeader
        items={[
          { label: 'Pools', value: String(allPools.length), hint: `${readyPools} ready` },
          { label: 'Capacity', value: String(totalCapacity) },
          {
            label: 'Allocated',
            value: String(totalAllocated),
            hint:
              totalCapacity > 0
                ? `${Math.round((totalAllocated / totalCapacity) * 100)}% utilization`
                : undefined,
          },
          { label: 'Tenants served', value: String(tenantsServed) },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <ObjectsTable
          ariaLabel="Provider public IP pools"
          rows={allPools}
          getRowKey={(p) => p.id}
          columns={columns}
          onRowClick={(p) => navigate(`/provider/public-ip-pools/${p.id}`)}
        />
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        variant="small"
        aria-label="Create pool"
      >
        <ModalHeader title="Create public IP pool" />
        <ModalBody>
          <Form>
            <FormGroup label="Pool name" fieldId="cp-name" isRequired>
              <TextInput id="cp-name" value={newPoolName} onChange={(_, v) => setNewPoolName(v)} />
            </FormGroup>
            <FormGroup label="CIDR" fieldId="cp-cidr" isRequired>
              <TextInput
                id="cp-cidr"
                value={newPoolCidr}
                onChange={(_, v) => setNewPoolCidr(v)}
                placeholder="e.g. 203.0.113.0/24"
              />
            </FormGroup>
            <FormGroup label="Zone" fieldId="cp-zone">
              <TextInput
                id="cp-zone"
                value={newPoolZone}
                onChange={(_, v) => setNewPoolZone(v)}
                placeholder="e.g. us-east-1"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            onClick={handleCreatePool}
            isDisabled={!newPoolName.trim() || !newPoolCidr.trim()}
          >
            Create
          </Button>
          <Button variant="link" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </PageSection>
  )
}
