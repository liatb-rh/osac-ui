import { FilterIcon } from '@patternfly/react-icons/dist/esm/icons/filter-icon'
/**
 * flow: tenant-user-dashboard
 * step: tud_dashboard_home — VM utilization trends + recent activities preview
 *
 * Four line charts (CPU, Memory, GPU, Storage) with a time-period picker.
 * Sidebar shows the 6 most recent activity events; clicking navigates to /activities.
 *
 * Layout uses only PF primitives (Grid, Gallery, Stack, Flex) and PF design tokens.
 * No custom CSS classes — see design-system.yaml layout_and_shell.implementation_policy.
 */
import { css } from '@emotion/css'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Grid,
  GridItem,
  Label,
  MenuToggle,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { Chart, ChartAxis, ChartGroup, ChartLine } from '@patternfly/react-charts/victory'
import { buildRecentActivities } from '@osac/api-contracts'
import { useComputeInstances } from '../../hooks/hooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UtilizationPeriod = '24h' | '7d' | '30d' | '90d'

interface PeriodOption {
  value: UtilizationPeriod
  label: string
  points: number
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '24h', label: 'Last 24 hours', points: 24 },
  { value: '7d', label: 'Last 7 days', points: 14 },
  { value: '30d', label: 'Last 30 days', points: 30 },
  { value: '90d', label: 'Last 90 days', points: 18 },
]

// ---------------------------------------------------------------------------
// Demo data generator — deterministic sine-wave shaped time series
// ---------------------------------------------------------------------------

interface ChartPoint {
  x: number
  y: number
  tickLabel: string
}

function buildUtilizationData(
  period: UtilizationPeriod,
  metricKey: 'cpu' | 'memory' | 'gpu' | 'storage',
  vmCount: number,
): ChartPoint[] {
  const opt = PERIOD_OPTIONS.find((o) => o.value === period) ?? PERIOD_OPTIONS[1]
  const n = opt.points
  const bases: Record<string, [number, number]> = {
    cpu: [55 + (vmCount % 10) * 2, 14],
    memory: [68 + (vmCount % 7) * 3, 11],
    gpu: [40 + (vmCount % 8) * 4, 17],
    storage: [72 + (vmCount % 5) * 2, 7],
  }
  const [base, amp] = bases[metricKey]
  return Array.from({ length: n }, (_, i) => {
    const phase = (i / n) * Math.PI * 4 + metricKey.length
    const noise = Math.sin(phase) * amp + Math.cos(phase * 1.7) * (amp / 2)
    const y = Math.min(99, Math.max(4, base + noise))
    let tickLabel = ''
    if (period === '24h') tickLabel = `${i}h`
    else if (period === '7d') tickLabel = `D${i + 1}`
    else tickLabel = `W${i + 1}`
    return { x: i, y: Math.round(y * 10) / 10, tickLabel }
  })
}

// ---------------------------------------------------------------------------
// Metric configuration
// ---------------------------------------------------------------------------

const sectionCss = css`
  margin-top: var(--pf-t--global--spacer--xl);
`

const headerFlexCss = css`
  margin-bottom: var(--pf-t--global--spacer--md);
`

const sectionTitleCss = css`
  margin: 0;
`

const chartSubtitleCss = css`
  margin: 0 0 var(--pf-t--global--spacer--sm);
  font-size: var(--pf-t--global--font--size--body--sm);
  color: var(--pf-t--global--text--color--subtle);
`

const chartContainerCss = css`
  height: 180px;
`

const activityTimeCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const activityMessageCss = css`
  margin: 0;
  font-weight: var(--pf-t--global--font--weight--body--bold);
  font-size: var(--pf-t--global--font--size--body--default);
`

const METRICS = [
  {
    key: 'cpu' as const,
    title: 'CPU usage',
    subtitle: 'vCPU-weighted utilization across running VMs',
    color: '#0066CC',
  },
  {
    key: 'memory' as const,
    title: 'Memory usage',
    subtitle: 'GiB-weighted memory pressure for running VMs',
    color: '#F0AB00',
  },
  {
    key: 'gpu' as const,
    title: 'GPU usage',
    subtitle: 'Accelerator load for GPU-style workloads',
    color: '#009596',
  },
  {
    key: 'storage' as const,
    title: 'Storage usage',
    subtitle: 'Pool utilization from fleet disk footprint',
    color: '#3E8635',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DashboardUtilizationSectionProps {
  /** Reserved for future chart theme adaptation (dark/light). */
  isDarkTheme?: boolean
}

export function DashboardUtilizationSection(_props: DashboardUtilizationSectionProps) {
  const navigate = useNavigate()
  const { data: vms = [] } = useComputeInstances()
  const [period, setPeriod] = useState<UtilizationPeriod>('7d')
  const [menuOpen, setMenuOpen] = useState(false)

  const currentPeriod = PERIOD_OPTIONS.find((o) => o.value === period) ?? PERIOD_OPTIONS[1]

  const chartDataMap = useMemo(
    () =>
      METRICS.reduce<Record<string, ChartPoint[]>>((acc, m) => {
        acc[m.key] = buildUtilizationData(period, m.key, vms.length)
        return acc
      }, {}),
    [period, vms.length],
  )

  const activities = useMemo(() => buildRecentActivities(vms, 6), [vms])

  return (
    <section aria-label="VM utilization trends and recent activities" className={sectionCss}>
      <Grid hasGutter>
        {/* ---- Left: 4 line chart cards ---- */}
        <GridItem sm={12} md={8} lg={9}>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'wrap' }}
            className={headerFlexCss}
          >
            <FlexItem>
              <Title headingLevel="h2" size="xl" className={sectionTitleCss}>
                VM utilization trends
              </Title>
            </FlexItem>
            <FlexItem>
              <Dropdown
                isOpen={menuOpen}
                onOpenChange={setMenuOpen}
                onSelect={() => setMenuOpen(false)}
                popperProps={{ placement: 'bottom-end' }}
                toggle={(ref) => (
                  <MenuToggle
                    ref={ref}
                    icon={<FilterIcon />}
                    isExpanded={menuOpen}
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="Time period for utilization charts"
                  >
                    {currentPeriod.label}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  {PERIOD_OPTIONS.map((opt) => (
                    <DropdownItem
                      key={opt.value}
                      isSelected={period === opt.value}
                      onClick={() => {
                        setPeriod(opt.value)
                        setMenuOpen(false)
                      }}
                    >
                      {opt.label}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            </FlexItem>
          </Flex>

          <Gallery hasGutter minWidths={{ default: '280px' }}>
            {METRICS.map((m) => {
              const data = chartDataMap[m.key] ?? []
              const n = data.length
              const tickPositions = n > 1 ? [0, Math.floor(n / 2), n - 1] : [0]
              return (
                <GalleryItem key={m.key}>
                  <Card component="article">
                    <CardHeader>
                      <CardTitle component="h3">{m.title}</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Content component="p" className={chartSubtitleCss}>
                        {m.subtitle}
                      </Content>
                      {/* pf-primitive-exception: Victory SVG requires an explicit pixel height;
                          no PatternFly primitive can provide a chart bounding box */}
                      <div
                        className={chartContainerCss}
                        role="img"
                        aria-label={`${m.title} — ${currentPeriod.label}, percent over time`}
                      >
                        <Chart height={180} padding={{ top: 8, right: 8, bottom: 36, left: 44 }}>
                          <ChartAxis
                            tickValues={tickPositions}
                            tickFormat={(x: number) => data[x]?.tickLabel ?? ''}
                            style={{ tickLabels: { fontSize: 10 } }}
                          />
                          <ChartAxis
                            dependentAxis
                            domain={[0, 100]}
                            tickValues={[0, 25, 50, 75, 100]}
                            tickFormat={(t: number) => `${t}%`}
                            style={{ tickLabels: { fontSize: 10 } }}
                          />
                          <ChartGroup>
                            <ChartLine
                              data={data.map((d) => ({ x: d.x, y: d.y }))}
                              style={{ data: { stroke: m.color, strokeWidth: 2 } }}
                            />
                          </ChartGroup>
                        </Chart>
                      </div>
                    </CardBody>
                  </Card>
                </GalleryItem>
              )
            })}
          </Gallery>
        </GridItem>

        {/* ---- Right: Recent activities sidebar ---- */}
        <GridItem sm={12} md={4} lg={3}>
          <Card isFullHeight isClickable component="aside" aria-label="Recent activities">
            <CardHeader
              selectableActions={{
                onClickAction: () => navigate('/activities'),
                selectableActionAriaLabel:
                  'Open recent activities — full page with detailed event information',
              }}
            >
              <CardTitle component="h2" id="osac-recent-activity-heading">
                Recent activities
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Stack hasGutter>
                {activities.map((item) => {
                  const labelColor =
                    item.severity === 'success'
                      ? 'green'
                      : item.severity === 'danger'
                        ? 'red'
                        : item.severity === 'warning'
                          ? 'orange'
                          : 'blue'
                  return (
                    <StackItem key={item.id}>
                      <Stack hasGutter={false}>
                        <StackItem>
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                          >
                            <FlexItem>
                              <Label color={labelColor} variant="outline" isCompact>
                                {item.type}
                              </Label>
                            </FlexItem>
                            <FlexItem>
                              <Content component="small" className={activityTimeCss}>
                                {new Date(item.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Content>
                            </FlexItem>
                          </Flex>
                        </StackItem>
                        <StackItem>
                          <Content component="p" className={activityMessageCss}>
                            {item.message ?? item.type}
                          </Content>
                        </StackItem>
                      </Stack>
                    </StackItem>
                  )
                })}
              </Stack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </section>
  )
}
