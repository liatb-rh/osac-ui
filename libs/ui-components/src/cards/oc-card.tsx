import type { ReactNode } from 'react'
import { Card, CardBody } from '@patternfly/react-core'
import { css, cx } from '@emotion/css'

// ---------------------------------------------------------------------------
// Styles — osac-pilot .osac-kpi design via PF Card
// ---------------------------------------------------------------------------

// --pf-t--global--color--brand--200 resolves to #0066cc (blue-50) in PF 6
const cardCss = css`
  box-shadow: -3px 0 0 0 var(--pf-t--global--color--brand--200) !important;
`

const bodyInnerCss = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const toneCss: Record<OcCardTone, string> = {
  default: '',
  success: css`box-shadow: -3px 0 0 0 var(--pf-t--global--color--status--success--default) !important;`,
  warning: css`box-shadow: -3px 0 0 0 var(--pf-t--global--color--status--warning--default) !important;`,
  danger:  css`box-shadow: -3px 0 0 0 var(--pf-t--global--color--status--danger--default) !important;`,
  muted:   css`box-shadow: -3px 0 0 0 var(--pf-t--global--text--color--subtle) !important;`,
}

const labelCss = css`
  font-size: var(--pf-t--global--font--size--body--lg);
  color: var(--pf-t--global--text--color--subtle);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin: 0;
`

const valueCss = css`
  font-size: 28px;
  font-weight: 700;
  color: var(--pf-t--global--text--color--regular);
  margin: 0;
  line-height: 1.2;
  text-transform: capitalize;
`

const hintCss = css`
  font-size: 12px;
  color: var(--pf-t--global--text--color--subtle);
  margin: 0;
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcCardTone = 'default' | 'success' | 'warning' | 'danger' | 'muted'

export interface OcCardProps {
  /** Short descriptive label rendered above the value (displayed uppercase). */
  label: string
  /** Primary content — string or any React node (e.g. status badge, icon). */
  value: ReactNode
  /** Optional secondary hint line below the value. */
  hint?: ReactNode
  /** Colour tone for the left accent bar. Defaults to `"default"` (blue). */
  tone?: OcCardTone
  /** Additional CSS class names merged onto the card root. */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OcCard({ label, value, hint, tone = 'default', className }: OcCardProps) {
  return (
    <Card isFullHeight className={cx(cardCss, toneCss[tone], className)}>
      <CardBody>
        <div className={bodyInnerCss}>
          <div className={labelCss}>{label}</div>
          <div className={valueCss}>{value}</div>
          {hint && <div className={hintCss}>{hint}</div>}
        </div>
      </CardBody>
    </Card>
  )
}
