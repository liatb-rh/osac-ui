/**
 * flow: tenant-user-dashboard
 * step: tud_dashboard_home
 */
import { useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Gallery,
  GalleryItem,
  PageSection,
  Title,
} from '@patternfly/react-core'
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'
import { DEMO_TENANT_DISPLAY_USER } from '@osac/api-contracts'
import type { CreateVmWizardHandle, DeploymentMode } from '../../components/vm/CreateVmWizard'
import { CreateVmWizard } from '../../components/vm/CreateVmWizard'
import { PageHeader } from '../../components/layout'
import { DashboardQuotaSection, DashboardUtilizationSection } from '../../components/dashboard'
import { useSession } from '../../contexts/SessionContext'
import { useComputeInstances, useProvisionVm } from '../../api/hooks'

interface StatCard {
  key: string
  label: string
  value: number
  valueColor: string
  caption: string
  powerFilter: VmPowerState | null
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { selectedTenant, isDarkTheme } = useSession()
  const wizardRef = useRef<CreateVmWizardHandle>(null)
  const { data: vms = [] } = useComputeInstances()
  const provisionVm = useProvisionVm()

  const handleWizardProvision = useCallback(
    (vm: ComputeInstance, meta: { mode: DeploymentMode }) => {
      provisionVm.mutate({ vm, specTemplateOnly: meta.mode === 'template' })
    },
    [provisionVm],
  )

  const tenant = selectedTenant ?? 'northstar'
  const displayName = selectedTenant ? DEMO_TENANT_DISPLAY_USER[selectedTenant] : ''

  /** KPIs from normalized GET compute_instances (spec: starting/deleting/error count in All only). */
  const powerCounts = useMemo(() => {
    let running = 0
    let paused = 0
    let stopped = 0
    for (const v of vms) {
      const s = v.status.state
      if (s === 'running') running++
      else if (s === 'paused') paused++
      else if (s === 'stopped') stopped++
    }
    return { running, paused, stopped, all: vms.length }
  }, [vms])

  const stats: StatCard[] = [
    {
      key: 'all-vms',
      label: 'All VMs',
      value: powerCounts.all,
      valueColor: 'var(--pf-t--global--text--color--regular)',
      caption: 'Total VMs across your workspaces',
      powerFilter: null,
    },
    {
      key: 'running',
      label: 'Running',
      value: powerCounts.running,
      valueColor: 'var(--pf-t--global--color--status--success--default)',
      caption: 'On and ready for workloads',
      powerFilter: 'running',
    },
    {
      key: 'paused',
      label: 'Paused',
      value: powerCounts.paused,
      valueColor: 'var(--pf-t--global--color--status--warning--default)',
      caption: 'Suspended with memory and disks retained',
      powerFilter: 'paused',
    },
    {
      key: 'stopped',
      label: 'Stopped',
      value: powerCounts.stopped,
      valueColor: 'var(--pf-t--global--color--status--danger--default)',
      caption: 'Powered off — storage may still incur cost',
      powerFilter: 'stopped',
    },
  ]

  const handleStatCardClick = useCallback(
    (powerFilter: VmPowerState | null) => {
      const path = powerFilter ? `/vms?power=${powerFilter}` : '/vms'
      navigate(path)
    },
    [navigate],
  )

  const handleOpenCreateVm = useCallback(() => {
    wizardRef.current?.open()
  }, [])

  return (
    <PageSection isFilled>
      <CreateVmWizard
        ref={wizardRef}
        existingVms={vms}
        tenant={tenant !== 'vertexa' ? tenant : 'northstar'}
        onProvision={handleWizardProvision}
      />

      <PageHeader
        title={`Welcome, ${displayName}`}
        description="This workspace is for VM as a Service — create, run, and manage virtual machines."
        descriptionMaxWidth="48rem"
        actions={
          <Button variant="primary" onClick={handleOpenCreateVm}>
            Create virtual machine
          </Button>
        }
      />

      {/* VM stat cards */}
      <Gallery hasGutter className="osac-dashboard-vm-stats-grid">
        {stats.map((stat) => (
          <GalleryItem key={stat.key}>
            <Card
              isClickable
              isFullHeight
              component="article"
              className="osac-dashboard-vm-stat-card"
            >
              <CardHeader
                selectableActions={{
                  onClickAction: () => handleStatCardClick(stat.powerFilter),
                  selectableActionAriaLabel: `${stat.label}, ${stat.value}. ${stat.caption}`,
                }}
              >
                <CardTitle
                  component="h2"
                  style={{
                    fontSize: 'var(--pf-t--global--font--size--heading--xs)',
                    fontWeight: 'var(--pf-t--global--font--weight--heading--bold)',
                  }}
                >
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Title headingLevel="h3" size="4xl" style={{ color: stat.valueColor, margin: 0 }}>
                  {stat.value}
                </Title>
                <Content
                  component="p"
                  style={{
                    marginTop: 'var(--pf-t--global--spacer--xs)',
                    color: 'var(--pf-t--global--text--color--subtle)',
                    fontSize: 'var(--pf-t--global--font--size--body--sm)',
                  }}
                >
                  {stat.caption}
                </Content>
              </CardBody>
            </Card>
          </GalleryItem>
        ))}
      </Gallery>

      {/* VM utilization trends + recent activities preview */}
      <DashboardUtilizationSection isDarkTheme={isDarkTheme} />

      {/* Resource quota donuts */}
      <DashboardQuotaSection selectedTenant={selectedTenant} />
    </PageSection>
  )
}
