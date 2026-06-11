import {
  Bullseye,
  Content,
  Gallery,
  GalleryItem,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import type { ClusterTemplate } from '@osac/api-contracts'
import type { FullCatalogItem } from './catalogitem/CatalogItem'
import { FullCatalogItemCard } from './catalogitem/CatalogItemCard'
import styles from './TemplatesGallery.module.css'

// ---------------------------------------------------------------------------
// Adapter — maps ClusterTemplate (backend shape) to FullCatalogItem (card shape)
// ---------------------------------------------------------------------------

function templateToItem(t: ClusterTemplate): FullCatalogItem {
  return {
    id: t.id,
    metadata: { name: t.metadata.name },
    title: t.title,
    description: t.description,
    icon: t.icon,
    type: 'vm',
    workloadProfile: t.workloadProfile,
    tags: t.tags,
    published: true,
    templateRef: t.id,
    fixedDefaults: {
      cpu: t.defaultCores,
      memoryGib: t.defaultMemoryGib,
      bootDiskSizeGib: t.defaultBootDiskSizeGib,
    },
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface TemplatesGalleryProps {
  templates: ClusterTemplate[]
  isLoading: boolean
  /** Called when a card is clicked (open detail panel or select in wizard). */
  onSelectTemplate: (template: ClusterTemplate) => void
  /** Controlled search value. */
  search: string
  onSearchChange: (value: string) => void
  /** When set, the matching card is highlighted as selected. */
  selectedTemplateId?: string
  /** When provided, renders a "Provision from template" button on each card. */
  onProvision?: (template: ClusterTemplate) => void
}

export function TemplatesGallery({
  templates,
  isLoading,
  onSelectTemplate,
  search,
  onSearchChange,
  selectedTemplateId,
}: TemplatesGalleryProps) {
  return (
    <Stack hasGutter>
      <StackItem>
        <SearchInput
          className="osac-template-catalog-search"
          placeholder="Search templates"
          value={search}
          onChange={(_e, value) => onSearchChange(value)}
          onClear={() => onSearchChange('')}
          aria-label="Filter catalog by keyword"
        />
      </StackItem>

      <StackItem>
        <Content component="small" className="osac-template-catalog-count">
          {isLoading ? '…' : templates.length} templates
        </Content>
      </StackItem>

      <StackItem>
        {isLoading ? (
          <Bullseye className={styles.spinnerWrap}>
            <Spinner aria-label="Loading templates" />
          </Bullseye>
        ) : templates.length === 0 ? (
          <Content component="p" className="osac-template-empty-state">
            No templates match your current filters and search.
          </Content>
        ) : (
          <Gallery hasGutter className="osac-template-gallery">
            {templates.map((template) => (
              <GalleryItem key={template.id}>
                <FullCatalogItemCard
                  item={templateToItem(template)}
                  isSelected={template.id === selectedTemplateId}
                  onClick={() => onSelectTemplate(template)}
                />
              </GalleryItem>
            ))}
          </Gallery>
        )}
      </StackItem>
    </Stack>
  )
}
