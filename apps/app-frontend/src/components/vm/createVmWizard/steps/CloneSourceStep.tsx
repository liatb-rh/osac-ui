import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
/**
 * flow: create-virtual-machine-wizard
 * step: cvm_wizard_source_clone
 */
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Divider,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Radio,
  SearchInput,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import linuxMascotUrl from '../../../../assets/guest-os-tux-linux.png'
import { VmStatusLabel } from '@osac/ui-components'
import { useMemo, useState } from 'react'
import type { UpdateFn, WizardState } from '../types'

interface CloneSourceStepProps {
  state: WizardState
  update: UpdateFn
  search: string
  setSearch: (s: string) => void
  vms: ComputeInstance[]
}

const OS_FILTER_OPTIONS = [
  { value: 'all', label: 'All operating systems' },
  { value: 'rhel', label: 'RHEL' },
  { value: 'windows', label: 'Microsoft Windows' },
  { value: 'linux', label: 'Linux' },
] as const

const STATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All states' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'paused', label: 'Paused' },
] as const

function OsIcon({ os }: { os?: string }) {
  const style = { width: 28, height: 28 } as const
  if (os === 'windows') return <WindowsIcon style={{ ...style, color: '#0078D4' }} />
  if (os === 'rhel') return <RedhatIcon style={{ ...style, color: '#EE0000' }} />
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

function formatCreatedDate(value?: string): string {
  if (!value) return 'Not set'
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toLocaleDateString()
}

function ownerFromVm(vm: ComputeInstance): string {
  return (
    vm.metadata.labels?.owner ??
    vm.metadata.labels?.createdBy ??
    vm.metadata.labels?.tenant ??
    'Not set'
  )
}

function storageSummary(vm: ComputeInstance): string {
  if (vm.spec.bootDisk || vm.spec.additionalDisks?.length) {
    return `Storage configured (${(vm.spec.additionalDisks?.length ?? 0) + (vm.spec.bootDisk ? 1 : 0)} disk(s))`
  }
  return 'Storage not specified'
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Stack hasGutter={false}>
      <StackItem>
        <Content
          component="small"
          style={{
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontWeight: 500,
            color: 'rgba(32, 37, 43, 0.82)',
          }}
        >
          {label}
        </Content>
      </StackItem>
      <StackItem>
        <Content
          component="p"
          style={{ margin: 0, fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
        >
          {value}
        </Content>
      </StackItem>
    </Stack>
  )
}

function InlineDetailField({ label, value }: { label: string; value: string }) {
  return (
    <Content
      component="p"
      style={{
        margin: 0,
        fontSize: 'var(--pf-t--global--font--size--body--sm)',
        display: 'grid',
        gridTemplateColumns: '96px minmax(120px, 1fr)',
        columnGap: '1.25rem',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontWeight: 500,
          color: 'rgba(32, 37, 43, 0.82)',
        }}
      >
        {label}
      </span>
      <span style={{ textAlign: 'center' }}>{value}</span>
    </Content>
  )
}

export function CloneSourceStep({ state, update, search, setSearch, vms }: CloneSourceStepProps) {
  const [osFilter, setOsFilter] = useState<string>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let list = [...vms]
    if (osFilter !== 'all') list = list.filter((vm) => (vm.os ?? 'linux') === osFilter)
    if (stateFilter !== 'all') list = list.filter((vm) => vm.status.state === stateFilter)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (vm) =>
          vm.metadata.name.toLowerCase().includes(q) ||
          vm.id.toLowerCase().includes(q) ||
          (vm.os ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [vms, osFilter, stateFilter, search])

  const clearFilters = () => {
    setOsFilter('all')
    setStateFilter('all')
    setSearch('')
  }

  const countPhrase = `${filtered.length} ${filtered.length === 1 ? 'virtual machine' : 'virtual machines'} available`

  return (
    <Stack hasGutter>
      <StackItem>
        <Title id="clone-source-heading" headingLevel="h2" size="xl">
          Source virtual machine
        </Title>
        <Content
          component="p"
          className="pf-v6-u-color-text-subtle"
          style={{ marginTop: 'var(--pf-t--global--spacer--sm)', maxWidth: 720 }}
        >
          Select a virtual machine to clone.
        </Content>
      </StackItem>
      <StackItem>
        <Form>
          <FormGroup label="New VM name" fieldId="clone-new-name" isRequired>
            <TextInput
              id="clone-new-name"
              value={state.cloneNewName}
              onChange={(_e, v) => update('cloneNewName', v)}
              placeholder="Enter a name for the cloned VM"
            />
          </FormGroup>
        </Form>
      </StackItem>
      <StackItem>
        <Flex
          direction={{ default: 'column', md: 'row' }}
          flexWrap={{ default: 'wrap' }}
          alignItems={{ default: 'alignItemsFlexStart', md: 'alignItemsFlexEnd' }}
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <FormSelect
              id="clone-filter-os"
              value={osFilter}
              onChange={(_e, v) => setOsFilter(v)}
              aria-label="Filter source VMs by operating system"
              style={{ minWidth: 200 }}
            >
              {OS_FILTER_OPTIONS.map((o) => (
                <FormSelectOption key={o.value} value={o.value} label={o.label} />
              ))}
            </FormSelect>
          </FlexItem>
          <FlexItem>
            <FormSelect
              id="clone-filter-state"
              value={stateFilter}
              onChange={(_e, v) => setStateFilter(v)}
              aria-label="Filter source VMs by state"
              style={{ minWidth: 180 }}
            >
              {STATE_FILTER_OPTIONS.map((o) => (
                <FormSelectOption key={o.value} value={o.value} label={o.label} />
              ))}
            </FormSelect>
          </FlexItem>
          <FlexItem>
            <Button variant="link" onClick={clearFilters} isInline>
              Clear filters
            </Button>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }} style={{ minWidth: 220 }}>
            <SearchInput
              id="clone-search"
              placeholder="Search source VMs…"
              value={search}
              onChange={(_e, v) => setSearch(v)}
              onClear={() => setSearch('')}
            />
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="p" style={{ margin: 0, fontWeight: 600 }}>
          {countPhrase}
        </Content>
      </StackItem>
      <StackItem>
        <div
          className="osac-clone-source-cards"
          role="radiogroup"
          aria-label="Source virtual machines"
        >
          {filtered.length === 0 ? (
            <Content
              component="p"
              className="pf-v6-u-color-text-subtle"
              style={{ gridColumn: '1 / -1', margin: 0 }}
            >
              No virtual machines match your filters or search.
            </Content>
          ) : null}
          {filtered.map((vm) => {
            const selected = state.cloneSourceVmId === vm.id
            return (
              <div key={vm.id}>
                <Card
                  id={`clone-source-card-${vm.id}`}
                  className="osac-template-cards__card osac-clone-source-cards__card"
                  isCompact
                  isClickable
                  isSelected={selected}
                  onClick={() => {
                    update('cloneSourceVmId', vm.id)
                    update('cloneNewName', `${vm.metadata.name}-clone`)
                  }}
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
                        <OsIcon os={vm.os} />
                      </FlexItem>
                      <FlexItem>
                        <Stack hasGutter={false} style={{ alignItems: 'flex-end' }}>
                          <StackItem>
                            <Radio
                              id={`clone-source-radio-${vm.id}`}
                              name="selectedCloneSourceVm"
                              aria-label={vm.metadata.name}
                              isChecked={selected}
                              onChange={() => {
                                update('cloneSourceVmId', vm.id)
                                update('cloneNewName', `${vm.metadata.name}-clone`)
                              }}
                            />
                          </StackItem>
                          <StackItem>
                            <VmStatusLabel state={vm.status.state} />
                          </StackItem>
                        </Stack>
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
                          {vm.metadata.name}
                        </Content>
                      </StackItem>
                      <StackItem>
                        <Flex gap={{ default: 'gapLg' }} flexWrap={{ default: 'wrap' }}>
                          <FlexItem>
                            <DetailField
                              label="CPU"
                              value={`${(vm.spec.cores ?? 2).toString()} vCPU`}
                            />
                          </FlexItem>
                          <FlexItem>
                            <DetailField
                              label="Memory"
                              value={`${(vm.spec.memoryGib ?? 4).toString()} GiB`}
                            />
                          </FlexItem>
                          <FlexItem>
                            <DetailField label="Storage" value={storageSummary(vm)} />
                          </FlexItem>
                        </Flex>
                      </StackItem>
                      <StackItem>
                        <Divider component="div" />
                      </StackItem>
                      <StackItem>
                        <Stack hasGutter={false}>
                          <StackItem>
                            <InlineDetailField
                              label="Created"
                              value={formatCreatedDate(vm.metadata.createdAt)}
                            />
                          </StackItem>
                          <StackItem>
                            <InlineDetailField label="Owner" value={ownerFromVm(vm)} />
                          </StackItem>
                        </Stack>
                      </StackItem>
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
