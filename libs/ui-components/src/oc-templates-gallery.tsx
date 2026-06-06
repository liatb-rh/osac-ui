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
import { css } from '@emotion/css'
import type { ClusterTemplate } from '@osac/api-contracts'
import { OcTemplateCard } from './cards/oc-template-card'

const spinnerWrapCss = css`
  padding: var(--pf-t--global--spacer--2xl);
`

export interface OcTemplatesGalleryProps {
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

export function OcTemplatesGallery({
  templates,
  isLoading,
  onProvision,
  onSelectTemplate,
  search,
  onSearchChange,
  selectedTemplateId,
}: OcTemplatesGalleryProps) {
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
          <Bullseye className={spinnerWrapCss}>
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
                <div
                  className="tenant-vm-catalog-template-card-wrap"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open template details for ${template.title}`}
                  onClick={() => onSelectTemplate(template)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectTemplate(template)
                    }
                  }}
                >
                  <OcTemplateCard
                    template={template}
                    isSelected={selectedTemplateId !== undefined ? selectedTemplateId === template.id : undefined}
                    onProvision={onProvision}
                  />
                </div>
              </GalleryItem>
            ))}
          </Gallery>
        )}
      </StackItem>
    </Stack>
  )
}
