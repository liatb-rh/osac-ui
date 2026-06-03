import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Label,
  Radio,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { useMemo, useState } from 'react'
import type { ClusterTemplate, TemplateWorkloadProfile } from '@osac/api-contracts'
import linuxMascotUrl from '../../../../assets/guest-os-tux-linux.png'
import { useComputeInstanceTemplates } from '../../../../api/hooks'
import { defaultTemplateBootDiskGib } from '../constants'
import type { UpdateFn, WizardState } from '../types'

function applySelectedTemplate(tpl: ClusterTemplate, update: UpdateFn) {
  update('selectedTemplateId', tpl.id)
  update('templateBootDiskSizeGib', String(defaultTemplateBootDiskGib(tpl)))
}

const OS_FILTER_OPTIONS = [
  { value: 'all', label: 'All operating systems' },
  { value: 'rhel', label: 'RHEL' },
  { value: 'windows', label: 'Microsoft Windows' },
  { value: 'linux', label: 'Linux' },
] as const

const WORKLOAD_FILTER_OPTIONS: { value: 'all' | TemplateWorkloadProfile; label: string }[] = [
  { value: 'all', label: 'All workloads' },
  { value: 'high-performance', label: 'High performance' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'machine-learning', label: 'Machine learning' },
  { value: 'data-processing', label: 'Data processing' },
]

const WORKLOAD_LABELS: Record<TemplateWorkloadProfile, string> = {
  'high-performance': 'High performance',
  analytics: 'Analytics',
  'machine-learning': 'Machine learning',
  'data-processing': 'Data processing',
}

function truncateDescription(text: string, max = 120): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function OsIcon({ icon }: { icon?: string }) {
  const style = { width: 28, height: 28 } as const
  if (icon === 'windows') return <WindowsIcon style={{ ...style, color: '#0078D4' }} />
  if (icon === 'rhel') return <RedhatIcon style={{ ...style, color: '#EE0000' }} />
  return (
    <img
      src={linuxMascotUrl}
      alt=""
      width={28}
      height={28}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

export function TemplateStep({ state, update }: { state: WizardState; update: UpdateFn }) {
  const [osFilter, setOsFilter] = useState<string>('all')
  const [workloadFilter, setWorkloadFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const {
    data: templates = [],
    isPending: templatesLoading,
    isError: templatesError,
    error: templatesErrorDetail,
    refetch: refetchTemplates,
  } = useComputeInstanceTemplates()

  const filtered = useMemo(() => {
    let list: ClusterTemplate[] = [...templates]
    if (osFilter !== 'all') {
      list = list.filter((t) => (t.icon ?? 'linux') === osFilter)
    }
    if (workloadFilter !== 'all') {
      list = list.filter((t) => t.workloadProfile === workloadFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    return list
  }, [templates, osFilter, workloadFilter, search])

  const clearFilters = () => {
    setOsFilter('all')
    setWorkloadFilter('all')
    setSearch('')
  }

  const count = filtered.length
  const countPhrase = `${count} ${count === 1 ? 'template' : 'templates'} available`

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="template-step-heading" headingLevel="h2" size="xl">
          Templates
        </Title>
        <Content
          component="p"
          className="pf-v6-u-color-text-subtle"
          style={{ marginTop: 'var(--pf-t--global--spacer--sm)', maxWidth: 720 }}
        >
          Select a template to create your virtual machine from
        </Content>
      </StackItem>
      <StackItem>
        <Flex
          direction={{ default: 'column', md: 'row' }}
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsFlexStart', md: 'alignItemsFlexEnd' }}
          gap={{ default: 'gapMd' }}
          justifyContent={{ default: 'justifyContentFlexStart' }}
        >
          <FlexItem>
            <FormSelect
              id="template-filter-os"
              value={osFilter}
              onChange={(_e, v) => setOsFilter(v)}
              aria-label="Filter templates by operating system"
            >
              {OS_FILTER_OPTIONS.map((o) => (
                <FormSelectOption key={o.value} value={o.value} label={o.label} />
              ))}
            </FormSelect>
          </FlexItem>
          <FlexItem>
            <FormSelect
              id="template-filter-workload"
              value={workloadFilter}
              onChange={(_e, v) => setWorkloadFilter(v)}
              aria-label="Filter templates by workload"
            >
              {WORKLOAD_FILTER_OPTIONS.map((o) => (
                <FormSelectOption key={o.value} value={o.value} label={o.label} />
              ))}
            </FormSelect>
          </FlexItem>
          <FlexItem>
            <Button variant="link" onClick={clearFilters} isInline>
              Clear filters
            </Button>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 200 }}>
            <SearchInput
              placeholder="Search templates…"
              value={search}
              onChange={(_e, v) => setSearch(v)}
              onClear={() => setSearch('')}
              aria-label="Search templates"
            />
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Flex
          gap={{ default: 'gapSm' }}
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsBaseline' }}
        >
          <Content component="p" style={{ margin: 0, fontWeight: 600 }}>
            {templatesLoading ? 'Loading templates…' : countPhrase}
          </Content>
          <Content component="p" className="pf-v6-u-color-text-subtle" style={{ margin: 0 }}>
            Select one to continue.
          </Content>
        </Flex>
      </StackItem>
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
      ) : null}
      <StackItem>
        <div
          className="osac-template-cards"
          role="radiogroup"
          aria-labelledby="template-step-heading"
        >
          {templatesLoading ? (
            <Bullseye style={{ padding: 'var(--pf-t--global--spacer--xl)', gridColumn: '1 / -1' }}>
              <Spinner aria-label="Loading templates" />
            </Bullseye>
          ) : null}
          {!templatesLoading && !templatesError && count === 0 ? (
            <Content
              component="p"
              className="pf-v6-u-color-text-subtle"
              style={{ gridColumn: '1 / -1', margin: 0 }}
            >
              No templates match your filters or search. Try clearing filters or changing keywords.
            </Content>
          ) : null}
          {!templatesLoading &&
            !templatesError &&
            filtered.map((tpl) => {
              const selected = state.selectedTemplateId === tpl.id
              const cores = tpl.defaultCores ?? 2
              const mem = tpl.defaultMemoryGib ?? 8
              const diskGib = defaultTemplateBootDiskGib(tpl)
              const profile = tpl.workloadProfile
              return (
                <div key={tpl.id}>
                  <Card
                    id={`template-card-${tpl.id}`}
                    className="osac-template-cards__card"
                    isCompact
                    isClickable
                    isSelected={selected}
                    onClick={() => applySelectedTemplate(tpl, update)}
                    ouiaId={`template-option-${tpl.id}`}
                    style={{
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: selected
                        ? 'var(--pf-t--global--color--brand--default)'
                        : 'var(--pf-t--global--border--color--default)',
                      borderRadius: 'var(--pf-t--global--border--radius--medium)',
                    }}
                  >
                    <CardHeader style={{ flexShrink: 0 }}>
                      <Flex
                        justifyContent={{ default: 'justifyContentSpaceBetween' }}
                        alignItems={{ default: 'alignItemsFlexStart' }}
                        style={{ width: '100%' }}
                      >
                        <FlexItem>
                          <OsIcon icon={tpl.icon} />
                        </FlexItem>
                        <FlexItem>
                          <Radio
                            id={`template-radio-${tpl.id}`}
                            name="selectedCatalogTemplate"
                            aria-label={tpl.title}
                            isChecked={selected}
                            onChange={() => applySelectedTemplate(tpl, update)}
                          />
                        </FlexItem>
                      </Flex>
                    </CardHeader>
                    <CardBody>
                      <Stack hasGutter>
                        <StackItem>
                          <Content
                            component="h3"
                            style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}
                          >
                            {tpl.title}
                          </Content>
                        </StackItem>
                        {tpl.description ? (
                          <StackItem>
                            <Content
                              component="p"
                              className="pf-v6-u-color-text-subtle"
                              style={{
                                margin: 0,
                                fontSize: 'var(--pf-t--global--font--size--body--sm)',
                              }}
                            >
                              {truncateDescription(tpl.description)}
                            </Content>
                          </StackItem>
                        ) : null}
                        <StackItem>
                          <Content
                            component="p"
                            style={{
                              margin: 0,
                              fontSize: 'var(--pf-t--global--font--size--body--sm)',
                            }}
                          >
                            {cores} vCPU · {mem} GiB memory · {diskGib} GiB disk
                          </Content>
                        </StackItem>
                        {profile ? (
                          <StackItem>
                            <Label isCompact color="grey">
                              {WORKLOAD_LABELS[profile]}
                            </Label>
                          </StackItem>
                        ) : null}
                      </Stack>
                    </CardBody>
                  </Card>
                </div>
              )
            })}
        </div>
      </StackItem>
    </Stack>
  )
}
