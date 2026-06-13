/**
 * flow: tenant-user-catalog
 * step: tuc_catalog_browse
 * route: /catalog-items
 *
 * Tenant user view — browse published + tenant-enabled catalog items.
 * Clicking a card directly opens the appropriate workload creation wizard.
 */
import { css } from '@emotion/css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  EmptyState,
  EmptyStateBody,
  PageSection,
  SearchInput,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { CatalogItemType, FullCatalogItem, WorkloadProfile } from '@osac/ui-components'
import { FullCatalogItemCard, PageHeader } from '@osac/ui-components'
import type { ComputeInstance } from '@osac/api-contracts'
import { catalogItemsStore } from './catalogItemsStore'
import { LaunchInstanceWizard } from '../../../components/instances/LaunchInstanceWizard'
import { refetchComputeInstancesQueries } from '../../../hooks/hooks'
import { useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const toolbarCss = css`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 0 8px;
  border-bottom: 1px solid var(--pf-t--global--border--color--default);
  margin-bottom: 16px;
`

const filterGroupCss = css`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const filterLabelCss = css`
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--pf-t--global--text--color--subtle);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`

const filterOptionCss = css`
  padding: 3px 10px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.875rem;
  border: 1px solid transparent;
  &:hover {
    background: var(--pf-t--global--background--color--secondary--default);
  }
`

const filterOptionActiveCss = css`
  background: var(--pf-t--global--background--color--secondary--default);
  border-color: var(--pf-t--global--border--color--default);
  font-weight: 600;
`

const gridCss = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

const TYPE_FILTERS: Array<{ label: string; value: CatalogItemType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Virtual Machine', value: 'vm' },
  { label: 'Cluster', value: 'cluster' },
  { label: 'Bare Metal', value: 'baremetal' },
]

const PROFILE_FILTERS: Array<{ label: string; value: WorkloadProfile | 'all' }> = [
  { label: 'All profiles', value: 'all' },
  { label: 'High Performance', value: 'high-performance' },
  { label: 'Machine Learning', value: 'machine-learning' },
  { label: 'Data Processing', value: 'data-processing' },
  { label: 'Analytics', value: 'analytics' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CatalogItemsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [items, setItems] = useState<FullCatalogItem[]>(() => catalogItemsStore.getPublished())

  useEffect(() => {
    const unsub = catalogItemsStore.subscribe(() => {
      setItems(catalogItemsStore.getPublished())
    })
    return () => {
      unsub()
    }
  }, [])

  const [launchWizardOpen, setLaunchWizardOpen] = useState(false)

  function handleProvisioned(vm: ComputeInstance) {
    void refetchComputeInstancesQueries(queryClient)
    // Navigate to VM list so the user can track provisioning progress
    navigate(`/vms`)
    void vm
  }
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CatalogItemType | 'all'>('all')
  const [profileFilter, setProfileFilter] = useState<WorkloadProfile | 'all'>('all')

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (profileFilter !== 'all' && item.workloadProfile !== profileFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [items, typeFilter, profileFilter, search])

  function handleSelect(item: FullCatalogItem) {
    if (item.type === 'cluster') {
      navigate(`/clusters?catalogItem=${item.id}`)
    } else if (item.type === 'baremetal') {
      navigate(`/baremetal?catalogItem=${item.id}`)
    } else {
      navigate(`/vms?catalogItem=${item.id}`)
    }
  }

  return (
    <PageSection isFilled>
      <LaunchInstanceWizard
        isOpen={launchWizardOpen}
        onClose={() => setLaunchWizardOpen(false)}
        onProvisioned={handleProvisioned}
      />

      <PageHeader
        title="Services"
        description="Browse available offerings and provision workloads."
        actions={
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => setLaunchWizardOpen(true)}
          >
            Launch an instance
          </Button>
        }
      />

      {/* Toolbar: search + type + profile filters */}
      <div className={toolbarCss}>
        <SearchInput
          placeholder="Search catalog…"
          value={search}
          onChange={(_, v) => setSearch(v)}
          onClear={() => setSearch('')}
          style={{ maxWidth: 260 }}
        />
        <div className={filterGroupCss}>
          <span className={filterLabelCss}>Type</span>
          {TYPE_FILTERS.map((f) => (
            <div
              key={f.value}
              className={`${filterOptionCss} ${typeFilter === f.value ? filterOptionActiveCss : ''}`}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </div>
          ))}
        </div>
        <div className={filterGroupCss}>
          <span className={filterLabelCss}>Profile</span>
          {PROFILE_FILTERS.map((f) => (
            <div
              key={f.value}
              className={`${filterOptionCss} ${profileFilter === f.value ? filterOptionActiveCss : ''}`}
              onClick={() => setProfileFilter(f.value)}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Catalog grid */}
      {filtered.length === 0 ? (
        <EmptyState>
          <EmptyStateBody>
            No catalog items match your filters. Try adjusting the search or type filter.
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <div className={gridCss}>
          {filtered.map((item) => (
            <FullCatalogItemCard key={item.id} item={item} onClick={handleSelect} />
          ))}
        </div>
      )}
    </PageSection>
  )
}
