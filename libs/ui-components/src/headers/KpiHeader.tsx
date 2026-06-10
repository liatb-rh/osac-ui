import type { ReactNode } from 'react'
import clsx from 'clsx'
import { StatCard } from '../components/cards/Card'
import type { StatCardTone } from '../components/cards/Card'
import styles from './KpiHeader.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KpiItem {
  /** Stable key for reconciliation. Falls back to label if omitted. */
  key?: string
  /** Short label rendered above the value. */
  label: string
  /** Primary value — string or any React node. */
  value: ReactNode
  /** Optional secondary hint line below the value. */
  hint?: ReactNode
  /** Colour tone for the left accent bar. Defaults to `"default"` (blue). */
  tone?: StatCardTone
}

export interface KpiHeaderProps {
  items: KpiItem[]
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KpiHeader({ items, className }: KpiHeaderProps) {
  return (
    <div className={clsx(styles.row, className)}>
      {items.map((item, i) => (
        <StatCard
          key={item.key ?? item.label ?? i}
          label={item.label}
          value={item.value}
          hint={item.hint}
          tone={item.tone}
        />
      ))}
    </div>
  )
}
