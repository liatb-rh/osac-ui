/**
 * Reusable status label for cluster state display.
 */
import { Label, Spinner } from '@patternfly/react-core'
import type { ClusterState } from '@osac/api-contracts'

interface ClusterStatusLabelProps {
  state: ClusterState
}

const STATE_CONFIG: Record<ClusterState, { color: 'blue' | 'green' | 'red' | 'grey' | 'orange' | 'purple' | 'cyan' | 'gold'; text: string; spinning?: boolean }> = {
  CLUSTER_STATE_PROGRESSING: { color: 'blue', text: 'Provisioning', spinning: true },
  CLUSTER_STATE_READY: { color: 'green', text: 'Ready' },
  CLUSTER_STATE_FAILED: { color: 'red', text: 'Failed' },
  CLUSTER_STATE_UPGRADING: { color: 'blue', text: 'Upgrading', spinning: true },
  CLUSTER_STATE_UPGRADE_FAILED: { color: 'red', text: 'Upgrade Failed' },
  CLUSTER_STATE_UNSPECIFIED: { color: 'grey', text: 'Unknown' },
}

export function ClusterStatusLabel({ state }: ClusterStatusLabelProps) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.CLUSTER_STATE_UNSPECIFIED
  return (
    <Label color={config.color} icon={config.spinning ? <Spinner size="sm" aria-label={config.text} /> : undefined}>
      <span className="pf-v5-screen-reader">{`Cluster state: `}</span>
      {config.text}
    </Label>
  )
}
