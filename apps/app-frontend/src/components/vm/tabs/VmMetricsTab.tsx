import { Card, CardBody, CardTitle, Grid, GridItem } from '@patternfly/react-core'
import { css } from '@emotion/css'

const svgCss = css`
  width: 100%;
  height: 60px;
  display: block;
`

const metricUnitCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const gridPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

function sinePoints(
  width: number,
  height: number,
  amplitude: number,
  offset: number,
  samples = 40,
): string {
  return Array.from({ length: samples }, (_, i) => {
    const x = (i / (samples - 1)) * width
    const y = height / 2 - amplitude * Math.sin((i / samples) * 4 * Math.PI + offset)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

interface MetricCardProps {
  title: string
  unit: string
  amplitude: number
  offset: number
}

function MetricCard({ title, unit, amplitude, offset }: MetricCardProps) {
  const pts = sinePoints(300, 60, amplitude, offset)
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardBody>
        <svg
          viewBox="0 0 300 60"
          preserveAspectRatio="none"
          aria-hidden
          className={svgCss}
        >
          <polyline
            points={pts}
            fill="none"
            stroke="var(--pf-t--global--active-color--100)"
            strokeWidth="2"
          />
        </svg>
        <small className={metricUnitCss}>{unit}</small>
      </CardBody>
    </Card>
  )
}

const METRICS: MetricCardProps[] = [
  { title: 'CPU utilization',    unit: '% over last hour',   amplitude: 12, offset: 0   },
  { title: 'Memory usage',       unit: 'GiB over last hour', amplitude: 5,  offset: 1.2 },
  { title: 'Disk read / write',  unit: 'MiB/s',              amplitude: 18, offset: 2.4 },
  { title: 'Network in / out',   unit: 'Mbps',               amplitude: 9,  offset: 3.7 },
]

export function VmMetricsTab() {
  return (
    <Grid hasGutter className={gridPaddingCss}>
      {METRICS.map((m) => (
        <GridItem key={m.title} span={6}>
          <MetricCard {...m} />
        </GridItem>
      ))}
    </Grid>
  )
}
