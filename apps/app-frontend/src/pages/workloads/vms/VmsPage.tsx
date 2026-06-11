/**
 * flow: manage-virtual-machines
 * step: mvm_list_view
 */
import { css } from '@emotion/css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bullseye,
  Button,
  Content,
  Flex,
  FlexItem,
  PageSection,
  SearchInput,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'
import { resolveVmOsForUi } from '@osac/api-contracts'
import { CustomTableLink, ObjectsTable, VmStatusLabel } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { useComputeInstances, useDeleteVm, usePatchVm, useProvisionVm } from '../../../hooks/hooks'
import { useVmPowerActionDisplay } from '../../../hooks/useVmPowerActionDisplay'
import { useSession } from '../../../contexts/SessionContext'
import { PageHeader } from '@osac/ui-components'
import { VmDeleteConfirmModal } from '../../../components/vm/VmDeleteConfirmModal'
import type {
  CreateVmWizardHandle,
  DeploymentMode,
} from '../../../components/vm/createVmWizard/CreateVmWizard'
import { CreateVmWizard } from '../../../components/vm/createVmWizard/CreateVmWizard'
import { usePendingVmCreations } from '../../../hooks/usePendingVmCreations'
import { usePendingVmDeletes } from '../../../hooks/usePendingVmDeletes'
import { refetchComputeInstancesQueries } from '../../../hooks/hooks'
import { useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | VmPowerState

const toolbarFlexCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
  flex-wrap: wrap;
`

const searchInputCss = css`
  min-width: 260px;
`

const loadingBullseyeCss = css`
  padding: var(--pf-t--global--spacer--2xl);
`

const emptyContentCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openVmConsole(vm: ComputeInstance) {
  const base = `${window.location.origin}${window.location.pathname}`
  const q = new URLSearchParams({
    demo: 'vm-console',
    vm: vm.id,
    name: vm.metadata.name,
    os: resolveVmOsForUi(vm),
  })
  window.open(`${base}?${q.toString()}`, '_blank', 'noopener,noreferrer')
}

function osLabel(vm: ComputeInstance): string {
  const os = resolveVmOsForUi(vm)
  if (os === 'rhel') return 'RHEL'
  if (os === 'windows') return 'Windows'
  return 'Linux'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VmsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { role, selectedTenant } = useSession()
  const wizardRef = useRef<CreateVmWizardHandle>(null)

  // Auto-open wizard pre-seeded from catalog navigation
  const catalogItemId = searchParams.get('catalogItem')
  useEffect(() => {
    if (catalogItemId) {
      wizardRef.current?.openFromTemplate(catalogItemId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [vmToDelete, setVmToDelete] = useState<ComputeInstance | null>(null)

  const queryClient = useQueryClient()
  const { data: vms = [], isLoading } = useComputeInstances()
  const provisionVm = useProvisionVm()
  const patchVm = usePatchVm()
  const deleteVm = useDeleteVm()

  const refetchInstances = useCallback(
    () => refetchComputeInstancesQueries(queryClient),
    [queryClient],
  )

  const { getDisplayState, runPowerAction } = useVmPowerActionDisplay(vms, patchVm.mutate, {
    refetchInstances,
  })

  const { registerPending, noteCreateSuccess, dismissPending } = usePendingVmCreations(vms, {
    refetchInstances,
  })

  const { markPendingDelete, clearPendingDelete, isPendingDelete } = usePendingVmDeletes(vms)

  const handleOpenCreateVm = useCallback(() => {
    wizardRef.current?.open()
  }, [])

  const handleWizardProvision = useCallback(
    (vm: ComputeInstance, meta: { mode: DeploymentMode }) => {
      const clientId = registerPending(vm)
      provisionVm.mutate(
        { vm, specTemplateOnly: meta.mode === 'template' },
        {
          onSuccess: (created) => {
            noteCreateSuccess(clientId, created.id)
          },
          onError: () => {
            dismissPending(clientId)
          },
        },
      )
    },
    [dismissPending, noteCreateSuccess, provisionVm, registerPending],
  )

  const handleRequestDelete = useCallback((vm: ComputeInstance) => {
    setVmToDelete(vm)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!vmToDelete) return
    const id = vmToDelete.id
    const live = vms.find((v) => v.id === id) ?? vmToDelete

    markPendingDelete(id)
    setVmToDelete(null)

    const finishDelete = () => {
      deleteVm.mutate(id, { onError: () => clearPendingDelete(id) })
    }

    if (live.status.state === 'stopped') {
      finishDelete()
      return
    }
    patchVm.mutate(
      { id, powerAction: 'stop' },
      { onSuccess: () => finishDelete(), onError: () => clearPendingDelete(id) },
    )
  }, [clearPendingDelete, deleteVm, markPendingDelete, patchVm, vmToDelete, vms])

  const tenant = selectedTenant && selectedTenant !== 'vertexa' ? selectedTenant : 'northstar'
  const vmToDeleteLive = vmToDelete ? (vms.find((v) => v.id === vmToDelete.id) ?? vmToDelete) : null
  const deleteWillStopFirst = vmToDeleteLive != null && vmToDeleteLive.status.state !== 'stopped'
  const deleteBusy = deleteVm.isPending || patchVm.isPending

  const filteredVms = vms.filter((vm) => {
    const matchesSearch = !search || vm.metadata.name.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (statusFilter === 'all') return true
    return getDisplayState(vm) === statusFilter
  })

  const vmColumns: ObjectsTableColumn<ComputeInstance>[] = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (vm) => {
        const locked = isPendingDelete(vm.id)
        return (
          <CustomTableLink isDisabled={locked} onClick={() => navigate(`/vms/${vm.id}`)}>
            {vm.metadata.name}
          </CustomTableLink>
        )
      },
    },
    {
      label: 'Status',
      dataLabel: 'Status',
      render: (vm) => <VmStatusLabel state={getDisplayState(vm)} />,
    },
    {
      label: 'OS',
      dataLabel: 'OS',
      render: (vm) => osLabel(vm),
    },
    {
      label: 'vCPU',
      dataLabel: 'vCPU',
      render: (vm) => vm.spec.cores ?? '—',
    },
    {
      label: 'Memory',
      dataLabel: 'Memory',
      render: (vm) => (vm.spec.memoryGib != null ? `${vm.spec.memoryGib} GiB` : '—'),
    },
    {
      label: 'IP address',
      dataLabel: 'IP address',
      render: (vm) => <code>{vm.status.ipAddress || '—'}</code>,
    },
    {
      screenReaderText: 'Actions',
      isActionCell: true,
      render: (vm) => {
        const locked = isPendingDelete(vm.id)
        const state = getDisplayState(vm)
        return !locked ? (
          <ActionsColumn
            items={[
              {
                title: state === 'running' ? 'Stop' : 'Start',
                onClick: () => runPowerAction(vm, state === 'running' ? 'stop' : 'start'),
              },
              {
                title: 'Restart',
                isDisabled: state !== 'running',
                onClick: () => runPowerAction(vm, 'restart'),
              },
              { isSeparator: true },
              {
                title: 'Open console',
                isDisabled: state !== 'running',
                onClick: () => openVmConsole(vm),
              },
              { isSeparator: true },
              { title: 'Delete', onClick: () => handleRequestDelete(vm) },
            ]}
          />
        ) : null
      },
    },
  ]

  return (
    <PageSection isFilled>
      <VmDeleteConfirmModal
        vm={vmToDelete}
        isOpen={vmToDelete != null}
        isPending={deleteBusy}
        willStopFirst={deleteWillStopFirst}
        errorMessage={
          patchVm.isError || deleteVm.isError
            ? (patchVm.error ?? deleteVm.error) instanceof Error
              ? ((patchVm.error ?? deleteVm.error) as Error).message
              : 'Request failed'
            : null
        }
        onClose={() => {
          if (!deleteBusy) {
            setVmToDelete(null)
            deleteVm.reset()
            patchVm.reset()
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      <CreateVmWizard
        ref={wizardRef}
        existingVms={vms}
        tenant={tenant}
        onProvision={handleWizardProvision}
      />

      <PageHeader
        title="Virtual Machines"
        description="Operate workload lifecycle in your tenant workspace."
        actions={
          role === 'tenantUser' ? (
            <Button variant="primary" icon={<PlusCircleIcon />} onClick={handleOpenCreateVm}>
              Create VM
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar */}
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapMd' }}
        className={toolbarFlexCss}
      >
        <FlexItem>
          <SearchInput
            placeholder="Filter by name"
            value={search}
            onChange={(_e, v) => setSearch(v)}
            onClear={() => setSearch('')}
            className={searchInputCss}
          />
        </FlexItem>
        <FlexItem>
          <ToggleGroup aria-label="Filter VMs by status">
            {STATUS_FILTERS.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                text={label}
                isSelected={statusFilter === value}
                onChange={() => setStatusFilter(value)}
              />
            ))}
          </ToggleGroup>
        </FlexItem>
      </Flex>

      {/* Content */}
      {isLoading ? (
        <Bullseye className={loadingBullseyeCss}>
          <Spinner aria-label="Loading virtual machines" />
        </Bullseye>
      ) : filteredVms.length === 0 ? (
        <Content component="p" className={emptyContentCss}>
          {search || statusFilter !== 'all'
            ? 'No virtual machines match your filters.'
            : 'No virtual machines yet. Create one to get started.'}
        </Content>
      ) : (
        <ObjectsTable
          ariaLabel="Virtual machines"
          columns={vmColumns}
          rows={filteredVms}
          getRowKey={(vm) => vm.id}
          onRowClick={(vm) => navigate(`/vms/${vm.id}`)}
          isRowDisabled={(vm) => isPendingDelete(vm.id)}
          defaultPageSize={10}
        />
      )}
    </PageSection>
  )
}
