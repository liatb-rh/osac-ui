import { Flex, FlexItem, Label, Spinner } from '@patternfly/react-core'
import { type VmPowerState, isVmTransitionPowerState } from '@osac/api-contracts'

interface VmStatusLabelProps {
  state: VmPowerState
}

const STATE_MAP: Record<
  VmPowerState,
  { color: 'green' | 'orange' | 'red' | 'blue' | 'grey'; text: string }
> = {
  running: { color: 'green', text: 'Running' },
  paused: { color: 'orange', text: 'Paused' },
  stopped: { color: 'red', text: 'Stopped' },
  starting: { color: 'blue', text: 'Starting' },
  stopping: { color: 'blue', text: 'Stopping' },
  restarting: { color: 'blue', text: 'Restarting' },
  deleting: { color: 'grey', text: 'Deleting' },
  error: { color: 'red', text: 'Error' },
  creating: { color: 'blue', text: 'Creating' },
  still_provisioning: { color: 'blue', text: 'Still provisioning' },
}

export function VmStatusLabel({ state }: VmStatusLabelProps) {
  const { color, text } = STATE_MAP[state] ?? { color: 'grey', text: state }
  const inTransition = isVmTransitionPowerState(state)

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
      {inTransition ? (
        <FlexItem>
          <Spinner size="sm" aria-label={`${text} in progress`} />
        </FlexItem>
      ) : null}
      <FlexItem>
        <Label color={color} isCompact>
          {text}
        </Label>
      </FlexItem>
    </Flex>
  )
}
