import { css } from '@emotion/css'
import { Flex, FlexItem } from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'

const unavailableRowCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

export function formatDate(ts?: string): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
  } catch {
    return ts
  }
}

export function UnavailableRow({ label }: { label: string }) {
  return (
    <Flex
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className={unavailableRowCss}
    >
      <FlexItem>
        <LockIcon aria-hidden />
      </FlexItem>
      <FlexItem>
        <em>{label} not available yet</em>
      </FlexItem>
    </Flex>
  )
}
