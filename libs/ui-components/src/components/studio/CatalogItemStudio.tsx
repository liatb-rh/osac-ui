import { useState } from 'react'
import {
  ActionGroup,
  Button,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Label,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Switch,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import type {
  CatalogItemType,
  FieldDefinition,
  FullCatalogItem,
  StudioTemplate,
} from '../catalogitem/CatalogItem'
import { CatalogFormPreview } from './CatalogFormPreview'
import { FieldDefinitionBuilder } from './FieldDefinitionBuilder'

export interface CatalogItemStudioProps {
  /** undefined = create mode; defined = edit mode pre-populates all fields */
  item?: FullCatalogItem
  availableTemplates: StudioTemplate[]
  onSave: (item: FullCatalogItem) => void
  onDiscard: () => void
}

const TYPE_OPTIONS: { value: CatalogItemType; label: string }[] = [
  { value: 'vm', label: 'Virtual Machine' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'baremetal', label: 'Bare Metal' },
]

const TYPE_COLOR: Record<CatalogItemType, 'blue' | 'green' | 'orange'> = {
  vm: 'blue',
  cluster: 'green',
  baremetal: 'orange',
}

function TemplatePicker({
  templates,
  selected,
  onSelect,
}: {
  templates: StudioTemplate[]
  selected: string
  onSelect: (id: string) => void
}) {
  if (templates.length === 0) {
    return (
      <p style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
        No templates available. Contact the provider admin to assign templates to your tenant.
      </p>
    )
  }

  return (
    <Grid hasGutter sm={12} md={6} lg={4}>
      {templates.map((tpl) => (
        <GridItem key={tpl.id}>
          <Card
            isClickable
            isSelected={selected === tpl.id}
            onClick={() => onSelect(tpl.id)}
            style={{ cursor: 'pointer', height: '100%' }}
          >
            <CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Label color={TYPE_COLOR[tpl.type]} isCompact>
                  {tpl.type}
                </Label>
                <span>{tpl.name}</span>
              </div>
            </CardTitle>
            {tpl.description && (
              <CardBody>
                <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.875rem' }}>
                  {tpl.description}
                </span>
              </CardBody>
            )}
          </Card>
        </GridItem>
      ))}
    </Grid>
  )
}

export function CatalogItemStudio({
  item,
  availableTemplates,
  onSave,
  onDiscard,
}: CatalogItemStudioProps) {
  const isEdit = item !== undefined

  // Section 1 — Identity
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [type, setType] = useState<CatalogItemType>(item?.type ?? 'vm')
  const [typeOpen, setTypeOpen] = useState(false)

  // Section 2 — Base Template
  const defaultTemplate =
    item?.templateRef
      ? (availableTemplates.find((t) => t.name === item.templateRef)?.id ?? availableTemplates[0]?.id ?? '')
      : (availableTemplates[0]?.id ?? '')
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate)

  // Section 3 — Field Definitions
  const [fields, setFields] = useState<FieldDefinition[]>(item?.fieldDefinitions ?? [])

  // Section 4 — Publish
  const [published, setPublished] = useState(item?.published ?? false)

  const selectedTemplate = availableTemplates.find((t) => t.id === selectedTemplateId)

  function handleSave() {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const saved: FullCatalogItem = {
      id: item?.id ?? `ci-${Date.now()}`,
      metadata: { name: item?.metadata.name ?? slug },
      title: title.trim() || 'Untitled',
      description: description.trim() || undefined,
      type,
      published,
      tenantEnabled: published,
      templateRef: selectedTemplate?.name ?? selectedTemplateId,
      fixedDefaults: item?.fixedDefaults ?? {},
      fieldDefinitions: fields,
    }
    onSave(saved)
  }

  const isValid = title.trim().length > 0 && selectedTemplateId.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable canvas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        <Title headingLevel="h2" size="xl" style={{ marginBottom: 24 }}>
          {isEdit ? `Edit: ${item.title}` : 'New Catalog Item'}
        </Title>

        {/* Section 1 — Identity */}
        <Card style={{ marginBottom: 16 }}>
          <CardTitle>
            <Title headingLevel="h3" size="md">1. Identity</Title>
          </CardTitle>
          <CardBody>
            <Form>
              <FormSection>
                <FormGroup label="Name" isRequired fieldId="studio-title">
                  <TextInput
                    id="studio-title"
                    value={title}
                    onChange={(_, v) => setTitle(v)}
                    placeholder="e.g. RHEL 9 — GPU Large"
                    isRequired
                  />
                </FormGroup>
                <FormGroup label="Description" fieldId="studio-desc">
                  <TextArea
                    id="studio-desc"
                    value={description}
                    onChange={(_, v) => setDescription(v)}
                    rows={3}
                    placeholder="Describe what this catalog item is for…"
                    resizeOrientation="vertical"
                  />
                </FormGroup>
                <FormGroup label="Type" isRequired fieldId="studio-type">
                  <Select
                    isOpen={typeOpen}
                    onOpenChange={setTypeOpen}
                    toggle={(ref) => (
                      <MenuToggle ref={ref} onClick={() => setTypeOpen((v) => !v)}>
                        {TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}
                      </MenuToggle>
                    )}
                    selected={type}
                    onSelect={(_, v) => {
                      setType(v as CatalogItemType)
                      setTypeOpen(false)
                    }}
                  >
                    <SelectList>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectOption key={o.value} value={o.value}>
                          <Label color={TYPE_COLOR[o.value]} isCompact style={{ marginRight: 8 }}>
                            {o.value}
                          </Label>
                          {o.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FormGroup>
              </FormSection>
            </Form>
          </CardBody>
        </Card>

        {/* Section 2 — Base Template */}
        <Card style={{ marginBottom: 16 }}>
          <CardTitle>
            <Title headingLevel="h3" size="md">2. Base Template</Title>
          </CardTitle>
          <CardBody>
            <TemplatePicker
              templates={availableTemplates}
              selected={selectedTemplateId}
              onSelect={setSelectedTemplateId}
            />
          </CardBody>
        </Card>

        {/* Section 3 — Field Definitions */}
        <Card style={{ marginBottom: 16 }}>
          <CardTitle>
            <Title headingLevel="h3" size="md">3. Field Definitions</Title>
          </CardTitle>
          <CardBody>
            <p style={{ color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 16, fontSize: '0.875rem' }}>
              Define the parameters tenant users can configure when provisioning this catalog item.
              Locked fields (editable = off) are shown read-only with their default value applied automatically.
            </p>
            <FieldDefinitionBuilder fields={fields} onChange={setFields} />
          </CardBody>
        </Card>

        {/* Section 4 — Live Preview */}
        <Card style={{ marginBottom: 16 }}>
          <CardTitle>
            <Title headingLevel="h3" size="md">4. Live Preview</Title>
          </CardTitle>
          <CardBody>
            <p style={{ color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 16, fontSize: '0.875rem' }}>
              This is how the field definitions will appear to tenant users at provision time.
            </p>
            <CatalogFormPreview fields={fields} />
          </CardBody>
        </Card>
      </div>

      {/* Sticky footer */}
      <div
        style={{
          borderTop: '1px solid var(--pf-t--global--border--color--default)',
          padding: '16px 0',
          background: 'var(--pf-t--global--background--color--primary--default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Switch
            id="studio-publish"
            label="Publish immediately"
            isChecked={published}
            onChange={(_, v) => setPublished(v)}
          />
          <ActionGroup style={{ margin: 0, marginLeft: 'auto' }}>
            <Button variant="primary" onClick={handleSave} isDisabled={!isValid}>
              {published ? 'Publish' : 'Save draft'}
            </Button>
            <Button variant="link" onClick={onDiscard}>
              Discard
            </Button>
          </ActionGroup>
        </div>
      </div>
    </div>
  )
}
