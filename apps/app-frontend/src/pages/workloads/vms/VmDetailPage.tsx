/**
 * flow: manage-virtual-machines
 * step: mvm_detail_page
 *
 * Full-page VM detail view — mirrors osac-pilot VM detail design.
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { PlayIcon } from '@patternfly/react-icons/dist/esm/icons/play-icon'
import { PowerOffIcon } from '@patternfly/react-icons/dist/esm/icons/power-off-icon'
import { RedoIcon } from '@patternfly/react-icons/dist/esm/icons/redo-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { css } from '@emotion/css'
import { KpiHeader, VmStatusLabel } from '@osac/ui-components'
import type { ComputeInstance } from '@osac/api-contracts'
import { resolveVmOsForUi } from '@osac/api-contracts'
import { useComputeInstances, useDeleteVm, usePatchVm } from '../../../hooks/hooks'
import { useVmPowerActionDisplay } from '../../../hooks/useVmPowerActionDisplay'
import { PageHeader } from '@osac/ui-components'
import { VmDeleteConfirmModal } from '../../../components/vm/VmDeleteConfirmModal'
import {
  VmActivityTab,
  VmNetworkingTab,
  VmOverviewTab,
  VmStorageTab,
} from '../../../components/vm/tabs'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const osSubtitleCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const loadingBullseyeCss = css`
  height: 60vh;
`

const breadcrumbButtonCss = css`
  cursor: pointer;
`

// ---------------------------------------------------------------------------
// VmDetailPage
// ---------------------------------------------------------------------------

export function VmDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<number>(0)
  const [deleteTarget, setDeleteTarget] = useState<ComputeInstance | null>(null)

  const { data: vms = [], isLoading } = useComputeInstances()

  const { mutate: patchMutate } = usePatchVm()
  const { mutate: deleteMutate, isPending: isDeleting, error: deleteError } = useDeleteVm()

  const { getDisplayState, runPowerAction, isPowerActionPending } = useVmPowerActionDisplay(
    vms,
    patchMutate,
  )

  const vm = vms.find((v) => v.id === id) ?? null
  const displayState = vm ? getDisplayState(vm) : null

  if (isLoading) {
    return (
      <Bullseye className={loadingBullseyeCss}>
        <Spinner size="xl" aria-label="Loading VM details" />
      </Bullseye>
    )
  }

  if (!vm) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateBody>
            Virtual machine not found.{' '}
            <Button variant="link" isInline onClick={() => navigate('/vms')}>
              Back to My VMs
            </Button>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  const osLabel =
    resolveVmOsForUi(vm) === 'rhel'
      ? 'RHEL'
      : resolveVmOsForUi(vm) === 'windows'
        ? 'Windows'
        : 'Linux'

  const isActionPending = isPowerActionPending(vm.id)
  const isRunning = displayState === 'running'
  const isStopped = displayState === 'stopped'

  function handleRequestDelete() {
    setDeleteTarget(vm)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteMutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        navigate('/vms')
      },
    })
  }

  return (
    <PageSection isFilled>
      <Stack hasGutter>
        {/* Breadcrumb */}
        <StackItem>
          <Breadcrumb>
            <BreadcrumbItem
              onClick={() => navigate('/vms')}
              className={breadcrumbButtonCss}
              component="button"
            >
              Virtual Machines
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{vm.metadata.name}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>

        {/* Page header */}
        <StackItem>
          <PageHeader
            title={vm.metadata.name}
            description={
              <span className={osSubtitleCss}>
                {osLabel}
                {vm.spec.template ? ` · ${vm.spec.template}` : ''}
              </span>
            }
            actions={
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    variant="secondary"
                    aria-label="Start"
                    icon={<PlayIcon />}
                    isDisabled={!isStopped || isActionPending}
                    onClick={() => runPowerAction(vm, 'start')}
                  >
                    Start
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    aria-label="Stop"
                    icon={<PowerOffIcon />}
                    isDisabled={!isRunning || isActionPending}
                    onClick={() => runPowerAction(vm, 'stop')}
                  >
                    Stop
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="secondary"
                    aria-label="Restart"
                    icon={<RedoIcon />}
                    isDisabled={!isRunning || isActionPending}
                    onClick={() => runPowerAction(vm, 'restart')}
                  >
                    Restart
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="danger"
                    aria-label="Delete"
                    icon={<TrashIcon />}
                    onClick={handleRequestDelete}
                  >
                    Delete
                  </Button>
                </FlexItem>
              </Flex>
            }
          />
        </StackItem>

        {/* KPI bar */}
        <StackItem>
          <KpiHeader
            items={[
              {
                label: 'Power state',
                value: <VmStatusLabel state={displayState ?? vm.status.state} />,
              },
              { label: 'vCPU', value: vm.spec.cores != null ? String(vm.spec.cores) : '—' },
              {
                label: 'Memory',
                value: vm.spec.memoryGib != null ? `${vm.spec.memoryGib} GiB` : '—',
              },
              { label: 'Storage', value: '100 GiB' },
              { label: 'IP address', value: vm.status.ipAddress ?? '—' },
            ]}
          />
        </StackItem>

        {/* Tabs */}
        <StackItem isFilled>
          <Tabs
            activeKey={activeTab}
            onSelect={(_, key) => setActiveTab(key as number)}
            aria-label="VM detail tabs"
          >
            <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
              {activeTab === 0 && <VmOverviewTab vm={vm} />}
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Networking</TabTitleText>}>
              {activeTab === 1 && <VmNetworkingTab vm={vm} />}
            </Tab>
            <Tab eventKey={2} title={<TabTitleText>Storage</TabTitleText>}>
              {activeTab === 2 && <VmStorageTab vm={vm} />}
            </Tab>
            <Tab eventKey={5} title={<TabTitleText>Activity</TabTitleText>}>
              {activeTab === 5 && <VmActivityTab vm={vm} />}
            </Tab>
            {/* <Tab eventKey={6} title={<TabTitleText>Danger zone</TabTitleText>}>
              {activeTab === 6 && <VmDangerZoneTab vm={vm} onDelete={handleRequestDelete} />}
            </Tab> */}
          </Tabs>
        </StackItem>
      </Stack>

      <VmDeleteConfirmModal
        vm={deleteTarget}
        isOpen={deleteTarget !== null}
        isPending={isDeleting}
        errorMessage={deleteError?.message ?? null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </PageSection>
  )
}
