/**
 * flow: provider-administration
 * step: pad_network_classes
 */
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  Label,
  LabelGroup,
  PageSection,
  Spinner,
} from '@patternfly/react-core'
import { useNetworkClasses } from '../../hooks/useNetworking'
import { PageHeader } from '@osac/ui-components'

function NcStateLabel({ state }: { state: string }) {
  if (state === 'NETWORK_CLASS_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'NETWORK_CLASS_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'NETWORK_CLASS_STATE_FAILED')
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

export function NetworkClassesPage() {
  const { data: networkClasses, isLoading, error, refetch } = useNetworkClasses()

  return (
    <PageSection isFilled>
      <PageHeader
        title="Network Classes"
        description="Available network backends for virtual network provisioning."
      />

      {isLoading && <Spinner aria-label="Loading network classes" />}
      {error && (
        <Alert variant="danger" title="Failed to load network classes" isInline>
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {!isLoading && !error && (networkClasses ?? []).length === 0 && (
        <EmptyState>
          <EmptyStateBody>
            No network classes available. Network classes are configured by the operator.
          </EmptyStateBody>
        </EmptyState>
      )}
      {!isLoading && !error && (networkClasses ?? []).length > 0 && (
        <Gallery hasGutter minWidths={{ default: '280px' }}>
          {(networkClasses ?? []).map((nc) => (
            <Card key={nc.id} isCompact>
              <CardHeader>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>
                    <CardTitle>{nc.title}</CardTitle>
                  </FlexItem>
                  {nc.isDefault && (
                    <FlexItem>
                      <Label color="blue" isCompact>
                        Default
                      </Label>
                    </FlexItem>
                  )}
                </Flex>
              </CardHeader>
              <CardBody>{nc.description ?? <em>No description available.</em>}</CardBody>
              <CardFooter>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>
                    <NcStateLabel state={nc.status.state} />
                  </FlexItem>
                  <FlexItem>
                    <LabelGroup aria-label={`${nc.title} capabilities`}>
                      {nc.capabilities.supportsIpv4 && (
                        <Label color="grey" isCompact>
                          IPv4
                        </Label>
                      )}
                      {nc.capabilities.supportsIpv6 && (
                        <Label color="grey" isCompact>
                          IPv6
                        </Label>
                      )}
                      {nc.capabilities.supportsDualStack && (
                        <Label color="grey" isCompact>
                          Dual-stack
                        </Label>
                      )}
                    </LabelGroup>
                  </FlexItem>
                </Flex>
              </CardFooter>
            </Card>
          ))}
        </Gallery>
      )}
    </PageSection>
  )
}
