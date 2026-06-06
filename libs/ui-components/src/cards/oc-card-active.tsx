/**
 * OcCardActive — generic clickable card component for OSAC UIs.
 *
 * Built on PatternFly's Card primitives (Card / CardHeader / CardTitle /
 * CardBody / CardFooter) using the isClickable + selectableActions pattern
 * for proper a11y (hidden button covers the full card surface, keyboard
 * navigable, aria-labelledby wired to the card title).
 *
 * Maintains the osac-pilot visual design via scoped CSS overrides:
 * white surface, 3 px toned top accent, translateY lift on hover,
 * link-blue subtitle / CTA text, PF token-aware dark mode.
 *
 * Usage:
 *   <OcCardActive
 *     tone="northstar"
 *     badge="Tenant Organization"
 *     title="Northstar Bank"
 *     subtitle="Tenant Admin"
 *     description="Administer users, quota, and cluster offerings."
 *     cta="Continue to sign-in →"
 *     icon={<BuildingIcon style={{ color: '#003f87' }} aria-hidden />}
 *     onClick={handleSelect}
 *   />
 */
import { useId } from 'react'
import { css, cx } from '@emotion/css'
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Tone variant — drives the 3 px coloured top border. */
export type OcCardActiveTone = 'provider' | 'northstar' | 'bluestone'

export interface OcCardActiveProps {
  /** Accent tone — maps to a coloured 3 px top border. */
  tone?: OcCardActiveTone
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
// Styles
// ---------------------------------------------------------------------------

const TONE_BORDERS: Record<OcCardActiveTone, string> = {
  provider: '#6753c2',
  northstar: '#003f87',
  bluestone: '#1f7a4d',
}

function cardCss(tone?: OcCardActiveTone) {
  const toneAccent = tone ? `border-top: 3px solid ${TONE_BORDERS[tone]};` : ''

  return css`
    background: #ffffff;
    border: 1px solid #e3e8ee;
    border-radius: 22px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    width: 100%;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    ${toneAccent}

    &:hover {
      transform: translateY(-2px);
      border-color: #0066cc;
      box-shadow:
        0 6px 24px -8px rgba(11, 27, 43, 0.12),
        0 2px 6px rgba(11, 27, 43, 0.06);
    }

    &:has(:focus-visible) {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
      &:hover {
        transform: none;
      }
    }

    /* PF Card section padding reset */
    & .pf-v6-c-card__header,
    & .pf-v6-c-card__body,
    & .pf-v6-c-card__footer {
      padding: 0;
    }

    /*
     * When CardHeader contains only the selectable-actions button (no badge,
     * no icon), collapse it out of the flex flow so it doesn't create a gap.
     */
    &
      .pf-v6-c-card__header:not(:has(.pf-v6-c-card__header-main > *)):not(
        :has(.pf-v6-c-card__actions)
      ) {
      position: absolute;
      overflow: visible;
    }

    /* Header row: PF CardHeader already flexes badge (left) + icon (right) */
    & .pf-v6-c-card__header-main {
      display: flex;
      align-items: center;
    }

    /* Primary heading — targets both PF's wrapper and our slot className */
    & .pf-v6-c-card__title,
    & .oc-card-active__title {
      font-size: 18px;
      font-weight: 700;
      color: #0b1b2b;
      padding: 0;
    }

    /* CTA footer — push to bottom of card flex column */
    & .pf-v6-c-card__footer.oc-card-active__cta {
      margin-top: auto;
      font-size: 12px;
      font-weight: 600;
      color: #0066cc;
    }

    /* Dark mode — PF semantic tokens */
    .pf-v6-theme-dark & {
      background: var(--pf-t--global--background--color--secondary--default);
      border-color: var(--pf-t--global--border--color--default);
    }

    .pf-v6-theme-dark &:hover {
      border-color: var(--pf-t--global--active-color--100);
      box-shadow:
        0 6px 24px -8px rgba(0, 0, 0, 0.4),
        0 2px 6px rgba(0, 0, 0, 0.25);
    }

    .pf-v6-theme-dark & .pf-v6-c-card__title,
    .pf-v6-theme-dark & .oc-card-active__title {
      color: var(--pf-t--global--text--color--regular);
    }

    .pf-v6-theme-dark & .oc-card-active__badge,
    .pf-v6-theme-dark & .oc-card-active__desc {
      color: var(--pf-t--global--text--color--subtle);
    }
  `
}

const badgeCss = css`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5b6b7c;
`

const subtitleCss = css`
  font-size: 14px;
  font-weight: 600;
  color: #0066cc;
`

const descCss = css`
  font-size: 13px;
  color: #5b6b7c;
  line-height: 1.5;
  margin-top: 4px;
`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OcCardActive({
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
}: OcCardActiveProps) {
  const uid = useId()
  const titleId = `oc-card-active-title-${uid}`

  const rootCls = cx(cardCss(tone), className)

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
            <span className={cx('oc-card-active__badge', badgeCss)}>{badge}</span>
          )}
        </CardHeader>
      )}

      <CardTitle id={titleId} className="oc-card-active__title">
        {title}
      </CardTitle>

      {(subtitle !== undefined || description !== undefined) && (
        <CardBody>
          {subtitle !== undefined && <div className={subtitleCss}>{subtitle}</div>}
          {description !== undefined && (
            <div className={cx('oc-card-active__desc', descCss)}>{description}</div>
          )}
        </CardBody>
      )}

      {cta !== undefined && <CardFooter className="oc-card-active__cta">{cta}</CardFooter>}
    </Card>
  )
}
