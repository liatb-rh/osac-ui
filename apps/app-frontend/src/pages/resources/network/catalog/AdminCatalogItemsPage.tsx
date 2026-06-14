/**
 * flow: tenant-administration
 * step: tad_catalog_items
 * route: /admin/catalog-items
 *
 * Tenant admin view — list of catalog items.
 * Create / edit navigate to /admin/catalog-items/new and /admin/catalog-items/:id.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Label,
  PageSection,
  Switch,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { PencilAltIcon } from '@patternfly/react-icons/dist/esm/icons/pencil-alt-icon'
import type { FullCatalogItem } from '@osac/ui-components'
import { ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { catalogItemsStore } from '../../../services/catalog/catalogItemsStore'

const TYPE_COLOR = {
  vm: 'blue',
  cluster: 'green',
  baremetal: 'orange',
} as const

export function AdminCatalogItemsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<FullCatalogItem[]>(() => catalogItemsStore.getAll())

  useEffect(() => {
    return catalogItemsStore.subscribe(() => setItems(catalogItemsStore.getAll()))
  }, [])

  function handleToggle(id: string, checked: boolean) {
    catalogItemsStore.toggle(id, checked)
  }

  function handleDelete(id: string) {
    catalogItemsStore.remove(id)
  }

  const columns: ObjectsTableColumn<FullCatalogItem>[] = [
    {
      label: 'Title',
      render: (i) => (
        <button
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          onClick={() => navigate(`/resources/network/catalog/admin-catalog-items/${i.id}`)}
        >
          <strong>{i.title}</strong>
        </button>
      ),
    },
    {
      label: 'Type',
      render: (i) => (
        <Label color={TYPE_COLOR[i.type]} isCompact>
          {i.type}
        </Label>
      ),
    },
    {
      label: 'CPU / RAM',
      render: (i) => {
        const { cpu, memoryGib } = i.fixedDefaults
        if (cpu == null && memoryGib == null) return '—'
        return [cpu != null ? `${cpu} vCPU` : null, memoryGib != null ? `${memoryGib} GiB` : null]
          .filter(Boolean)
          .join(' · ')
      },
    },
    {
      label: 'Status',
      render: (i) =>
        i.published ? (
          <Label color="green" isCompact>Published</Label>
        ) : (
          <Label color="orange" isCompact>Draft</Label>
        ),
    },
    {
      label: 'Enabled',
      render: (i) => (
        <Switch
          id={`toggle-${i.id}`}
          isChecked={!!i.tenantEnabled}
          onChange={(_, v) => handleToggle(i.id, v)}
          aria-label={`Enable ${i.title}`}
        />
      ),
    },
    {
      isActionCell: true,
      render: (i) => (
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () => navigate(`/resources/network/catalog/admin-catalog-items/${i.id}`),
              icon: <PencilAltIcon />,
            },
            {
              title: i.published ? 'Unpublish' : 'Publish',
              onClick: () => handleToggle(i.id, !i.published),
            },
            { isSeparator: true },
            {
              title: 'Delete',
              onClick: () => handleDelete(i.id),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Catalog Items"
        description="Create and publish catalog items for tenant users to provision workloads."
        actions={
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            onClick={() => navigate('/resources/network/catalog/admin-catalog-items/new')}
          >
            New catalog item
          </Button>
        }
      />

      <div style={{ marginTop: 24 }}>
        <ObjectsTable
          ariaLabel="Catalog items"
          rows={items}
          getRowKey={(i) => i.id}
          columns={columns}
          onRowClick={(i) => navigate(`/resources/network/catalog/admin-catalog-items/${i.id}`)}
        />
      </div>
    </PageSection>
  )
}
