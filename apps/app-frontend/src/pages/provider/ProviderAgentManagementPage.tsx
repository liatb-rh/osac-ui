/**
 * flow: provider-administration
 * step: pad_agent_management
 * route: /provider/agents
 */
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  PageSection,
  Spinner,
  Tooltip,
} from '@patternfly/react-core'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  ServerIcon,
} from '@patternfly/react-icons'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Agent, AgentState } from '@osac/api-contracts'
import { DEMO_INVENTORY_BACKENDS } from '@osac/api-contracts'
import { useAgents, useDeprovisionAgent, useProvisionAgent } from '../../api/useAgents'
import { PageHeader } from '../../components/layout'

// ─── State display config ─────────────────────────────────────────────────────

const AGENT_STATE_CONFIG: Record<
  AgentState,
  { color: 'green' | 'blue' | 'yellow' | 'red' | 'grey'; text: string; spinning?: boolean }
> = {
  AGENT_STATE_AVAILABLE: { color: 'green', text: 'Available' },
  AGENT_STATE_PROVISIONING: { color: 'blue', text: 'Provisioning', spinning: true },
  AGENT_STATE_PROVISIONED: { color: 'grey', text: 'Provisioned' },
  AGENT_STATE_DEPROVISIONING: { color: 'yellow', text: 'Deprovisioning', spinning: true },
  AGENT_STATE_UNAVAILABLE: { color: 'red', text: 'Unavailable' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortProfile(profile: string | undefined): string {
  if (!profile) return '—'
  // e.g. "baremetal-standard-48c-192g" → "standard · 48c / 192G"
  const m = profile.match(/baremetal-([^-]+)-(\d+c)-(\d+g)(?:-(.+))?/)
  if (m) return `${m[1]} · ${m[2].toUpperCase()} / ${m[3].toUpperCase()}${m[4] ? ` · ${m[4].toUpperCase()}` : ''}`
  return profile
}

function backendFreshness(lastSyncTime: string | undefined): { label: string; stale: boolean } {
  if (!lastSyncTime) return { label: 'Never synced', stale: true }
  const diffMs = Date.now() - new Date(lastSyncTime).getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 1) return { label: `${Math.round(diffMs / 60000)}m ago`, stale: false }
  if (diffH < 24) return { label: `${Math.round(diffH)}h ago`, stale: diffH > 4 }
  return { label: `${Math.round(diffH / 24)}d ago`, stale: true }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <Card style={{ textAlign: 'center' }}>
      <CardBody>
        <div style={{ fontSize: 'var(--pf-t--global--font--size--heading--xl)', fontWeight: 700, color, lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--text--color--subtle)', marginTop: '0.25rem' }}>
          {label}
        </div>
      </CardBody>
    </Card>
  )
}

function AgentStateLabel({ state }: { state: AgentState }) {
  const config = AGENT_STATE_CONFIG[state] ?? { color: 'grey' as const, text: state }
  return (
    <Label
      color={config.color}
      icon={config.spinning ? <Spinner size="sm" aria-label={config.text} /> : undefined}
      isCompact
    >
      {config.text}
    </Label>
  )
}

function AgentsTable({ agents, provisioning, deprovisioning, onProvision, onDeprovision }: {
  agents: Agent[]
  provisioning: boolean
  deprovisioning: boolean
  onProvision: (id: string) => void
  onDeprovision: (id: string) => void
}) {
  // Group agents: assigned clusters first (sorted by clusterRef), then unassigned
  const grouped: Array<{ groupKey: string; rows: Agent[] }> = []
  const byCluster: Record<string, Agent[]> = {}

  for (const agent of agents) {
    const key = agent.clusterRef ?? '__unassigned__'
    if (!byCluster[key]) byCluster[key] = []
    byCluster[key].push(agent)
  }

  for (const [key, rows] of Object.entries(byCluster).sort(([a], [b]) => {
    if (a === '__unassigned__') return 1
    if (b === '__unassigned__') return -1
    return a.localeCompare(b)
  })) {
    grouped.push({ groupKey: key, rows })
  }

  return (
    <Table aria-label="Server inventory" variant="compact">
      <Thead>
        <Tr>
          <Th>Server</Th>
          <Th>State</Th>
          <Th>Hardware</Th>
          <Th>Inventory backend</Th>
          <Th aria-label="Actions" />
        </Tr>
      </Thead>
      {grouped.map(({ groupKey, rows }) => (
        <Tbody key={groupKey}>
          {/* Group header row */}
          <Tr>
            <Td
              colSpan={5}
              style={{
                background: 'var(--pf-t--global--background--color--secondary--default)',
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--pf-t--global--text--color--subtle)',
                padding: '0.4rem 1rem',
              }}
            >
              <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><ServerIcon aria-hidden /></FlexItem>
                <FlexItem>
                  {groupKey === '__unassigned__' ? 'Unassigned (pool)' : groupKey.replace('cluster-', '')}
                </FlexItem>
                <FlexItem>
                  <Label isCompact color="grey">{rows.length}</Label>
                </FlexItem>
              </Flex>
            </Td>
          </Tr>
          {rows.map((agent) => (
            <Tr key={agent.id}>
              <Td dataLabel="Server">
                <code style={{ fontSize: '0.875rem' }}>{agent.metadata?.name ?? agent.id}</code>
              </Td>
              <Td dataLabel="State">
                <AgentStateLabel state={agent.state} />
              </Td>
              <Td dataLabel="Hardware">
                <Tooltip content={agent.hardwareProfile ?? '—'}>
                  <span>{shortProfile(agent.hardwareProfile)}</span>
                </Tooltip>
              </Td>
              <Td dataLabel="Inventory backend">{agent.inventoryBackend ?? '—'}</Td>
              <Td dataLabel="Actions">
                {agent.state === 'AGENT_STATE_AVAILABLE' && (
                  <Button variant="secondary" size="sm" onClick={() => onProvision(agent.id)} isDisabled={provisioning}>
                    Provision
                  </Button>
                )}
                {agent.state === 'AGENT_STATE_PROVISIONED' && (
                  <Button variant="danger" size="sm" onClick={() => onDeprovision(agent.id)} isDisabled={deprovisioning}>
                    Deprovision
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      ))}
    </Table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProviderAgentManagementPage() {
  const { data: agents, isLoading, error, refetch } = useAgents()
  const { mutate: provision, isPending: provisioning } = useProvisionAgent()
  const { mutate: deprovision, isPending: deprovisioning } = useDeprovisionAgent()

  const allAgents = agents ?? []
  const total = allAgents.length
  const provisioned = allAgents.filter((a) => a.state === 'AGENT_STATE_PROVISIONED').length
  const available = allAgents.filter((a) => a.state === 'AGENT_STATE_AVAILABLE').length
  const unavailable = allAgents.filter((a) => a.state === 'AGENT_STATE_UNAVAILABLE').length
  const inProgress = allAgents.filter(
    (a) => a.state === 'AGENT_STATE_PROVISIONING' || a.state === 'AGENT_STATE_DEPROVISIONING',
  ).length

  return (
    <PageSection>
      <PageHeader
        title="Infrastructure Automation"
        description="Manage bare-metal server lifecycle and network fabric preparation for CaaS cluster deployment."
      />

      {error && (
        <Alert variant="danger" title="Failed to load agents." isInline style={{ marginBottom: '1rem' }}>
          <Button variant="link" isInline onClick={() => refetch()}>Retry</Button>
        </Alert>
      )}

      {/* ── Summary stats ────────────────────────────────────────────────── */}
      <Grid hasGutter style={{ marginBottom: '1.5rem' }}>
        <GridItem md={3} sm={6}>
          <StatTile count={total} label="Total servers" color="var(--pf-t--global--text--color--regular)" />
        </GridItem>
        <GridItem md={3} sm={6}>
          <StatTile count={provisioned} label="Assigned to clusters" color="var(--pf-t--global--text--color--regular)" />
        </GridItem>
        <GridItem md={3} sm={6}>
          <StatTile count={available} label="Available (pool)" color="var(--pf-t--global--color--status--success--default)" />
        </GridItem>
        <GridItem md={3} sm={6}>
          <StatTile
            count={unavailable}
            label="Unavailable"
            color={unavailable > 0 ? 'var(--pf-t--global--color--status--danger--default)' : 'var(--pf-t--global--text--color--subtle)'}
          />
        </GridItem>
      </Grid>

      {/* ── Automation gaps ───────────────────────────────────────────────── */}
      <Grid hasGutter style={{ marginBottom: '1.5rem' }}>
        <GridItem md={6}>
          <Card style={{ borderTop: '3px solid var(--pf-t--global--color--status--warning--default)', height: '100%' }}>
            <CardTitle>
              <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><ExclamationTriangleIcon color="var(--pf-t--global--color--status--warning--default)" aria-hidden /></FlexItem>
                <FlexItem>Server Provisioning</FlexItem>
                <FlexItem><Label color="yellow" isCompact>Manual trigger only</Label></FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <p style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: '0.75rem' }}>
                Provisioning is triggered manually per server. Periodic automation via the ESI backend is available
                but not yet scheduled — inventory may drift between syncs.
              </p>
              <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>ESI backend</DescriptionListTerm>
                  <DescriptionListDescription>Network, inventory and provisioning — automated for ESI only</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Sync cadence</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label color="yellow" isCompact>Not periodic</Label>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                      Trigger manually or configure a schedule
                    </span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem md={6}>
          <Card style={{ borderTop: '3px solid var(--pf-t--global--color--status--danger--default)', height: '100%' }}>
            <CardTitle>
              <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem><ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" aria-hidden /></FlexItem>
                <FlexItem>Netris Fabric Preparation</FlexItem>
                <FlexItem><Label color="red" isCompact>Not automated</Label></FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <p style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: '0.75rem' }}>
                Network fabric setup for new sites must be performed manually. The following resources require
                configuration in Netris before clusters can be provisioned on new hardware.
              </p>
              <Grid hasGutter>
                {[
                  'Switches', 'Servers', 'Softgates',
                  'NAT Pools', 'Management VPC', 'Cluster templates',
                ].map((item) => (
                  <GridItem key={item} span={6}>
                    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        <InfoCircleIcon
                          color="var(--pf-t--global--text--color--subtle)"
                          aria-hidden
                          style={{ fontSize: '0.75rem' }}
                        />
                      </FlexItem>
                      <FlexItem>
                        <span style={{ fontSize: '0.875rem' }}>{item}</span>
                      </FlexItem>
                    </Flex>
                  </GridItem>
                ))}
              </Grid>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* ── In-progress alert ─────────────────────────────────────────────── */}
      {inProgress > 0 && (
        <Alert
          variant="info"
          isInline
          title={`${inProgress} server${inProgress > 1 ? 's' : ''} currently changing state`}
          style={{ marginBottom: '1rem' }}
        >
          Provisioning and deprovisioning operations are in progress. The table will update automatically.
        </Alert>
      )}

      {/* ── Server inventory table ────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        {isLoading ? (
          <Spinner aria-label="Loading servers" />
        ) : (
          <AgentsTable
            agents={allAgents}
            provisioning={provisioning}
            deprovisioning={deprovisioning}
            onProvision={provision}
            onDeprovision={deprovision}
          />
        )}
      </div>

      {/* ── Inventory backends ────────────────────────────────────────────── */}
      <h2 style={{
        fontSize: 'var(--pf-t--global--font--size--heading--md)',
        fontWeight: 600,
        marginBottom: '1rem',
      }}>
        Inventory Backends
      </h2>
      <Grid hasGutter>
        {DEMO_INVENTORY_BACKENDS.map((backend) => {
          const { label: syncLabel, stale } = backendFreshness(backend.lastSyncTime)
          const isConnected = backend.status === 'CONNECTED'
          return (
            <GridItem key={backend.id} md={6}>
              <Card style={{ borderTop: `3px solid ${isConnected ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--color--status--danger--default)'}` }}>
                <CardTitle>
                  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      {isConnected
                        ? <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" aria-hidden />
                        : <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" aria-hidden />
                      }
                    </FlexItem>
                    <FlexItem>{backend.name}</FlexItem>
                    <FlexItem>
                      <Label color={isConnected ? 'green' : 'red'} isCompact>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </Label>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  {!isConnected && (
                    <Alert
                      variant="danger"
                      isInline
                      isPlain
                      title="Backend unreachable — inventory may be stale"
                      style={{ marginBottom: '0.75rem', padding: 0 }}
                    />
                  )}
                  <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Endpoint</DescriptionListTerm>
                      <DescriptionListDescription>
                        <code style={{ fontSize: '0.85em' }}>{backend.endpointUrl ?? '—'}</code>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Last sync</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                          <FlexItem>{syncLabel}</FlexItem>
                          {stale && (
                            <FlexItem>
                              <Label color="orange" isCompact icon={<ExclamationTriangleIcon aria-hidden />}>
                                Stale
                              </Label>
                            </FlexItem>
                          )}
                        </Flex>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Sync cadence</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color="yellow" isCompact>Manual only</Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </CardBody>
              </Card>
            </GridItem>
          )
        })}
      </Grid>
    </PageSection>
  )
}
