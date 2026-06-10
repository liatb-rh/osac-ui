import { css } from '@emotion/css'
import React, { useState } from 'react'
import {
  Alert,
  Card,
  CardBody,
  Form,
  FormGroup,
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

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const EXTRA_TEMPLATES = ['vm-rhel9-gpu', 'vm-ubuntu22', 'vm-win2022', 'ocp-4.17-ai']

const summaryCardCss = css`
  margin-top: 12px;
`

const summaryCardBodyCss = css`
  display: grid;
  gap: 6px;
`

export interface PublishCatalogItemWizardProps {
  /** Available Ansible template names to pick from. */
  backingTemplates: string[]
  onDone: () => void
}

export function PublishCatalogItemWizard({
  backingTemplates,
  onDone,
}: PublishCatalogItemWizardProps) {
  const allTemplates = [...new Set([...backingTemplates, ...EXTRA_TEMPLATES])]

  const [name, setName] = useState('RHEL 9 — Edge')
  const [desc, setDesc] = useState('Compact RHEL 9 profile preset for branch deployments.')
  const [template, setTemplate] = useState(allTemplates[0] ?? '')
  const [tOpen, setTOpen] = useState(false)
  const [variant, setVariant] = useState('Edge')
  const [cpu, setCpu] = useState(2)
  const [ram, setRam] = useState(4)
  const [allowResize, setAllowResize] = useState(false)
  const [publish, setPublish] = useState(true)

  return (
    <Wizard onClose={onDone} onSave={onDone} height={500}>
      <WizardStep name="Identity" id="gt-id">
        <Form>
          <FormGroup label="Catalog item name" isRequired fieldId="gtn">
            <TextInput id="gtn" value={name} onChange={(_, v) => setName(v)} />
          </FormGroup>
          <FormGroup label="Description" fieldId="gtd">
            <TextArea id="gtd" value={desc} onChange={(_, v) => setDesc(v)} rows={3} />
          </FormGroup>
          <FormGroup label="Variant label" fieldId="gtv">
            <TextInput id="gtv" value={variant} onChange={(_, v) => setVariant(v)} />
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep name="Template" id="gt-tpl">
        <Form>
          <FormGroup label="Backing Ansible template" fieldId="gtt">
            <Select
              isOpen={tOpen}
              onOpenChange={setTOpen}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setTOpen((v) => !v)}>
                  {template}
                </MenuToggle>
              )}
              selected={template}
              onSelect={(_, v) => {
                setTemplate(String(v))
                setTOpen(false)
              }}
            >
              <SelectList>
                {allTemplates.map((o) => (
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
            title="One template can back many catalog items. Use variants to expose S / M / L sizes."
          />
        </Form>
      </WizardStep>

      <WizardStep name="Presets & constraints" id="gt-pre">
        <Form>
          <FormGroup label="Preset vCPU" fieldId="gtc">
            <NumberInput
              value={cpu}
              min={1}
              max={64}
              onMinus={() => setCpu((n) => Math.max(1, n - 1))}
              onPlus={() => setCpu((n) => clamp(n + 1, 1, 64))}
              onChange={(e: React.FormEvent<HTMLInputElement>) =>
                setCpu(clamp(Number(e.currentTarget.value) || 1, 1, 64))
              }
            />
          </FormGroup>
          <FormGroup label="Preset RAM (GiB)" fieldId="gtr">
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
          <FormGroup fieldId="gtar">
            <Switch
              id="gtar"
              label="Allow tenants to override cpu / ram at order time"
              isChecked={allowResize}
              onChange={(_, v) => setAllowResize(v)}
            />
          </FormGroup>
        </Form>
      </WizardStep>

      <WizardStep
        name="Publish"
        id="gt-pub"
        footer={{ nextButtonText: publish ? 'Publish' : 'Save draft' }}
      >
        <Form>
          <FormGroup fieldId="gtp">
            <Switch
              id="gtp"
              label="Publish to tenant catalog immediately"
              isChecked={publish}
              onChange={(_, v) => setPublish(v)}
            />
          </FormGroup>
        </Form>
        <Card className={summaryCardCss}>
          <CardBody className={summaryCardBodyCss}>
            <div>
              <strong>Name:</strong> {name} ({variant})
            </div>
            <div>
              <strong>Template:</strong> <code>{template}</code>
            </div>
            <div>
              <strong>Preset:</strong> {cpu} vCPU · {ram} GiB RAM · resize{' '}
              {allowResize ? 'allowed' : 'locked'}
            </div>
          </CardBody>
        </Card>
      </WizardStep>
    </Wizard>
  )
}
