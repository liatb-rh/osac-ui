/**
 * flow: tenant-administration
 * step: tad_catalog_item_detail
 * route: /admin/catalog-items/new        — create mode
 *        /admin/catalog-items/:id        — edit mode
 */
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  PageBreadcrumb,
  PageSection,
} from '@patternfly/react-core'
import type { FullCatalogItem, StudioTemplate } from '@osac/ui-components'
import { CatalogItemStudio } from '@osac/ui-components'
import { catalogItemsStore } from '../../../services/catalog/catalogItemsStore'
import { INITIAL_TEMPLATES } from '../templates/templatesStore'

const AVAILABLE_TEMPLATES: StudioTemplate[] = INITIAL_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  type: t.type,
  description: t.description,
}))

export function AdminCatalogItemDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isNew = !id || id === 'new'
  const item = isNew ? undefined : catalogItemsStore.getAll().find((i) => i.id === id)

  function handleSave(saved: FullCatalogItem) {
    if (isNew) {
      catalogItemsStore.add(saved)
    } else {
      catalogItemsStore.update(saved)
    }
    navigate('/resources/network/catalog/admin-catalog-items')
  }

  function handleDiscard() {
    navigate('/resources/network/catalog/admin-catalog-items')
  }

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem
            to="/resources/network/catalog/admin-catalog-items"
            onClick={(e) => { e.preventDefault(); navigate('/resources/network/catalog/admin-catalog-items') }}
          >
            Catalog Items
          </BreadcrumbItem>
          <BreadcrumbItem isActive>
            {isNew ? 'New catalog item' : (item?.title ?? id)}
          </BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection isFilled style={{ display: 'flex', flexDirection: 'column' }}>
        <CatalogItemStudio
          item={item}
          availableTemplates={AVAILABLE_TEMPLATES}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      </PageSection>
    </>
  )
}
