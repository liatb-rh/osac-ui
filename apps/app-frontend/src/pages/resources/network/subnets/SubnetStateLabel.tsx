import { Label, Spinner } from '@patternfly/react-core'

export function SubnetStateLabel({ state }: { state: string }) {
  if (state === 'SUBNET_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'SUBNET_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'SUBNET_STATE_FAILED')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  if (state === 'SUBNET_STATE_DELETING')
    return (
      <Label color="orange" isCompact>
        Deleting
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      Unknown
    </Label>
  )
}
