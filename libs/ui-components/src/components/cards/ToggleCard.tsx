import type { ReactNode } from 'react'
import { Button, Card, CardBody, CardHeader, Label, Switch } from '@patternfly/react-core'
import styles from './ToggleCard.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type LabelColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'grey'
  | 'purple'
  | 'teal'
  | 'orangered'
  | 'yellow'

export interface ToggleCardLabel {
  text: string
  color?: LabelColor
}

export interface ToggleCardChip {
  key: string
  text: string
  color?: LabelColor
}

export interface ToggleCardProps {
  /** Title text — displayed in blue. */
  title: ReactNode
  /** Status / metadata labels shown beside the title. */
  labels?: ToggleCardLabel[]
  /** Optional description text below the title. */
  description?: ReactNode
  /** Small chip labels (e.g. version numbers) rendered below the description. */
  chips?: ToggleCardChip[]
  /** Whether the item is currently active / enabled. Controls toggle state and card opacity. */
  isActive: boolean
  /** Called with the new boolean value when the toggle changes. */
  onToggle: (value: boolean) => void
  /** Label shown on the Switch. Defaults to "Enabled". */
  toggleLabel?: string
  /** Accessible name for the toggle (should identify the item). */
  toggleAriaLabel?: string
  /** Label for the optional action button. Defaults to "View details". */
  actionLabel?: string
  /** If provided, renders an action link-button with this callback. */
  onAction?: () => void
  /** DOM id forwarded to the underlying Switch. Must be unique per page. */
  switchId: string
  /** Optional extra content rendered below description/chips in the card body. */
  extra?: ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ToggleCard({
  title,
  labels = [],
  description,
  chips = [],
  isActive,
  onToggle,
  toggleLabel = 'Enabled',
  toggleAriaLabel,
  actionLabel = 'View details',
  onAction,
  switchId,
  extra,
}: ToggleCardProps) {
  return (
    <Card className={styles.card} data-inactive={!isActive}>
      <CardHeader
        actions={{
          actions: (
            <div className={styles.actionsRow}>
              {onAction && (
                <Button variant="link" onClick={onAction}>
                  {actionLabel}
                </Button>
              )}
              <Switch
                id={switchId}
                label={toggleLabel}
                isChecked={isActive}
                onChange={(_e, v) => onToggle(v)}
                aria-label={
                  toggleAriaLabel ??
                  `${isActive ? 'Disable' : 'Enable'} ${typeof title === 'string' ? title : ''}`
                }
              />
            </div>
          ),
          hasNoOffset: true,
        }}
      >
        <div className={styles.headerInner}>
          <span className={styles.title} data-clickable={!!onAction} onClick={onAction}>
            {title}
          </span>
          {labels.map((l, i) => (
            <Label key={i} isCompact color={l.color ?? 'grey'}>
              {l.text}
            </Label>
          ))}
        </div>
      </CardHeader>

      {(description || chips.length > 0 || extra) && (
        <CardBody>
          {description && <div className={styles.desc}>{description}</div>}
          {chips.length > 0 && (
            <div className={styles.chipsRow}>
              {chips.map((c) => (
                <Label key={c.key} isCompact color={c.color ?? 'blue'}>
                  {c.text}
                </Label>
              ))}
            </div>
          )}
          {extra}
        </CardBody>
      )}
    </Card>
  )
}
