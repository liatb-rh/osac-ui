import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Card as PfCard, CardBody as PfCardBody } from '@patternfly/react-core'
import styles from './Card.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatCardTone = 'default' | 'success' | 'warning' | 'danger' | 'muted'

export interface StatCardProps {
  /** Short descriptive label rendered above the value (displayed uppercase). */
  label: string
  /** Primary content — string or any React node (e.g. status badge, icon). */
  value: ReactNode
  /** Optional secondary hint line below the value. */
  hint?: ReactNode
  /** Colour tone for the left accent bar. Defaults to `"default"` (blue). */
  tone?: StatCardTone
  /** Additional CSS class names merged onto the card root. */
  className?: string
}

const TONE_CLASS: Record<StatCardTone, string | undefined> = {
  default: undefined,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  muted: styles.toneMuted,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatCard({ label, value, hint, tone = 'default', className }: StatCardProps) {
  return (
    <PfCard isFullHeight className={clsx(styles.card, TONE_CLASS[tone], className)}>
      <PfCardBody>
        <div className={styles.bodyInner}>
          <div className={styles.label}>{label}</div>
          <div className={styles.value}>{value}</div>
          {hint && <div className={styles.hint}>{hint}</div>}
        </div>
      </PfCardBody>
    </PfCard>
  )
}
