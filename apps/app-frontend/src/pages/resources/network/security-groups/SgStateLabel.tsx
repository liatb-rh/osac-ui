import { Label, Spinner } from '@patternfly/react-core'

export function SgStateLabel({ state }: { state: string }) {
  if (state === 'SECURITY_GROUP_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'SECURITY_GROUP_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'SECURITY_GROUP_STATE_FAILED')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      Unknown
    </Label>
  )
}
