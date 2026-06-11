import { css, cx } from '@emotion/css'
import {
  Content,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
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
import { useComputeInstanceTemplates } from '../../../../hooks/hooks'
import {
  useAllSubnets,
  usePublicIPPools,
  usePublicIPs,
  useSecurityGroups,
  useVirtualNetworks,
} from '../../../../hooks/useNetworking'
import { PublicIpField } from '@osac/ui-components'
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

const customizationIntroCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  max-width: 720px;
`

const customizationTabsCss = css`
  margin-top: var(--pf-t--global--spacer--md);
`

const customizationTabPanelCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const menuToggleFullWidthCss = css`
  width: 100%;
`

const RUN_STRATEGY_OPTIONS = [
  { value: 'Always', label: 'Always' },
  { value: 'Halted', label: 'Halted' },
] as const

const OS_TYPE_OPTIONS = [
  { value: '', label: 'Select operating system' },
  { value: 'linux', label: 'Linux' },
  { value: 'windows', label: 'Windows' },
] as const

type CustomizationTabKey = 'overview' | 'storage' | 'network' | 'ssh'

export function CustomizationStep({ state, update }: { state: WizardState; update: UpdateFn }) {
  const [activeTab, setActiveTab] = useState<CustomizationTabKey>('overview')
  const [sgSelectOpen, setSgSelectOpen] = useState(false)
  const { data: templates = [] } = useComputeInstanceTemplates()
  const { data: allSubnets } = useAllSubnets()
  const { data: securityGroups } = useSecurityGroups()
  const { data: virtualNetworks } = useVirtualNetworks()
  const { data: publicIPPools = [] } = usePublicIPPools()
  const { data: publicIPs = [] } = usePublicIPs()
  const allocatedIPs = publicIPs.filter((ip) => ip.status.state === 'PUBLIC_IP_STATE_ALLOCATED')

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

  function toggleSecurityGroup(id: string) {
    const current = state.templateSecurityGroupIds
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    update('templateSecurityGroupIds', next)
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="customization-heading" headingLevel="h2" size="xl">
          Customization
        </Title>
        <Content component="p" className={cx('pf-v6-u-color-text-subtle', customizationIntroCss)}>
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
            className={customizationTabsCss}
          >
            <Tab key="overview" eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <Stack hasGutter className={customizationTabPanelCss}>
                <Form>
                  <FormGroup label="Operating System" fieldId="template-os-type" isRequired>
                    <FormSelect
                      id="template-os-type"
                      value={state.templateOsType}
                      onChange={(_e, v) =>
                        update('templateOsType', v as WizardState['templateOsType'])
                      }
                      aria-label="Select operating system"
                    >
                      {OS_TYPE_OPTIONS.map((o) => (
                        <FormSelectOption
                          key={o.value || 'placeholder'}
                          value={o.value}
                          label={o.label}
                        />
                      ))}
                    </FormSelect>
                    <FormHelperText>
                      Linux or Windows (v0.1 — image selection coming in v0.2).
                    </FormHelperText>
                  </FormGroup>
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
              <Stack hasGutter className={customizationTabPanelCss}>
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
              <Stack hasGutter className={customizationTabPanelCss}>
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
                        .filter(
                          (s) =>
                            !state.templateVirtualNetworkId ||
                            s.spec.virtualNetwork === state.templateVirtualNetworkId,
                        )
                        .map((s) => (
                          <FormSelectOption key={s.id} value={s.id} label={s.metadata.name} />
                        ))}
                    </FormSelect>
                    <FormHelperText>Optional. Filtered by selected virtual network.</FormHelperText>
                  </FormGroup>
                  <FormGroup label="Security groups" fieldId="template-security-groups">
                    <Select
                      id="template-security-groups"
                      isOpen={sgSelectOpen}
                      onOpenChange={setSgSelectOpen}
                      toggle={(ref) => (
                        <MenuToggle
                          ref={ref}
                          onClick={() => setSgSelectOpen((o) => !o)}
                          isExpanded={sgSelectOpen}
                          className={menuToggleFullWidthCss}
                          aria-label="Select security groups"
                        >
                          {state.templateSecurityGroupIds.length === 0
                            ? 'None (use defaults)'
                            : `${state.templateSecurityGroupIds.length} selected`}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {(securityGroups ?? []).map((sg) => (
                          <SelectOption
                            key={sg.id}
                            value={sg.id}
                            hasCheckbox
                            isSelected={state.templateSecurityGroupIds.includes(sg.id)}
                            onClick={() => toggleSecurityGroup(sg.id)}
                          >
                            {sg.metadata.name}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                    <FormHelperText>Optional. Select one or more security groups.</FormHelperText>
                  </FormGroup>
                  <PublicIpField
                    pools={publicIPPools}
                    allocatedIPs={allocatedIPs}
                    onChange={(sel) => update('publicIp', sel)}
                  />
                </Form>
              </Stack>
            </Tab>
            <Tab key="ssh" eventKey="ssh" title={<TabTitleText>SSH</TabTitleText>}>
              <Stack hasGutter className={customizationTabPanelCss}>
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
