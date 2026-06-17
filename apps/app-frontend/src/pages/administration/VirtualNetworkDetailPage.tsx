/**
 * flow: tenant-administration
 * step: tad_vn_detail
 * route: /networks/virtual-networks/:id
 */
import { useState } from 'react'
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
  Label,
  PageBreadcrumb,
  PageSection,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { PageHeader } from '@osac/ui-components'
import { useAllSubnets, useSecurityGroups, useVirtualNetworks } from '../../hooks/useNetworking'

function VnStateLabel({ state }: { state: string }) {
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
      {state}
    </Label>
  )
}

function SubnetStateLabel({ state }: { state: string }) {
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
      {state}
    </Label>
  )
}

function SgStateLabel({ state }: { state: string }) {
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
      {state}
    </Label>
  )
}

export function VirtualNetworkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<number>(0)

  const { data: vns = [] } = useVirtualNetworks()
  const { data: allSubnets = [] } = useAllSubnets()
  const { data: allSgs = [] } = useSecurityGroups()

  const vn = vns.find((v) => v.id === id)
  const subnets = allSubnets.filter((s) => s.spec.virtualNetwork === id)
  const sgs = allSgs.filter((sg) => sg.spec.virtualNetwork === id)

  if (!vn) {
    return (
      <PageSection isFilled>
        <EmptyState>
          <EmptyStateBody>Virtual network not found.</EmptyStateBody>
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
          <BreadcrumbItem isActive>{vn.metadata.name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection isFilled>
        <PageHeader
          title={vn.metadata.name}
          description={vn.spec.ipv4Cidr ?? vn.spec.ipv6Cidr ?? 'Virtual network'}
        />

        <Tabs
          activeKey={activeTab}
          onSelect={(_e, k) => setActiveTab(k as number)}
          aria-label="Virtual network detail tabs"
        >
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <div style={{ paddingTop: '1rem' }}>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>State</DescriptionListTerm>
                  <DescriptionListDescription>
                    <VnStateLabel state={vn.status.state} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>IPv4 CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{vn.spec.ipv4Cidr ?? '—'}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>IPv6 CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{vn.spec.ipv6Cidr ?? '—'}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Network Class</DescriptionListTerm>
                  <DescriptionListDescription>
                    {vn.spec.networkClass ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {vn.status.message && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Status message</DescriptionListTerm>
                    <DescriptionListDescription>{vn.status.message}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {vn.metadata.createdAt ? new Date(vn.metadata.createdAt).toLocaleString() : '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>

          <Tab eventKey={1} title={<TabTitleText>Subnets ({subnets.length})</TabTitleText>}>
            <div style={{ paddingTop: '1rem' }}>
              {subnets.length === 0 ? (
                <EmptyState>
                  <EmptyStateBody>No subnets in this virtual network.</EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Subnets" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>IPv4 CIDR</Th>
                      <Th>IPv6 CIDR</Th>
                      <Th>State</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {subnets.map((s) => (
                      <Tr key={s.id}>
                        <Td dataLabel="Name">
                          <Button
                            variant="link"
                            isInline
                            onClick={() => navigate(`/networks/subnets/${s.id}`)}
                          >
                            {s.metadata.name}
                          </Button>
                        </Td>
                        <Td dataLabel="IPv4 CIDR">
                          <code>{s.spec.ipv4Cidr ?? '—'}</code>
                        </Td>
                        <Td dataLabel="IPv6 CIDR">
                          <code>{s.spec.ipv6Cidr ?? '—'}</code>
                        </Td>
                        <Td dataLabel="State">
                          <SubnetStateLabel state={s.status.state} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </Tab>

          <Tab eventKey={2} title={<TabTitleText>Security Groups ({sgs.length})</TabTitleText>}>
            <div style={{ paddingTop: '1rem' }}>
              {sgs.length === 0 ? (
                <EmptyState>
                  <EmptyStateBody>No security groups in this virtual network.</EmptyStateBody>
                </EmptyState>
              ) : (
                <Table aria-label="Security groups" variant="compact">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Ingress rules</Th>
                      <Th>Egress rules</Th>
                      <Th>State</Th>
                      <Th aria-label="Actions" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sgs.map((sg) => (
                      <Tr key={sg.id}>
                        <Td dataLabel="Name">
                          <strong>{sg.metadata.name}</strong>
                        </Td>
                        <Td dataLabel="Ingress rules">{(sg.spec.ingress ?? []).length}</Td>
                        <Td dataLabel="Egress rules">{(sg.spec.egress ?? []).length}</Td>
                        <Td dataLabel="State">
                          <SgStateLabel state={sg.status.state} />
                        </Td>
                        <Td isActionCell>
                          <ActionsColumn
                            items={[
                              {
                                title: 'Edit rules',
                                onClick: () =>
                                  navigate('/networks', { state: { editSgId: sg.id } }),
                              },
                            ]}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </Tab>
        </Tabs>
      </PageSection>
    </>
  )
}
