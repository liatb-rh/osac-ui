import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { WindowsIcon } from '@patternfly/react-icons/dist/esm/icons/windows-icon'
/**
 * flow: manage-virtual-machines
 * step: mvm_detail_drawer
 */
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Flex,
  PageSection,
  Stack,
  StackItem,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { useState } from 'react'
import type { ComputeInstance, VmPowerState } from '@osac/api-contracts'
import {
  formatConditionStatusForDisplay,
  resolveVmOsForUi,
  shortSubnetDisplay,
} from '@osac/api-contracts'
import linuxMascotUrl from '../../assets/guest-os-tux-linux.png'
import { VmStatusLabel } from '@osac/ui-components'
import { VmActionsMenu } from './VmActionsMenu'

interface Props {
  vm: ComputeInstance | null
  effectiveState: VmPowerState
  onClose: () => void
  onPower: (action: 'start' | 'stop' | 'restart') => void
  onDelete?: () => void
  /* RESTORE when fulfillment supports clone: onClone?: () => void */
  isRestarting?: boolean
  isPowerActionPending?: boolean
  onOpenConsole: () => void
}

function humanizeConditionType(type: string): string {
  return type.replace(/^CONDITION_TYPE_/i, '').replace(/_/g, ' ') || type
}

function formatIsoDate(iso?: string): string {
  if (!iso?.trim()) return '—'
  const t = Date.parse(iso.trim())
  return Number.isNaN(t) ? iso : new Date(t).toLocaleString()
}

export function VmDetailDrawer({
  vm,
  effectiveState,
  onClose,
  onPower,
  onDelete,
  isRestarting = false,
  isPowerActionPending = false,
  onOpenConsole,
}: Props) {
  const [activeTab, setActiveTab] = useState(0)

  if (!vm) return null

  const isConsoleAvailable = effectiveState === 'running'
  const consoleSummary =
    effectiveState === 'running'
      ? 'Console is available for this virtual machine.'
      : effectiveState === 'paused'
        ? 'Console is unavailable while the virtual machine is paused.'
        : 'Console is unavailable while the virtual machine is stopped.'

  const uiOs = resolveVmOsForUi(vm)
  const osLabel = uiOs === 'rhel' ? 'RHEL' : uiOs === 'windows' ? 'Windows' : 'Linux'

  const tenantsLine = vm.metadata.tenants?.length ? vm.metadata.tenants.join(', ') : '—'
  const creatorsLine = vm.metadata.creators?.length ? vm.metadata.creators.join(', ') : '—'

  return (
    <Stack hasGutter>
      <StackItem>
        <Breadcrumb>
          <BreadcrumbItem>
            <Button variant="link" isInline onClick={onClose}>
              My VMs
            </Button>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{vm.metadata.name}</BreadcrumbItem>
        </Breadcrumb>
      </StackItem>

      <StackItem>
        <Stack hasGutter={false}>
          <StackItem>
            <Title headingLevel="h1" size="2xl">
              {vm.metadata.name}
            </Title>
          </StackItem>
          {vm.description && (
            <StackItem>
              <Content
                component="p"
                style={{ color: 'var(--pf-t--global--text--color--subtle)', margin: 0 }}
              >
                {vm.description}
              </Content>
            </StackItem>
          )}
        </Stack>
      </StackItem>

      <StackItem>
        <Divider />
      </StackItem>

      <StackItem>
        <div className="osac-vm-detail-layout">
          <Card isFullHeight className="osac-vm-detail-main-card">
            <CardBody>
              <Tabs
                activeKey={activeTab}
                onSelect={(_e, key) => setActiveTab(Number(key))}
                className="osac-vm-detail-tabs"
              >
                <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
                  <PageSection
                    hasBodyWrapper={false}
                    style={{ padding: 'var(--pf-t--global--spacer--md) 0' }}
                  >
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Name</DescriptionListTerm>
                        <DescriptionListDescription>{vm.metadata.name}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>OS</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            spaceItems={{ default: 'spaceItemsSm' }}
                          >
                            {uiOs === 'windows' ? (
                              <WindowsIcon style={{ width: 16, height: 16, color: '#0078D4' }} />
                            ) : uiOs === 'rhel' ? (
                              <RedhatIcon style={{ width: 16, height: 16, color: '#EE0000' }} />
                            ) : (
                              <img
                                src={linuxMascotUrl}
                                alt=""
                                width={16}
                                height={16}
                                style={{ objectFit: 'contain' }}
                              />
                            )}
                            <span>{osLabel}</span>
                          </Flex>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Template</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.spec.template ?? '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Run strategy</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.spec.runStrategy ?? '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>vCPU</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.spec.cores ?? '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Memory</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.spec.memoryGib != null ? `${vm.spec.memoryGib} GiB` : '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      {vm.description && (
                        <DescriptionListGroup>
                          <DescriptionListTerm>Description</DescriptionListTerm>
                          <DescriptionListDescription>{vm.description}</DescriptionListDescription>
                        </DescriptionListGroup>
                      )}
                      <DescriptionListGroup>
                        <DescriptionListTerm>Created</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.metadata.createdAt ? formatIsoDate(vm.metadata.createdAt) : '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Tenants</DescriptionListTerm>
                        <DescriptionListDescription>{tenantsLine}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Creators</DescriptionListTerm>
                        <DescriptionListDescription>{creatorsLine}</DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Version</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.metadata.version != null ? String(vm.metadata.version) : '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </PageSection>
                </Tab>

                <Tab eventKey={1} title={<TabTitleText>Networking</TabTitleText>}>
                  <PageSection
                    hasBodyWrapper={false}
                    style={{ padding: 'var(--pf-t--global--spacer--md) 0' }}
                  >
                    <DescriptionList isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>IP address</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.status.ipAddress ?? '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Subnet</DescriptionListTerm>
                        <DescriptionListDescription>
                          {shortSubnetDisplay(vm.spec.subnet)}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Security groups</DescriptionListTerm>
                        <DescriptionListDescription>
                          {vm.spec.securityGroups?.join(', ') ?? '—'}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </PageSection>
                </Tab>

                <Tab eventKey={2} title={<TabTitleText>Conditions</TabTitleText>}>
                  <PageSection
                    hasBodyWrapper={false}
                    style={{ padding: 'var(--pf-t--global--spacer--md) 0' }}
                  >
                    {vm.status.conditions && vm.status.conditions.length > 0 ? (
                      <Table aria-label="Virtual machine conditions" variant="compact">
                        <Thead>
                          <Tr>
                            <Th>Type</Th>
                            <Th>Status</Th>
                            <Th>Reason</Th>
                            <Th>Message</Th>
                            <Th>Last transition</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {vm.status.conditions.map((c, i) => (
                            <Tr key={`${c.type}-${i}`}>
                              <Td dataLabel="Type">{humanizeConditionType(c.type)}</Td>
                              <Td dataLabel="Status">
                                {formatConditionStatusForDisplay(c.status)}
                              </Td>
                              <Td dataLabel="Reason">{c.reason ?? '—'}</Td>
                              <Td dataLabel="Message">{c.message ?? '—'}</Td>
                              <Td dataLabel="Last transition">
                                {formatIsoDate(c.lastTransitionTime)}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Content
                        component="p"
                        style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                      >
                        No conditions reported.
                      </Content>
                    )}
                  </PageSection>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>

          <Card isFullHeight className="osac-vm-detail-console-card">
            <CardHeader>
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ width: '100%' }}
              >
                <CardTitle>Console</CardTitle>
                <VmActionsMenu
                  vm={vm}
                  effectiveState={effectiveState}
                  isRestarting={isRestarting}
                  isPowerActionPending={isPowerActionPending}
                  onPower={onPower}
                  onDelete={onDelete}
                />
              </Flex>
            </CardHeader>
            <CardBody>
              <Stack hasGutter>
                <StackItem>
                  <VmStatusLabel state={effectiveState} />
                </StackItem>
                <StackItem>
                  <Content
                    component="p"
                    style={{ margin: 0, color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    {consoleSummary}
                  </Content>
                </StackItem>
                <StackItem>
                  <Button
                    variant="primary"
                    isBlock
                    isDisabled={!isConsoleAvailable}
                    onClick={onOpenConsole}
                  >
                    Open console
                  </Button>
                </StackItem>
                <StackItem>
                  <Content component="p" style={{ margin: 0 }}>
                    <strong>IP address:</strong> {vm.status.ipAddress ?? '—'}
                  </Content>
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </div>
      </StackItem>
    </Stack>
  )
}
