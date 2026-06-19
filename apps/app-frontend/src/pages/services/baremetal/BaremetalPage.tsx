/**
 * flow: tenant-workloads
 * step: bm_list
 * route: /baremetal
 *
 * Tenant (user + admin) — bare metal instance list + Request wizard.
 */
import { css } from '@emotion/css'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Label, SearchInput, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { BARE_METAL_INSTANCES, BM_IMAGES } from '@osac/api-contracts'
import type { BareMetalInstance } from '@osac/api-contracts'
import {
  CustomTableLink,
  ObjectsTable,
  PageLayout,
  RequestBareMetalWizard,
} from '@osac/ui-components'
import type {
  BareMetalWizardCatalogItem,
  BareMetalWizardCreatePayload,
  ObjectsTableColumn,
} from '@osac/ui-components'
import { catalogItemsStore } from '../catalog/catalogItemsStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type InstanceFilter = 'all' | 'running' | 'inprogress'

/** Aligned to fulfillment proto BareMetalInstanceState enum */
function BmStateLabel({ state }: { state: string }) {
  const s = state.replace('BARE_METAL_INSTANCE_STATE_', '')
  if (s === 'RUNNING' || s === 'active')
    return (
      <Label color="green" isCompact>
        Running
      </Label>
    )
  if (s === 'PROVISIONING' || s === 'installing' || s === 'configuring' || s === 'queued')
    return (
      <Label color="blue" isCompact>
        Provisioning
      </Label>
    )
  if (s === 'FAILED' || s === 'failed')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  if (s === 'DELETING' || s === 'releasing')
    return (
      <Label color="orange" isCompact>
        Deleting
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      {s}
    </Label>
  )
}

function formatAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const filterBarCss = css`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`

// Map BM_IMAGES to the wizard format
const BM_IMAGES_FOR_WIZARD = BM_IMAGES.map((img) => ({ id: img.id, name: img.name }))

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BaremetalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [instances, setInstances] = useState<BareMetalInstance[]>(BARE_METAL_INSTANCES)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InstanceFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const catalogItemIdFromUrl = searchParams.get('catalogItem')
  const [wizardCatalogItem, setWizardCatalogItem] = useState<string>(catalogItemIdFromUrl ?? '')

  // Catalog items for the wizard (baremetal only, published)
  const catalogItems: BareMetalWizardCatalogItem[] = catalogItemsStore
    .getPublished()
    .filter((i) => i.type === 'baremetal')
    .map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      published: i.published,
      fieldDefinitions: i.fieldDefinitions,
    }))

  useEffect(() => {
    if (catalogItemIdFromUrl) {
      setWizardCatalogItem(catalogItemIdFromUrl)
      setWizardOpen(true)
    }
  }, [catalogItemIdFromUrl])

  const filtered = instances.filter((i) => {
    const s = i.provisioningState
    if (filter === 'running' && s !== 'active') return false
    if (
      filter === 'inprogress' &&
      !['installing', 'configuring', 'queued', 'BARE_METAL_INSTANCE_STATE_PROVISIONING'].includes(s)
    )
      return false
    if (search.trim() && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleWizardSubmit(payload: BareMetalWizardCreatePayload) {
    setIsSubmitting(true)
    // Mock: simulate async provisioning, then add to list
    setTimeout(() => {
      const newInstance: BareMetalInstance = {
        id: `bmi-${Date.now()}`,
        name: payload.metadata.name,
        tenant: 'northstar',
        hostRef: 'bh-004',
        flavor: payload.spec.catalogItem,
        image: payload.spec.image ?? BM_IMAGES[0].id,
        vnet: payload.spec.vnet ?? 'prod-network',
        subnet: payload.spec.subnet ?? 'prod-subnet-a',
        vlan: 100,
        bootMode: 'uefi',
        secureBoot: false,
        ipmiUrl: 'https://10.0.200.22/redfish/v1',
        ip: '10.10.1.99',
        provisioningState:
          'BARE_METAL_INSTANCE_STATE_PROVISIONING' as BareMetalInstance['provisioningState'],
        createdAt: new Date().toISOString(),
        createdBy: 'current-user@example.com',
      }
      setInstances((prev) => [newInstance, ...prev])
      setIsSubmitting(false)
      setWizardOpen(false)
    }, 800)
  }

  // Catalog item lookup for display in the table
  const catalogItemMap = new Map(catalogItems.map((c) => [c.id, c.title]))

  const columns: ObjectsTableColumn<BareMetalInstance>[] = [
    {
      label: 'Name',
      render: (i) => (
        <CustomTableLink onClick={() => navigate(`/baremetal/${i.id}`)}>{i.name}</CustomTableLink>
      ),
    },
    {
      label: 'Status',
      render: (i) => <BmStateLabel state={i.provisioningState} />,
    },
    {
      label: 'Catalog Item',
      render: (i) => <span>{catalogItemMap.get(i.flavor) ?? <code>{i.flavor}</code>}</span>,
    },
    {
      label: 'Image',
      render: (i) => {
        const img = BM_IMAGES.find((m) => m.id === i.image)
        return img?.name ?? i.image
      },
    },
    {
      label: 'Network',
      render: (i) => `${i.vnet} / ${i.subnet}`,
    },
    {
      label: 'IP',
      render: (i) => <code>{i.ip}</code>,
    },
    {
      label: 'Age',
      render: (i) => <span title={i.createdAt}>{formatAge(i.createdAt)}</span>,
    },
    {
      isActionCell: true,
      render: (i) => (
        <ActionsColumn
          items={[
            {
              title: i.provisioningState === 'active' ? 'Power off' : 'Power on',
              onClick: () => {},
            },
            { title: 'Reboot', onClick: () => {} },
            { title: 'Launch BMC console', onClick: () => window.open(i.ipmiUrl, '_blank') },
            { isSeparator: true },
            {
              title: 'Release host',
              onClick: () => setInstances((prev) => prev.filter((item) => item.id !== i.id)),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageLayout
      title="Bare Metal Instances"
      description="Request and manage bare metal instances provisioned from the catalog."
      actions={
        <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
          Request bare metal
        </Button>
      }
    >
      <div className={filterBarCss} style={{ marginTop: 16 }}>
        <SearchInput
          placeholder="Search by name…"
          value={search}
          onChange={(_, v) => setSearch(v)}
          onClear={() => setSearch('')}
          style={{ maxWidth: 300 }}
        />
        <ToggleGroup aria-label="Filter instances">
          {(['all', 'running', 'inprogress'] as InstanceFilter[]).map((f) => (
            <ToggleGroupItem
              key={f}
              text={f === 'all' ? 'All' : f === 'running' ? 'Running' : 'Provisioning'}
              isSelected={filter === f}
              onChange={() => setFilter(f)}
            />
          ))}
        </ToggleGroup>
      </div>

      <ObjectsTable
        ariaLabel="Bare metal instances"
        rows={filtered}
        getRowKey={(i) => i.id}
        columns={columns}
        onRowClick={(i) => navigate(`/baremetal/${i.id}`)}
        defaultPageSize={10}
      />

      <RequestBareMetalWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        isSubmitting={isSubmitting}
        catalogItems={catalogItems}
        availableImages={BM_IMAGES_FOR_WIZARD}
        initialCatalogItemId={wizardCatalogItem}
      />
    </PageLayout>
  )
}
