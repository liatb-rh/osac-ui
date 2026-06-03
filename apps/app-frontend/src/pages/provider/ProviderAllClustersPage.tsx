/**
 * flow: provider-administration
 * step: pad_all_clusters
 * route: /provider/clusters
 */
import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  FormSelect,
  FormSelectOption,
  Label,
  PageSection,
  SearchInput,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { ClusterState } from '@osac/api-contracts'
import { useClustersList } from '../../api/useClustersList'
import { ClusterStatusLabel } from '../../components/clusters/ClusterStatusLabel'
import { PageHeader } from '../../components/layout'

const ALL_STATES: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'CLUSTER_STATE_PROGRESSING', label: 'Provisioning' },
  { value: 'CLUSTER_STATE_READY', label: 'Ready' },
  { value: 'CLUSTER_STATE_FAILED', label: 'Failed' },
  { value: 'CLUSTER_STATE_UPGRADING', label: 'Upgrading' },
  { value: 'CLUSTER_STATE_UPGRADE_FAILED', label: 'Upgrade Failed' },
]

export function ProviderAllClustersPage() {
  const { data: clusters, isLoading, error, refetch } = useClustersList()

  const [searchName, setSearchName] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')

  const tenantOptions = useMemo(() => {
    const tenants = new Set<string>()
    for (const c of clusters ?? []) {
      for (const t of c.metadata.tenants ?? []) tenants.add(t)
    }
    return ['', ...Array.from(tenants)]
  }, [clusters])

  const filtered = useMemo(() => {
    return (clusters ?? []).filter((c) => {
      if (searchName && !c.metadata.name.toLowerCase().includes(searchName.toLowerCase())) return false
      if (stateFilter && c.status.state !== stateFilter) return false
      if (tenantFilter && !(c.metadata.tenants ?? []).includes(tenantFilter)) return false
      return true
    })
  }, [clusters, searchName, stateFilter, tenantFilter])

  function getWorkerCount(cluster: (typeof filtered)[number]): number {
    return Object.values(cluster.spec.nodeSets ?? {}).reduce((sum, ns) => sum + ns.size, 0)
  }

  return (
    <PageSection>
      <PageHeader
        title="All Clusters"
        subtitle="Cross-tenant OpenShift cluster overview."
      />

      {error && (
        <Alert variant="danger" title="Failed to load clusters." isInline style={{ marginBottom: '1rem' }}>
          <Button variant="link" isInline onClick={() => refetch()}>Retry</Button>
        </Alert>
      )}

      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter by name…"
              value={searchName}
              onChange={(_e, v) => setSearchName(v)}
              onClear={() => setSearchName('')}
              aria-label="Search clusters by name"
            />
          </ToolbarItem>
          <ToolbarItem>
            <FormSelect
              value={stateFilter}
              onChange={(_e, v) => setStateFilter(v)}
              aria-label="Filter by status"
              style={{ minWidth: '160px' }}
            >
              {ALL_STATES.map((s) => (
                <FormSelectOption key={s.value} value={s.value} label={s.label} />
              ))}
            </FormSelect>
          </ToolbarItem>
          <ToolbarItem>
            <FormSelect
              value={tenantFilter}
              onChange={(_e, v) => setTenantFilter(v)}
              aria-label="Filter by tenant"
              style={{ minWidth: '140px' }}
            >
              {tenantOptions.map((t) => (
                <FormSelectOption key={t} value={t} label={t || 'All tenants'} />
              ))}
            </FormSelect>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {isLoading && <Spinner aria-label="Loading clusters" />}

      {!isLoading && (
        <Table aria-label="All clusters" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Tenant</Th>
              <Th>Status</Th>
              <Th>Storage</Th>
              <Th>OCP Version</Th>
              <Th>Virtual Network</Th>
              <Th>Workers</Th>
              <Th>Created</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.length === 0 && (
              <Tr>
                <Td colSpan={8} style={{ textAlign: 'center', color: 'var(--pf-v5-global--Color--200)' }}>
                  No clusters match the current filters.
                </Td>
              </Tr>
            )}
            {filtered.map((cluster) => (
              <Tr key={cluster.id}>
                <Td dataLabel="Name"><strong>{cluster.metadata.name}</strong></Td>
                <Td dataLabel="Tenant">{cluster.metadata.tenants?.[0] ?? '—'}</Td>
                <Td dataLabel="Status"><ClusterStatusLabel state={cluster.status.state} /></Td>
                <Td dataLabel="Storage">
                  {cluster.status.storageReady === true ? (
                    <Label color="green">Ready</Label>
                  ) : cluster.status.storageReady === false ? (
                    <Label color="blue" icon={<Spinner size="sm" aria-label="Storage provisioning" />}>
                      Provisioning
                    </Label>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td dataLabel="OCP Version">{cluster.status.version ?? '—'}</Td>
                <Td dataLabel="Virtual Network">{cluster.spec.network?.virtualNetworkRef ?? '—'}</Td>
                <Td dataLabel="Workers">{getWorkerCount(cluster)}</Td>
                <Td dataLabel="Created">
                  {cluster.metadata.createdAt
                    ? new Date(cluster.metadata.createdAt).toLocaleDateString()
                    : '—'}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </PageSection>
  )
}
