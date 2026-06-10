import { css } from '@emotion/css'
import { Grid, GridItem } from '@patternfly/react-core'
import { SparklineCard } from '@osac/ui-components'

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

interface MetricConfig {
  title: string
  unit: string
  amplitude: number
  offset: number
}

const METRICS: MetricConfig[] = [
  { title: 'CPU utilization', unit: '% over last hour', amplitude: 12, offset: 0 },
  { title: 'Memory usage', unit: 'GiB over last hour', amplitude: 5, offset: 1.2 },
  { title: 'Disk read / write', unit: 'MiB/s', amplitude: 18, offset: 2.4 },
  { title: 'Network in / out', unit: 'Mbps', amplitude: 9, offset: 3.7 },
]

export function VmMetricsTab() {
  return (
    <Grid hasGutter className={gridPaddingCss}>
      {METRICS.map((m) => (
        <GridItem key={m.title} span={6}>
          <SparklineCard
            title={m.title}
            unit={m.unit}
            points={sinePoints(300, 60, m.amplitude, m.offset)}
          />
        </GridItem>
      ))}
    </Grid>
  )
}
