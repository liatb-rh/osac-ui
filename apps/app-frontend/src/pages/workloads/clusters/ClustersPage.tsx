/**
 * flow: cluster-service-catalog
 * step: csc_clusters_list
 * route: /clusters
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Alert,
  Bullseye,
  Button,
  Content,
  Divider,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  PageSection,
  SearchInput,
  Spinner,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { Cluster } from '@osac/api-contracts'
import { useClustersList } from '../../../hooks/useClustersList'
import { useClusterCatalogItems } from '../../../hooks/useClusterCatalogItems'
import { ClusterStatusLabel } from '../../../components/clusters/ClusterStatusLabel'
import { CreateClusterModal } from '../../../components/clusters/CreateClusterModal'
import { UpgradeClusterModal } from '../../../components/clusters/UpgradeClusterModal'
import { ClusterActionsMenu } from '../../../components/clusters/ClusterActionsMenu'
import { useDeleteCluster } from '../../../hooks/useDeleteCluster'
import { PageHeader } from '../../../components/layout'
import { OcLink, OcTable } from '@osac/ui-components'
import type { OcTableColumn } from '@osac/ui-components'

type StateFilter = 'all' | 'CLUSTER_STATE_READY' | 'CLUSTER_STATE_PROGRESSING' | 'CLUSTER_STATE_UPGRADING' | 'CLUSTER_STATE_FAILED'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const filterToolbarCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const searchInputCss = css`
  min-width: 220px;
`

const stateFilterCss = css`
  min-width: 180px;
`

const errorAlertCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const loadingBullseyeCss = css`
  padding: var(--pf-t--global--spacer--2xl);
`

const emptyMessageCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const pageDividerCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const apiUrlMonoCss = css`
  font-family: monospace;
  font-size: 0.85em;
`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClustersPage() {
  const navigate = useNavigate()
  const { data: clusters, isLoading, error, refetch } = useClustersList()
  const { data: catalogItems } = useClusterCatalogItems()
  const { mutateAsync: deleteCluster } = useDeleteCluster()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [upgradeCluster, setUpgradeCluster] = useState<Cluster | null>(null)
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

  const columns: OcTableColumn<Cluster>[] = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (cluster) => (
        <OcLink onClick={() => navigate(`/clusters/${cluster.id}`)}>
          {cluster.metadata.name}
        </OcLink>
      ),
    },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (cluster) => <ClusterStatusLabel state={cluster.status.state} />,
    },
    {
      label: 'OCP Version',
      dataLabel: 'OCP Version',
      render: (cluster) => cluster.status.version ?? '—',
    },
    {
      label: 'Workers',
      dataLabel: 'Workers',
      render: (cluster) => {
        const n = getWorkerCount(cluster)
        return n ? `${n} workers` : '—'
      },
    },
    {
      label: 'API URL',
      dataLabel: 'API URL',
      render: (cluster) =>
        cluster.status.apiUrl ? (
          <span className={apiUrlMonoCss}>{cluster.status.apiUrl}</span>
        ) : '—',
    },
    {
      label: 'Created',
      dataLabel: 'Created',
      render: (cluster) =>
        cluster.metadata.createdAt
          ? new Date(cluster.metadata.createdAt).toLocaleDateString()
          : '—',
    },
    {
      screenReaderText: 'Actions',
      isActionCell: true,
      render: (cluster) => {
        const catalogItem = getCatalogItem(cluster)
        const isProvisioning = cluster.status.state === 'CLUSTER_STATE_PROGRESSING'
        const canUpgrade =
          cluster.status.state === 'CLUSTER_STATE_READY' &&
          (catalogItem?.allowedVersions ?? []).some((v) => v > (cluster.status.version ?? ''))
        return (
          <ClusterActionsMenu
            cluster={cluster}
            canUpgrade={canUpgrade}
            canDelete={!isProvisioning}
            onViewDetails={() => navigate(`/clusters/${cluster.id}`)}
            onUpgrade={() => setUpgradeCluster(cluster)}
            onDelete={() => handleDelete(cluster)}
          />
        )
      },
    },
  ]

  const mainContent = (
    <PageSection isFilled>
      <PageHeader
        title="Clusters"
        description="OpenShift clusters provisioned for your organization."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setShowCreateModal(true)}>
            Create cluster
          </Button>
        }
      />

      <Flex
        justifyContent={{ default: 'justifyContentFlexStart' }}
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: 'wrap' }}
        gap={{ default: 'gapSm' }}
        className={filterToolbarCss}
      >
        <FlexItem>
          <SearchInput
            placeholder="Search clusters by name…"
            value={search}
            onChange={(_e, v) => setSearch(v)}
            onClear={() => setSearch('')}
            className={searchInputCss}
          />
        </FlexItem>
        <FlexItem>
          <FormSelect
            id="cluster-filter-state"
            value={stateFilter}
            onChange={(_e, v) => setStateFilter(v as StateFilter)}
            aria-label="Filter clusters by status"
            className={stateFilterCss}
          >
            <FormSelectOption value="all" label="All statuses" />
            <FormSelectOption value="CLUSTER_STATE_READY" label="Ready" />
            <FormSelectOption value="CLUSTER_STATE_PROGRESSING" label="Provisioning" />
            <FormSelectOption value="CLUSTER_STATE_UPGRADING" label="Upgrading" />
            <FormSelectOption value="CLUSTER_STATE_FAILED" label="Failed" />
          </FormSelect>
        </FlexItem>
      </Flex>

      {error && (
        <Alert
          variant="danger"
          title="Failed to load clusters"
          isInline
          className={errorAlertCss}
        >
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {isLoading ? (
        <Bullseye className={loadingBullseyeCss}>
          <Spinner aria-label="Loading clusters" />
        </Bullseye>
      ) : filteredClusters.length === 0 ? (
        <Content component="p" className={emptyMessageCss}>
          {search || stateFilter !== 'all'
            ? 'No clusters match your filters.'
            : 'No clusters yet. Create one to get started.'}
        </Content>
      ) : (
        <OcTable
          ariaLabel="Clusters"
          columns={columns}
          rows={filteredClusters}
          getRowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/clusters/${c.id}`)}
          defaultPageSize={10}
        />
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
