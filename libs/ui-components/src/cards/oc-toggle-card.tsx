import type { ReactNode } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Label,
  Switch,
} from '@patternfly/react-core'
import { css } from '@emotion/css'

// ── Styles ────────────────────────────────────────────────────────────────────

const cardCss = css`
  transition: opacity 0.2s ease;
  &[data-inactive='true'] {
    opacity: 0.65;
  }
`

const titleCss = css`
  font-weight: 600;
  color: #0066cc;
  cursor: default;
  &[data-clickable='true'] {
    cursor: pointer;
  }
`

const descCss = css`
  font-size: 13px;
  color: var(--pf-t--global--text--color--subtle);
  margin-top: 2px;
`

const chipsRowCss = css`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
`

const headerInnerCss = css`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`

const actionsRowCss = css`
  display: flex;
  gap: 8px;
  align-items: center;
`

// ── Types ─────────────────────────────────────────────────────────────────────

type LabelColor = 'blue' | 'green' | 'orange' | 'red' | 'grey' | 'purple' | 'teal' | 'orangered' | 'yellow'

export interface OcToggleCardLabel {
  text: string
  color?: LabelColor
}

export interface OcToggleCardChip {
  key: string
  text: string
  color?: LabelColor
}

export interface OcToggleCardProps {
  /** Title text — displayed in blue. */
  title: ReactNode
  /** Status / metadata labels shown beside the title. */
  labels?: OcToggleCardLabel[]
  /** Optional description text below the title. */
  description?: ReactNode
  /** Small chip labels (e.g. version numbers) rendered below the description. */
  chips?: OcToggleCardChip[]
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

export function OcToggleCard({
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
}: OcToggleCardProps) {
  return (
    <Card
      className={cardCss}
      data-inactive={!isActive}
    >
      <CardHeader
        actions={{
          actions: (
            <div className={actionsRowCss}>
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
                aria-label={toggleAriaLabel ?? `${isActive ? 'Disable' : 'Enable'} ${typeof title === 'string' ? title : ''}`}
              />
            </div>
          ),
          hasNoOffset: true,
        }}
      >
        <div className={headerInnerCss}>
          <span
            className={titleCss}
            data-clickable={!!onAction}
            onClick={onAction}
          >
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
          {description && <div className={descCss}>{description}</div>}
          {chips.length > 0 && (
            <div className={chipsRowCss}>
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
