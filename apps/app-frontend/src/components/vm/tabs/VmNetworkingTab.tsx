import {
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  LabelGroup,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { css } from '@emotion/css'
import type { ComputeInstance } from '@osac/api-contracts'
import { shortSubnetDisplay } from '@osac/api-contracts'
import { ObjectsTable } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'

type LabelColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'grey' | 'teal' | 'yellow'

function sgColor(name: string): LabelColor {
  const n = name.toLowerCase()
  if (n.includes('allow') || n.includes('permit')) return 'green'
  if (n.includes('deny') || n.includes('block') || n.includes('restrict')) return 'red'
  if (n.includes('monitor') || n.includes('observ') || n.includes('log')) return 'purple'
  if (n.includes('internal') || n.includes('private') || n.includes('rpc')) return 'blue'
  if (n.includes('egress') || n.includes('outbound')) return 'orange'
  if (n.includes('ingress') || n.includes('inbound')) return 'teal'
  if (n.includes('admin') || n.includes('mgmt') || n.includes('management')) return 'yellow'
  return 'grey'
}

interface Props {
  vm: ComputeInstance
}

interface NicRow {
  iface: string
  vnet: string
  subnet: string
  ip: string
  mac: string
}

const sectionTitleCss = css`
  font-weight: 600;
  margin: 0 0 var(--pf-t--global--spacer--sm);
`

const tabPaddingCss = css`
  padding-top: var(--pf-t--global--spacer--md);
`

const NIC_COLUMNS: ObjectsTableColumn<NicRow>[] = [
  { label: 'Interface', dataLabel: 'Interface', render: (r) => r.iface },
  { label: 'Virtual network', dataLabel: 'Virtual network', render: (r) => r.vnet },
  { label: 'Subnet', dataLabel: 'Subnet', render: (r) => r.subnet },
  { label: 'IP', dataLabel: 'IP', render: (r) => <code>{r.ip}</code> },
  { label: 'MAC', dataLabel: 'MAC', render: (r) => <code>{r.mac}</code> },
]

export function VmNetworkingTab({ vm }: Props) {
  const MOCK_SECURITY_GROUPS = [
    'sg-allow-ssh',
    'sg-allow-https',
    'sg-internal-rpc',
    'sg-monitoring',
  ]
  const securityGroups =
    (vm.spec.securityGroups?.length ?? 0) > 0 ? vm.spec.securityGroups! : MOCK_SECURITY_GROUPS

  const nics: NicRow[] = [
    {
      iface: 'eth0',
      vnet: 'vn-prod',
      subnet: shortSubnetDisplay(vm.spec.subnet),
      ip: vm.status.ipAddress ?? '10.128.4.21',
      mac: '52:54:00:a1:1c:0e',
    },
    {
      iface: 'eth1',
      vnet: 'vn-storage',
      subnet: 'sn-storage / 10.200.0.0/24',
      ip: '10.200.0.47',
      mac: '52:54:00:b2:3d:1f',
    },
    {
      iface: 'eth2',
      vnet: 'vn-mgmt',
      subnet: 'sn-mgmt / 192.168.1.0/24',
      ip: '192.168.1.105',
      mac: '52:54:00:c3:4e:2a',
    },
  ]

  return (
    <Stack hasGutter className={tabPaddingCss}>
      <StackItem>
        <ObjectsTable
          ariaLabel="Network interfaces"
          columns={NIC_COLUMNS}
          rows={nics}
          getRowKey={(r) => r.iface}
        />
      </StackItem>

      <StackItem>
        <Content component="p" className={sectionTitleCss}>
          Security groups
        </Content>
        {securityGroups.length === 0 ? (
          <EmptyState variant="sm">
            <EmptyStateBody>No security groups configured.</EmptyStateBody>
          </EmptyState>
        ) : (
          <LabelGroup>
            {securityGroups.map((sg) => (
              <Label key={sg} color={sgColor(sg)}>
                {sg}
              </Label>
            ))}
          </LabelGroup>
        )}
      </StackItem>
    </Stack>
  )
}
