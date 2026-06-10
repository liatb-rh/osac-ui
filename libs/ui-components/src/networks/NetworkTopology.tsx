import type { ComputeInstance } from '@osac/api-contracts'
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'

interface NetworkTopologyProps {
  vms: ComputeInstance[]
  onOpenVirtualMachineDetail?: (vmId: string) => void
}

interface SubnetGroup {
  subnet: string
  vms: ComputeInstance[]
}

function groupBySubnet(vms: ComputeInstance[]): SubnetGroup[] {
  const map = new Map<string, ComputeInstance[]>()
  for (const vm of vms) {
    const key = vm.spec.subnet ?? 'default'
    const list = map.get(key) ?? []
    list.push(vm)
    map.set(key, list)
  }
  return Array.from(map.entries()).map(([subnet, vms]) => ({ subnet, vms }))
}

const STATE_COLOR: Record<string, string> = {
  running: 'var(--pf-t--global--color--status--success--default)',
  paused: 'var(--pf-t--global--color--status--warning--default)',
  stopped: 'var(--pf-t--global--color--status--danger--default)',
  starting: 'var(--pf-t--global--color--status--info--default)',
}

export function NetworkTopologyPage({ vms, onOpenVirtualMachineDetail }: NetworkTopologyProps) {
  const groups = groupBySubnet(vms)

  return (
    <Stack hasGutter style={{ padding: 'var(--pf-t--global--spacer--md)', minHeight: '400px' }}>
      {groups.map((group) => (
        <StackItem key={group.subnet}>
          <Card isCompact>
            <CardBody>
              <Stack hasGutter>
                <StackItem>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem>
                      <Title headingLevel="h3" size="md" style={{ margin: 0 }}>
                        🔗 {group.subnet}
                      </Title>
                    </FlexItem>
                    <FlexItem>
                      <Label color="blue" isCompact variant="outline">
                        Subnet
                      </Label>
                    </FlexItem>
                  </Flex>
                </StackItem>
                <StackItem>
                  <Flex flexWrap={{ default: 'wrap' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    {group.vms.map((vm) => {
                      const stateColor =
                        STATE_COLOR[vm.status.state] ?? 'var(--pf-t--global--text--color--subtle)'
                      const isClickable = !!onOpenVirtualMachineDetail
                      return (
                        <FlexItem key={vm.id}>
                          <Button
                            variant="plain"
                            onClick={() => onOpenVirtualMachineDetail?.(vm.id)}
                            isDisabled={!isClickable}
                            style={{
                              border: `2px solid ${stateColor}`,
                              borderRadius: 'var(--pf-t--global--border--radius--small)',
                              padding:
                                'var(--pf-t--global--spacer--sm) var(--pf-t--global--spacer--md)',
                              background:
                                'var(--pf-t--global--background--color--primary--default)',
                              cursor: isClickable ? 'pointer' : 'default',
                              textAlign: 'left',
                              minWidth: '180px',
                              transition: 'box-shadow 0.15s',
                            }}
                            aria-label={`VM ${vm.metadata.name}, state ${vm.status.state}${isClickable ? ', click to view detail' : ''}`}
                          >
                            <Stack>
                              <StackItem>
                                <Content
                                  component="p"
                                  style={{
                                    margin: 0,
                                    fontWeight: 'var(--pf-t--global--font--weight--heading--bold)',
                                    fontSize: 'var(--pf-t--global--font--size--body--sm)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {vm.metadata.name}
                                </Content>
                              </StackItem>
                              <StackItem>
                                <Flex
                                  alignItems={{ default: 'alignItemsCenter' }}
                                  spaceItems={{ default: 'spaceItemsXs' }}
                                >
                                  <FlexItem
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: stateColor,
                                      flexShrink: 0,
                                    }}
                                    aria-hidden
                                  />
                                  <FlexItem>
                                    <Content
                                      component="small"
                                      style={{
                                        color: 'var(--pf-t--global--text--color--subtle)',
                                        fontSize: 'var(--pf-t--global--font--size--body--sm)',
                                        textTransform: 'capitalize',
                                      }}
                                    >
                                      {vm.status.state}
                                      {vm.status.ipAddress ? ` · ${vm.status.ipAddress}` : ''}
                                    </Content>
                                  </FlexItem>
                                </Flex>
                              </StackItem>
                            </Stack>
                          </Button>
                        </FlexItem>
                      )
                    })}
                  </Flex>
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </StackItem>
      ))}
    </Stack>
  )
}
