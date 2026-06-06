import { css, cx } from '@emotion/css'
import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  FormSelect,
  FormSelectOption,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { useMemo, useState } from 'react'
import type { ClusterTemplate, TemplateWorkloadProfile } from '@osac/api-contracts'
import { useComputeInstanceTemplates } from '../../../../hooks/hooks'
import { defaultTemplateBootDiskGib } from '../constants'
import type { UpdateFn, WizardState } from '../types'
import { OcTemplatesGallery } from '@osac/ui-components'

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

const introCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  max-width: 720px;
`

const searchHintCss = css`
  margin: 0;
`

const WORKLOAD_FILTER_OPTIONS: { value: 'all' | TemplateWorkloadProfile; label: string }[] = [
  { value: 'all', label: 'All workloads' },
  { value: 'high-performance', label: 'High performance' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'machine-learning', label: 'Machine learning' },
  { value: 'data-processing', label: 'Data processing' },
]


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


  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="template-step-heading" headingLevel="h2" size="xl">
          Templates
        </Title>
        <Content
          component="p"
          className={cx('pf-v6-u-color-text-subtle', introCss)}
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
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="p" className={cx('pf-v6-u-color-text-subtle', searchHintCss)}>
          Search and select a template to continue.
        </Content>
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
      {!templatesError && (
        <StackItem>
          <OcTemplatesGallery
            templates={filtered}
            isLoading={templatesLoading}
            search={search}
            onSearchChange={setSearch}
            selectedTemplateId={state.selectedTemplateId ?? undefined}
            onSelectTemplate={(tpl) => applySelectedTemplate(tpl, update)}
          />
        </StackItem>
      )}
    </Stack>
  )
}
