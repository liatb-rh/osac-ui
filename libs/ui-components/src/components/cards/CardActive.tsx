/**
 * CardActive — interactive card with accent tone, badge, icon, and CTA slot.
 *
 * Usage:
 *   <CardActive
 *     tone="provider"
 *     badge="Platform Operator"
 *     title="Red Hat"
 *     subtitle="Primary provider"
 *     description="Manages the underlying infrastructure."
 *     cta="Open provider settings →"
 *     onClick={() => navigate('/providers/rh')}
 *   />
 */
import { useId } from 'react'
import clsx from 'clsx'
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core'
import type { ReactNode } from 'react'
import styles from './CardActive.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Tone variant — drives the 3 px coloured top border. */
export type CardActiveTone = 'provider' | 'northstar' | 'bluestone'

export interface CardActiveProps {
  /** Accent tone — maps to a coloured 3 px top border. */
  tone?: CardActiveTone
  /** Small all-caps label at the top-left (e.g. "Platform Operator"). */
  badge?: string
  /** Optional icon rendered at the top-right of the header row. */
  icon?: ReactNode
  /** Primary heading — organisation or entity name. */
  title: string
  /** Secondary line rendered in link-blue (e.g. a role label). */
  subtitle?: string
  /** Body copy beneath the title. */
  description?: string
  /** CTA text pushed to the bottom of the card. */
  cta?: string
  /** Click handler — the entire card surface is the click target. */
  onClick?: () => void
  /** Additional class names merged onto the root element. */
  className?: string
  /** Overrides the implicit accessible name (derived from title). */
  'aria-label'?: string
}

// ---------------------------------------------------------------------------
// Tone class map
// ---------------------------------------------------------------------------

const TONE_CLASS: Record<CardActiveTone, string> = {
  provider: styles.toneProvider,
  northstar: styles.toneNorthstar,
  bluestone: styles.toneBluestone,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CardActive({
  tone,
  badge,
  icon,
  title,
  subtitle,
  description,
  cta,
  onClick,
  className,
  'aria-label': ariaLabel,
}: CardActiveProps) {
  const uid = useId()
  const titleId = `oc-card-active-title-${uid}`

  const rootCls = clsx(styles.card, tone && TONE_CLASS[tone], className)

  const showHeader = badge !== undefined || icon !== undefined || onClick !== undefined

  return (
    <Card isClickable={!!onClick} className={rootCls}>
      {showHeader && (
        <CardHeader
          actions={icon !== undefined ? { actions: <>{icon}</> } : undefined}
          {...(onClick !== undefined && {
            selectableActions: {
              onClickAction: onClick,
              selectableActionId: `oc-card-active-btn-${uid}`,
              selectableActionAriaLabelledby: titleId,
              ...(ariaLabel !== undefined && {
                selectableActionAriaLabel: ariaLabel,
              }),
            },
          })}
        >
          {badge !== undefined && (
            <span className={clsx('oc-card-active__badge', styles.badge)}>{badge}</span>
          )}
        </CardHeader>
      )}

      <CardTitle id={titleId} className="oc-card-active__title">
        {title}
      </CardTitle>

      {(subtitle !== undefined || description !== undefined) && (
        <CardBody>
          {subtitle !== undefined && <div className={styles.subtitle}>{subtitle}</div>}
          {description !== undefined && (
            <div className={clsx('oc-card-active__desc', styles.desc)}>{description}</div>
          )}
        </CardBody>
      )}

      {cta !== undefined && <CardFooter className="oc-card-active__cta">{cta}</CardFooter>}
    </Card>
  )
}
