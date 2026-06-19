/**
 * RequestBareMetalWizard — shared, props-only 3-step bare metal provisioning wizard.
 *
 * No API hooks inside. The app layer supplies catalogItems + onSubmit + isSubmitting.
 * Covers all fields from the fulfillment-service BareMetalInstanceSpec proto plus
 * EC2-equivalent infrastructure parameters mapped to the OpenShift/OSAC model.
 */
import { useState } from 'react'
import {
  ActionGroup,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  NumberInput,
  Radio,
  Stack,
  StackItem,
  Switch,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import type { FieldDefinition } from '../catalogitem/CatalogItem'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BareMetalWizardCatalogItem {
  id: string
  title: string
  description?: string
  published: boolean
  fieldDefinitions?: FieldDefinition[]
}

export interface BareMetalWizardCreatePayload {
  metadata: { name: string; labels?: Record<string, string> }
  spec: {
    catalogItem: string
    runStrategy:
      | 'BARE_METAL_INSTANCE_RUN_STRATEGY_ALWAYS'
      | 'BARE_METAL_INSTANCE_RUN_STRATEGY_HALTED'
    sshKey?: string
    userData?: string
    zone?: string
    image?: string
    vnet?: string
    subnet?: string
    networkPolicyGroup?: string
    topologyKey?: string
    fieldValues?: Record<string, unknown>
  }
}

export interface RequestBareMetalWizardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: BareMetalWizardCreatePayload) => void
  isSubmitting?: boolean
  catalogItems: BareMetalWizardCatalogItem[]
  /** Available failure domains — maps EC2 Availability Zones */
  availableZones?: string[]
  /** Available node images — maps EC2 AMIs */
  availableImages?: Array<{ id: string; name: string }>
  /** Pre-select a catalog item (from URL param or card click) */
  initialCatalogItemId?: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const SSH_KEY_RE = /^(ssh-(rsa|ed25519|ecdsa)|ecdsa-sha2)/
const MAX_USER_DATA_BYTES = 64 * 1024

interface LabelPair {
  key: string
  value: string
}

function byteLength(s: string) {
  return new TextEncoder().encode(s).length
}

// ---------------------------------------------------------------------------
// Step 1 — Hardware offering (catalog item selector)
// ---------------------------------------------------------------------------

function Step1CatalogSelector({
  items,
  selected,
  onSelect,
}: {
  items: BareMetalWizardCatalogItem[]
  selected: string
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
        No bare metal catalog items available. Ask your tenant admin to publish one.
      </p>
    )
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3" size="md">
          Select a hardware offering
        </Title>
        <p
          style={{
            color: 'var(--pf-t--global--text--color--subtle)',
            fontSize: '0.875rem',
            marginTop: 4,
          }}
        >
          Each offering maps to a hardware profile defined by your tenant admin.
        </p>
      </StackItem>
      <StackItem>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {items
            .filter((i) => i.published)
            .map((item) => (
              <Card
                key={item.id}
                isClickable
                isSelected={selected === item.id}
                onClick={() => onSelect(item.id)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid var(--pf-t--global--border--color--default)',
                }}
              >
                <CardTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Label color="orange" isCompact>
                      Bare Metal
                    </Label>
                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                  </div>
                </CardTitle>
                {item.description && (
                  <CardBody>
                    <span
                      style={{
                        color: 'var(--pf-t--global--text--color--subtle)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {item.description}
                    </span>
                  </CardBody>
                )}
                {item.fieldDefinitions && item.fieldDefinitions.length > 0 && (
                  <CardBody>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--pf-t--global--text--color--subtle)',
                      }}
                    >
                      {item.fieldDefinitions.filter((f) => f.editable).length} configurable ·{' '}
                      {item.fieldDefinitions.filter((f) => !f.editable).length} fixed parameters
                    </span>
                  </CardBody>
                )}
              </Card>
            ))}
        </div>
      </StackItem>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Dynamic field renderer (live, enabled — unlike CatalogFormPreview)
// ---------------------------------------------------------------------------

function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition
  value: unknown
  onChange: (val: unknown) => void
}) {
  const { componentType, displayName, editable, defaultValue, options, validation, path } = field
  const fieldId = `rbw-dyn-${field.id}`

  if (!editable) {
    return (
      <FormGroup
        label={displayName || path}
        fieldId={fieldId}
        labelHelp={<LockIcon style={{ color: 'var(--pf-t--global--icon--color--subtle)' }} />}
      >
        {componentType === 'boolean' ? (
          <Switch id={fieldId} isChecked={!!defaultValue} isDisabled aria-label={displayName} />
        ) : (
          <TextInput
            id={fieldId}
            value={String(defaultValue ?? '')}
            type={componentType === 'password' ? 'password' : 'text'}
            isDisabled
            aria-label={displayName}
          />
        )}
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--pf-t--global--text--color--subtle)',
            marginTop: 2,
          }}
        >
          Fixed — cannot be changed at provision time
        </p>
      </FormGroup>
    )
  }

  switch (componentType) {
    case 'number':
      return (
        <FormGroup label={displayName || path} fieldId={fieldId}>
          <NumberInput
            id={fieldId}
            value={
              typeof value === 'number'
                ? value
                : typeof defaultValue === 'number'
                  ? defaultValue
                  : 0
            }
            min={validation?.min}
            max={validation?.max}
            onMinus={() =>
              onChange(
                Math.max(
                  validation?.min ?? -Infinity,
                  (typeof value === 'number' ? value : 0) - (validation?.step ?? 1),
                ),
              )
            }
            onPlus={() =>
              onChange(
                Math.min(
                  validation?.max ?? Infinity,
                  (typeof value === 'number' ? value : 0) + (validation?.step ?? 1),
                ),
              )
            }
            onChange={(e) => onChange(Number((e.target as HTMLInputElement).value))}
          />
        </FormGroup>
      )
    case 'boolean':
      return (
        <FormGroup label={displayName || path} fieldId={fieldId}>
          <Switch
            id={fieldId}
            isChecked={typeof value === 'boolean' ? value : !!defaultValue}
            onChange={(_, checked) => onChange(checked)}
            aria-label={displayName}
          />
        </FormGroup>
      )
    case 'select':
      return (
        <FormGroup label={displayName || path} fieldId={fieldId}>
          <FormSelect
            id={fieldId}
            value={typeof value === 'string' ? value : String(defaultValue ?? '')}
            onChange={(_, v) => onChange(v)}
          >
            {(options ?? []).map((opt) => (
              <FormSelectOption key={opt} value={opt} label={opt} />
            ))}
          </FormSelect>
        </FormGroup>
      )
    case 'textarea':
      return (
        <FormGroup label={displayName || path} fieldId={fieldId}>
          <TextArea
            id={fieldId}
            value={typeof value === 'string' ? value : String(defaultValue ?? '')}
            onChange={(_, v) => onChange(v)}
            rows={validation?.rows ?? 4}
            aria-label={displayName}
            resizeOrientation="vertical"
          />
        </FormGroup>
      )
    case 'password':
      return (
        <FormGroup label={displayName || path} fieldId={fieldId}>
          <TextInput
            id={fieldId}
            type="password"
            value={typeof value === 'string' ? value : String(defaultValue ?? '')}
            onChange={(_, v) => onChange(v)}
            aria-label={displayName}
          />
        </FormGroup>
      )
    default:
      return (
        <FormGroup label={displayName || path} fieldId={fieldId}>
          <TextInput
            id={fieldId}
            value={typeof value === 'string' ? value : String(defaultValue ?? '')}
            onChange={(_, v) => onChange(v)}
            aria-label={displayName}
            minLength={validation?.minLength}
            maxLength={validation?.maxLength}
          />
        </FormGroup>
      )
  }
}

// ---------------------------------------------------------------------------
// Step 2 — Configuration
// ---------------------------------------------------------------------------

interface Step2Props {
  name: string
  setName: (v: string) => void
  runStrategy: 'ALWAYS' | 'HALTED'
  setRunStrategy: (v: 'ALWAYS' | 'HALTED') => void
  labels: LabelPair[]
  setLabels: (v: LabelPair[]) => void
  sshKey: string
  setSshKey: (v: string) => void
  sshKeyError: string
  onSshKeyBlur: () => void
  userData: string
  setUserData: (v: string) => void
  userDataError: string
  zone: string
  setZone: (v: string) => void
  image: string
  setImage: (v: string) => void
  vnet: string
  setVnet: (v: string) => void
  subnet: string
  setSubnet: (v: string) => void
  networkPolicy: string
  setNetworkPolicy: (v: string) => void
  topologyKey: string
  setTopologyKey: (v: string) => void
  fieldValues: Record<string, unknown>
  setFieldValues: (v: Record<string, unknown>) => void
  availableZones: string[]
  availableImages: Array<{ id: string; name: string }>
  fieldDefinitions: FieldDefinition[]
}

function Step2Configuration(p: Step2Props) {
  const [infraExpanded, setInfraExpanded] = useState(true)
  const [accessExpanded, setAccessExpanded] = useState(false)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [catalogParamsExpanded, setCatalogParamsExpanded] = useState(true)

  const editableFields = p.fieldDefinitions.filter((f) => f.editable)
  const lockedFields = p.fieldDefinitions.filter((f) => !f.editable)

  return (
    <Form>
      {/* Basic */}
      <Title headingLevel="h3" size="md" style={{ marginBottom: 12 }}>
        Basic
      </Title>

      <FormGroup label="Instance name" isRequired fieldId="rbw-name">
        <TextInput
          id="rbw-name"
          value={p.name}
          onChange={(_, v) => p.setName(v)}
          placeholder="e.g. bm-analytics-01"
          isRequired
        />
      </FormGroup>

      <FormGroup label="Run strategy" fieldId="rbw-run-strategy">
        <div style={{ display: 'flex', gap: 24 }}>
          <Radio
            id="rbw-rs-always"
            name="runStrategy"
            label="Always on"
            description="Instance runs continuously"
            isChecked={p.runStrategy === 'ALWAYS'}
            onChange={() => p.setRunStrategy('ALWAYS')}
          />
          <Radio
            id="rbw-rs-halted"
            name="runStrategy"
            label="Halted"
            description="Instance is provisioned but powered off"
            isChecked={p.runStrategy === 'HALTED'}
            onChange={() => p.setRunStrategy('HALTED')}
          />
        </div>
      </FormGroup>

      <FormGroup label="Labels / Tags" fieldId="rbw-labels">
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--pf-t--global--text--color--subtle)',
            marginBottom: 8,
          }}
        >
          Kubernetes <code>metadata.labels</code>
        </p>
        <Stack hasGutter>
          {p.labels.map((lbl, idx) => (
            <StackItem key={idx}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <TextInput
                  aria-label="Label key"
                  placeholder="key"
                  value={lbl.key}
                  onChange={(_, v) => {
                    const next = [...p.labels]
                    next[idx] = { ...next[idx], key: v }
                    p.setLabels(next)
                  }}
                  style={{ maxWidth: 160 }}
                />
                <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>=</span>
                <TextInput
                  aria-label="Label value"
                  placeholder="value"
                  value={lbl.value}
                  onChange={(_, v) => {
                    const next = [...p.labels]
                    next[idx] = { ...next[idx], value: v }
                    p.setLabels(next)
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="plain"
                  aria-label="Remove label"
                  onClick={() => p.setLabels(p.labels.filter((_, i) => i !== idx))}
                >
                  <TrashIcon />
                </Button>
              </div>
            </StackItem>
          ))}
          <StackItem>
            <Button
              variant="link"
              icon={<PlusCircleIcon />}
              onClick={() => p.setLabels([...p.labels, { key: '', value: '' }])}
            >
              Add label
            </Button>
          </StackItem>
        </Stack>
      </FormGroup>

      {/* Access & init */}
      <ExpandableSection
        toggleText="Access & initialization"
        isExpanded={accessExpanded}
        onToggle={(_, v) => setAccessExpanded(v)}
        style={{ marginTop: 8 }}
      >
        <Stack hasGutter style={{ paddingTop: 8 }}>
          <StackItem>
            <FormGroup label="SSH public key" fieldId="rbw-ssh">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                OpenSSH format (ssh-rsa, ssh-ed25519, ecdsa-sha2-*)
              </p>
              <TextArea
                id="rbw-ssh"
                value={p.sshKey}
                onChange={(_, v) => p.setSshKey(v)}
                onBlur={p.onSshKeyBlur}
                placeholder="ssh-ed25519 AAAA..."
                rows={3}
                aria-label="SSH public key"
                resizeOrientation="vertical"
                validated={p.sshKeyError ? 'error' : 'default'}
              />
              {p.sshKeyError && (
                <p
                  style={{
                    color: 'var(--pf-t--global--danger-color--100)',
                    fontSize: '0.875rem',
                    marginTop: 4,
                  }}
                >
                  {p.sshKeyError}
                </p>
              )}
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="User data (cloud-init)" fieldId="rbw-userdata">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                cloud-init YAML or shell script, max 64 KB
              </p>
              <TextArea
                id="rbw-userdata"
                value={p.userData}
                onChange={(_, v) => p.setUserData(v)}
                placeholder={'#cloud-config\n# or #!/bin/bash'}
                rows={5}
                aria-label="User data"
                resizeOrientation="vertical"
                validated={p.userDataError ? 'error' : 'default'}
              />
              <p
                style={{
                  fontSize: '0.75rem',
                  color: p.userDataError
                    ? 'var(--pf-t--global--danger-color--100)'
                    : 'var(--pf-t--global--text--color--subtle)',
                  marginTop: 2,
                }}
              >
                {byteLength(p.userData).toLocaleString()} / {MAX_USER_DATA_BYTES.toLocaleString()}{' '}
                bytes
                {p.userDataError && ` — ${p.userDataError}`}
              </p>
            </FormGroup>
          </StackItem>
        </Stack>
      </ExpandableSection>

      {/* Infrastructure placement */}
      <ExpandableSection
        toggleText="Infrastructure placement"
        isExpanded={infraExpanded}
        onToggle={(_, v) => setInfraExpanded(v)}
        style={{ marginTop: 8 }}
      >
        <Stack hasGutter style={{ paddingTop: 8 }}>
          <StackItem>
            <FormGroup label="Failure Domain (Zone)" fieldId="rbw-zone">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                Availability zone
              </p>
              <FormSelect id="rbw-zone" value={p.zone} onChange={(_, v) => p.setZone(v)}>
                <FormSelectOption value="" label="— Any zone —" />
                {p.availableZones.map((z) => (
                  <FormSelectOption key={z} value={z} label={z} />
                ))}
              </FormSelect>
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Node Image" fieldId="rbw-image">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                OS image applied to the bare metal host
              </p>
              <FormSelect id="rbw-image" value={p.image} onChange={(_, v) => p.setImage(v)}>
                <FormSelectOption value="" label="— Use catalog default —" />
                {p.availableImages.map((img) => (
                  <FormSelectOption key={img.id} value={img.id} label={img.name} />
                ))}
              </FormSelect>
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Cluster Network" fieldId="rbw-vnet">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                Virtual network
              </p>
              <TextInput
                id="rbw-vnet"
                value={p.vnet}
                onChange={(_, v) => p.setVnet(v)}
                placeholder="e.g. prod-network"
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Network Segment (Subnet)" fieldId="rbw-subnet">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                Network subnet
              </p>
              <TextInput
                id="rbw-subnet"
                value={p.subnet}
                onChange={(_, v) => p.setSubnet(v)}
                placeholder="e.g. prod-subnet-a"
              />
            </FormGroup>
          </StackItem>
          <StackItem>
            <FormGroup label="Network Policy Group" fieldId="rbw-netpolicy">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                Network policy / security group
              </p>
              <TextInput
                id="rbw-netpolicy"
                value={p.networkPolicy}
                onChange={(_, v) => p.setNetworkPolicy(v)}
                placeholder="e.g. web-servers-sg"
              />
            </FormGroup>
          </StackItem>
        </Stack>
      </ExpandableSection>

      {/* Advanced */}
      <ExpandableSection
        toggleText="Advanced"
        isExpanded={advancedExpanded}
        onToggle={(_, v) => setAdvancedExpanded(v)}
        style={{ marginTop: 8 }}
      >
        <Stack hasGutter style={{ paddingTop: 8 }}>
          <StackItem>
            <FormGroup label="Topology Placement Key" fieldId="rbw-topology">
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--pf-t--global--text--color--subtle)',
                  marginBottom: 4,
                }}
              >
                Node topology affinity rule
              </p>
              <TextInput
                id="rbw-topology"
                value={p.topologyKey}
                onChange={(_, v) => p.setTopologyKey(v)}
                placeholder="e.g. kubernetes.io/hostname"
              />
            </FormGroup>
          </StackItem>
        </Stack>
      </ExpandableSection>

      {/* Catalog parameters — dynamic fields */}
      {p.fieldDefinitions.length > 0 && (
        <ExpandableSection
          toggleText="Catalog parameters"
          isExpanded={catalogParamsExpanded}
          onToggle={(_, v) => setCatalogParamsExpanded(v)}
          style={{ marginTop: 8 }}
        >
          <Stack hasGutter style={{ paddingTop: 8 }}>
            {editableFields.map((field) => (
              <StackItem key={field.id}>
                <DynamicFieldInput
                  field={field}
                  value={p.fieldValues[field.id] ?? field.defaultValue}
                  onChange={(val) => p.setFieldValues({ ...p.fieldValues, [field.id]: val })}
                />
              </StackItem>
            ))}
            {lockedFields.length > 0 && (
              <StackItem>
                <ExpandableSection
                  toggleText={`${lockedFields.length} fixed parameter${lockedFields.length > 1 ? 's' : ''}`}
                >
                  {lockedFields.map((field) => (
                    <DynamicFieldInput
                      key={field.id}
                      field={field}
                      value={field.defaultValue}
                      onChange={() => {}}
                    />
                  ))}
                </ExpandableSection>
              </StackItem>
            )}
          </Stack>
        </ExpandableSection>
      )}
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Review
// ---------------------------------------------------------------------------

function Step3Review({
  catalogItems,
  selectedCatalogItemId,
  name,
  runStrategy,
  labels,
  sshKey,
  userData,
  zone,
  image,
  vnet,
  subnet,
  networkPolicy,
  topologyKey,
  fieldDefinitions,
  fieldValues,
  availableImages,
}: {
  catalogItems: BareMetalWizardCatalogItem[]
  selectedCatalogItemId: string
  name: string
  runStrategy: 'ALWAYS' | 'HALTED'
  labels: LabelPair[]
  sshKey: string
  userData: string
  zone: string
  image: string
  vnet: string
  subnet: string
  networkPolicy: string
  topologyKey: string
  fieldDefinitions: FieldDefinition[]
  fieldValues: Record<string, unknown>
  availableImages: Array<{ id: string; name: string }>
}) {
  const selectedItem = catalogItems.find((i) => i.id === selectedCatalogItemId)
  const selectedImageName = availableImages.find((i) => i.id === image)?.name ?? image

  const validLabels = labels.filter((l) => l.key.trim())

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3" size="md">
          Review your request
        </Title>
      </StackItem>

      <StackItem>
        <DescriptionList isCompact columnModifier={{ default: '2Col' }}>
          <DescriptionListGroup>
            <DescriptionListTerm>Hardware offering</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedItem ? (
                <span>
                  <Label color="orange" isCompact style={{ marginRight: 6 }}>
                    Bare Metal
                  </Label>
                  {selectedItem.title}
                </span>
              ) : (
                '—'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Instance name</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{name || '—'}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Run strategy</DescriptionListTerm>
            <DescriptionListDescription>
              {runStrategy === 'ALWAYS' ? 'Always on' : 'Halted'}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>Labels</DescriptionListTerm>
            <DescriptionListDescription>
              {validLabels.length
                ? validLabels.map((l) => `${l.key}=${l.value}`).join(', ')
                : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>SSH key</DescriptionListTerm>
            <DescriptionListDescription>
              {sshKey.trim() ? 'Provided' : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>

          <DescriptionListGroup>
            <DescriptionListTerm>User data</DescriptionListTerm>
            <DescriptionListDescription>
              {userData.trim() ? `${byteLength(userData).toLocaleString()} bytes` : 'None'}
            </DescriptionListDescription>
          </DescriptionListGroup>

          {zone && (
            <DescriptionListGroup>
              <DescriptionListTerm>Zone (Failure Domain)</DescriptionListTerm>
              <DescriptionListDescription>{zone}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {image && (
            <DescriptionListGroup>
              <DescriptionListTerm>Node Image</DescriptionListTerm>
              <DescriptionListDescription>{selectedImageName || image}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {vnet && (
            <DescriptionListGroup>
              <DescriptionListTerm>Cluster Network</DescriptionListTerm>
              <DescriptionListDescription>{vnet}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {subnet && (
            <DescriptionListGroup>
              <DescriptionListTerm>Network Segment</DescriptionListTerm>
              <DescriptionListDescription>{subnet}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {networkPolicy && (
            <DescriptionListGroup>
              <DescriptionListTerm>Network Policy Group</DescriptionListTerm>
              <DescriptionListDescription>{networkPolicy}</DescriptionListDescription>
            </DescriptionListGroup>
          )}

          {topologyKey && (
            <DescriptionListGroup>
              <DescriptionListTerm>Topology Key</DescriptionListTerm>
              <DescriptionListDescription>{topologyKey}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>
      </StackItem>

      {/* Dynamic field values */}
      {fieldDefinitions.filter((f) => f.editable).length > 0 && (
        <StackItem>
          <Title headingLevel="h4" size="md" style={{ marginBottom: 8 }}>
            Catalog parameters
          </Title>
          <DescriptionList isCompact>
            {fieldDefinitions
              .filter((f) => f.editable)
              .map((field) => {
                const val = fieldValues[field.id] ?? field.defaultValue
                return (
                  <DescriptionListGroup key={field.id}>
                    <DescriptionListTerm>{field.displayName}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {field.componentType === 'boolean'
                        ? val
                          ? 'Yes'
                          : 'No'
                        : field.componentType === 'password'
                          ? '••••••••'
                          : val != null
                            ? `${val as string | number | boolean}`
                            : '—'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )
              })}
          </DescriptionList>
        </StackItem>
      )}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function RequestBareMetalWizard({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  catalogItems,
  availableZones = ['zone-a', 'zone-b', 'zone-c'],
  availableImages = [],
  initialCatalogItemId = '',
}: RequestBareMetalWizardProps) {
  // Step 1
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState(initialCatalogItemId)

  // Step 2 — basic
  const [name, setName] = useState('')
  const [runStrategy, setRunStrategy] = useState<'ALWAYS' | 'HALTED'>('ALWAYS')
  const [labels, setLabels] = useState<LabelPair[]>([])

  // Step 2 — access & init
  const [sshKey, setSshKey] = useState('')
  const [sshKeyError, setSshKeyError] = useState('')
  const [userData, setUserData] = useState('')

  // Step 2 — infrastructure placement
  const [zone, setZone] = useState('')
  const [image, setImage] = useState('')
  const [vnet, setVnet] = useState('')
  const [subnet, setSubnet] = useState('')
  const [networkPolicy, setNetworkPolicy] = useState('')
  const [topologyKey, setTopologyKey] = useState('')

  // Step 2 — dynamic field values
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})

  const selectedItem = catalogItems.find((i) => i.id === selectedCatalogItemId)
  const fieldDefinitions = selectedItem?.fieldDefinitions ?? []

  const userDataError =
    userData.trim() && byteLength(userData) > MAX_USER_DATA_BYTES
      ? `Exceeds 64 KB limit (${byteLength(userData).toLocaleString()} bytes)`
      : ''

  function handleSshKeyBlur() {
    if (sshKey.trim() && !SSH_KEY_RE.test(sshKey.trim())) {
      setSshKeyError('Must be a valid OpenSSH public key (ssh-rsa, ssh-ed25519, ecdsa-sha2-*)')
    } else {
      setSshKeyError('')
    }
  }

  const step1Valid = !!selectedCatalogItemId
  const step2Valid = name.trim().length > 0 && !sshKeyError && !userDataError

  function buildPayload(): BareMetalWizardCreatePayload {
    const validLabels = labels.filter((l) => l.key.trim())
    return {
      metadata: {
        name: name.trim(),
        ...(validLabels.length
          ? { labels: Object.fromEntries(validLabels.map((l) => [l.key.trim(), l.value.trim()])) }
          : {}),
      },
      spec: {
        catalogItem: selectedCatalogItemId,
        runStrategy: `BARE_METAL_INSTANCE_RUN_STRATEGY_${runStrategy}`,
        ...(sshKey.trim() ? { sshKey: sshKey.trim() } : {}),
        ...(userData.trim() ? { userData: userData.trim() } : {}),
        ...(zone ? { zone } : {}),
        ...(image ? { image } : {}),
        ...(vnet ? { vnet } : {}),
        ...(subnet ? { subnet } : {}),
        ...(networkPolicy ? { networkPolicyGroup: networkPolicy } : {}),
        ...(topologyKey ? { topologyKey } : {}),
        ...(Object.keys(fieldValues).length ? { fieldValues } : {}),
      },
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
      aria-label="Request bare metal instance"
    >
      <ModalHeader
        title="Request Bare Metal"
        description="Provision a bare metal instance from the catalog."
      />
      <ModalBody style={{ minHeight: 560 }}>
        <Wizard onClose={onClose} height={520}>
          <WizardStep
            name="Hardware offering"
            id="rbw-step-catalog"
            footer={{
              nextButtonText: 'Next: Configure',
              isNextDisabled: !step1Valid,
            }}
          >
            <Step1CatalogSelector
              items={catalogItems}
              selected={selectedCatalogItemId}
              onSelect={setSelectedCatalogItemId}
            />
          </WizardStep>

          <WizardStep
            name="Configuration"
            id="rbw-step-config"
            footer={{
              nextButtonText: 'Next: Review',
              isNextDisabled: !step2Valid,
            }}
          >
            <Step2Configuration
              name={name}
              setName={setName}
              runStrategy={runStrategy}
              setRunStrategy={setRunStrategy}
              labels={labels}
              setLabels={setLabels}
              sshKey={sshKey}
              setSshKey={setSshKey}
              sshKeyError={sshKeyError}
              onSshKeyBlur={handleSshKeyBlur}
              userData={userData}
              setUserData={setUserData}
              userDataError={userDataError}
              zone={zone}
              setZone={setZone}
              image={image}
              setImage={setImage}
              vnet={vnet}
              setVnet={setVnet}
              subnet={subnet}
              setSubnet={setSubnet}
              networkPolicy={networkPolicy}
              setNetworkPolicy={setNetworkPolicy}
              topologyKey={topologyKey}
              setTopologyKey={setTopologyKey}
              fieldValues={fieldValues}
              setFieldValues={setFieldValues}
              availableZones={availableZones}
              availableImages={availableImages}
              fieldDefinitions={fieldDefinitions}
            />
          </WizardStep>

          <WizardStep
            name="Review"
            id="rbw-step-review"
            footer={{
              nextButtonText: isSubmitting ? 'Provisioning…' : 'Provision server',
              isNextDisabled: isSubmitting || !step1Valid || !step2Valid,
              onNext: () => onSubmit(buildPayload()),
            }}
          >
            <Step3Review
              catalogItems={catalogItems}
              selectedCatalogItemId={selectedCatalogItemId}
              name={name}
              runStrategy={runStrategy}
              labels={labels}
              sshKey={sshKey}
              userData={userData}
              zone={zone}
              image={image}
              vnet={vnet}
              subnet={subnet}
              networkPolicy={networkPolicy}
              topologyKey={topologyKey}
              fieldDefinitions={fieldDefinitions}
              fieldValues={fieldValues}
              availableImages={availableImages}
            />
          </WizardStep>
        </Wizard>

        {/* Fallback action row for non-wizard submit (safety) */}
        <ActionGroup style={{ display: 'none' }}>
          <Button isDisabled={isSubmitting} onClick={() => onSubmit(buildPayload())}>
            {isSubmitting ? 'Provisioning…' : 'Provision server'}
          </Button>
          <Button variant="link" onClick={onClose}>
            Cancel
          </Button>
        </ActionGroup>
      </ModalBody>
    </Modal>
  )
}
