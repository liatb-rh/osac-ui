import { Label, Spinner } from '@patternfly/react-core'

export function VnStateLabel({ state }: { state: string }) {
  if (state === 'VIRTUAL_NETWORK_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'VIRTUAL_NETWORK_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'VIRTUAL_NETWORK_STATE_FAILED')
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
