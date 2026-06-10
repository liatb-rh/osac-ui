/**
 * flow: provider-administration
 * step: pad_agent_detail
 * route: /provider/agents/:id
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  LabelGroup,
  PageSection,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { EditIcon } from '@patternfly/react-icons/dist/esm/icons/edit-icon'
import { PowerOffIcon } from '@patternfly/react-icons/dist/esm/icons/power-off-icon'
import { RedoIcon } from '@patternfly/react-icons/dist/esm/icons/redo-icon'
import { SyncAltIcon } from '@patternfly/react-icons/dist/esm/icons/sync-alt-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import type { Agent, AgentState } from '@osac/api-contracts'
import { KpiHeader, ObjectsTable } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { useAgent, useDeprovisionAgent } from '../../hooks/useAgents'
import { ActionRow, PageHeader } from '@osac/ui-components'

// ── Hardware profile helpers ──────────────────────────────────────────────────

interface HwProfile {
  title: string
  description: string
  cores: number
  memGib: number
  diskTib: number
  nicCount: number
  nicSpeed: number
}

const HW_PROFILES: Record<string, HwProfile> = {
  'baremetal-standard-48c-192g': {
    title: 'Standard · 48c / 192G',
    description: '48 cores · 192 GiB RAM · NVMe local · general-purpose workers.',
    cores: 48,
    memGib: 192,
    diskTib: 3.8,
    nicCount: 2,
    nicSpeed: 25,
  },
  'baremetal-high-64c-1024g': {
    title: 'High memory · 64c / 1024G',
    description: '64 cores · 1 TiB RAM · NVMe local · high-memory analytics & databases.',
    cores: 64,
    memGib: 1024,
    diskTib: 7.6,
    nicCount: 2,
    nicSpeed: 25,
  },
  'baremetal-gpu-96c-1024g-h100': {
    title: 'GPU · 96c / 1024G · H100',
    description: '96 cores · 1 TiB RAM · 4× NVIDIA H100 · for ML training & inference.',
    cores: 96,
    memGib: 1024,
    diskTib: 15.3,
    nicCount: 2,
    nicSpeed: 100,
  },
}

function hwProfile(profile: string | undefined): HwProfile {
  if (profile && HW_PROFILES[profile]) return HW_PROFILES[profile]
  // Parse from profile string if possible
  const m = profile?.match(/baremetal-[^-]+-(\d+)c-(\d+)g/)
  if (m) {
    return {
      title: `${m[1]}c / ${m[2]}G`,
      description: `${m[1]} cores · ${m[2]} GiB RAM`,
      cores: Number(m[1]),
      memGib: Number(m[2]),
      diskTib: 1.9,
      nicCount: 1,
      nicSpeed: 25,
    }
  }
  return {
    title: profile ?? '—',
    description: '—',
    cores: 0,
    memGib: 0,
    diskTib: 0,
    nicCount: 1,
    nicSpeed: 10,
  }
}

// ── State display ─────────────────────────────────────────────────────────────

const STATE_LABEL: Record<AgentState, string> = {
  AGENT_STATE_AVAILABLE: 'available',
  AGENT_STATE_PROVISIONING: 'provisioning',
  AGENT_STATE_PROVISIONED: 'provisioned',
  AGENT_STATE_DEPROVISIONING: 'deprovisioning',
  AGENT_STATE_UNAVAILABLE: 'unreachable',
}

// ── Enriched fields (derived from lean API type) ──────────────────────────────

function enrolledAt(a: Agent): string {
  return a.metadata?.createdAt ? a.metadata.createdAt.slice(0, 10) : '—'
}

function mockNics(hw: HwProfile, agentId: string) {
  const seed = agentId.replace(/\D/g, '').slice(0, 2).padStart(2, '0')
  return Array.from({ length: hw.nicCount }, (_, i) => ({
    name: `eno${i + 1}`,
    mac: `ac:1f:6b:00:${seed}:0${i + 1}`,
    speedGbps: hw.nicSpeed,
    link: 'up' as const,
    bound: i === 0 ? 'mgmt' : 'data',
  }))
}

const overviewGridCss = css`
  padding-top: 1rem;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
`

const hwDescriptionHintCss = css`
  color: var(--pf-t--global--text--color--subtle);
  font-size: 12px;
  margin-left: 6px;
`

const unassignedSpanCss = css`
  color: var(--pf-t--global--text--color--subtle);
`

const conditionsListCss = css`
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
`

const conditionItemCss = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--pf-t--global--border--color--default);
`

const conditionTypeCodeCss = css`
  font-size: 11px;
`

const tabContentCss = css`
  padding-top: 1rem;
`

const boundCodeCss = css`
  font-size: 12px;
`

const logPreCss = css`
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  font-family: var(--pf-t--global--font--family--mono);
  white-space: pre-wrap;
  color: var(--pf-t--global--text--color--regular);
`

const dangerZoneGridCss = css`
  padding-top: 1rem;
  display: grid;
  gap: 0.75rem;
`

// ── Page ──────────────────────────────────────────────────────────────────────

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agent, isLoading } = useAgent(id ?? '')
  const { mutate: deprovision } = useDeprovisionAgent()
  const [tab, setTab] = useState<string | number>('overview')

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Loading agent" />
      </PageSection>
    )
  }

  if (!agent) {
    return (
      <PageSection>
        <EmptyState>
          <EmptyStateBody>
            Agent <code>{id}</code> not found in fleet inventory.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  const hw = hwProfile(agent.hardwareProfile)
  const nics = mockNics(hw, agent.id)
  const isReachable = agent.state !== 'AGENT_STATE_UNAVAILABLE'

  const conditions: { type: string; ok: boolean }[] = [
    {
      type: 'AGENT_CONDITION_PROVISIONED',
      ok: agent.state === 'AGENT_STATE_PROVISIONED' || agent.state === 'AGENT_STATE_AVAILABLE',
    },
    { type: 'AGENT_CONDITION_REACHABLE', ok: isReachable },
    { type: 'AGENT_CONDITION_VERSION_CURRENT', ok: agent.state !== 'AGENT_STATE_UNAVAILABLE' },
    { type: 'AGENT_CONDITION_CLUSTER_JOINED', ok: !!agent.clusterRef },
  ]

  const logLines = [
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}Z] INFO  heartbeat sent to fulfillment-svc (rtt=4ms)`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}Z] INFO  reconcile node-set ${agent.clusterRef ?? '—'} version=ok`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}Z] DEBUG inventory pushed: cpu=${hw.cores} mem=${hw.memGib}GiB`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}Z] INFO  CSI driver vast-csi up (mode=networked)`,
    `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}Z] WARN  ntp drift 12ms, within tolerance`,
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title={agent.metadata?.name ?? agent.id}
        description={`${hw.title} · backend ${agent.inventoryBackend ?? '—'}`}
        actions={
          <>
            <Button variant="secondary" icon={<SyncAltIcon />}>
              Upgrade
            </Button>
            <Button variant="secondary" icon={<RedoIcon />}>
              Reboot
            </Button>
            <Button
              variant="danger"
              icon={<PowerOffIcon />}
              onClick={() => {
                deprovision(agent.id)
                navigate('/agents')
              }}
              isDisabled={agent.state !== 'AGENT_STATE_PROVISIONED'}
            >
              Deprovision
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <KpiHeader
        items={[
          {
            label: 'Status',
            value: STATE_LABEL[agent.state] ?? agent.state,
            tone:
              agent.state === 'AGENT_STATE_UNAVAILABLE'
                ? 'danger'
                : agent.state === 'AGENT_STATE_AVAILABLE' ||
                    agent.state === 'AGENT_STATE_PROVISIONED'
                  ? 'success'
                  : 'default',
          },
          { label: 'Hardware', value: hw.title },
          { label: 'Cores', value: String(hw.cores), hint: 'physical' },
          { label: 'Memory', value: `${hw.memGib} GiB`, hint: 'installed' },
          { label: 'Local disk', value: `${hw.diskTib} TiB`, hint: 'NVMe' },
        ]}
      />

      {/* Tabs */}
      <Tabs activeKey={tab} onSelect={(_, k) => setTab(k)} aria-label="Agent detail tabs">
        {/* ── Overview ──────────────────────────────────────────────────────── */}
        <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
          <div className={overviewGridCss}>
            <Card>
              <CardTitle>Inventory</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Hostname</DescriptionListTerm>
                    <DescriptionListDescription>
                      {agent.metadata?.name ?? agent.id}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Agent ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{agent.id}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Hardware profile</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{agent.hardwareProfile ?? '—'}</code>
                      {hw.description !== '—' && (
                        <span className={hwDescriptionHintCss}>— {hw.description}</span>
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Inventory backend</DescriptionListTerm>
                    <DescriptionListDescription>
                      {agent.inventoryBackend ?? '—'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Cluster</DescriptionListTerm>
                    <DescriptionListDescription>
                      {agent.clusterRef ?? <span className={unassignedSpanCss}>unassigned</span>}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Enrolled</DescriptionListTerm>
                    <DescriptionListDescription>{enrolledAt(agent)}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Labels</DescriptionListTerm>
                    <DescriptionListDescription>
                      <LabelGroup>
                        <Label color="blue" isCompact>
                          hardware={agent.hardwareProfile?.split('-')[1] ?? '—'}
                        </Label>
                        {agent.clusterRef && (
                          <Label color="green" isCompact>
                            cluster={agent.clusterRef}
                          </Label>
                        )}
                        {agent.inventoryBackend && (
                          <Label color="purple" isCompact>
                            backend={agent.inventoryBackend}
                          </Label>
                        )}
                        <Label color="grey" isCompact>
                          state={STATE_LABEL[agent.state] ?? agent.state}
                        </Label>
                      </LabelGroup>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>

            <Card>
              <CardTitle>Conditions</CardTitle>
              <CardBody>
                <ul className={conditionsListCss}>
                  {conditions.map((c) => (
                    <li key={c.type} className={conditionItemCss}>
                      <code className={conditionTypeCodeCss}>{c.type}</code>
                      <Label isCompact color={c.ok ? 'green' : 'red'}>
                        {c.ok ? 'True' : 'False'}
                      </Label>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* ── Networking ────────────────────────────────────────────────────── */}
        <Tab eventKey="networking" title={<TabTitleText>Networking</TabTitleText>}>
          <div className={tabContentCss}>
            <ObjectsTable
              ariaLabel="NICs"
              rows={nics}
              getRowKey={(n) => n.name}
              columns={
                [
                  { label: 'NIC', render: (n) => <code>{n.name}</code> },
                  { label: 'MAC', render: (n) => <code>{n.mac}</code> },
                  { label: 'Speed', render: (n) => <>{n.speedGbps} Gbps</> },
                  {
                    label: 'Link',
                    render: (n) => (
                      <Label isCompact color={n.link === 'up' ? 'green' : 'red'}>
                        {n.link}
                      </Label>
                    ),
                  },
                  {
                    label: 'Bound to',
                    render: (n) => <code className={boundCodeCss}>{n.bound}</code>,
                  },
                ] satisfies ObjectsTableColumn<(typeof nics)[number]>[]
              }
            />
          </div>
        </Tab>

        {/* ── Storage ───────────────────────────────────────────────────────── */}
        <Tab eventKey="storage" title={<TabTitleText>Storage</TabTitleText>}>
          <div className={tabContentCss}>
            <ObjectsTable
              ariaLabel="Storage devices"
              rows={[
                {
                  id: 'os',
                  device: '/dev/nvme0n1',
                  role: 'OS / etcd',
                  size: '960 GiB',
                  type: 'NVMe',
                  tier: 'local' as const,
                },
                {
                  id: 'cache',
                  device: '/dev/nvme1n1',
                  role: 'CSI cache',
                  size: `${Math.round((hw.diskTib * 1024) / 2)} GiB`,
                  type: 'NVMe',
                  tier: 'gold' as const,
                },
                {
                  id: 'vast',
                  device: 'vast://tenant-northstar',
                  role: 'Tenant storage',
                  size: 'via Tier API',
                  type: 'VAST CSI',
                  tier: 'networked' as const,
                },
              ]}
              getRowKey={(r) => r.id}
              columns={[
                { label: 'Device', render: (r) => <code>{r.device}</code> },
                { label: 'Role', render: (r) => <>{r.role}</> },
                { label: 'Size', render: (r) => <>{r.size}</> },
                { label: 'Type', render: (r) => <>{r.type}</> },
                {
                  label: 'Tier',
                  render: (r) => (
                    <Label
                      isCompact
                      color={r.tier === 'local' ? 'grey' : r.tier === 'gold' ? 'yellow' : 'blue'}
                    >
                      {r.tier}
                    </Label>
                  ),
                },
              ]}
            />
          </div>
        </Tab>

        {/* ── Logs ──────────────────────────────────────────────────────────── */}
        <Tab eventKey="logs" title={<TabTitleText>Logs</TabTitleText>}>
          <div className={tabContentCss}>
            <Card>
              <CardBody>
                <pre className={logPreCss}>{logLines.join('\n')}</pre>
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* ── Danger zone ───────────────────────────────────────────────────── */}
        <Tab eventKey="danger" title={<TabTitleText>Danger zone</TabTitleText>}>
          <div className={dangerZoneGridCss}>
            <ActionRow
              icon={<EditIcon />}
              title="Re-label agent"
              body="Update zone, host-type, or cluster labels."
              cta="Edit"
            />
            <ActionRow
              icon={<SyncAltIcon />}
              title="Pin release channel"
              body="Lock this agent to a specific channel and version."
              cta="Pin"
            />
            <ActionRow
              icon={<TrashIcon />}
              title="Deprovision host"
              body="Drain workloads, revoke trust, and remove from fleet."
              cta="Deprovision"
              tone="danger"
              onClick={() => {
                deprovision(agent.id)
                navigate('/provider/agents')
              }}
            />
          </div>
        </Tab>
      </Tabs>
    </PageSection>
  )
}
