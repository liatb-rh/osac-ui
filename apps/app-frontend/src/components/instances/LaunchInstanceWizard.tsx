/**
 * flow: launch-instance
 * step: launch_instance_wizard
 *
 * EC2-style "Launch an instance" wizard — 6 steps + review.
 * Self-contained state; no BFF session required (prototype).
 */
import { css } from '@emotion/css'
import { useState } from 'react'
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Card,
  CardBody,
  Checkbox,
  Divider,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalHeader,
  Radio,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  Spinner,
  Stack,
  StackItem,
  Switch,
  TextInput,
  Title,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { CloudIcon } from '@patternfly/react-icons/dist/esm/icons/cloud-icon'
import { ServerIcon } from '@patternfly/react-icons/dist/esm/icons/server-icon'
import type { CSSProperties, ComponentType } from 'react'
import type { Cluster, ClusterCatalogItem, ComputeInstance } from '@osac/api-contracts'
import {
  useVirtualNetworks,
  useAllSubnets,
  useSecurityGroups,
  usePublicIPPools,
} from '../../hooks/useNetworking'
import { useProvisionVm, refetchComputeInstancesQueries } from '../../hooks/hooks'
import { usePendingVmCreations } from '../../hooks/usePendingVmCreations'
import { useQueryClient } from '@tanstack/react-query'
import { useClusterCatalogItems } from '../../hooks/useClusterCatalogItems'
import { useCreateCluster } from '../../hooks/useCreateCluster'
import { useStorageTiers } from '../../hooks/useAgents'
import { useCreateBareMetalInstance } from '../../hooks/useBareMetalInstances'
import { BM_IMAGES } from '@osac/api-contracts'
import { RequestBareMetalWizard } from '@osac/ui-components'
import type { BareMetalWizardCatalogItem, BareMetalWizardCreatePayload } from '@osac/ui-components'
import { catalogItemsStore } from '../../pages/services/catalog/catalogItemsStore'

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------

const OS_OPTIONS = [
  {
    id: 'rhel-9',
    label: 'Red Hat Enterprise Linux 9',
    os: 'rhel',
    provider: 'Red Hat',
    description: 'Enterprise-grade Linux for mission-critical workloads.',
    versions: ['9.4', '9.3', '9.2'],
  },
  {
    id: 'rhel-8',
    label: 'Red Hat Enterprise Linux 8',
    os: 'rhel',
    provider: 'Red Hat',
    description: 'Long-term supported enterprise Linux baseline.',
    versions: ['8.10', '8.9'],
  },
  {
    id: 'ubuntu-24',
    label: 'Ubuntu 24.04 LTS',
    os: 'ubuntu',
    provider: 'Canonical',
    description: 'Latest LTS release with 5-year security support.',
    versions: ['24.04'],
  },
  {
    id: 'ubuntu-22',
    label: 'Ubuntu 22.04 LTS',
    os: 'ubuntu',
    provider: 'Canonical',
    description: 'Stable LTS release widely used in production.',
    versions: ['22.04'],
  },
  {
    id: 'windows-2022',
    label: 'Windows Server 2022',
    os: 'windows',
    provider: 'Microsoft',
    description: 'Latest Windows Server with enhanced security features.',
    versions: ['2022'],
  },
  {
    id: 'windows-2019',
    label: 'Windows Server 2019',
    os: 'windows',
    provider: 'Microsoft',
    description: 'Proven Windows Server with long-term support.',
    versions: ['2019'],
  },
  {
    id: 'centos-9',
    label: 'CentOS Stream 9',
    os: 'centos',
    provider: 'CentOS Project',
    description: 'Rolling-release upstream of RHEL for development and testing.',
    versions: ['9'],
  },
  {
    id: 'debian-12',
    label: 'Debian 12 (Bookworm)',
    os: 'debian',
    provider: 'Debian',
    description: 'Stable, community-maintained universal operating system.',
    versions: ['12'],
  },
] as const

const ARCHITECTURES = [
  { value: 'x86_64', label: 'x86_64 (64-bit)' },
  { value: 'arm64', label: 'arm64 (64-bit ARM)' },
] as const

interface InstanceProfile {
  id: string
  label: string
  category: 'general' | 'compute' | 'memory' | 'gpu'
  cpu: number
  memoryGib: number
  description: string
}

const INSTANCE_PROFILES: InstanceProfile[] = [
  {
    id: 'general-small',
    label: 'general-small',
    category: 'general',
    cpu: 2,
    memoryGib: 4,
    description: 'General purpose — small',
  },
  {
    id: 'general-medium',
    label: 'general-medium',
    category: 'general',
    cpu: 4,
    memoryGib: 8,
    description: 'General purpose — medium',
  },
  {
    id: 'general-large',
    label: 'general-large',
    category: 'general',
    cpu: 8,
    memoryGib: 16,
    description: 'General purpose — large',
  },
  {
    id: 'compute-large',
    label: 'compute-large',
    category: 'compute',
    cpu: 16,
    memoryGib: 32,
    description: 'Compute optimized',
  },
  {
    id: 'compute-xlarge',
    label: 'compute-xlarge',
    category: 'compute',
    cpu: 32,
    memoryGib: 64,
    description: 'Compute optimized — XL',
  },
  {
    id: 'memory-large',
    label: 'memory-large',
    category: 'memory',
    cpu: 8,
    memoryGib: 64,
    description: 'Memory optimized',
  },
  {
    id: 'memory-xlarge',
    label: 'memory-xlarge',
    category: 'memory',
    cpu: 16,
    memoryGib: 128,
    description: 'Memory optimized — XL',
  },
  {
    id: 'gpu-standard',
    label: 'gpu-standard',
    category: 'gpu',
    cpu: 8,
    memoryGib: 32,
    description: 'GPU accelerated',
  },
]

const VOLUME_TYPES = [
  { value: 'ssd', label: 'SSD (gp3)' },
  { value: 'nvme', label: 'NVMe SSD (io2)' },
  { value: 'hdd', label: 'HDD (st1)' },
] as const

/** Maps (osId, version) → OCI source_ref for fulfillment spec.image.source_ref */
const OS_SOURCE_REF: Record<string, string> = {
  'rhel-9': 'registry.redhat.io/rhel9/rhel-guest-image',
  'rhel-8': 'registry.redhat.io/rhel8/rhel-guest-image',
  'ubuntu-24': 'quay.io/osac/ubuntu-24.04-cloud',
  'ubuntu-22': 'quay.io/osac/ubuntu-22.04-cloud',
  'windows-2022': 'quay.io/osac/windows-server-2022',
  'windows-2019': 'quay.io/osac/windows-server-2019',
  'centos-9': 'quay.io/osac/centos-stream-9',
  'debian-12': 'quay.io/osac/debian-12',
}

// ---------------------------------------------------------------------------
// Wizard state
// ---------------------------------------------------------------------------

interface TagEntry {
  id: string
  key: string
  value: string
}

interface VolumeEntry {
  id: string
  sizeGib: number
  type: 'ssd' | 'nvme' | 'hdd'
  deleteOnTermination: boolean
}

type ResourceType = 'vm' | 'cluster' | 'baremetal'

interface WizardState {
  // Resource type selector
  resourceType: ResourceType
  // Step 1 — shared
  name: string
  tags: TagEntry[]
  // Step 2 — VM: OS image  /  Cluster: OCP version
  osId: string
  osVersion: string
  architecture: 'x86_64' | 'arm64'
  // Cluster: catalog item + OCP release
  clusterCatalogItemId: string
  ocpReleaseImage: string
  // Step 3 — VM: instance type  /  Cluster: node sets
  instanceProfileId: string
  customCpu: string
  customMemoryGib: string
  useCustom: boolean
  clusterControlPlaneCount: number
  clusterWorkerCount: number
  clusterHostType: string
  // Step 4 — shared: SSH key
  authType: 'keypair' | 'password'
  keyPairName: string
  username: string
  password: string
  // Step 5 — network (shared; cluster adds CIDRs)
  assignPublicIP: boolean
  virtualNetworkId: string
  subnetId: string
  selectedSecurityGroupIds: string[]
  sgSelectOpen: boolean
  clusterPodCidr: string
  clusterServiceCidr: string
  // Step 6 — VM: storage volumes  /  Cluster: storage tier
  rootVolumeGib: number
  rootVolumeType: 'ssd' | 'nvme' | 'hdd'
  deleteRootOnTermination: boolean
  encryptVolumes: boolean
  additionalVolumes: VolumeEntry[]
  clusterStorageTierId: string
}

const INITIAL: WizardState = {
  resourceType: 'vm',
  name: '',
  tags: [],
  osId: 'rhel-9',
  osVersion: '9.4',
  architecture: 'x86_64',
  clusterCatalogItemId: '',
  ocpReleaseImage: '',
  instanceProfileId: 'general-medium',
  customCpu: '4',
  customMemoryGib: '8',
  useCustom: false,
  clusterControlPlaneCount: 3,
  clusterWorkerCount: 3,
  clusterHostType: '',
  authType: 'keypair',
  keyPairName: '',
  username: 'ec2-user',
  password: '',
  assignPublicIP: false,
  virtualNetworkId: '',
  subnetId: '',
  selectedSecurityGroupIds: [],
  sgSelectOpen: false,
  clusterPodCidr: '10.128.0.0/14',
  clusterServiceCidr: '172.30.0.0/16',
  rootVolumeGib: 30,
  rootVolumeType: 'ssd',
  deleteRootOnTermination: true,
  encryptVolumes: false,
  additionalVolumes: [],
  clusterStorageTierId: '',
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const stepHeaderCss = css`
  margin-bottom: var(--pf-t--global--spacer--lg);
`

const osGridCss = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  margin-top: 12px;
`

// ---------------------------------------------------------------------------
// OS icon configuration
// ---------------------------------------------------------------------------

type OsFamily = 'rhel' | 'ubuntu' | 'windows' | 'centos' | 'debian'

interface OsIconConfig {
  bg: string
  fg: string
  Icon: ComponentType<{ style?: CSSProperties }>
  providerColor: 'red' | 'orange' | 'blue' | 'green' | 'purple'
}

const OS_ICON_CONFIG: Record<OsFamily, OsIconConfig> = {
  rhel: {
    bg: 'var(--pf-t--global--background--color--danger--default)',
    fg: 'var(--pf-t--global--icon--color--danger)',
    Icon: CubesIcon,
    providerColor: 'red',
  },
  ubuntu: {
    bg: 'var(--pf-t--global--background--color--warning--default)',
    fg: 'var(--pf-t--global--icon--color--warning)',
    Icon: CloudIcon,
    providerColor: 'orange',
  },
  windows: {
    bg: 'var(--pf-t--global--background--color--info--default)',
    fg: 'var(--pf-t--global--icon--color--info)',
    Icon: ServerIcon,
    providerColor: 'blue',
  },
  centos: {
    bg: 'var(--pf-t--global--background--color--success--default)',
    fg: 'var(--pf-t--global--icon--color--success)',
    Icon: CubesIcon,
    providerColor: 'green',
  },
  debian: {
    bg: 'var(--pf-t--global--background--color--danger--default)',
    fg: 'var(--pf-t--global--icon--color--danger)',
    Icon: CubesIcon,
    providerColor: 'red',
  },
}

const osIconBadgeCss = (bg: string, fg: string) => css`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  background: ${bg};
  color: ${fg};
  display: grid;
  place-items: center;
`

const osCardHeaderRowCss = css`
  display: flex;
  align-items: center;
  gap: 10px;
`

const osCardTitleCss = css`
  font-size: 0.875rem;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const osCardDescCss = css`
  margin-top: 6px;
  color: var(--pf-t--global--text--color--subtle);
  font-size: 0.78rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

// ---------------------------------------------------------------------------
// OsOptionCard sub-component
// ---------------------------------------------------------------------------

interface OsOptionCardProps {
  id: string
  label: string
  os: string
  provider: string
  description: string
  isSelected: boolean
  onSelect: () => void
}

function OsOptionCard({ label, os, provider, description, isSelected, onSelect }: OsOptionCardProps) {
  const config = OS_ICON_CONFIG[os as OsFamily] ?? OS_ICON_CONFIG.rhel
  const { Icon, bg, fg, providerColor } = config
  return (
    <Card
      isClickable
      isSelected={isSelected}
      onClick={onSelect}
      style={{
        border: `1px solid ${isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'var(--pf-t--global--border--color--default)'}`,
        outline: isSelected ? '2px solid var(--pf-t--global--border--color--brand--default)' : undefined,
      }}
    >
      <CardBody>
        <div className={osCardHeaderRowCss}>
          <div className={osIconBadgeCss(bg, fg)}>
            <Icon style={{ fontSize: 18 }} />
          </div>
          <span className={osCardTitleCss}>{label}</span>
          <Label color={providerColor} isCompact>
            {provider}
          </Label>
        </div>
        <p className={osCardDescCss}>{description}</p>
      </CardBody>
    </Card>
  )
}

const profileTableCss = css`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-top: 12px;
  td,
  th {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--pf-t--global--border--color--default);
  }
  th {
    font-weight: 600;
    color: var(--pf-t--global--text--color--subtle);
    background: var(--pf-t--global--background--color--secondary--default);
  }
  tr:hover td {
    background: var(--pf-t--global--background--color--secondary--default);
  }
`

const selectedRowCss = css`
  td {
    background: var(--pf-t--global--background--color--info--default) !important;
  }
`

const tagRowCss = css`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;
`

const volumeRowCss = css`
  padding: 12px;
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: 6px;
  margin-bottom: 10px;
`

const reviewSectionCss = css`
  margin-bottom: 20px;
`

const reviewGridCss = css`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 4px 16px;
  font-size: 0.875rem;
`

const reviewLabelCss = css`
  color: var(--pf-t--global--text--color--subtle);
  font-weight: 500;
`

// ---------------------------------------------------------------------------
// Step sub-components
// ---------------------------------------------------------------------------

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className={stepHeaderCss}>
      <Title headingLevel="h2" size="xl">
        {title}
      </Title>
      <p style={{ marginTop: 4, color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.9rem' }}>
        {description}
      </p>
    </div>
  )
}

// Step 1 — Name & Tags
function NameTagsStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  function addTag() {
    update('tags', [...state.tags, { id: `tag-${Date.now()}`, key: '', value: '' }])
  }

  function removeTag(id: string) {
    update('tags', state.tags.filter((t) => t.id !== id))
  }

  function updateTag(id: string, field: 'key' | 'value', val: string) {
    update(
      'tags',
      state.tags.map((t) => (t.id === id ? { ...t, [field]: val } : t)),
    )
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Name and tags"
          description="Give your instance a name and optional key-value tags for organisation and cost allocation."
        />
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="Instance name" fieldId="li-name" isRequired>
            <TextInput
              id="li-name"
              value={state.name}
              onChange={(_, v) => update('name', v)}
              placeholder="e.g. my-app-server-01"
            />
          </FormGroup>
        </Form>
      </StackItem>
      <StackItem>
        <Title headingLevel="h3" size="md" style={{ marginBottom: 8 }}>
          Tags
        </Title>
        {state.tags.map((tag) => (
          <div key={tag.id} className={tagRowCss}>
            <FormGroup label="Key" fieldId={`tag-key-${tag.id}`} style={{ flex: 1 }}>
              <TextInput
                id={`tag-key-${tag.id}`}
                value={tag.key}
                onChange={(_, v) => updateTag(tag.id, 'key', v)}
                placeholder="Key"
              />
            </FormGroup>
            <FormGroup label="Value" fieldId={`tag-val-${tag.id}`} style={{ flex: 1 }}>
              <TextInput
                id={`tag-val-${tag.id}`}
                value={tag.value}
                onChange={(_, v) => updateTag(tag.id, 'value', v)}
                placeholder="Value"
              />
            </FormGroup>
            <Button
              variant="plain"
              aria-label="Remove tag"
              style={{ marginTop: 26 }}
              onClick={() => removeTag(tag.id)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addTag}>
          Add tag
        </Button>
      </StackItem>
    </Stack>
  )
}

// Step 2 — Application & OS Image
function OsImageStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const selected = OS_OPTIONS.find((o) => o.id === state.osId) ?? OS_OPTIONS[0]

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Application and OS image"
          description="Select the operating system and architecture for your instance boot image."
        />
      </StackItem>

      <StackItem>
        <Title headingLevel="h3" size="md">
          Operating system
        </Title>
        <div className={osGridCss}>
          {OS_OPTIONS.map((opt) => (
            <OsOptionCard
              key={opt.id}
              id={opt.id}
              label={opt.label}
              os={opt.os}
              provider={opt.provider}
              description={opt.description}
              isSelected={state.osId === opt.id}
              onSelect={() => {
                update('osId', opt.id)
                update('osVersion', opt.versions[0])
              }}
            />
          ))}
        </div>
      </StackItem>

      <StackItem>
        <Form>
          <Grid hasGutter>
            <GridItem span={4}>
              <FormGroup label="Version" fieldId="li-os-version">
                <FormSelect
                  id="li-os-version"
                  value={state.osVersion}
                  onChange={(_, v) => update('osVersion', v)}
                >
                  {selected.versions.map((v) => (
                    <FormSelectOption key={v} value={v} label={v} />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>
            <GridItem span={4}>
              <FormGroup label="Architecture" fieldId="li-arch">
                <FormSelect
                  id="li-arch"
                  value={state.architecture}
                  onChange={(_, v) =>
                    update('architecture', v as WizardState['architecture'])
                  }
                >
                  {ARCHITECTURES.map((a) => (
                    <FormSelectOption key={a.value} value={a.value} label={a.label} />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>
          </Grid>
        </Form>
      </StackItem>
    </Stack>
  )
}

// Step 3 — Instance Type
function InstanceTypeStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const categories = ['general', 'compute', 'memory', 'gpu'] as const
  const [catFilter, setCatFilter] = useState<string>('all')

  const visible =
    catFilter === 'all'
      ? INSTANCE_PROFILES
      : INSTANCE_PROFILES.filter((p) => p.category === catFilter)

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Instance type"
          description="Choose a pre-defined profile or specify custom vCPU and memory."
        />
      </StackItem>

      <StackItem>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['all', ...categories].map((c) => (
            <Button
              key={c}
              variant={catFilter === c ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCatFilter(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>

        <table className={profileTableCss}>
          <thead>
            <tr>
              <th></th>
              <th>Profile</th>
              <th>vCPU</th>
              <th>Memory (GiB)</th>
              <th>Category</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.id}
                className={!state.useCustom && state.instanceProfileId === p.id ? selectedRowCss : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  update('instanceProfileId', p.id)
                  update('useCustom', false)
                }}
              >
                <td>
                  <Radio
                    id={`profile-${p.id}`}
                    name="instanceProfile"
                    isChecked={!state.useCustom && state.instanceProfileId === p.id}
                    onChange={() => {
                      update('instanceProfileId', p.id)
                      update('useCustom', false)
                    }}
                    aria-label={p.label}
                  />
                </td>
                <td>
                  <code>{p.label}</code>
                </td>
                <td>{p.cpu}</td>
                <td>{p.memoryGib}</td>
                <td>
                  <Label color="grey" isCompact>
                    {p.category}
                  </Label>
                </td>
                <td style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                  {p.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StackItem>

      <StackItem>
        <Divider />
        <div style={{ marginTop: 12 }}>
          <Switch
            id="li-custom-type"
            label="Use custom vCPU / memory"
            isChecked={state.useCustom}
            onChange={(_, v) => update('useCustom', v)}
          />
        </div>
        {state.useCustom && (
          <Form style={{ marginTop: 12, maxWidth: 400 }}>
            <Grid hasGutter>
              <GridItem span={6}>
                <FormGroup label="vCPU count" fieldId="li-custom-cpu" isRequired>
                  <TextInput
                    id="li-custom-cpu"
                    type="number"
                    value={state.customCpu}
                    onChange={(_, v) => update('customCpu', v)}
                    min={1}
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={6}>
                <FormGroup label="Memory (GiB)" fieldId="li-custom-mem" isRequired>
                  <TextInput
                    id="li-custom-mem"
                    type="number"
                    value={state.customMemoryGib}
                    onChange={(_, v) => update('customMemoryGib', v)}
                    min={1}
                  />
                </FormGroup>
              </GridItem>
            </Grid>
          </Form>
        )}
      </StackItem>
    </Stack>
  )
}

// Step 4 — Login
function LoginStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Login credentials"
          description="Configure how you will authenticate to this instance after launch."
        />
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="Authentication type" fieldId="li-auth-type" isRequired>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Radio
                id="auth-keypair"
                name="authType"
                label="SSH key pair"
                description="Recommended. Uses a public/private key pair for secure access."
                isChecked={state.authType === 'keypair'}
                onChange={() => update('authType', 'keypair')}
              />
              <Radio
                id="auth-password"
                name="authType"
                label="Password"
                description="Set a password for the default user account."
                isChecked={state.authType === 'password'}
                onChange={() => update('authType', 'password')}
              />
            </div>
          </FormGroup>

          {state.authType === 'keypair' && (
            <FormGroup label="Key pair name" fieldId="li-keypair" isRequired>
              <TextInput
                id="li-keypair"
                value={state.keyPairName}
                onChange={(_, v) => update('keyPairName', v)}
                placeholder="e.g. my-ssh-key"
              />
              <HelperText>
                <HelperTextItem>
                  Paste the name of an existing key pair or the public key will be injected via
                  cloud-init.
                </HelperTextItem>
              </HelperText>
            </FormGroup>
          )}

          {state.authType === 'password' && (
            <FormGroup label="Password" fieldId="li-password" isRequired>
              <TextInput
                id="li-password"
                type="password"
                value={state.password}
                onChange={(_, v) => update('password', v)}
                placeholder="Enter a secure password"
              />
            </FormGroup>
          )}

          <FormGroup label="Default username" fieldId="li-username">
            <TextInput
              id="li-username"
              value={state.username}
              onChange={(_, v) => update('username', v)}
              placeholder="e.g. ec2-user"
            />
            <HelperText>
              <HelperTextItem>
                Default: <code>ec2-user</code> for RHEL/CentOS, <code>ubuntu</code> for Ubuntu,{' '}
                <code>Administrator</code> for Windows.
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </Form>
      </StackItem>
    </Stack>
  )
}

// Step 5 — Network
function NetworkStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const { data: vnets = [] } = useVirtualNetworks()
  const { data: allSubnets = [] } = useAllSubnets()
  const { data: securityGroups = [] } = useSecurityGroups()
  const { data: publicIPPools = [] } = usePublicIPPools()

  const subnets = state.virtualNetworkId
    ? allSubnets.filter((s) => s.spec.virtualNetwork === state.virtualNetworkId)
    : allSubnets

  function toggleSg(id: string) {
    const has = state.selectedSecurityGroupIds.includes(id)
    update(
      'selectedSecurityGroupIds',
      has
        ? state.selectedSecurityGroupIds.filter((s) => s !== id)
        : [...state.selectedSecurityGroupIds, id],
    )
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Network settings"
          description="Choose the virtual network, subnet, and security groups for this instance."
        />
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="Virtual network (VPC)" fieldId="li-vnet">
            <FormSelect
              id="li-vnet"
              value={state.virtualNetworkId}
              onChange={(_, v) => {
                update('virtualNetworkId', v)
                update('subnetId', '')
              }}
            >
              <FormSelectOption value="" label="— Select a VPC —" />
              {vnets.map((vn) => (
                <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Subnet" fieldId="li-subnet">
            <FormSelect
              id="li-subnet"
              value={state.subnetId}
              onChange={(_, v) => update('subnetId', v)}
              isDisabled={!state.virtualNetworkId}
            >
              <FormSelectOption value="" label="— Select a subnet —" />
              {subnets.map((s) => (
                <FormSelectOption
                  key={s.id}
                  value={s.id}
                  label={`${s.metadata.name} (${s.spec.ipv4Cidr ?? s.id})`}
                />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Security groups" fieldId="li-sg">
            <Select
              isOpen={state.sgSelectOpen}
              onOpenChange={(v) => update('sgSelectOpen', v)}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  onClick={() => update('sgSelectOpen', !state.sgSelectOpen)}
                  style={{ minWidth: 300 }}
                >
                  {state.selectedSecurityGroupIds.length === 0
                    ? 'Select security groups'
                    : `${state.selectedSecurityGroupIds.length} selected`}
                </MenuToggle>
              )}
            >
              <SelectList>
                {securityGroups.map((sg) => (
                  <SelectOption
                    key={sg.id}
                    value={sg.id}
                    hasCheckbox
                    isSelected={state.selectedSecurityGroupIds.includes(sg.id)}
                    onClick={() => toggleSg(sg.id)}
                  >
                    {sg.metadata.name}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            {state.selectedSecurityGroupIds.length > 0 && (
              <LabelGroup style={{ marginTop: 8 }}>
                {state.selectedSecurityGroupIds.map((id) => {
                  const sg = securityGroups.find((s) => s.id === id)
                  return (
                    <Label key={id} isCompact onClose={() => toggleSg(id)}>
                      {sg?.metadata.name ?? id}
                    </Label>
                  )
                })}
              </LabelGroup>
            )}
          </FormGroup>

          <FormGroup fieldId="li-public-ip" label="Public IP">
            <Switch
              id="li-public-ip"
              label="Assign public IP address"
              isChecked={state.assignPublicIP}
              onChange={(_, v) => update('assignPublicIP', v)}
            />
            {state.assignPublicIP && publicIPPools.length > 0 && (
              <HelperText style={{ marginTop: 8 }}>
                <HelperTextItem>
                  A public IP will be allocated from pool <strong>{publicIPPools[0].metadata.name}</strong>.
                </HelperTextItem>
              </HelperText>
            )}
          </FormGroup>
        </Form>
      </StackItem>
    </Stack>
  )
}

// Step 6 — Storage
function StorageStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  function addVolume() {
    update('additionalVolumes', [
      ...state.additionalVolumes,
      {
        id: `vol-${Date.now()}`,
        sizeGib: 50,
        type: 'ssd',
        deleteOnTermination: true,
      },
    ])
  }

  function removeVolume(id: string) {
    update(
      'additionalVolumes',
      state.additionalVolumes.filter((v) => v.id !== id),
    )
  }

  function updateVolume<K extends keyof VolumeEntry>(id: string, field: K, val: VolumeEntry[K]) {
    update(
      'additionalVolumes',
      state.additionalVolumes.map((v) => (v.id === id ? { ...v, [field]: val } : v)),
    )
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Storage"
          description="Configure the root volume and attach additional data volumes."
        />
      </StackItem>

      {/* Root volume */}
      <StackItem>
        <Title headingLevel="h3" size="md" style={{ marginBottom: 10 }}>
          Root volume
        </Title>
        <div className={volumeRowCss}>
          <Form>
            <Grid hasGutter>
              <GridItem span={4}>
                <FormGroup label="Size (GiB)" fieldId="li-root-size" isRequired>
                  <TextInput
                    id="li-root-size"
                    type="number"
                    value={state.rootVolumeGib}
                    onChange={(_, v) => update('rootVolumeGib', Number(v))}
                    min={8}
                  />
                </FormGroup>
              </GridItem>
              <GridItem span={4}>
                <FormGroup label="Volume type" fieldId="li-root-type">
                  <FormSelect
                    id="li-root-type"
                    value={state.rootVolumeType}
                    onChange={(_, v) =>
                      update('rootVolumeType', v as WizardState['rootVolumeType'])
                    }
                  >
                    {VOLUME_TYPES.map((t) => (
                      <FormSelectOption key={t.value} value={t.value} label={t.label} />
                    ))}
                  </FormSelect>
                </FormGroup>
              </GridItem>
              <GridItem span={4} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                <Checkbox
                  id="li-root-del"
                  label="Delete on termination"
                  isChecked={state.deleteRootOnTermination}
                  onChange={(_, v) => update('deleteRootOnTermination', v)}
                />
              </GridItem>
            </Grid>
          </Form>
        </div>
      </StackItem>

      {/* Additional volumes */}
      <StackItem>
        <Title headingLevel="h3" size="md" style={{ marginBottom: 10 }}>
          Additional volumes
        </Title>
        {state.additionalVolumes.map((vol, idx) => (
          <div key={vol.id} className={volumeRowCss}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <strong style={{ fontSize: '0.875rem' }}>Volume {idx + 1}</strong>
              <Button
                variant="plain"
                aria-label="Remove volume"
                onClick={() => removeVolume(vol.id)}
              >
                <TrashIcon />
              </Button>
            </div>
            <Form>
              <Grid hasGutter>
                <GridItem span={4}>
                  <FormGroup label="Size (GiB)" fieldId={`li-vol-size-${vol.id}`} isRequired>
                    <TextInput
                      id={`li-vol-size-${vol.id}`}
                      type="number"
                      value={vol.sizeGib}
                      onChange={(_, v) => updateVolume(vol.id, 'sizeGib', Number(v))}
                      min={1}
                    />
                  </FormGroup>
                </GridItem>
                <GridItem span={4}>
                  <FormGroup label="Volume type" fieldId={`li-vol-type-${vol.id}`}>
                    <FormSelect
                      id={`li-vol-type-${vol.id}`}
                      value={vol.type}
                      onChange={(_, v) =>
                        updateVolume(vol.id, 'type', v as VolumeEntry['type'])
                      }
                    >
                      {VOLUME_TYPES.map((t) => (
                        <FormSelectOption key={t.value} value={t.value} label={t.label} />
                      ))}
                    </FormSelect>
                  </FormGroup>
                </GridItem>
                <GridItem
                  span={4}
                  style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}
                >
                  <Checkbox
                    id={`li-vol-del-${vol.id}`}
                    label="Delete on termination"
                    isChecked={vol.deleteOnTermination}
                    onChange={(_, v) => updateVolume(vol.id, 'deleteOnTermination', v)}
                  />
                </GridItem>
              </Grid>
            </Form>
          </div>
        ))}
        <Button variant="link" icon={<PlusCircleIcon />} onClick={addVolume}>
          Add volume
        </Button>
      </StackItem>

      {/* Advanced */}
      <StackItem>
        <Divider style={{ margin: '8px 0' }} />
        <Title headingLevel="h3" size="md" style={{ marginBottom: 10 }}>
          Advanced details
        </Title>
        <Checkbox
          id="li-encrypt"
          label="Encrypt all volumes"
          description="Uses the platform-managed encryption key."
          isChecked={state.encryptVolumes}
          onChange={(_, v) => update('encryptVolumes', v)}
        />
      </StackItem>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Step 0 — Resource type selector
// ---------------------------------------------------------------------------

const resourceTypeCardCss = (selected: boolean) => css`
  padding: 16px 20px;
  border-radius: 8px;
  border: 2px solid
    ${selected
      ? 'var(--pf-t--global--border--color--brand--default)'
      : 'var(--pf-t--global--border--color--default)'};
  background: ${selected
    ? 'var(--pf-t--global--background--color--info--default)'
    : 'var(--pf-t--global--background--color--primary--default)'};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  max-width: 280px;
  &:hover {
    border-color: var(--pf-t--global--border--color--brand--hover);
  }
`

function ResourceTypeStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const types: { value: ResourceType; label: string; description: string }[] = [
    {
      value: 'vm',
      label: 'Virtual Machine',
      description: 'Provision an individual compute instance with custom OS, CPU, memory and storage.',
    },
    {
      value: 'cluster',
      label: 'OpenShift Cluster',
      description: 'Deploy a managed OpenShift cluster with configurable node sets and networking.',
    },
    {
      value: 'baremetal',
      label: 'Bare Metal',
      description: 'Provision a dedicated physical server from the available bare metal catalog.',
    },
  ]

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Choose resource type"
          description="Select what you want to provision."
        />
      </StackItem>
      <StackItem>
        <div style={{ display: 'flex', gap: 16 }}>
          {types.map((t) => (
            <div
              key={t.value}
              className={resourceTypeCardCss(state.resourceType === t.value)}
              onClick={() => update('resourceType', t.value)}
            >
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.label}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                {t.description}
              </div>
            </div>
          ))}
        </div>
      </StackItem>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Cluster-specific steps
// ---------------------------------------------------------------------------

function ClusterImageStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const { data: catalogItems = [] } = useClusterCatalogItems()
  const selectedItem: ClusterCatalogItem | undefined = catalogItems.find(
    (i) => i.id === state.clusterCatalogItemId,
  )
  const versions = selectedItem?.allowedVersions ?? []

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="OpenShift version"
          description="Select a cluster offering and the OCP release version to deploy."
        />
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="Cluster offering" fieldId="cl-catalog" isRequired>
            <FormSelect
              id="cl-catalog"
              value={state.clusterCatalogItemId}
              onChange={(_, v) => {
                update('clusterCatalogItemId', v)
                const item = catalogItems.find((i) => i.id === v)
                update('ocpReleaseImage', item?.allowedVersions?.[0] ?? '')
              }}
            >
              <FormSelectOption value="" label="— Select an offering —" />
              {catalogItems.filter((i) => i.published).map((i) => (
                <FormSelectOption key={i.id} value={i.id} label={i.title} />
              ))}
            </FormSelect>
          </FormGroup>
          {versions.length > 0 && (
            <FormGroup label="OCP release version" fieldId="cl-version">
              <FormSelect
                id="cl-version"
                value={state.ocpReleaseImage}
                onChange={(_, v) => update('ocpReleaseImage', v)}
              >
                {versions.map((v) => (
                  <FormSelectOption key={v} value={v} label={v} />
                ))}
              </FormSelect>
            </FormGroup>
          )}
          {!state.clusterCatalogItemId && (
            <HelperText>
              <HelperTextItem variant="indeterminate">
                Cluster offerings are configured by your tenant administrator.
              </HelperTextItem>
            </HelperText>
          )}
        </Form>
      </StackItem>
    </Stack>
  )
}

function ClusterNodeSetsStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Node sets"
          description="Configure control plane and worker node counts."
        />
      </StackItem>
      <StackItem>
        <Form>
          <Grid hasGutter>
            <GridItem span={4}>
              <FormGroup label="Control plane nodes" fieldId="cl-cp" isRequired>
                <FormSelect
                  id="cl-cp"
                  value={String(state.clusterControlPlaneCount)}
                  onChange={(_, v) => update('clusterControlPlaneCount', Number(v))}
                >
                  {[1, 3].map((n) => (
                    <FormSelectOption key={n} value={String(n)} label={String(n)} />
                  ))}
                </FormSelect>
              </FormGroup>
            </GridItem>
            <GridItem span={4}>
              <FormGroup label="Worker nodes" fieldId="cl-workers" isRequired>
                <TextInput
                  id="cl-workers"
                  type="number"
                  value={state.clusterWorkerCount}
                  onChange={(_, v) => update('clusterWorkerCount', Number(v))}
                  min={0}
                />
              </FormGroup>
            </GridItem>
          </Grid>
        </Form>
      </StackItem>
    </Stack>
  )
}

function ClusterNetworkStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const { data: vnets = [] } = useVirtualNetworks()
  const { data: allSubnets = [] } = useAllSubnets()
  const { data: securityGroups = [] } = useSecurityGroups()

  const subnets = state.virtualNetworkId
    ? allSubnets.filter((s) => s.spec.virtualNetwork === state.virtualNetworkId)
    : allSubnets

  function toggleSg(id: string) {
    const has = state.selectedSecurityGroupIds.includes(id)
    update(
      'selectedSecurityGroupIds',
      has
        ? state.selectedSecurityGroupIds.filter((s) => s !== id)
        : [...state.selectedSecurityGroupIds, id],
    )
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Network settings"
          description="Choose the VPC, subnet, and CIDRs for this cluster."
        />
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="Virtual network (VPC)" fieldId="cl-vnet">
            <FormSelect
              id="cl-vnet"
              value={state.virtualNetworkId}
              onChange={(_, v) => { update('virtualNetworkId', v); update('subnetId', '') }}
            >
              <FormSelectOption value="" label="— Select a VPC —" />
              {vnets.map((vn) => (
                <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Subnet" fieldId="cl-subnet">
            <FormSelect
              id="cl-subnet"
              value={state.subnetId}
              onChange={(_, v) => update('subnetId', v)}
              isDisabled={!state.virtualNetworkId}
            >
              <FormSelectOption value="" label="— Select a subnet —" />
              {subnets.map((s) => (
                <FormSelectOption
                  key={s.id}
                  value={s.id}
                  label={`${s.metadata.name} (${s.spec.ipv4Cidr ?? s.id})`}
                />
              ))}
            </FormSelect>
          </FormGroup>
          <Grid hasGutter>
            <GridItem span={6}>
              <FormGroup label="Pod CIDR" fieldId="cl-pod-cidr">
                <TextInput
                  id="cl-pod-cidr"
                  value={state.clusterPodCidr}
                  onChange={(_, v) => update('clusterPodCidr', v)}
                  placeholder="10.128.0.0/14"
                />
              </FormGroup>
            </GridItem>
            <GridItem span={6}>
              <FormGroup label="Service CIDR" fieldId="cl-svc-cidr">
                <TextInput
                  id="cl-svc-cidr"
                  value={state.clusterServiceCidr}
                  onChange={(_, v) => update('clusterServiceCidr', v)}
                  placeholder="172.30.0.0/16"
                />
              </FormGroup>
            </GridItem>
          </Grid>
          <FormGroup label="Security groups" fieldId="cl-sg">
            <Select
              isOpen={state.sgSelectOpen}
              onOpenChange={(v) => update('sgSelectOpen', v)}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  onClick={() => update('sgSelectOpen', !state.sgSelectOpen)}
                  style={{ minWidth: 300 }}
                >
                  {state.selectedSecurityGroupIds.length === 0
                    ? 'Select security groups'
                    : `${state.selectedSecurityGroupIds.length} selected`}
                </MenuToggle>
              )}
            >
              <SelectList>
                {securityGroups.map((sg) => (
                  <SelectOption
                    key={sg.id}
                    value={sg.id}
                    hasCheckbox
                    isSelected={state.selectedSecurityGroupIds.includes(sg.id)}
                    onClick={() => toggleSg(sg.id)}
                  >
                    {sg.metadata.name}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        </Form>
      </StackItem>
    </Stack>
  )
}

function ClusterStorageStep({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  const { data: tiers = [] } = useStorageTiers()

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Storage tier"
          description="Select the storage tier that will be used for cluster persistent volumes."
        />
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="Storage tier" fieldId="cl-storage-tier">
            <FormSelect
              id="cl-storage-tier"
              value={state.clusterStorageTierId}
              onChange={(_, v) => update('clusterStorageTierId', v)}
            >
              <FormSelectOption value="" label="— Select a tier (optional) —" />
              {tiers.filter((t) => t.available).map((t) => (
                <FormSelectOption key={t.id} value={t.id} label={t.name} />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </StackItem>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Cluster mapper
// ---------------------------------------------------------------------------

function mapWizardStateToCluster(state: WizardState): Partial<Cluster> {
  const labels: Record<string, string> = {}
  for (const tag of state.tags) {
    if (tag.key.trim()) labels[tag.key.trim()] = tag.value.trim()
  }

  return {
    metadata: {
      name: state.name.trim() || `cluster-${Date.now()}`,
      ...(Object.keys(labels).length ? { labels } : {}),
    },
    spec: {
      catalogItem: state.clusterCatalogItemId || undefined,
      releaseImage: state.ocpReleaseImage || undefined,
      sshPublicKey: state.authType === 'keypair' && state.keyPairName.trim()
        ? state.keyPairName.trim()
        : undefined,
      nodeSets: {
        'control-plane': { size: state.clusterControlPlaneCount },
        workers: { size: state.clusterWorkerCount },
      },
      network: {
        podCidr: state.clusterPodCidr || undefined,
        serviceCidr: state.clusterServiceCidr || undefined,
        virtualNetworkRef: state.virtualNetworkId || undefined,
        subnetRef: state.subnetId || undefined,
        securityGroupRefs:
          state.selectedSecurityGroupIds.length > 0
            ? state.selectedSecurityGroupIds
            : undefined,
      },
      storageTierIds: state.clusterStorageTierId ? [state.clusterStorageTierId] : undefined,
    },
  }
}

// Review step
function ReviewStep({ state }: { state: WizardState }) {
  const profile = INSTANCE_PROFILES.find((p) => p.id === state.instanceProfileId)
  const osOption = OS_OPTIONS.find((o) => o.id === state.osId)
  const cpu = state.useCustom ? state.customCpu : profile?.cpu
  const mem = state.useCustom ? state.customMemoryGib : profile?.memoryGib

  function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className={reviewSectionCss}>
        <Title headingLevel="h3" size="md" style={{ marginBottom: 8 }}>
          {title}
        </Title>
        <div className={reviewGridCss}>{children}</div>
        <Divider style={{ marginTop: 12 }} />
      </div>
    )
  }

  function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <>
        <div className={reviewLabelCss}>{label}</div>
        <div>{value}</div>
      </>
    )
  }

  const isCluster = state.resourceType === 'cluster'
  const isBm = state.resourceType === 'baremetal'

  const resourceTypeLabel = isCluster ? 'OpenShift Cluster' : isBm ? 'Bare Metal' : 'Virtual Machine'
  const launchDesc = isCluster ? 'deploying the cluster' : isBm ? 'provisioning the server' : 'launching the instance'

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Review and launch"
          description={`Confirm your configuration before ${launchDesc}.`}
        />
      </StackItem>
      <StackItem>
        <ReviewSection title="Resource">
          <Row label="Type" value={resourceTypeLabel} />
          <Row label="Name" value={state.name || <em style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>—</em>} />
          <Row
            label="Tags"
            value={
              state.tags.length > 0 ? (
                <LabelGroup>
                  {state.tags.map((t) => (
                    <Label key={t.id} isCompact color="grey">
                      {t.key}: {t.value}
                    </Label>
                  ))}
                </LabelGroup>
              ) : (
                <em style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>None</em>
              )
            }
          />
        </ReviewSection>

        {isCluster ? (
          <>
            <ReviewSection title="OpenShift Version">
              <Row label="Catalog offering" value={state.clusterCatalogItemId || '—'} />
              <Row label="OCP release" value={state.ocpReleaseImage || '—'} />
            </ReviewSection>

            <ReviewSection title="Node Sets">
              <Row label="Control plane" value={state.clusterControlPlaneCount} />
              <Row label="Workers" value={state.clusterWorkerCount} />
            </ReviewSection>
          </>
        ) : (
          <>
            <ReviewSection title="OS Image">
              <Row label="OS" value={osOption?.label ?? state.osId} />
              <Row label="Version" value={state.osVersion} />
              <Row label="Architecture" value={state.architecture} />
            </ReviewSection>

            <ReviewSection title="Instance Type">
              <Row
                label="Profile"
                value={
                  state.useCustom ? (
                    <em>Custom</em>
                  ) : (
                    <code>{profile?.label ?? state.instanceProfileId}</code>
                  )
                }
              />
              <Row label="vCPU" value={cpu} />
              <Row label="Memory (GiB)" value={mem} />
            </ReviewSection>
          </>
        )}

        <ReviewSection title="Login">
          <Row label="Auth type" value={state.authType === 'keypair' ? 'SSH key pair' : 'Password'} />
          {state.authType === 'keypair' && (
            <Row label="Key pair" value={state.keyPairName || '—'} />
          )}
          {!isCluster && !isBm && <Row label="Username" value={<code>{state.username}</code>} />}
        </ReviewSection>

        {!isBm && (
          <>
            <ReviewSection title="Network">
              {!isCluster && <Row label="Public IP" value={state.assignPublicIP ? 'Yes' : 'No'} />}
              <Row label="VPC" value={state.virtualNetworkId || '—'} />
              <Row label="Subnet" value={state.subnetId || '—'} />
              <Row
                label="Security groups"
                value={
                  state.selectedSecurityGroupIds.length > 0
                    ? state.selectedSecurityGroupIds.join(', ')
                    : '—'
                }
              />
              {isCluster && (
                <>
                  <Row label="Pod CIDR" value={state.clusterPodCidr || '—'} />
                  <Row label="Service CIDR" value={state.clusterServiceCidr || '—'} />
                </>
              )}
            </ReviewSection>

            <ReviewSection title="Storage">
              {isCluster ? (
                <Row label="Storage tier" value={state.clusterStorageTierId || 'Default'} />
              ) : (
                <>
                  <Row
                    label="Root volume"
                    value={`${state.rootVolumeGib} GiB · ${VOLUME_TYPES.find((t) => t.value === state.rootVolumeType)?.label ?? state.rootVolumeType}`}
                  />
                  <Row
                    label="Data volumes"
                    value={state.additionalVolumes.length > 0 ? `${state.additionalVolumes.length} volume(s)` : 'None'}
                  />
                  <Row label="Encryption" value={state.encryptVolumes ? 'Enabled' : 'Disabled'} />
                </>
              )}
            </ReviewSection>
          </>
        )}
      </StackItem>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Mapper: WizardState → Partial<ComputeInstance>
// ---------------------------------------------------------------------------

function mapWizardStateToComputeInstance(state: WizardState): Partial<ComputeInstance> {
  const profile = INSTANCE_PROFILES.find((p) => p.id === state.instanceProfileId)
  const cores = state.useCustom ? Number(state.customCpu) || 1 : (profile?.cpu ?? 2)
  const memoryGib = state.useCustom ? Number(state.customMemoryGib) || 1 : (profile?.memoryGib ?? 4)

  const labels: Record<string, string> = {}
  for (const tag of state.tags) {
    if (tag.key.trim()) labels[tag.key.trim()] = tag.value.trim()
  }

  const sourceRef = OS_SOURCE_REF[state.osId] ?? state.osId
  const sourceRefWithVersion = `${sourceRef}:${state.osVersion}`

  const networkAttachments =
    state.subnetId
      ? [{ subnet: state.subnetId, securityGroups: state.selectedSecurityGroupIds }]
      : undefined

  const additionalDisks = state.additionalVolumes.map((v) => ({ size_gib: v.sizeGib }))

  return {
    metadata: {
      name: state.name.trim() || `instance-${Date.now()}`,
      ...(Object.keys(labels).length ? { labels } : {}),
    },
    spec: {
      cores,
      memoryGib,
      image: { source_type: 'registry', source_ref: sourceRefWithVersion },
      bootDisk: { size_gib: state.rootVolumeGib },
      ...(additionalDisks.length ? { additionalDisks } : {}),
      runStrategy: 'Always',
      ...(state.authType === 'keypair' && state.keyPairName.trim()
        ? { sshKey: state.keyPairName.trim() }
        : {}),
      ...(networkAttachments ? { networkAttachments } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Default wizard footer (Back / Next / Cancel) — used for all non-Review steps
// ---------------------------------------------------------------------------

function WizardNavFooter({ onClose }: { onClose: () => void }) {
  const { activeStep, goToNextStep, goToPrevStep, steps } = useWizardContext()
  const currentIndex = steps.findIndex((s) => s.id === activeStep.id)
  const isFirst = currentIndex <= 0
  const isLast = currentIndex === steps.length - 1
  if (isLast) return null // Review step renders its own footer
  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListItem>
          <Button variant="primary" onClick={() => void goToNextStep()}>
            Next
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button variant="secondary" onClick={() => void goToPrevStep()} isDisabled={isFirst}>
            Back
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button variant="link" onClick={onClose}>
            Cancel
          </Button>
        </ActionListItem>
      </ActionList>
    </WizardFooterWrapper>
  )
}

// ---------------------------------------------------------------------------
// Step builder — returns a flat array so Wizard never receives fragments/nulls
// ---------------------------------------------------------------------------

interface StepBuilderArgs {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
  isCluster: boolean
  isBm: boolean
  isSubmitting: boolean
  launchLabel: string
  launchingLabel: string
  launchError: string | null
  handleLaunch: () => void
  handleClose: () => void
}

function buildWizardSteps({
  state,
  update,
  isCluster,
  isBm,
  isSubmitting,
  launchLabel,
  launchingLabel,
  launchError,
  handleLaunch,
  handleClose,
}: StepBuilderArgs): React.ReactElement[] {
  const reviewFooter = (
    <WizardFooterWrapper>
      {launchError && (
        <Alert variant="danger" isInline title="Launch failed" style={{ marginBottom: 12 }}>
          {launchError}
        </Alert>
      )}
      <ActionList>
        <ActionListItem>
          <Button
            variant="primary"
            onClick={handleLaunch}
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" style={{ marginRight: 8 }} />
                {launchingLabel}
              </>
            ) : (
              launchLabel
            )}
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button variant="link" onClick={handleClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
        </ActionListItem>
      </ActionList>
    </WizardFooterWrapper>
  )

  const steps: React.ReactElement[] = [
    <WizardStep name="Resource type" id="li-step-resource-type" key="resource-type">
      <ResourceTypeStep state={state} update={update} />
    </WizardStep>,

    <WizardStep name="Name & tags" id="li-step-name" key="name-tags">
      <NameTagsStep state={state} update={update} />
    </WizardStep>,
  ]

  if (isCluster) {
    steps.push(
      <WizardStep name="OCP version" id="li-step-ocp-version" key="ocp-version">
        <ClusterImageStep state={state} update={update} />
      </WizardStep>,
      <WizardStep name="Node sets" id="li-step-node-sets" key="node-sets">
        <ClusterNodeSetsStep state={state} update={update} />
      </WizardStep>,
    )
  } else {
    steps.push(
      <WizardStep name="OS image" id="li-step-os" key="os-image">
        <OsImageStep state={state} update={update} />
      </WizardStep>,
      <WizardStep name="Instance type" id="li-step-type" key="instance-type">
        <InstanceTypeStep state={state} update={update} />
      </WizardStep>,
    )
  }

  steps.push(
    <WizardStep name="Login" id="li-step-login" key="login">
      <LoginStep state={state} update={update} />
    </WizardStep>,
  )

  if (!isBm) {
    if (isCluster) {
      steps.push(
        <WizardStep name="Network" id="li-step-cl-network" key="cl-network">
          <ClusterNetworkStep state={state} update={update} />
        </WizardStep>,
        <WizardStep name="Storage" id="li-step-cl-storage" key="cl-storage">
          <ClusterStorageStep state={state} update={update} />
        </WizardStep>,
      )
    } else {
      steps.push(
        <WizardStep name="Network" id="li-step-network" key="vm-network">
          <NetworkStep state={state} update={update} />
        </WizardStep>,
        <WizardStep name="Storage" id="li-step-storage" key="vm-storage">
          <StorageStep state={state} update={update} />
        </WizardStep>,
      )
    }
  }

  steps.push(
    <WizardStep name="Review" id="li-step-review" key="review" footer={reviewFooter}>
      <ReviewStep state={state} />
    </WizardStep>,
  )

  return steps
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

interface LaunchInstanceWizardProps {
  isOpen: boolean
  onClose: () => void
  onProvisioned?: (vm: ComputeInstance) => void
}

export function LaunchInstanceWizard({
  isOpen,
  onClose,
  onProvisioned,
}: LaunchInstanceWizardProps) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<WizardState>(INITIAL)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const provisionVm = useProvisionVm()
  const createCluster = useCreateCluster()
  const createBm = useCreateBareMetalInstance()
  const refetchInstances = () => refetchComputeInstancesQueries(queryClient)
  const { registerPending, noteCreateSuccess, dismissPending } = usePendingVmCreations([], {
    refetchInstances,
  })

  const isCluster = state.resourceType === 'cluster'
  const isBm = state.resourceType === 'baremetal'

  // Catalog items for RequestBareMetalWizard (baremetal only, published)
  const bmCatalogItems: BareMetalWizardCatalogItem[] = catalogItemsStore
    .getPublished()
    .filter((i) => i.type === 'baremetal')
    .map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      published: i.published,
      fieldDefinitions: i.fieldDefinitions,
    }))

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function handleBmSubmit(payload: BareMetalWizardCreatePayload) {
    createBm.mutate(payload, {
      onSuccess: () => {
        onClose()
        setState(INITIAL)
      },
    })
  }

  function handleLaunch() {
    setLaunchError(null)

    if (isCluster) {
      const payload = mapWizardStateToCluster(state)
      createCluster.mutate(payload, {
        onSuccess: () => {
          onClose()
          setState(INITIAL)
        },
        onError: (err) => {
          setLaunchError(err instanceof Error ? err.message : 'Failed to deploy cluster.')
        },
      })
      return
    }

    const vm = mapWizardStateToComputeInstance(state)
    const clientId = registerPending(vm as ComputeInstance)
    provisionVm.mutate(
      { vm },
      {
        onSuccess: (created) => {
          noteCreateSuccess(clientId, created.id)
          onProvisioned?.(created)
          onClose()
          setState(INITIAL)
        },
        onError: (err) => {
          dismissPending(clientId)
          setLaunchError(err instanceof Error ? err.message : 'Failed to launch instance.')
        },
      },
    )
  }

  function handleClose() {
    if (provisionVm.isPending || createCluster.isPending || createBm.isPending) return
    onClose()
    setState(INITIAL)
    setLaunchError(null)
  }

  const isSubmitting = provisionVm.isPending || createCluster.isPending || createBm.isPending
  const launchLabel = isCluster ? 'Deploy cluster' : 'Launch instance'
  const launchingLabel = isCluster ? 'Deploying…' : 'Launching…'

  // When bare metal is selected, delegate entirely to the shared RequestBareMetalWizard
  if (isBm) {
    return (
      <RequestBareMetalWizard
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleBmSubmit}
        isSubmitting={createBm.isPending}
        catalogItems={bmCatalogItems}
        availableImages={BM_IMAGES.map((img) => ({ id: img.id, name: img.name }))}
      />
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="large"
      aria-label="Launch instance wizard"
      style={{ '--pf-v6-c-modal-box--Width': '1100px', '--pf-v6-c-modal-box--Height': '90vh' } as React.CSSProperties}
    >
      <ModalHeader
        title={isCluster ? 'Deploy an OpenShift cluster' : 'Launch an instance'}
        description="Configure and provision a new workload step by step."
      />
      <ModalBody style={{ height: 'calc(90vh - 120px)', padding: 0 }}>
        <Wizard
          onClose={handleClose}
          height="100%"
          footer={<WizardNavFooter onClose={handleClose} />}
        >
          {buildWizardSteps({
            state,
            update,
            isCluster,
            isBm,
            isSubmitting,
            launchLabel,
            launchingLabel,
            launchError,
            handleLaunch,
            handleClose,
          })}
        </Wizard>
      </ModalBody>
    </Modal>
  )
}
