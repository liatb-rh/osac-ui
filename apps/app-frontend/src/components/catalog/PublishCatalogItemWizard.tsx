import { css } from '@emotion/css'
import React, { useState } from 'react'
import {
  Alert,
  Card,
  CardBody,
  Form,
  FormGroup,
  Label,
  MenuToggle,
  NumberInput,
  Select,
  SelectList,
  SelectOption,
  Switch,
  TextArea,
  TextInput,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import type { CatalogItemType, FullCatalogItem } from '@osac/ui-components'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const summaryCardCss = css`
  margin-top: 12px;
`

const summaryCardBodyCss = css`
  display: grid;
  gap: 6px;
`

const TYPE_OPTIONS: { value: CatalogItemType; label: string }[] = [
  { value: 'vm', label: 'Virtual Machine' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'baremetal', label: 'Bare Metal' },
]

export interface PublishCatalogItemWizardProps {
  /** Available backing template names assigned to this tenant's groups. */
  availableTemplates: string[]
  onDone: (item?: FullCatalogItem) => void
}

export function PublishCatalogItemWizard({
  availableTemplates,
  onDone,
}: PublishCatalogItemWizardProps) {
  // Step 1 — Identity
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [variant, setVariant] = useState('')
  const [type, setType] = useState<CatalogItemType>('vm')
  const [typeOpen, setTypeOpen] = useState(false)

  // Step 2 — Template
  const [template, setTemplate] = useState(availableTemplates[0] ?? '')
  const [tOpen, setTOpen] = useState(false)

  // Step 3 — Fixed Defaults
  const [cpu, setCpu] = useState(2)
  const [ram, setRam] = useState(4)
  const [disk, setDisk] = useState(40)
  const [allowResize, setAllowResize] = useState(false)

  // Step 4 — Dynamic Parameters
  const [paramSchemaRaw, setParamSchemaRaw] = useState('')
  const [schemaError, setSchemaError] = useState<string | null>(null)

  function validateSchema(raw: string) {
    if (!raw.trim()) {
      setSchemaError(null)
      return
    }
    try {
      JSON.parse(raw)
      setSchemaError(null)
    } catch {
      setSchemaError('Invalid JSON. Please enter a valid JSON Schema object.')
    }
  }

  // Step 5 — Publish
  const [publish, setPublish] = useState(true)

  function handleSave() {
    const item: FullCatalogItem = {
      id: `ci-${Date.now()}`,
      metadata: { name: title.toLowerCase().replace(/\s+/g, '-') },
      title: variant ? `${title} — ${variant}` : title,
      description: desc || undefined,
      type,
      published: publish,
      tenantEnabled: publish,
      templateRef: template,
      fixedDefaults: { cpu, memoryGib: ram, bootDiskSizeGib: disk, allowUserResize: allowResize },
      paramSchema: paramSchemaRaw.trim() ? (JSON.parse(paramSchemaRaw) as object) : undefined,
    }
    onDone(item)
  }

  return (
    <Wizard onClose={() => onDone()} onSave={handleSave} height={520}>
      {/* Step 1 — Identity */}
      <WizardStep name="Identity" id="ci-id">
        <Form>
          <FormGroup label="Catalog item name" isRequired fieldId="ci-name">
            <TextInput
              id="ci-name"
              value={title}
              onChange={(_, v) => setTitle(v)}
              placeholder="e.g. RHEL 9"
            />
          </FormGroup>
          <FormGroup label="Description" fieldId="ci-desc">
            <TextArea id="ci-desc" value={desc} onChange={(_, v) => setDesc(v)} rows={3} />
          </FormGroup>
          <FormGroup label="Variant label" fieldId="ci-variant">
            <TextInput
              id="ci-variant"
              value={variant}
              onChange={(_, v) => setVariant(v)}
              placeholder="e.g. Small, Medium, GPU"
            />
          </FormGroup>
          <FormGroup label="Type" fieldId="ci-type" isRequired>
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
                    {o.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        </Form>
      </WizardStep>

      {/* Step 2 — Template */}
      <WizardStep name="Template" id="ci-tpl">
        <Form>
          <FormGroup label="Backing template" fieldId="ci-tpl-select" isRequired>
            <Select
              isOpen={tOpen}
              onOpenChange={setTOpen}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setTOpen((v) => !v)}>
                  {template || 'Select a template'}
                </MenuToggle>
              )}
              selected={template}
              onSelect={(_, v) => {
                setTemplate(String(v))
                setTOpen(false)
              }}
            >
              <SelectList>
                {availableTemplates.map((o) => (
                  <SelectOption key={o} value={o}>
                    {o}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
          <Alert
            variant="info"
            isInline
            isPlain
            title="Only templates assigned to your tenant's groups are shown. Contact the provider admin to add more."
          />
        </Form>
      </WizardStep>

      {/* Step 3 — Fixed Defaults */}
      <WizardStep name="Fixed Defaults" id="ci-pre">
        <Form>
          <FormGroup label="Preset vCPU" fieldId="ci-cpu">
            <NumberInput
              value={cpu}
              min={1}
              max={128}
              onMinus={() => setCpu((n) => Math.max(1, n - 1))}
              onPlus={() => setCpu((n) => clamp(n + 1, 1, 128))}
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setCpu(clamp(Number(e.currentTarget.value) || 1, 1, 128))
              }
            />
          </FormGroup>
          <FormGroup label="Preset RAM (GiB)" fieldId="ci-ram">
            <NumberInput
              value={ram}
              min={1}
              max={512}
              onMinus={() => setRam((n) => Math.max(1, n - 1))}
              onPlus={() => setRam((n) => clamp(n + 2, 1, 512))}
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setRam(clamp(Number(e.currentTarget.value) || 1, 1, 512))
              }
            />
          </FormGroup>
          <FormGroup label="Boot disk size (GiB)" fieldId="ci-disk">
            <NumberInput
              value={disk}
              min={10}
              max={2048}
              onMinus={() => setDisk((n) => Math.max(10, n - 10))}
              onPlus={() => setDisk((n) => clamp(n + 10, 10, 2048))}
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setDisk(clamp(Number(e.currentTarget.value) || 10, 10, 2048))
              }
            />
          </FormGroup>
          <FormGroup fieldId="ci-resize">
            <Switch
              id="ci-resize"
              label="Allow tenants to override CPU / RAM at order time"
              isChecked={allowResize}
              onChange={(_, v) => setAllowResize(v)}
            />
          </FormGroup>
        </Form>
      </WizardStep>

      {/* Step 4 — Dynamic Parameters */}
      <WizardStep name="Dynamic Parameters" id="ci-dyn">
        <Form>
          <FormGroup
            label="Parameter schema (JSON Schema draft-07)"
            fieldId="ci-schema"
            labelHelp={
              <span style={{ fontSize: '0.8125rem' }}>
                Optional. Leave blank if no user-configurable parameters are needed.
              </span>
            }
          >
            <TextArea
              id="ci-schema"
              value={paramSchemaRaw}
              onChange={(_, v) => {
                setParamSchemaRaw(v)
                validateSchema(v)
              }}
              rows={10}
              placeholder={'{\n  "properties": {\n    "region": { "type": "string" }\n  }\n}'}
              resizeOrientation="vertical"
              validated={schemaError ? 'error' : 'default'}
            />
          </FormGroup>
          {schemaError && <Alert variant="danger" isInline isPlain title={schemaError} />}
          {!paramSchemaRaw.trim() && (
            <Alert
              variant="info"
              isInline
              isPlain
              title="No dynamic parameters — users will see only the fixed defaults defined in the previous step."
            />
          )}
        </Form>
      </WizardStep>

      {/* Step 5 — Publish */}
      <WizardStep
        name="Publish"
        id="ci-pub"
        footer={{ nextButtonText: publish ? 'Publish' : 'Save draft' }}
      >
        <Form>
          <FormGroup fieldId="ci-pub-toggle">
            <Switch
              id="ci-pub-toggle"
              label="Publish to tenant catalog immediately"
              isChecked={publish}
              onChange={(_, v) => setPublish(v)}
            />
          </FormGroup>
        </Form>
        <Card className={summaryCardCss}>
          <CardBody className={summaryCardBodyCss}>
            <div>
              <strong>Name:</strong> {title}
              {variant ? ` — ${variant}` : ''}{' '}
              <Label color="blue" isCompact>
                {type}
              </Label>
            </div>
            <div>
              <strong>Template:</strong> <code>{template}</code>
            </div>
            <div>
              <strong>Preset:</strong> {cpu} vCPU · {ram} GiB RAM · {disk} GiB disk
              {allowResize ? ' · resize allowed' : ''}
            </div>
            {paramSchemaRaw.trim() && (
              <div>
                <strong>Dynamic parameters:</strong> JSON schema provided
              </div>
            )}
          </CardBody>
        </Card>
      </WizardStep>
    </Wizard>
  )
}
