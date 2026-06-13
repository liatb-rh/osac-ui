/**
 * flow: tenant-administration
 * step: tad_public_ip_pools
 * route: /admin/public-ips
 */
import { useNavigate } from 'react-router-dom'
import { Label, PageSection } from '@patternfly/react-core'
import type { PublicIPPoolExtended } from '@osac/api-contracts'
import { ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { usePublicIPPools, usePublicIPs } from '../../../../hooks/useNetworking'

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

export function PublicIpPoolsPage() {
  const navigate = useNavigate()
  const { data: pools = [] } = usePublicIPPools()
  const { data: publicIPs = [] } = usePublicIPs()

  const extPools = pools as PublicIPPoolExtended[]

  const columns: ObjectsTableColumn<PublicIPPoolExtended>[] = [
    { label: 'Name', render: (p) => <strong>{p.metadata.name}</strong> },
    { label: 'CIDR', render: (p) => <code>{p.spec.cidr ?? '—'}</code> },
    { label: 'Zone', render: (p) => p.zone ?? '—' },
    { label: 'Status', render: (p) => <PoolStateLabel state={p.status.state} /> },
    {
      label: 'User groups',
      render: (p) => String((p.groupAssignments ?? []).length),
    },
    {
      label: 'Tenant allocations',
      render: (p) => String(publicIPs.filter((ip) => ip.spec.pool === p.id).length),
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Public IP Pools"
        description="Manage public IP pool assignments and user group quotas for your tenant."
      />

      <div style={{ marginTop: 24 }}>
        <ObjectsTable
          ariaLabel="Public IP pools"
          rows={extPools}
          getRowKey={(p) => p.id}
          columns={columns}
          onRowClick={(p) => navigate(`/admin/public-ips/${p.id}`)}
        />
      </div>
    </PageSection>
  )
}
