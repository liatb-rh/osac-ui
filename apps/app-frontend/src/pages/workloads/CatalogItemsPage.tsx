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
  EmptyState,
  EmptyStateBody,
  PageSection,
  SearchInput,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core'
import type { CatalogItemType, FullCatalogItem, WorkloadProfile } from '@osac/ui-components'
import { FullCatalogItemCard, PageHeader } from '@osac/ui-components'
import { catalogItemsStore } from './catalogItemsStore'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const filterPanelCss = css`
  min-width: 200px;
  max-width: 220px;
  border-right: 1px solid var(--pf-t--global--border--color--default);
  padding: 16px;
`

const gridCss = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
  flex: 1;
`

const filterLabelCss = css`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 8px;
  margin-top: 16px;
  color: var(--pf-t--global--text--color--subtle);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  &:first-child {
    margin-top: 0;
  }
`

const filterOptionCss = css`
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover {
    background: var(--pf-t--global--background--color--secondary--default);
  }
`

const filterOptionActiveCss = css`
  background: var(--pf-t--global--background--color--secondary--default);
  font-weight: 600;
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
  const [items, setItems] = useState<FullCatalogItem[]>(() => catalogItemsStore.getPublished())

  useEffect(() => {
    const unsub = catalogItemsStore.subscribe(() => {
      setItems(catalogItemsStore.getPublished())
    })
    return () => {
      unsub()
    }
  }, [])

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
    <PageSection isFilled padding={{ default: 'noPadding' }}>
      <div style={{ padding: '24px 24px 0' }}>
        <PageHeader
          title="Catalog"
          description="Browse available offerings and provision workloads."
        />
      </div>
      <Sidebar>
        <SidebarPanel className={filterPanelCss}>
          <SearchInput
            placeholder="Search catalog…"
            value={search}
            onChange={(_, v) => setSearch(v)}
            onClear={() => setSearch('')}
          />
          <div className={filterLabelCss}>Type</div>
          {TYPE_FILTERS.map((f) => (
            <div
              key={f.value}
              className={`${filterOptionCss} ${typeFilter === f.value ? filterOptionActiveCss : ''}`}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </div>
          ))}
          <div className={filterLabelCss}>Workload profile</div>
          {PROFILE_FILTERS.map((f) => (
            <div
              key={f.value}
              className={`${filterOptionCss} ${profileFilter === f.value ? filterOptionActiveCss : ''}`}
              onClick={() => setProfileFilter(f.value)}
            >
              {f.label}
            </div>
          ))}
        </SidebarPanel>
        <SidebarContent>
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
        </SidebarContent>
      </Sidebar>
    </PageSection>
  )
}
