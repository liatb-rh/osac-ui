/**
 * flow: tenant-administration
 * step: tad_catalog_items
 * route: /admin/catalog-items
 *
 * Tenant admin view — publish, enable/disable, and delete catalog items that
 * tenant users can browse at /catalog-items.
 */
import { useEffect, useState } from 'react'
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  PageSection,
  Switch,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { FullCatalogItem } from '@osac/ui-components'
import { KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { PublishCatalogItemWizard } from '../../components/catalog'
import { catalogItemsStore } from '../workloads/catalogItemsStore'

// Templates available to this tenant (in real life, derived from provider group assignments)
const AVAILABLE_TEMPLATES = [
  'vm-rhel9',
  'vm-rhel9-gpu',
  'vm-ubuntu22',
  'ocp-4.17',
  'ocp-4.17-edge',
  'bm-standard',
]

const TYPE_COLOR = {
  vm: 'blue',
  cluster: 'green',
  baremetal: 'orange',
} as const

export function AdminCatalogItemsPage() {
  const [items, setItems] = useState<FullCatalogItem[]>(() => catalogItemsStore.getAll())
  const [wizardOpen, setWizardOpen] = useState(false)

  useEffect(() => {
    return catalogItemsStore.subscribe(() => {
      setItems(catalogItemsStore.getAll())
    })
  }, [])

  const published = items.filter((i) => i.published).length
  const draft = items.length - published

  function handleToggle(id: string, checked: boolean) {
    catalogItemsStore.toggle(id, checked)
  }

  function handleDelete(id: string) {
    catalogItemsStore.remove(id)
  }

  function handleWizardDone(item?: FullCatalogItem) {
    if (item) catalogItemsStore.add(item)
    setWizardOpen(false)
  }

  const columns: ObjectsTableColumn<FullCatalogItem>[] = [
    {
      label: 'Title',
      render: (i) => <strong>{i.title}</strong>,
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
          <Label color="green" isCompact>
            Published
          </Label>
        ) : (
          <Label color="orange" isCompact>
            Draft
          </Label>
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
        description="Publish catalog items from available templates. Tenant users browse the published catalog at /catalog-items."
        actions={
          <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setWizardOpen(true)}>
            Publish catalog item
          </Button>
        }
      />

      <KpiHeader
        items={[
          { label: 'Total items', value: String(items.length) },
          { label: 'Published', value: String(published), tone: 'success' },
          { label: 'Draft', value: String(draft) },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <ObjectsTable
          ariaLabel="Catalog items"
          rows={items}
          getRowKey={(i) => i.id}
          columns={columns}
        />
      </div>

      <Modal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        variant="large"
        aria-label="Publish catalog item"
      >
        <ModalHeader
          title="Publish catalog item"
          description="Create a tenant-facing offering layered on top of a backing template."
        />
        <ModalBody style={{ minHeight: 520 }}>
          <PublishCatalogItemWizard
            availableTemplates={AVAILABLE_TEMPLATES}
            onDone={handleWizardDone}
          />
        </ModalBody>
      </Modal>
    </PageSection>
  )
}
