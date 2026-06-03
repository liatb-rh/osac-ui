/**
 * flow: cluster-service-catalog
 * step: csc_clusters_list
 * route: /clusters
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Divider,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Gallery,
  GalleryItem,
  Label,
  PageSection,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { BarsIcon } from '@patternfly/react-icons/dist/esm/icons/bars-icon'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { ThLargeIcon } from '@patternfly/react-icons/dist/esm/icons/th-large-icon'
import type { Cluster } from '@osac/api-contracts'
import { useClustersList } from '../../api/useClustersList'
import { useClusterCatalogItems } from '../../api/useClusterCatalogItems'
import { ClusterStatusLabel } from './ClusterStatusLabel'
import { CreateClusterModal } from './CreateClusterModal'
import { UpgradeClusterModal } from './UpgradeClusterModal'
import { ClusterActionsMenu } from './ClusterActionsMenu'
import { useDeleteCluster } from '../../api/useDeleteCluster'
import { PageHeader } from '../layout'

type ListMode = 'cards' | 'table'
type StateFilter = 'all' | 'CLUSTER_STATE_READY' | 'CLUSTER_STATE_PROGRESSING' | 'CLUSTER_STATE_UPGRADING' | 'CLUSTER_STATE_FAILED'

// ── Reusable field helpers (mirrors VmDetailField / VmInlineDetailField) ──────

function ClusterDetailField({ label, value }: { label: string; value: string }) {
  return (
    <Stack hasGutter={false}>
      <StackItem>
        <Content
          component="small"
          style={{
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontWeight: 500,
            color: 'var(--pf-t--global--text--color--subtle)',
          }}
        >
          {label}
        </Content>
      </StackItem>
      <StackItem>
        <Content
          component="p"
          style={{ margin: 0, fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
        >
          {value}
        </Content>
      </StackItem>
    </Stack>
  )
}

function ClusterInlineDetailField({ label, value }: { label: string; value: string }) {
  return (
    <Content
      component="p"
      style={{
        margin: 0,
        fontSize: 'var(--pf-t--global--font--size--body--sm)',
        display: 'grid',
        gridTemplateColumns: '96px minmax(120px, 1fr)',
        columnGap: '1.25rem',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 500, color: 'var(--pf-t--global--text--color--subtle)' }}>{label}</span>
      <span>{value}</span>
    </Content>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function ClustersPage() {
  const navigate = useNavigate()
  const { data: clusters, isLoading, error, refetch } = useClustersList()
  const { data: catalogItems } = useClusterCatalogItems()
  const { mutateAsync: deleteCluster } = useDeleteCluster()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [upgradeCluster, setUpgradeCluster] = useState<Cluster | null>(null)
  const [listMode, setListMode] = useState<ListMode>('cards')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')

  function getCatalogItem(cluster: Cluster) {
    return (catalogItems ?? []).find((ci) => ci.id === cluster.spec.catalogItem)
  }

  function getWorkerCount(cluster: Cluster): number {
    return Object.values(cluster.spec.nodeSets ?? {}).reduce((sum, ns) => sum + ns.size, 0)
  }

  async function handleDelete(cluster: Cluster) {
    await deleteCluster(cluster.id)
  }

  const filteredClusters = useMemo(() => {
    return (clusters ?? []).filter((c) => {
      const matchesSearch = !search || c.metadata.name.toLowerCase().includes(search.toLowerCase())
      const matchesState = stateFilter === 'all' || c.status.state === stateFilter
      return matchesSearch && matchesState
    })
  }, [clusters, search, stateFilter])

  const mainContent = (
    <PageSection isFilled>
      <PageHeader
        title="Clusters"
        subtitle="OpenShift clusters provisioned for your organization."
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create cluster
          </Button>
        }
      />

      <Divider style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }} />

      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: 'wrap' }}
        gap={{ default: 'gapMd' }}
        style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
      >
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
        >
          <FlexItem>
            <SearchInput
              placeholder="Search clusters by name…"
              value={search}
              onChange={(_e, v) => setSearch(v)}
              onClear={() => setSearch('')}
              style={{ minWidth: 220 }}
            />
          </FlexItem>
          <FlexItem>
            <FormSelect
              id="cluster-filter-state"
              value={stateFilter}
              onChange={(_e, v) => setStateFilter(v as StateFilter)}
              aria-label="Filter clusters by status"
              style={{ minWidth: 180 }}
            >
              <FormSelectOption value="all" label="All statuses" />
              <FormSelectOption value="CLUSTER_STATE_READY" label="Ready" />
              <FormSelectOption value="CLUSTER_STATE_PROGRESSING" label="Provisioning" />
              <FormSelectOption value="CLUSTER_STATE_UPGRADING" label="Upgrading" />
              <FormSelectOption value="CLUSTER_STATE_FAILED" label="Failed" />
            </FormSelect>
          </FlexItem>
        </Flex>

        <FlexItem>
          <ToggleGroup aria-label="List view mode" className="osac-view-toggle--compact">
            <ToggleGroupItem
              text={<ThLargeIcon aria-hidden />}
              buttonId="view-cards"
              isSelected={listMode === 'cards'}
              onChange={() => setListMode('cards')}
              aria-label="Cards view"
            />
            <ToggleGroupItem
              text={<BarsIcon aria-hidden />}
              buttonId="view-table"
              isSelected={listMode === 'table'}
              onChange={() => setListMode('table')}
              aria-label="Table view"
            />
          </ToggleGroup>
        </FlexItem>
      </Flex>

      {error && (
        <Alert
          variant="danger"
          title="Failed to load clusters"
          isInline
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {isLoading ? (
        <Bullseye style={{ padding: 'var(--pf-t--global--spacer--2xl)' }}>
          <Spinner aria-label="Loading clusters" />
        </Bullseye>
      ) : filteredClusters.length === 0 ? (
        <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
          {search || stateFilter !== 'all'
            ? 'No clusters match your filters.'
            : 'No clusters yet. Create one to get started.'}
        </Content>
      ) : listMode === 'cards' ? (
        <Gallery hasGutter minWidths={{ default: '360px' }}>
          {filteredClusters.map((cluster) => {
            const isProvisioning = cluster.status.state === 'CLUSTER_STATE_PROGRESSING'
            const catalogItem = getCatalogItem(cluster)
            const canUpgrade =
              cluster.status.state === 'CLUSTER_STATE_READY' &&
              (catalogItem?.allowedVersions ?? []).some((v) => v > (cluster.status.version ?? ''))
            const canDelete = !isProvisioning
            const workerCount = getWorkerCount(cluster)
            const createdDate = cluster.metadata.createdAt
              ? new Date(cluster.metadata.createdAt).toLocaleDateString()
              : 'Not set'
            const apiUrl = cluster.status.apiUrl ?? '—'

            return (
              <GalleryItem key={cluster.id}>
                <Card
                  isClickable={!isProvisioning}
                  onClick={isProvisioning ? undefined : () => navigate(`/clusters/${cluster.id}`)}
                  style={{
                    border: '1px solid var(--pf-t--global--border--color--default)',
                    borderRadius: 'var(--pf-t--global--border--radius--medium)',
                  }}
                >
                  <CardHeader>
                    <Stack hasGutter style={{ width: '100%' }}>
                      <StackItem>
                        <Flex
                          alignItems={{ default: 'alignItemsCenter' }}
                          justifyContent={{ default: 'justifyContentSpaceBetween' }}
                        >
                          <FlexItem>
                            <CubesIcon
                              style={{ width: 24, height: 24, color: 'var(--pf-t--global--icon--color--brand)' }}
                              aria-hidden
                            />
                          </FlexItem>
                          <FlexItem>
                            <Flex
                              alignItems={{ default: 'alignItemsCenter' }}
                              spaceItems={{ default: 'spaceItemsSm' }}
                            >
                              <FlexItem>
                                <ClusterStatusLabel state={cluster.status.state} />
                              </FlexItem>
                              <FlexItem>
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <ClusterActionsMenu
                                    cluster={cluster}
                                    canUpgrade={canUpgrade}
                                    canDelete={canDelete}
                                    onViewDetails={() => navigate(`/clusters/${cluster.id}`)}
                                    onUpgrade={() => setUpgradeCluster(cluster)}
                                    onDelete={() => handleDelete(cluster)}
                                  />
                                </span>
                              </FlexItem>
                            </Flex>
                          </FlexItem>
                        </Flex>
                      </StackItem>
                      <StackItem>
                        <CardTitle>{cluster.metadata.name}</CardTitle>
                      </StackItem>
                    </Stack>
                  </CardHeader>
                  <CardBody>
                    <Flex
                      gap={{ default: 'gapLg' }}
                      flexWrap={{ default: 'wrap' }}
                      style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}
                    >
                      <FlexItem>
                        <ClusterDetailField
                          label="OCP Version"
                          value={cluster.status.version ?? '—'}
                        />
                      </FlexItem>
                      <FlexItem>
                        <ClusterDetailField
                          label="Workers"
                          value={workerCount ? String(workerCount) : '—'}
                        />
                      </FlexItem>
                      <FlexItem>
                        <ClusterDetailField
                          label="Storage"
                          value={
                            cluster.status.storageReady === true
                              ? 'Ready'
                              : cluster.status.storageReady === false
                                ? 'Provisioning'
                                : '—'
                          }
                        />
                      </FlexItem>
                    </Flex>
                    <Divider style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }} />
                    <Stack hasGutter={false} style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}>
                      <StackItem>
                        <ClusterInlineDetailField
                          label="API URL"
                          value={
                            apiUrl !== '—'
                              ? apiUrl.replace('https://', '').replace(':6443', '')
                              : '—'
                          }
                        />
                      </StackItem>
                      <StackItem>
                        <ClusterInlineDetailField label="Created" value={createdDate} />
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </GalleryItem>
            )
          })}
        </Gallery>
      ) : (
        <Table aria-label="Clusters" variant="compact">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>OCP Version</Th>
              <Th>Storage</Th>
              <Th>Workers</Th>
              <Th>API URL</Th>
              <Th>Created</Th>
              <Th aria-label="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {filteredClusters.map((cluster) => {
              const catalogItem = getCatalogItem(cluster)
              const canUpgrade =
                cluster.status.state === 'CLUSTER_STATE_READY' &&
                (catalogItem?.allowedVersions ?? []).some((v) => v > (cluster.status.version ?? ''))
              const isProvisioning = cluster.status.state === 'CLUSTER_STATE_PROGRESSING'
              const canDelete = !isProvisioning

              return (
                <Tr
                  key={cluster.id}
                  isClickable
                  onRowClick={() => navigate(`/clusters/${cluster.id}`)}
                  aria-label={`Open details for ${cluster.metadata.name}`}
                >
                  <Td dataLabel="Name">{cluster.metadata.name}</Td>
                  <Td dataLabel="Status">
                    <ClusterStatusLabel state={cluster.status.state} />
                  </Td>
                  <Td dataLabel="OCP Version">{cluster.status.version ?? '—'}</Td>
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
                  <Td dataLabel="Workers">{getWorkerCount(cluster) || '—'}</Td>
                  <Td dataLabel="API URL">
                    {cluster.status.apiUrl ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>
                        {cluster.status.apiUrl}
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td dataLabel="Created">
                    {cluster.metadata.createdAt
                      ? new Date(cluster.metadata.createdAt).toLocaleDateString()
                      : '—'}
                  </Td>
                  <Td dataLabel="Actions" isActionCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ClusterActionsMenu
                        cluster={cluster}
                        canUpgrade={canUpgrade}
                        canDelete={canDelete}
                        onViewDetails={() => navigate(`/clusters/${cluster.id}`)}
                                    onUpgrade={() => setUpgradeCluster(cluster)}
                                    onDelete={() => handleDelete(cluster)}
                      />
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      )}
    </PageSection>
  )

  return (
    <>
      {mainContent}

      {showCreateModal && (
        <CreateClusterModal onClose={() => setShowCreateModal(false)} />
      )}

      {upgradeCluster && (
        <UpgradeClusterModal
          cluster={upgradeCluster}
          catalogItem={getCatalogItem(upgradeCluster)}
          onClose={() => setUpgradeCluster(null)}
        />
      )}
    </>
  )
}
