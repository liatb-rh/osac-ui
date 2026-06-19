/**
 * flow: manage-networks
 * step: net_subnet_detail_page
 * route: /networks/subnets/:id
 */
import { useNavigate, useParams } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  PageBreadcrumb,
  PageSection,
} from '@patternfly/react-core'
import { PageHeader } from '@osac/ui-components'
import { useAllSubnets, useVirtualNetworks } from '../../../../hooks/useNetworking'
import { SubnetStateLabel } from './SubnetStateLabel'

export function SubnetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: allSubnets = [] } = useAllSubnets()
  const { data: vns = [] } = useVirtualNetworks()

  const subnet = allSubnets.find((s) => s.id === id)
  const parentVn = vns.find((v) => v.id === subnet?.spec.virtualNetwork)

  if (!subnet) {
    return (
      <PageSection isFilled>
        <EmptyState>
          <EmptyStateBody>Subnet not found.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem>
            <Button variant="link" isInline onClick={() => navigate('/networks')}>
              Networks
            </Button>
          </BreadcrumbItem>
          {parentVn && (
            <BreadcrumbItem>
              <Button
                variant="link"
                isInline
                onClick={() => navigate(`/networks/virtual-networks/${parentVn.id}`)}
              >
                {parentVn.metadata.name}
              </Button>
            </BreadcrumbItem>
          )}
          <BreadcrumbItem isActive>{subnet.metadata.name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection isFilled>
        <PageHeader
          title={subnet.metadata.name}
          description={subnet.spec.ipv4Cidr ?? subnet.spec.ipv6Cidr ?? 'Subnet'}
        />

        <DescriptionList isHorizontal style={{ maxWidth: 480 }}>
          <DescriptionListGroup>
            <DescriptionListTerm>State</DescriptionListTerm>
            <DescriptionListDescription>
              <SubnetStateLabel state={subnet.status.state} />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>IPv4 CIDR</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{subnet.spec.ipv4Cidr ?? '—'}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>IPv6 CIDR</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{subnet.spec.ipv6Cidr ?? '—'}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Parent virtual network</DescriptionListTerm>
            <DescriptionListDescription>
              {parentVn ? (
                <Button
                  variant="link"
                  isInline
                  onClick={() => navigate(`/networks/virtual-networks/${parentVn.id}`)}
                >
                  {parentVn.metadata.name}
                </Button>
              ) : (
                subnet.spec.virtualNetwork
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {subnet.status.message && (
            <DescriptionListGroup>
              <DescriptionListTerm>Status message</DescriptionListTerm>
              <DescriptionListDescription>{subnet.status.message}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {subnet.metadata.createdAt
                ? new Date(subnet.metadata.createdAt).toLocaleString()
                : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </PageSection>
    </>
  )
}
