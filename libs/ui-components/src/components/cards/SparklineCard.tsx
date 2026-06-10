import { Card, CardBody, CardTitle } from '@patternfly/react-core'
import styles from './SparklineCard.module.css'

export interface SparklineCardProps {
  title: string
  unit: string
  /** Pre-computed SVG polyline points string, e.g. "0,30 10,25 20,35 ..." */
  points: string
}

export function SparklineCard({ title, unit, points }: SparklineCardProps) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardBody>
        <svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden className={styles.svg}>
          <polyline
            points={points}
            fill="none"
            stroke="var(--pf-t--global--active-color--100)"
            strokeWidth="2"
          />
        </svg>
        <small className={styles.unit}>{unit}</small>
      </CardBody>
    </Card>
  )
}
