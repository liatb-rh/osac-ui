/**
 * flow: provider-administration
 * step: pad_infrastructure_topology
 */
import { PageSection } from '@patternfly/react-core'
import { NetworkTopologyPage } from '@osac/ui-components'
import { useComputeInstances } from '../../hooks/hooks'
import { PageHeader } from '../../components/layout'

export function ProviderInfraTopologyPage() {
  const { data: vms = [] } = useComputeInstances()

  return (
    <PageSection isFilled>
      <PageHeader
        title="Infrastructure"
        description="Platform-wide network topology across all tenant organizations."
      />
      {/* Provider topology — VM node click is no-op per spec */}
      <NetworkTopologyPage vms={vms} />
    </PageSection>
  )
}
