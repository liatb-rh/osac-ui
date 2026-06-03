import {
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  Stack,
  StackItem,
  Tab,
  TabTitleText,
  Tabs,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useComputeInstanceTemplates } from '../../../../api/hooks'
import { useAllSubnets, useSecurityGroups, useVirtualNetworks } from '../../../../api/useNetworking'
import {
  TEMPLATE_BOOT_DISK_MAX_GIB,
  TEMPLATE_BOOT_DISK_MIN_GIB,
  TEMPLATE_CORES_MAX,
  TEMPLATE_CORES_MIN,
  TEMPLATE_MEMORY_GIB_MAX,
  TEMPLATE_MEMORY_GIB_MIN,
  defaultTemplateBootDiskGib,
  parseTemplateAdditionalDisksGibInput,
  parseTemplateBootDiskGibInput,
  parseTemplateCoresInput,
  parseTemplateMemoryGibInput,
} from '../constants'
import type { UpdateFn, WizardState } from '../types'

const RUN_STRATEGY_OPTIONS = [
  { value: 'Always', label: 'Always' },
  { value: 'Halted', label: 'Halted' },
] as const

const IMAGE_SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Use template default image' },
  { value: 'SOURCE_TYPE_REGISTRY', label: 'Container registry' },
] as const

type CustomizationTabKey = 'overview' | 'storage' | 'network' | 'ssh' | 'advanced'

export function CustomizationStep({ state, update }: { state: WizardState; update: UpdateFn }) {
  const [activeTab, setActiveTab] = useState<CustomizationTabKey>('overview')
  const { data: templates = [] } = useComputeInstanceTemplates()
  const { data: allSubnets } = useAllSubnets()
  const { data: securityGroups } = useSecurityGroups()
  const { data: virtualNetworks } = useVirtualNetworks()

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === state.selectedTemplateId) ?? null,
    [templates, state.selectedTemplateId],
  )

  const bootDiskInvalid =
    state.mode === 'template' &&
    state.templateBootDiskSizeGib.trim().length > 0 &&
    parseTemplateBootDiskGibInput(state.templateBootDiskSizeGib) === null

  const coresInvalid =
    state.mode === 'template' &&
    state.templateCores.trim().length > 0 &&
    parseTemplateCoresInput(state.templateCores) === null

  const memoryInvalid =
    state.mode === 'template' &&
    state.templateMemoryGib.trim().length > 0 &&
    parseTemplateMemoryGibInput(state.templateMemoryGib) === null

  const additionalDisksInvalid =
    state.mode === 'template' &&
    state.templateAdditionalDisksGibRaw.trim().length > 0 &&
    parseTemplateAdditionalDisksGibInput(state.templateAdditionalDisksGibRaw) === null

  /** Seed numeric fields from catalog template when still empty / invalid. */
  useLayoutEffect(() => {
    if (state.mode !== 'template' || !state.selectedTemplateId || !selectedTemplate) return
    if (selectedTemplate.id !== state.selectedTemplateId) return

    const desiredBoot = String(defaultTemplateBootDiskGib(selectedTemplate))
    const bootParsed = parseTemplateBootDiskGibInput(state.templateBootDiskSizeGib)
    const bootRaw = state.templateBootDiskSizeGib.trim()
    const apiDefault = selectedTemplate.defaultBootDiskSizeGib

    if (bootRaw === '' || bootParsed === null) {
      update('templateBootDiskSizeGib', desiredBoot)
    } else if (apiDefault !== undefined && bootParsed === 40 && apiDefault !== 40) {
      update('templateBootDiskSizeGib', String(apiDefault))
    }

    const dc = String(selectedTemplate.defaultCores ?? 2)
    if (
      state.templateCores.trim() === '' ||
      parseTemplateCoresInput(state.templateCores) === null
    ) {
      update('templateCores', dc)
    }

    const dm = String(selectedTemplate.defaultMemoryGib ?? 8)
    if (
      state.templateMemoryGib.trim() === '' ||
      parseTemplateMemoryGibInput(state.templateMemoryGib) === null
    ) {
      update('templateMemoryGib', dm)
    }
  }, [
    state.mode,
    state.selectedTemplateId,
    state.templateBootDiskSizeGib,
    state.templateCores,
    state.templateMemoryGib,
    selectedTemplate,
    update,
  ])

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="customization-heading" headingLevel="h2" size="xl">
          Customization
        </Title>
        <Content
          component="p"
          className="pf-v6-u-color-text-subtle"
          style={{ marginTop: 'var(--pf-t--global--spacer--sm)', maxWidth: 720 }}
        >
          Adjust compute, storage, networking, and access for this virtual machine.
        </Content>
      </StackItem>
      <StackItem>
        {state.mode === 'template' && (
          <Form>
            <FormGroup label="Virtual machine name" fieldId="template-vm-name" isRequired>
              <TextInput
                id="template-vm-name"
                value={state.templateVmName}
                onChange={(_e, v) => update('templateVmName', v)}
                placeholder="Enter a name for this virtual machine"
              />
            </FormGroup>
          </Form>
        )}
        {state.mode === 'template' && (
          <Tabs
            id="cvm-customization-tabs"
            aria-label="Virtual machine customization"
            activeKey={activeTab}
            onSelect={(_e, k) => setActiveTab(k as CustomizationTabKey)}
            style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}
          >
            <Tab key="overview" eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <Stack hasGutter style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
                <Form>
                  <FormGroup label="vCPU count" fieldId="template-cores" isRequired>
                    <TextInput
                      id="template-cores"
                      type="text"
                      inputMode="numeric"
                      validated={coresInvalid ? 'error' : 'default'}
                      value={state.templateCores}
                      onChange={(_e, v) => update('templateCores', v)}
                      aria-describedby="template-cores-helper"
                    />
                    <FormHelperText id="template-cores-helper">
                      Whole number between {TEMPLATE_CORES_MIN} and {TEMPLATE_CORES_MAX}.
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup label="Memory (GiB)" fieldId="template-memory-gib" isRequired>
                    <TextInput
                      id="template-memory-gib"
                      type="text"
                      inputMode="numeric"
                      validated={memoryInvalid ? 'error' : 'default'}
                      value={state.templateMemoryGib}
                      onChange={(_e, v) => update('templateMemoryGib', v)}
                      aria-describedby="template-memory-gib-helper"
                    />
                    <FormHelperText id="template-memory-gib-helper">
                      Whole number between {TEMPLATE_MEMORY_GIB_MIN} and {TEMPLATE_MEMORY_GIB_MAX}{' '}
                      GiB.
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup label="Run strategy" fieldId="template-run-strategy">
                    <FormSelect
                      id="template-run-strategy"
                      value={state.templateRunStrategy}
                      onChange={(_e, v) => update('templateRunStrategy', v)}
                    >
                      {RUN_STRATEGY_OPTIONS.map((o) => (
                        <FormSelectOption key={o.value} value={o.value} label={o.label} />
                      ))}
                    </FormSelect>
                  </FormGroup>
                </Form>
              </Stack>
            </Tab>
            <Tab key="storage" eventKey="storage" title={<TabTitleText>Storage</TabTitleText>}>
              <Stack hasGutter style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
                <Form>
                  <FormGroup
                    label="Boot disk size (GiB)"
                    fieldId="template-boot-disk-gib"
                    isRequired
                  >
                    <TextInput
                      id="template-boot-disk-gib"
                      type="text"
                      inputMode="numeric"
                      validated={bootDiskInvalid ? 'error' : 'default'}
                      value={state.templateBootDiskSizeGib}
                      onChange={(_e, v) => update('templateBootDiskSizeGib', v)}
                      aria-describedby="template-boot-disk-gib-helper"
                    />
                    <FormHelperText id="template-boot-disk-gib-helper">
                      Whole number between {TEMPLATE_BOOT_DISK_MIN_GIB} and{' '}
                      {TEMPLATE_BOOT_DISK_MAX_GIB} GiB
                      {selectedTemplate
                        ? ` (template suggests ${defaultTemplateBootDiskGib(selectedTemplate)} GiB)`
                        : ''}
                      .
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup
                    label="Additional disks (GiB)"
                    fieldId="template-additional-disks"
                    labelHelp={
                      <Content component="p">
                        Comma-separated sizes, for example <code>50, 100</code>. Leave empty if you
                        do not need extra data disks.
                      </Content>
                    }
                  >
                    <TextInput
                      id="template-additional-disks"
                      type="text"
                      validated={additionalDisksInvalid ? 'error' : 'default'}
                      value={state.templateAdditionalDisksGibRaw}
                      onChange={(_e, v) => update('templateAdditionalDisksGibRaw', v)}
                    />
                  </FormGroup>
                </Form>
              </Stack>
            </Tab>
            <Tab key="network" eventKey="network" title={<TabTitleText>Network</TabTitleText>}>
              <Stack hasGutter style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
                <Form>
                  <FormGroup label="Virtual Network" fieldId="template-virtual-network">
                    <FormSelect
                      id="template-virtual-network"
                      value={state.templateVirtualNetworkId ?? ''}
                      onChange={(_e, v) => {
                        update('templateVirtualNetworkId', v)
                        update('templateSubnetId', '')
                      }}
                      aria-label="Select virtual network"
                    >
                      <FormSelectOption value="" label="Default (no preference)" />
                      {(virtualNetworks ?? []).map((vn) => (
                        <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
                      ))}
                    </FormSelect>
                    <FormHelperText>Optional.</FormHelperText>
                  </FormGroup>
                  <FormGroup label="Subnet" fieldId="template-subnet">
                    <FormSelect
                      id="template-subnet"
                      value={state.templateSubnetId}
                      onChange={(_e, v) => update('templateSubnetId', v)}
                      aria-label="Select subnet"
                    >
                      <FormSelectOption value="" label="Default (no preference)" />
                      {(allSubnets ?? [])
                        .filter((s) => !state.templateVirtualNetworkId || s.spec.virtualNetwork === state.templateVirtualNetworkId)
                        .map((s) => (
                          <FormSelectOption key={s.id} value={s.id} label={s.metadata.name} />
                        ))}
                    </FormSelect>
                    <FormHelperText>Optional. Filtered by selected virtual network.</FormHelperText>
                  </FormGroup>
                  <FormGroup label="Security groups" fieldId="template-security-groups">
                    <FormSelect
                      id="template-security-groups"
                      value={state.templateSecurityGroupsRaw}
                      onChange={(_e, v) => update('templateSecurityGroupsRaw', v)}
                      aria-label="Select security group"
                    >
                      <FormSelectOption value="" label="None (use defaults)" />
                      {(securityGroups ?? []).map((sg) => (
                        <FormSelectOption key={sg.id} value={sg.id} label={sg.metadata.name} />
                      ))}
                    </FormSelect>
                    <FormHelperText>Optional. Select one security group.</FormHelperText>
                  </FormGroup>
                </Form>
              </Stack>
            </Tab>
            <Tab key="ssh" eventKey="ssh" title={<TabTitleText>SSH</TabTitleText>}>
              <Stack hasGutter style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
                <Form>
                  <FormGroup label="SSH public key" fieldId="template-ssh-key">
                    <TextArea
                      id="template-ssh-key"
                      value={state.templateSshPublicKey}
                      onChange={(_e, v) => update('templateSshPublicKey', v)}
                      rows={5}
                      placeholder="ssh-ed25519 AAAA…"
                      resizeOrientation="vertical"
                    />
                    <FormHelperText>Optional.</FormHelperText>
                  </FormGroup>
                </Form>
              </Stack>
            </Tab>
            <Tab
              key="advanced"
              eventKey="advanced"
              title={<TabTitleText>Image &amp; user data</TabTitleText>}
            >
              <Stack hasGutter style={{ paddingTop: 'var(--pf-t--global--spacer--md)' }}>
                <Form>
                  <FormGroup label="Image source type" fieldId="template-image-source-type">
                    <FormSelect
                      id="template-image-source-type"
                      value={state.templateImageSourceType}
                      onChange={(_e, v) => update('templateImageSourceType', v)}
                    >
                      {IMAGE_SOURCE_TYPE_OPTIONS.map((o) => (
                        <FormSelectOption key={o.value || 'omit'} value={o.value} label={o.label} />
                      ))}
                    </FormSelect>
                    <FormHelperText>
                      Set both type and reference only if you need to override the template image.
                    </FormHelperText>
                  </FormGroup>
                  <FormGroup label="Image source reference" fieldId="template-image-source-ref">
                    <TextInput
                      id="template-image-source-ref"
                      value={state.templateImageSourceRef}
                      onChange={(_e, v) => update('templateImageSourceRef', v)}
                      placeholder="e.g. registry.redhat.io/rhel9:latest"
                    />
                  </FormGroup>
                  <FormGroup label="User data" fieldId="template-user-data">
                    <TextArea
                      id="template-user-data"
                      value={state.templateUserData}
                      onChange={(_e, v) => update('templateUserData', v)}
                      rows={8}
                      placeholder="#cloud-config or ignition…"
                      resizeOrientation="vertical"
                    />
                    <FormHelperText>Optional. For example cloud-init or Ignition.</FormHelperText>
                  </FormGroup>
                </Form>
              </Stack>
            </Tab>
          </Tabs>
        )}
      </StackItem>
    </Stack>
  )
}
