import { css } from '@emotion/css'
import {
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  LabelGroup,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Cluster } from '@osac/api-contracts'
import { useAllSubnets, useSecurityGroups, useVirtualNetworks } from '../../../hooks/useNetworking'

interface ClusterNetworkingTabProps {
  cluster: Cluster
}

const rootCss = css`
  padding-top: 1.5rem;
  display: grid;
  gap: 1rem;
`

const topRowCss = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
`

const cardBodyNoPaddingCss = css`
  padding: 0;
`

const subtleItalicCss = css`
  color: var(--pf-t--global--text--color--subtle);
  font-style: italic;
`

export function ClusterNetworkingTab({ cluster }: ClusterNetworkingTabProps) {
  const { data: virtualNetworks } = useVirtualNetworks()
  const { data: allSubnets } = useAllSubnets()
  const { data: securityGroups } = useSecurityGroups()

  function resolveVnName(vnId?: string): string {
    if (!vnId) return '—'
    return virtualNetworks?.find((v) => v.id === vnId)?.metadata.name ?? vnId
  }
  function resolveSubnetName(subnetId?: string): string {
    if (!subnetId) return '—'
    return allSubnets?.find((s) => s.id === subnetId)?.metadata.name ?? subnetId
  }
  function resolveSgName(sgId: string): string {
    return securityGroups?.find((sg) => sg.id === sgId)?.metadata.name ?? sgId
  }

  const vnName = resolveVnName(cluster.spec.network?.virtualNetworkRef)
  const subnetName = resolveSubnetName(cluster.spec.network?.subnetRef)
  const podCidr = cluster.spec.network?.podCidr ?? '10.128.0.0/14'
  const serviceCidr = cluster.spec.network?.serviceCidr ?? '172.30.0.0/16'
  const sgRefs = cluster.spec.network?.securityGroupRefs ?? []

  const apiPublicIp = cluster.status.network?.apiPublicIp
  const ingressPublicIp = cluster.status.network?.ingressPublicIp
  const clusterName = cluster.metadata.name

  return (
    <div className={rootCss}>
      {/* ── Top row: Virtual network + Egress policies ───────────────────── */}
      <div className={topRowCss}>
      {/* ── Virtual network ───────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Virtual network</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal isCompact columnModifier={{ default: '1Col' }}>
            <DescriptionListGroup>
              <DescriptionListTerm>VNet</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{vnName}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Node subnet</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{subnetName}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>CNI</DescriptionListTerm>
              <DescriptionListDescription>OVN-Kubernetes</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{podCidr}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Service CIDR</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{serviceCidr}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            {sgRefs.length > 0 && (
              <DescriptionListGroup>
                <DescriptionListTerm>Security groups</DescriptionListTerm>
                <DescriptionListDescription>
                  <LabelGroup numLabels={8}>
                    {sgRefs.map((sgId) => (
                      <Label key={sgId} color="blue" isCompact>
                        {resolveSgName(sgId)}
                      </Label>
                    ))}
                  </LabelGroup>
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>

       {/* ── Egress policies ───────────────────────────────────────────────── */}
       <Card>
        <CardTitle>Egress policies</CardTitle>
        <CardBody>
          <LabelGroup>
            <Label color="green" isCompact>allow: vast.{vnName}.internal</Label>
            <Label color="green" isCompact>allow: registry.osac.internal</Label>
            {cluster.status.network?.dnsRecords?.map((r) => (
              <Label key={r} color="green" isCompact>allow: {r}</Label>
            ))}
            <Label color="orange" isCompact>deny: 0.0.0.0/0</Label>
          </LabelGroup>
        </CardBody>
      </Card>

      </div>{/* end top row */}

      {/* ── Load balancers ────────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Load balancers</CardTitle>
        <CardBody className={cardBodyNoPaddingCss}>
          <Table aria-label="Load balancers">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>VIP / Public IP</Th>
                <Th>Backends</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td><code>api-{clusterName}</code></Td>
                <Td>internal</Td>
                <Td>
                  {apiPublicIp ? (
                    <ClipboardCopy isReadOnly isCode hoverTip="Copy" clickTip="Copied" aria-label="Copy API IP" variant="inline-compact">
                      {apiPublicIp}
                    </ClipboardCopy>
                  ) : (
                    <span className={subtleItalicCss}>not assigned</span>
                  )}
                </Td>
                <Td>3 control plane nodes</Td>
              </Tr>
              <Tr>
                <Td><code>ingress-{clusterName}</code></Td>
                <Td>internal</Td>
                <Td>
                  {ingressPublicIp ? (
                    <ClipboardCopy isReadOnly isCode hoverTip="Copy" clickTip="Copied" aria-label="Copy Ingress IP" variant="inline-compact">
                      {ingressPublicIp}
                    </ClipboardCopy>
                  ) : (
                    <span className={subtleItalicCss}>not assigned</span>
                  )}
                </Td>
                <Td>
                  {Object.values(cluster.spec.nodeSets ?? {}).reduce((s, ns) => s + ns.size, 0)} workers
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </CardBody>
      </Card>

    </div>
  )
}
