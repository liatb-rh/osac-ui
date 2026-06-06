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
import { css, cx } from '@emotion/css'
import type { UpdateFn, WizardState } from '../types'

const windowsIconCss = css`
  width: 28px;
  height: 28px;
  color: #0078d4;
`

const redhatIconCss = css`
  width: 28px;
  height: 28px;
  color: #ee0000;
`

const linuxMascotCss = css`
  display: block;
  object-fit: contain;
`

const detailFieldLabelCss = css`
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-weight: 500;
  color: rgba(32, 37, 43, 0.82);
`

const detailFieldValueCss = css`
  margin: 0;
  font-size: var(--pf-t--global--font--size--body--sm);
`

const inlineDetailFieldCss = css`
  margin: 0;
  font-size: var(--pf-t--global--font--size--body--sm);
  display: grid;
  grid-template-columns: 96px minmax(120px, 1fr);
  column-gap: 1.25rem;
  align-items: center;
`

const inlineDetailFieldLabelCss = css`
  font-weight: 500;
  color: rgba(32, 37, 43, 0.82);
`

const inlineDetailFieldValueCss = css`
  text-align: center;
`

const cloneSourceIntroCss = css`
  margin-top: var(--pf-t--global--spacer--sm);
  max-width: 720px;
`

const osFilterSelectCss = css`
  min-width: 200px;
`

const stateFilterSelectCss = css`
  min-width: 180px;
`

const searchFlexItemCss = css`
  min-width: 220px;
`

const countPhraseCss = css`
  margin: 0;
  font-weight: 600;
`

const emptyResultsCss = css`
  grid-column: 1 / -1;
  margin: 0;
`

const cloneSourceCardHeaderCss = css`
  flex-shrink: 0;
`

const cloneSourceCardHeaderFlexCss = css`
  width: 100%;
`

const cloneSourceCardRadioStackCss = css`
  align-items: flex-end;
`

const cloneSourceCardTitleCss = css`
  font-weight: 600;
  margin: 0;
  font-size: 1rem;
`

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
  if (os === 'windows') return <WindowsIcon className={windowsIconCss} />
  if (os === 'rhel') return <RedhatIcon className={redhatIconCss} />
  return (
    <img
      src={linuxMascotUrl}
      alt=""
      width={28}
      height={28}
      className={linuxMascotCss}
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
          className={detailFieldLabelCss}
        >
          {label}
        </Content>
      </StackItem>
      <StackItem>
        <Content
          component="p"
          className={detailFieldValueCss}
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
      className={inlineDetailFieldCss}
    >
      <span className={inlineDetailFieldLabelCss}>
        {label}
      </span>
      <span className={inlineDetailFieldValueCss}>{value}</span>
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
          className={cx('pf-v6-u-color-text-subtle', cloneSourceIntroCss)}
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
              className={osFilterSelectCss}
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
              className={stateFilterSelectCss}
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
          <FlexItem flex={{ default: 'flex_1' }} className={searchFlexItemCss}>
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
        <Content component="p" className={countPhraseCss}>
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
              className={cx('pf-v6-u-color-text-subtle', emptyResultsCss)}
            >
              No virtual machines match your filters or search.
            </Content>
          ) : null}
          {filtered.map((vm) => {
            const selected = state.cloneSourceVmId === vm.id
            const cloneSourceCardCss = css`
              cursor: pointer;
              box-sizing: border-box;
              border-width: 1px;
              border-style: solid;
              border-color: ${selected
                ? 'var(--pf-t--global--color--brand--default)'
                : 'var(--pf-t--global--border--color--default)'};
              border-radius: var(--pf-t--global--border--radius--medium);
            `
            return (
              <div key={vm.id}>
                <Card
                  id={`clone-source-card-${vm.id}`}
                  className={cx('osac-template-cards__card osac-clone-source-cards__card', cloneSourceCardCss)}
                  isCompact
                  isClickable
                  isSelected={selected}
                  onClick={() => {
                    update('cloneSourceVmId', vm.id)
                    update('cloneNewName', `${vm.metadata.name}-clone`)
                  }}
                >
                  <CardHeader className={cloneSourceCardHeaderCss}>
                    <Flex
                      justifyContent={{ default: 'justifyContentSpaceBetween' }}
                      alignItems={{ default: 'alignItemsFlexStart' }}
                      className={cloneSourceCardHeaderFlexCss}
                    >
                      <FlexItem>
                        <OsIcon os={vm.os} />
                      </FlexItem>
                      <FlexItem>
                        <Stack hasGutter={false} className={cloneSourceCardRadioStackCss}>
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
                          className={cloneSourceCardTitleCss}
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
