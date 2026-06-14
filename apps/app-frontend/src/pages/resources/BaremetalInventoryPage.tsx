/**
 * flow: provider-administration
 * step: pad_baremetal_inventory
 * route: /provider/baremetal
 *
 * Provider admin — bare metal host inventory, cross-tenant instances, discovery queue.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Label,
  PageSection,
  SearchInput,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { BARE_METAL_HOSTS, BARE_METAL_INSTANCES, BM_FLAVORS, BM_IMAGES } from '@osac/api-contracts'
import type { BareMetalHost } from '@osac/api-contracts'
import { KpiHeader, ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DiscoveryStateLabel({ state }: { state: string }) {
  if (state === 'available')
    return (
      <Label color="green" isCompact>
        Available
      </Label>
    )
  if (state === 'allocated')
    return (
      <Label color="blue" isCompact>
        Allocated
      </Label>
    )
  if (state === 'maintenance')
    return (
      <Label color="orange" isCompact>
        Maintenance
      </Label>
    )
  if (state === 'inspecting')
    return (
      <Label color="teal" isCompact>
        Inspecting
      </Label>
    )
  if (state === 'discovered')
    return (
      <Label color="purple" isCompact>
        Discovered
      </Label>
    )
  if (state === 'failed')
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BaremetalInventoryPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('hosts')
  const [hostSearch, setHostSearch] = useState('')
  const [hosts, setHosts] = useState(BARE_METAL_HOSTS)

  const available = hosts.filter((h) => h.discoveryState === 'available').length
  const allocated = hosts.filter((h) => h.discoveryState === 'allocated').length
  const maintenance = hosts.filter((h) => h.discoveryState === 'maintenance').length
  const pending = hosts.filter((h) =>
    ['discovered', 'inspecting'].includes(h.discoveryState),
  ).length

  const filteredHosts = hosts.filter((h) => {
    if (!hostSearch.trim()) return true
    const q = hostSearch.toLowerCase()
    return (
      h.hostname.toLowerCase().includes(q) ||
      h.serial.toLowerCase().includes(q) ||
      h.rack.toLowerCase().includes(q)
    )
  })

  const discoveryHosts = hosts.filter((h) =>
    ['discovered', 'inspecting'].includes(h.discoveryState),
  )

  function enterMaintenance(id: string) {
    setHosts((prev) =>
      prev.map((h) => (h.id === id ? { ...h, discoveryState: 'maintenance' as const } : h)),
    )
  }

  function exitMaintenance(id: string) {
    setHosts((prev) =>
      prev.map((h) => (h.id === id ? { ...h, discoveryState: 'available' as const } : h)),
    )
  }

  const hostColumns: ObjectsTableColumn<BareMetalHost>[] = [
    {
      label: 'Hostname',
      render: (h) => (
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            textDecoration: 'underline dashed',
            textUnderlineOffset: '3px',
          }}
          onClick={() => navigate(`/provider/baremetal/${h.id}`)}
        >
          {h.hostname}
        </button>
      ),
    },
    { label: 'Serial', render: (h) => <code>{h.serial}</code> },
    { label: 'Model', render: (h) => `${h.manufacturer} ${h.model}` },
    {
      label: 'CPU/RAM',
      render: (h) => `${h.cores} cores · ${h.memoryGiB} GiB`,
    },
    {
      label: 'GPU',
      render: (h) => h.gpu ?? '—',
    },
    {
      label: 'Rack/Zone',
      render: (h) => `${h.rack} / ${h.zone}`,
    },
    {
      label: 'Power',
      render: (h) => (
        <Label color={h.powerState === 'on' ? 'green' : 'grey'} isCompact>
          {h.powerState}
        </Label>
      ),
    },
    {
      label: 'State',
      render: (h) => <DiscoveryStateLabel state={h.discoveryState} />,
    },
    {
      label: 'Allocation',
      render: (h) => h.tenantAllocation ?? '—',
    },
    {
      isActionCell: true,
      render: (h) => (
        <ActionsColumn
          items={[
            { title: 'Inspect', onClick: () => navigate(`/provider/baremetal/${h.id}`) },
            {
              title: h.discoveryState === 'maintenance' ? 'Exit maintenance' : 'Enter maintenance',
              onClick: () =>
                h.discoveryState === 'maintenance' ? exitMaintenance(h.id) : enterMaintenance(h.id),
            },
            {
              title: 'Decommission',
              isDisabled: h.discoveryState === 'allocated',
              onClick: () => {
                setHosts((prev) => prev.filter((host) => host.id !== h.id))
              },
            },
          ]}
        />
      ),
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Bare Metal Inventory"
        description="Physical host inventory, cross-tenant instance view, and discovery management."
        actions={
          <Button variant="secondary" onClick={() => {}}>
            Trigger discovery scan
          </Button>
        }
      />

      <KpiHeader
        items={[
          { label: 'Total hosts', value: String(hosts.length) },
          { label: 'Available', value: String(available), tone: 'success' },
          { label: 'Allocated', value: String(allocated) },
          { label: 'Maintenance', value: String(maintenance), tone: 'warning' },
          { label: 'Pending discovery', value: String(pending) },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
          <Tab eventKey="hosts" title={<TabTitleText>Hosts</TabTitleText>}>
            <div style={{ marginTop: 12 }}>
              <SearchInput
                placeholder="Search by hostname, serial, rack…"
                value={hostSearch}
                onChange={(_, v) => setHostSearch(v)}
                onClear={() => setHostSearch('')}
                style={{ maxWidth: 400, marginBottom: 12 }}
              />
              <ObjectsTable
                ariaLabel="Bare metal hosts"
                rows={filteredHosts}
                getRowKey={(h) => h.id}
                columns={hostColumns}
                onRowClick={(h) => navigate(`/provider/baremetal/${h.id}`)}
                defaultPageSize={10}
              />
            </div>
          </Tab>

          <Tab eventKey="instances" title={<TabTitleText>Instances</TabTitleText>}>
            <div style={{ marginTop: 12 }}>
              <ObjectsTable
                ariaLabel="Bare metal instances (all tenants)"
                rows={BARE_METAL_INSTANCES}
                getRowKey={(i) => i.id}
                columns={[
                  { label: 'Name', render: (i) => <strong>{i.name}</strong> },
                  { label: 'Tenant', render: (i) => i.tenant },
                  {
                    label: 'Flavor',
                    render: (i) => {
                      const f = BM_FLAVORS.find((fl) => fl.id === i.flavor)
                      return f?.name ?? i.flavor
                    },
                  },
                  {
                    label: 'Image',
                    render: (i) => {
                      const img = BM_IMAGES.find((m) => m.id === i.image)
                      return img?.name ?? i.image
                    },
                  },
                  { label: 'Host', render: (i) => <code>{i.hostRef}</code> },
                  {
                    label: 'State',
                    render: (i) => (
                      <Label color={i.provisioningState === 'active' ? 'green' : 'blue'} isCompact>
                        {i.provisioningState}
                      </Label>
                    ),
                  },
                  { label: 'Created', render: (i) => i.createdAt.split('T')[0] },
                ]}
              />
            </div>
          </Tab>

          <Tab eventKey="discovery" title={<TabTitleText>Discovery</TabTitleText>}>
            <div style={{ marginTop: 12 }}>
              <ObjectsTable
                ariaLabel="Discovery queue"
                rows={discoveryHosts}
                getRowKey={(h) => h.id}
                columns={[
                  { label: 'Hostname', render: (h) => h.hostname },
                  { label: 'Serial', render: (h) => <code>{h.serial}</code> },
                  { label: 'Model', render: (h) => `${h.manufacturer} ${h.model}` },
                  { label: 'Discovered', render: (h) => h.discoveredAt.split('T')[0] },
                  {
                    label: 'State',
                    render: (h) => <DiscoveryStateLabel state={h.discoveryState} />,
                  },
                  {
                    isActionCell: true,
                    render: (h) => (
                      <ActionsColumn
                        items={[
                          {
                            title: 'Inspect',
                            onClick: () => navigate(`/provider/baremetal/${h.id}`),
                          },
                          {
                            title: 'Make available',
                            isDisabled: h.discoveryState === 'inspecting',
                            onClick: () => {
                              setHosts((prev) =>
                                prev.map((host) =>
                                  host.id === h.id
                                    ? { ...host, discoveryState: 'available' as const }
                                    : host,
                                ),
                              )
                            },
                          },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </Tab>
        </Tabs>
      </div>
    </PageSection>
  )
}
