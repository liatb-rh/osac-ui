import { css } from '@emotion/css'
import { Button } from '@patternfly/react-core'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const linkCss = css`
  font-weight: var(--pf-t--global--font--weight--body--bold);
  text-decoration-style: dashed;
  text-decoration-color: var(--pf-t--global--border--color--default);
  text-underline-offset: 3px;
  &:hover {
    text-decoration-color: var(--pf-t--global--color--brand--default);
  }
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OcLinkProps {
  children: string
  onClick: () => void
  isDisabled?: boolean
  title?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OcLink({ children, onClick, isDisabled, title }: OcLinkProps) {
  return (
    <Button
      variant="link"
      isInline
      isDisabled={isDisabled}
      title={title ?? children}
      className={linkCss}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDisabled) onClick()
      }}
    >
      {children}
    </Button>
  )
}
