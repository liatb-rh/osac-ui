/**
 * flow: tenant-workloads
 * step: bm_detail
 * route: /baremetal/:name
 */
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
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
import { BARE_METAL_HOSTS, BARE_METAL_INSTANCES, BM_FLAVORS, BM_IMAGES } from '@osac/api-contracts'
import { ActionRow, KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { useState } from 'react'

export function BaremetalDetailPage() {
  const { name: instanceId } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [releaseOpen, setReleaseOpen] = useState(false)

  const instance = BARE_METAL_INSTANCES.find((i) => i.id === instanceId)
  const host = instance ? BARE_METAL_HOSTS.find((h) => h.id === instance.hostRef) : null
  const flavor = instance ? BM_FLAVORS.find((f) => f.id === instance.flavor) : null
  const image = instance ? BM_IMAGES.find((img) => img.id === instance.image) : null

  if (!instance) {
    return (
      <PageSection>
        <p>
          Instance not found: <code>{instanceId}</code>
        </p>
        <Button variant="link" onClick={() => navigate('/baremetal')}>
          Back to Bare Metal
        </Button>
      </PageSection>
    )
  }

  return (
    <PageSection isFilled>
      <PageHeader
        title={instance.name}
        description={`Bare metal instance · ${flavor?.name ?? instance.flavor}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => {}}>
              {instance.provisioningState === 'active' ? 'Power off' : 'Power on'}
            </Button>
            <Button variant="secondary" onClick={() => {}}>
              Reboot
            </Button>
            <Button variant="secondary" component="a" href={instance.ipmiUrl} target="_blank">
              BMC console
            </Button>
          </>
        }
      />

      <KpiHeader
        items={[
          {
            label: 'State',
            value: (
              <Label color={instance.provisioningState === 'active' ? 'green' : 'blue'} isCompact>
                {instance.provisioningState}
              </Label>
            ),
          },
          {
            label: 'Power',
            value: host ? (
              <Label color={host.powerState === 'on' ? 'green' : 'grey'} isCompact>
                {host.powerState}
              </Label>
            ) : (
              '—'
            ),
          },
          {
            label: 'Cores',
            value: host ? String(host.cores) : flavor ? String(flavor.cores) : '—',
          },
          {
            label: 'Memory',
            value: host ? `${host.memoryGiB} GiB` : flavor ? `${flavor.memoryGiB} GiB` : '—',
          },
          { label: 'Primary IP', value: <code>{instance.ip}</code> },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
          <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList isCompact columnModifier={{ default: '2Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Instance ID</DescriptionListTerm>
                  <DescriptionListDescription>{instance.id}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Tenant</DescriptionListTerm>
                  <DescriptionListDescription>{instance.tenant}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Flavor</DescriptionListTerm>
                  <DescriptionListDescription>
                    {flavor?.name ?? instance.flavor}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Image</DescriptionListTerm>
                  <DescriptionListDescription>
                    {image?.name ?? instance.image}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Boot mode</DescriptionListTerm>
                  <DescriptionListDescription>
                    {instance.bootMode.toUpperCase()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Secure Boot</DescriptionListTerm>
                  <DescriptionListDescription>
                    {instance.secureBoot ? 'Enabled' : 'Disabled'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>{instance.createdAt}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created by</DescriptionListTerm>
                  <DescriptionListDescription>{instance.createdBy}</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>

          <Tab eventKey="hardware" title={<TabTitleText>Hardware</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              {host ? (
                <>
                  <DescriptionList
                    isCompact
                    columnModifier={{ default: '2Col' }}
                    style={{ marginBottom: 20 }}
                  >
                    <DescriptionListGroup>
                      <DescriptionListTerm>Manufacturer</DescriptionListTerm>
                      <DescriptionListDescription>
                        {host.manufacturer} {host.model}
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
                      ariaLabel="Disks"
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
                      ariaLabel="NICs"
                      rows={host.nics}
                      getRowKey={(n) => n.name}
                      columns={[
                        { label: 'Name', render: (n) => n.name },
                        { label: 'Speed', render: (n) => `${n.speedGbps} Gbps` },
                        { label: 'MAC', render: (n) => <code>{n.mac}</code> },
                      ]}
                    />
                  </div>
                </>
              ) : (
                <p>No host hardware info available.</p>
              )}
            </div>
          </Tab>

          <Tab eventKey="network" title={<TabTitleText>Network</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>Virtual network</DescriptionListTerm>
                  <DescriptionListDescription>{instance.vnet}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Subnet</DescriptionListTerm>
                  <DescriptionListDescription>{instance.subnet}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>VLAN</DescriptionListTerm>
                  <DescriptionListDescription>{instance.vlan}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>IP address</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{instance.ip}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </Tab>

          <Tab eventKey="power" title={<TabTitleText>Power &amp; Console</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <DescriptionList isCompact style={{ marginBottom: 16 }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>BMC endpoint</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{instance.ipmiUrl}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Power state</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color={host?.powerState === 'on' ? 'green' : 'grey'} isCompact>
                      {host?.powerState ?? 'Unknown'}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm">
                  Soft power off
                </Button>
                <Button variant="secondary" size="sm">
                  Hard power off
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  component="a"
                  href={instance.ipmiUrl}
                  target="_blank"
                >
                  Open console
                </Button>
              </div>
            </div>
          </Tab>

          <Tab eventKey="danger" title={<TabTitleText>Danger zone</TabTitleText>}>
            <div style={{ marginTop: 16 }}>
              <ActionRow
                icon={<TrashIcon />}
                title="Release host"
                body="Wipe the disks and return this host to the available pool. This action is irreversible."
                cta="Release host"
                tone="danger"
                onClick={() => setReleaseOpen(true)}
              />
            </div>
          </Tab>
        </Tabs>
      </div>

      <Modal
        isOpen={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        variant="small"
        aria-label="Confirm release"
      >
        <ModalHeader title="Release host" />
        <ModalBody>
          Are you sure you want to release <strong>{instance.name}</strong>? All data will be wiped.
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={() => {
              navigate('/baremetal')
            }}
          >
            Release
          </Button>
          <Button variant="link" onClick={() => setReleaseOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </PageSection>
  )
}
