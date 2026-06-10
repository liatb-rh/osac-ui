import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
/**
 * flow: vm-template-catalog
 * steps: vmc_catalog_grid, vmc_catalog_provider_global
 */
import { css } from '@emotion/css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  ExpandableSection,
  Flex,
  FlexItem,
  PageSection,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Switch,
  Title,
} from '@patternfly/react-core'
import type { ClusterTemplate, ComputeInstance } from '@osac/api-contracts'
import { useLocation } from 'react-router-dom'
import linuxMascotUrl from '../../assets/guest-os-tux-linux.png'
import { useSession } from '../../contexts/SessionContext'
import { useComputeInstanceTemplates, useComputeInstances, useProvisionVm } from '../../hooks/hooks'
import { PageHeader } from '@osac/ui-components'
import type {
  CreateVmWizardHandle,
  DeploymentMode,
} from '../../components/vm/createVmWizard/CreateVmWizard'
import { CreateVmWizard } from '../../components/vm/createVmWizard/CreateVmWizard'
import { TemplatesGallery } from '@osac/ui-components'

interface Props {
  isProviderGlobal?: boolean
}

type OsFilterKey = 'rhel' | 'windows' | 'linux'
type WorkloadFilterKey = 'highPerformance' | 'machineLearning' | 'dataProcessing' | 'analytics'

const OS_FILTER_CONFIG: Array<{
  key: OsFilterKey
  label: string
  matches: (template: ClusterTemplate) => boolean
}> = [
  { key: 'rhel', label: 'RHEL', matches: (template) => template.icon === 'rhel' },
  { key: 'windows', label: 'Windows', matches: (template) => template.icon === 'windows' },
  { key: 'linux', label: 'Linux', matches: (template) => template.icon === 'linux' },
]

const WORKLOAD_FILTER_CONFIG: Array<{
  key: WorkloadFilterKey
  label: string
  matches: (template: ClusterTemplate) => boolean
}> = [
  {
    key: 'highPerformance',
    label: 'High performance',
    matches: (template) => template.workloadProfile === 'high-performance',
  },
  {
    key: 'machineLearning',
    label: 'Machine learning',
    matches: (template) => template.workloadProfile === 'machine-learning',
  },
  {
    key: 'dataProcessing',
    label: 'Data processing',
    matches: (template) => template.workloadProfile === 'data-processing',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    matches: (template) => template.workloadProfile === 'analytics',
  },
]

function searchableTemplateText(template: ClusterTemplate): string {
  const subtitle =
    template.description && template.description.trim().length > 0
      ? template.description
      : template.metadata.name
  const workloadLabel = (() => {
    if (!template.workloadProfile) return template.workload ?? 'General'
    if (template.workloadProfile === 'high-performance') return 'High performance'
    if (template.workloadProfile === 'machine-learning') return 'Machine learning'
    if (template.workloadProfile === 'data-processing') return 'Data processing'
    return 'Analytics'
  })()
  const bootDiskGib = template.defaultBootDiskSizeGib ?? 40

  return [
    template.title,
    subtitle,
    template.description,
    template.metadata.name,
    template.workload,
    template.workloadProfile,
    workloadLabel,
    `${bootDiskGib} gib`,
    bootDiskGib.toString(),
    'Pod network',
    'Guest logs on',
    template.defaultCores?.toString(),
    template.defaultMemoryGib ? `${template.defaultMemoryGib} gib` : '',
    template.defaultMemoryGib?.toString(),
    (template.tags ?? []).join(' '),
    JSON.stringify(template.metadata.labels ?? {}),
    JSON.stringify(template.spec ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function guestOperatingSystem(template: ClusterTemplate): string {
  if (template.icon === 'windows') return 'Microsoft Windows'
  if (template.icon === 'rhel') return 'Red Hat Enterprise Linux'
  return 'Linux'
}

function workloadLabel(template: ClusterTemplate): string {
  if (!template.workloadProfile) return template.workload ?? 'General'
  if (template.workloadProfile === 'high-performance') return 'High performance'
  if (template.workloadProfile === 'machine-learning') return 'Machine learning'
  if (template.workloadProfile === 'data-processing') return 'Data processing'
  return 'Analytics'
}

function drawerSubtitle(template: ClusterTemplate): string {
  const source = template.description?.trim() || template.metadata.name
  return source.length <= 88 ? source : `${source.slice(0, 87)}…`
}

const windowsIconCss = css`
  width: 28px;
  height: 28px;
  color: #0078d4;
`

const rhelIconCss = css`
  width: 28px;
  height: 28px;
  color: #ee0000;
`

const linuxMascotCss = css`
  display: block;
  object-fit: contain;
`

function OsIcon({ icon }: { icon?: string }) {
  if (icon === 'windows') return <WindowsIcon className={windowsIconCss} />
  if (icon === 'rhel') return <RedhatIcon className={rhelIconCss} />
  return <img src={linuxMascotUrl} alt="" width={28} height={28} className={linuxMascotCss} />
}

export function TemplateCatalogPage({ isProviderGlobal = false }: Props) {
  const location = useLocation()
  const { selectedTenant } = useSession()
  const [search, setSearch] = useState('')
  const [osFilters, setOsFilters] = useState<Record<OsFilterKey, boolean>>({
    rhel: false,
    windows: false,
    linux: false,
  })
  const [workloadFilters, setWorkloadFilters] = useState<Record<WorkloadFilterKey, boolean>>({
    highPerformance: false,
    machineLearning: false,
    dataProcessing: false,
    analytics: false,
  })
  const [selectedTemplate, setSelectedTemplate] = useState<ClusterTemplate | null>(null)
  const wizardRef = useRef<CreateVmWizardHandle>(null)
  const drawerTitleRef = useRef<HTMLHeadingElement>(null)

  const {
    data: templates = [],
    isPending: templatesLoading,
    isError: templatesError,
    error: templatesErrorDetail,
    refetch: refetchTemplates,
  } = useComputeInstanceTemplates()
  const { data: vms = [] } = useComputeInstances()
  const provisionVm = useProvisionVm()

  const tenant = selectedTenant && selectedTenant !== 'vertexa' ? selectedTenant : 'northstar'

  const handleWizardProvision = useCallback(
    (vm: ComputeInstance, meta: { mode: DeploymentMode }) => {
      provisionVm.mutate({ vm, specTemplateOnly: meta.mode === 'template' })
    },
    [provisionVm],
  )
  const searchTerm = search.trim().toLowerCase()

  const activeOsFilterKeys = useMemo(
    () =>
      (Object.entries(osFilters) as Array<[OsFilterKey, boolean]>).filter(([, active]) => active),
    [osFilters],
  )
  const activeWorkloadFilterKeys = useMemo(
    () =>
      (Object.entries(workloadFilters) as Array<[WorkloadFilterKey, boolean]>).filter(
        ([, active]) => active,
      ),
    [workloadFilters],
  )

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        searchTerm.length === 0 || searchableTemplateText(template).includes(searchTerm)

      const matchesOsGroup =
        activeOsFilterKeys.length === 0 ||
        activeOsFilterKeys.some(([key]) =>
          OS_FILTER_CONFIG.find((config) => config.key === key)?.matches(template),
        )

      const matchesWorkloadGroup =
        activeWorkloadFilterKeys.length === 0 ||
        activeWorkloadFilterKeys.some(([key]) =>
          WORKLOAD_FILTER_CONFIG.find((config) => config.key === key)?.matches(template),
        )

      return matchesSearch && matchesOsGroup && matchesWorkloadGroup
    })
  }, [templates, searchTerm, activeOsFilterKeys, activeWorkloadFilterKeys])

  const handleOpenFromTemplate = useCallback((tpl: ClusterTemplate) => {
    wizardRef.current?.openFromTemplate(tpl.id)
    setSelectedTemplate(null)
  }, [])

  const clearCategoryFilters = useCallback(() => {
    setOsFilters({ rhel: false, windows: false, linux: false })
    setWorkloadFilters({
      highPerformance: false,
      machineLearning: false,
      dataProcessing: false,
      analytics: false,
    })
  }, [])
  const hasAnyCategoryFilter = activeOsFilterKeys.length > 0 || activeWorkloadFilterKeys.length > 0

  const locationState =
    location.state && typeof location.state === 'object'
      ? (location.state as { navReselect?: boolean; navSelectSeq?: number })
      : null
  useEffect(() => {
    if (locationState?.navReselect) {
      setSelectedTemplate(null)
    }
  }, [locationState?.navReselect, locationState?.navSelectSeq])
  useEffect(() => {
    if (selectedTemplate) {
      drawerTitleRef.current?.focus()
    }
  }, [selectedTemplate])

  const catalogContent = (
    <Sidebar
      className="catalog-vm-templates-sidebar osac-template-catalog-layout"
      hasGutter
      hasBorder
    >
      <SidebarPanel variant="static">
        <Title headingLevel="h2" size="md">
          Categories
        </Title>
        <Button
          className="catalog-vm-templates-all-items-button"
          variant={hasAnyCategoryFilter ? 'plain' : 'secondary'}
          isBlock
          onClick={clearCategoryFilters}
        >
          All items
        </Button>
        <ExpandableSection toggleText="Operating system" isExpanded isIndented>
          <Stack className="catalog-vm-templates-checkbox-stack">
            {OS_FILTER_CONFIG.map((filterConfig) => (
              <StackItem key={filterConfig.key}>
                <Checkbox
                  id={`catalog-os-${filterConfig.key}`}
                  label={filterConfig.label}
                  isChecked={osFilters[filterConfig.key]}
                  onChange={(_, checked) =>
                    setOsFilters((current) => ({ ...current, [filterConfig.key]: checked }))
                  }
                />
              </StackItem>
            ))}
          </Stack>
        </ExpandableSection>
        <ExpandableSection toggleText="Workload" isExpanded isIndented>
          <Stack className="catalog-vm-templates-checkbox-stack">
            {WORKLOAD_FILTER_CONFIG.map((filterConfig) => (
              <StackItem key={filterConfig.key}>
                <Checkbox
                  id={`catalog-workload-${filterConfig.key}`}
                  label={filterConfig.label}
                  isChecked={workloadFilters[filterConfig.key]}
                  onChange={(_, checked) =>
                    setWorkloadFilters((current) => ({
                      ...current,
                      [filterConfig.key]: checked,
                    }))
                  }
                />
              </StackItem>
            ))}
          </Stack>
        </ExpandableSection>
      </SidebarPanel>
      <SidebarContent>
        <Stack hasGutter>
          {templatesError ? (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Alert variant="danger" title="Could not load templates">
                    {templatesErrorDetail instanceof Error
                      ? templatesErrorDetail.message
                      : 'Request failed'}
                  </Alert>
                </StackItem>
                <StackItem>
                  <Button variant="primary" onClick={() => void refetchTemplates()}>
                    Retry
                  </Button>
                </StackItem>
              </Stack>
            </StackItem>
          ) : (
            <StackItem>
              <TemplatesGallery
                templates={filtered}
                isLoading={templatesLoading}
                search={search}
                onSearchChange={setSearch}
                onProvision={handleOpenFromTemplate}
                onSelectTemplate={setSelectedTemplate}
              />
            </StackItem>
          )}
        </Stack>
      </SidebarContent>
    </Sidebar>
  )

  return (
    <PageSection isFilled className="tenant-vm-templates-catalog-root">
      <CreateVmWizard
        ref={wizardRef}
        existingVms={vms}
        tenant={tenant}
        onProvision={handleWizardProvision}
        defaultMode="template"
      />

      <PageHeader
        title={isProviderGlobal ? 'Global Template Catalog' : 'Template Catalog'}
        descriptionMaxWidth="48rem"
        description={
          isProviderGlobal
            ? 'Browse global templates and inspect details before launching a virtual machine.'
            : 'Browse templates by operating system and workload.'
        }
        actions={
          isProviderGlobal ? (
            <Button
              variant="primary"
              onClick={(event) => {
                event.preventDefault()
              }}
            >
              Add template
            </Button>
          ) : undefined
        }
      />
      <div className="tenant-vm-templates-header-separator" aria-hidden />

      <div className="tenant-vm-templates-drawer-host">
        {selectedTemplate ? (
          <Drawer
            isExpanded
            isInline={false}
            position="right"
            className="tenant-vm-templates-drawer"
          >
            <DrawerContent
              panelContent={
                <DrawerPanelContent
                  widths={{ default: 'width_100', lg: 'width_50' }}
                  className="tenant-vm-template-drawer-panel"
                  aria-labelledby="tenant-vm-template-drawer-title"
                >
                  <DrawerHead className="tenant-vm-template-drawer-head">
                    <Flex
                      alignItems={{ default: 'alignItemsFlexStart' }}
                      spaceItems={{ default: 'spaceItemsMd' }}
                    >
                      <FlexItem className="tenant-vm-template-card__icon-tile">
                        <OsIcon icon={selectedTemplate.icon} />
                      </FlexItem>
                      <FlexItem>
                        <Stack hasGutter={false}>
                          <StackItem>
                            <Title
                              headingLevel="h2"
                              size="xl"
                              tabIndex={-1}
                              id="tenant-vm-template-drawer-title"
                              ref={drawerTitleRef}
                            >
                              {selectedTemplate.title}
                            </Title>
                          </StackItem>
                          <StackItem>
                            <Content
                              component="small"
                              className="tenant-vm-template-drawer-subtitle"
                            >
                              {drawerSubtitle(selectedTemplate)}
                            </Content>
                          </StackItem>
                        </Stack>
                      </FlexItem>
                    </Flex>
                    <DrawerActions>
                      <Button
                        className="tenant-vm-template-drawer-head-create"
                        variant="primary"
                        onClick={() => {
                          handleOpenFromTemplate(selectedTemplate)
                        }}
                      >
                        Create virtual machine
                      </Button>
                      <DrawerCloseButton onClick={() => setSelectedTemplate(null)} />
                    </DrawerActions>
                  </DrawerHead>
                  <DrawerPanelBody className="tenant-vm-template-drawer-body tenant-vm-template-drawer-scroll">
                    <Stack className="tenant-vm-template-detail-stack">
                      <StackItem>
                        <DescriptionList isCompact>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Guest operating system</DescriptionListTerm>
                            <DescriptionListDescription>
                              {guestOperatingSystem(selectedTemplate)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>CPU</DescriptionListTerm>
                            <DescriptionListDescription>
                              {selectedTemplate.defaultCores ?? 2} vCPU
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Memory</DescriptionListTerm>
                            <DescriptionListDescription>
                              {selectedTemplate.defaultMemoryGib ?? 8} GiB
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Storage</DescriptionListTerm>
                            <DescriptionListDescription>
                              {selectedTemplate.defaultBootDiskSizeGib ?? 40} GiB boot disk
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Workload</DescriptionListTerm>
                            <DescriptionListDescription>
                              {workloadLabel(selectedTemplate)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                      </StackItem>
                      <StackItem>
                        <Stack hasGutter>
                          <StackItem>
                            <Switch
                              id="template-detail-headless-mode"
                              label="Headless mode"
                              aria-label="Headless mode"
                              isChecked={false}
                              isDisabled
                            />
                          </StackItem>
                          <StackItem>
                            <Switch
                              id="template-detail-guest-log-access"
                              label="Guest system log access"
                              aria-label="Guest system log access"
                              isChecked
                              isDisabled
                            />
                          </StackItem>
                          <StackItem>
                            <Switch
                              id="template-detail-deletion-protection"
                              label="Deletion protection"
                              aria-label="Deletion protection"
                              isChecked={false}
                              isDisabled
                            />
                          </StackItem>
                        </Stack>
                      </StackItem>
                    </Stack>
                  </DrawerPanelBody>
                </DrawerPanelContent>
              }
            >
              <DrawerContentBody className="tenant-vm-templates-drawer__main">
                {catalogContent}
              </DrawerContentBody>
            </DrawerContent>
          </Drawer>
        ) : (
          <div className="tenant-vm-templates-drawer__main">{catalogContent}</div>
        )}
      </div>
    </PageSection>
  )
}
