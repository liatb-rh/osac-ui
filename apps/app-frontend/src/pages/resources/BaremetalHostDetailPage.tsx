/**
 * flow: provider-administration
 * step: pad_baremetal_host_detail
 * route: /provider/baremetal/:id
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { BARE_METAL_HOSTS, BARE_METAL_INSTANCES } from '@osac/api-contracts'
import { KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'

export function BaremetalHostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('hardware')
  const [decommissionOpen, setDecommissionOpen] = useState(false)

  const host = BARE_METAL_HOSTS.find((h) => h.id === id)

  if (!host) {
    return (
      <PageSection>
        <p>
          Host not found: <code>{id}</code>
        </p>
        <Button variant="link" onClick={() => navigate('/provider/baremetal')}>
          Back to Inventory
        </Button>
      </PageSection>
    )
  }

  const allocation = BARE_METAL_INSTANCES.find((i) => i.hostRef === host.id)

  return (
    <PageSection isFilled>
      <PageHeader
        title={host.hostname}
        description={`${host.manufacturer} ${host.model} · ${host.rack} / ${host.zone}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => {}}>
              Inspect
            </Button>
            <Button variant="secondary" onClick={() => {}}>
              {host.discoveryState === 'maintenance' ? 'Exit maintenance' : 'Enter maintenance'}
            </Button>
            <Button
              variant="danger"
              isDisabled={host.discoveryState === 'allocated'}
              onClick={() => setDecommissionOpen(true)}
            >
              Decommission
            </Button>
          </>
        }
      />

      <KpiHeader
        items={[
          {
            label: 'Discovery state',
            value: (() => {
              const s = host.discoveryState
              if (s === 'available')
                return (
                  <Label color="green" isCompact>
                    Available
                  </Label>
                )
              if (s === 'allocated')
                return (
                  <Label color="blue" isCompact>
                    Allocated
                  </Label>
                )
              if (s === 'maintenance')
                return (
                  <Label color="orange" isCompact>
                    Maintenance
                  </Label>
                )
              return (
                <Label color="grey" isCompact>
                  {s}
                </Label>
              )
            })(),
          },
          {
            label: 'Power',
            value: (
              <Label color={host.powerState === 'on' ? 'green' : 'grey'} isCompact>
                {host.powerState}
              </Label>
            ),
          },
          { label: 'Cores', value: String(host.cores) },
          { label: 'Memory', value: `${host.memoryGiB} GiB` },
          {
            label: 'Allocation',
            value: host.tenantAllocation ? (
              <Label color="blue" isCompact>
                {host.tenantAllocation}
              </Label>
            ) : (
              '—'
            ),
            hint: allocation ? `Instance: ${allocation.name}` : undefined,
          },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
          <Tab eventKey="hardware" title={<TabTitleText>Hardware</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList
                isCompact
                columnModifier={{ default: '2Col' }}
                style={{ marginBottom: 20 }}
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Manufacturer</DescriptionListTerm>
                  <DescriptionListDescription>{host.manufacturer}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Model</DescriptionListTerm>
                  <DescriptionListDescription>{host.model}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Serial</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{host.serial}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>CPU</DescriptionListTerm>
                  <DescriptionListDescription>
                    {host.cpuModel} ({host.cores} cores)
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Memory</DescriptionListTerm>
                  <DescriptionListDescription>{host.memoryGiB} GiB</DescriptionListDescription>
                </DescriptionListGroup>
                {host.gpu && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>GPU</DescriptionListTerm>
                    <DescriptionListDescription>{host.gpu}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
              <strong>Disks</strong>
              <div style={{ marginTop: 8 }}>
                <ObjectsTable
                  ariaLabel="Host disks"
                  rows={host.disks}
                  getRowKey={(d) => d.name}
                  columns={[
                    { label: 'Name', render: (d) => d.name },
                    { label: 'Size', render: (d) => `${d.sizeGib} GiB` },
                    { label: 'Type', render: (d) => d.type },
                  ]}
                />
              </div>
              <strong style={{ marginTop: 20, display: 'block' }}>NICs</strong>
              <div style={{ marginTop: 8 }}>
                <ObjectsTable
                  ariaLabel="Host NICs"
                  rows={host.nics}
                  getRowKey={(n) => n.name}
                  columns={[
                    { label: 'Name', render: (n) => n.name },
                    { label: 'Speed', render: (n) => `${n.speedGbps} Gbps` },
                    { label: 'MAC', render: (n) => <code>{n.mac}</code> },
                  ]}
                />
              </div>
            </div>
          </Tab>

          <Tab eventKey="bmc" title={<TabTitleText>BMC</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>BMC address</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{host.bmcAddress}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Protocol</DescriptionListTerm>
                  <DescriptionListDescription>Redfish</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Credentials</DescriptionListTerm>
                  <DescriptionListDescription>
                    Managed by platform secrets store
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>

          <Tab eventKey="allocation" title={<TabTitleText>Allocation</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              {allocation ? (
                <DescriptionList isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Tenant</DescriptionListTerm>
                    <DescriptionListDescription>{allocation.tenant}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Instance</DescriptionListTerm>
                    <DescriptionListDescription>{allocation.name}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Allocated since</DescriptionListTerm>
                    <DescriptionListDescription>{allocation.createdAt}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              ) : (
                <EmptyState>
                  <EmptyStateBody>
                    This host is available — not allocated to any tenant.
                  </EmptyStateBody>
                </EmptyState>
              )}
            </div>
          </Tab>
        </Tabs>
      </div>

      <Modal
        isOpen={decommissionOpen}
        onClose={() => setDecommissionOpen(false)}
        variant="small"
        aria-label="Confirm decommission"
      >
        <ModalHeader title="Decommission host" />
        <ModalBody>
          Decommission <strong>{host.hostname}</strong>? This removes it from the inventory.
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={() => navigate('/provider/baremetal')}>
            Decommission
          </Button>
          <Button variant="link" onClick={() => setDecommissionOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </PageSection>
  )
}
