/**
 * flow: manage-organizations
 * step: org_detail
 * route: /provider/tenants/:id (providerAdmin)
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  PageSection,
  Progress,
  ProgressSize,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { BuildingIcon } from '@patternfly/react-icons/dist/esm/icons/building-icon'
import { KeyIcon } from '@patternfly/react-icons/dist/esm/icons/key-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { ShieldAltIcon } from '@patternfly/react-icons/dist/esm/icons/shield-alt-icon'
import { CustomTableLink, KpiHeader, ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import type { Agent, Cluster, ComputeInstance } from '@osac/api-contracts'
import { DEMO_AGENTS, DEMO_CLUSTERS, buildVmsForTenant } from '@osac/api-contracts'
import {
  ORGANIZATIONS,
  type OrgFixture,
  getOrg,
  idpPhaseToStatus,
  isLdapConfig,
  isOidcConfig,
  orgStateToStatus,
} from '../../mocks/organizations-store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: 'ready' | 'progressing' | 'failed' }) {
  return <span className="osac-status-dot" data-s={status} />
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 12,
        alignItems: 'baseline',
        fontSize: 13,
      }}
    >
      <code style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>{k}</code>
      <div>{v}</div>
    </div>
  )
}

function QuotaBar({
  label,
  used,
  max,
  unit,
}: {
  label: string
  used: number
  max: number
  unit: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}
      >
        <strong>{label}</strong>
        <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
          {used}
          {unit} / {max}
          {unit}
        </span>
      </div>
      <Progress
        value={pct}
        size={ProgressSize.sm}
        aria-label={label}
        variant={pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : undefined}
      />
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: 'var(--pf-t--global--text--color--subtle)',
      }}
    >
      {msg}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quota fixture per tenant
// ---------------------------------------------------------------------------

const QUOTAS: Record<string, { cores: number; memGib: number; vmMax: number; clusterMax: number }> =
  {
    northstar: { cores: 512, memGib: 2048, vmMax: 200, clusterMax: 6 },
    evergreen: { cores: 384, memGib: 1536, vmMax: 160, clusterMax: 5 },
    aurora: { cores: 256, memGib: 1024, vmMax: 100, clusterMax: 3 },
    helix: { cores: 128, memGib: 512, vmMax: 60, clusterMax: 2 },
  }

const DEFAULT_QUOTA = { cores: 64, memGib: 256, vmMax: 50, clusterMax: 3 }

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ tenantId, org }: { tenantId: string; org: OrgFixture }) {
  return (
    <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <Card>
        <CardTitle>Identity &amp; federation</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{tenantId}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Keycloak realm</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{org.realm}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Issuer</DescriptionListTerm>
              <DescriptionListDescription>
                <code style={{ fontSize: 12 }}>https://auth.osac.internal/realms/{org.realm}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>IdP protocol</DescriptionListTerm>
              <DescriptionListDescription>
                <Label isCompact color="blue">
                  {org.idp.kind}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>IdP host</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{org.idp.host}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Break-glass</DescriptionListTerm>
              <DescriptionListDescription>
                {org.break_glass.length} account(s)
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Onboarded</DescriptionListTerm>
              <DescriptionListDescription>
                {org.created_at.split('T')[0]}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
      <Card>
        <CardTitle>Governance</CardTitle>
        <CardBody>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 13 }}>
            <li
              style={{
                padding: '8px 0',
                borderBottom: '1px dashed var(--pf-t--global--border--color--default)',
              }}
            >
              Authorino AuthPolicy:{' '}
              <Label isCompact color="green">
                enforced
              </Label>
            </li>
            <li
              style={{
                padding: '8px 0',
                borderBottom: '1px dashed var(--pf-t--global--border--color--default)',
              }}
            >
              Network isolation: <code>strict</code> (dedicated VRF)
            </li>
            <li
              style={{
                padding: '8px 0',
                borderBottom: '1px dashed var(--pf-t--global--border--color--default)',
              }}
            >
              Audit export:{' '}
              <Label isCompact color="green">
                to SIEM
              </Label>
            </li>
            <li style={{ padding: '8px 0' }}>RBAC source: osac-rbac v1</li>
          </ul>
          {org.state !== 'SYNCED' && (
            <Alert
              variant={org.state === 'FAILED' ? 'danger' : 'warning'}
              isInline
              isPlain
              title={`Org state: ${org.state.toLowerCase()}`}
              style={{ marginTop: 12 }}
            />
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Identity Provider (from my-org)
// ---------------------------------------------------------------------------

function IdentityProviderTab({ org }: { org: OrgFixture }) {
  const { idp } = org
  const oidc = isOidcConfig(idp.config) ? idp.config : null
  const ldap = isLdapConfig(idp.config) ? idp.config : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
      {/* Organization card */}
      <div
        style={{
          padding: 16,
          border: '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: 8,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BuildingIcon />
          <strong>Organization</strong>
        </div>
        <KV k="id" v={<code>{org.id}</code>} />
        <KV k="metadata.name" v={<code>{org.name}</code>} />
        <KV k="metadata.tenant" v={<code>{org.tenant}</code>} />
        <KV k="metadata.creator" v={<code>{org.creator}</code>} />
        <KV k="metadata.creation_timestamp" v={<code>{org.created_at}</code>} />
        <KV k="realm" v={<code>{org.realm}</code>} />
        <KV
          k="metadata.labels"
          v={
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(org.labels).map(([k, v]) => (
                <Label key={k} isCompact>
                  <code style={{ fontSize: 11 }}>
                    {k}={v}
                  </code>
                </Label>
              ))}
            </div>
          }
        />
      </div>

      {/* IdentityProvider card */}
      <div
        style={{
          padding: 16,
          border: '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: 8,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyIcon />
          <strong>IdentityProvider</strong>
          <Label isCompact color="blue" style={{ marginLeft: 'auto' }}>
            {idp.kind}
          </Label>
        </div>
        <KV k="id" v={<code>{idp.id}</code>} />
        <KV k="spec.kind" v={idp.kind} />
        <KV
          k="status.phase"
          v={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status={idpPhaseToStatus(idp.status.phase)} />
              <span>{idp.status.phase}</span>
            </span>
          }
        />
        <KV k="status.message" v={<span style={{ fontSize: 12 }}>{idp.status.message}</span>} />
        <KV
          k="status.last_probe"
          v={<span style={{ fontSize: 12 }}>{idp.status.last_probe}</span>}
        />
      </div>

      {/* Config card (full width) */}
      <div
        style={{
          padding: 16,
          border: '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: 8,
          display: 'grid',
          gap: 10,
          gridColumn: '1 / -1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyIcon />
          <strong>spec.{oidc ? 'oidc_config' : 'ldap_config'}</strong>
        </div>
        {oidc && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <KV k="issuer" v={<code style={{ fontSize: 12 }}>{oidc.issuer}</code>} />
            <KV k="client_id" v={<code>{oidc.client_id}</code>} />
            <KV
              k="authorization_url"
              v={<code style={{ fontSize: 12 }}>{oidc.authorization_url}</code>}
            />
            <KV k="token_url" v={<code style={{ fontSize: 12 }}>{oidc.token_url}</code>} />
            <KV k="jwks_url" v={<code style={{ fontSize: 12 }}>{oidc.jwks_url}</code>} />
            <KV k="logout_url" v={<code style={{ fontSize: 12 }}>{oidc.logout_url}</code>} />
            <KV k="client_secret" v={<code>{oidc.client_secret}</code>} />
          </div>
        )}
        {ldap && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <KV
              k="connection_url"
              v={<code style={{ fontSize: 12 }}>{ldap.connection_url}</code>}
            />
            <KV k="vendor" v={<code>{ldap.vendor}</code>} />
            <KV k="bind_dn" v={<code style={{ fontSize: 12 }}>{ldap.bind_dn}</code>} />
            <KV k="bind_credential" v={<code>{ldap.bind_credential}</code>} />
            <KV k="users_dn" v={<code style={{ fontSize: 12 }}>{ldap.users_dn}</code>} />
            <KV k="username_ldap_attribute" v={<code>{ldap.username_ldap_attribute}</code>} />
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Authn Capabilities (from my-org)
// ---------------------------------------------------------------------------

function AuthnCapabilitiesTab({ org }: { org: OrgFixture }) {
  const columns: ObjectsTableColumn<string>[] = [
    {
      label: 'trusted_token_issuers[]',
      dataLabel: 'Issuer',
      render: (iss) => <code style={{ fontSize: 12 }}>{iss}</code>,
    },
    {
      label: 'Algorithm',
      dataLabel: 'Algorithm',
      render: () => <code>RS256</code>,
    },
    {
      label: 'JWKS cache',
      dataLabel: 'JWKS cache',
      render: () => '10m',
    },
  ]

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          padding: 16,
          border: '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: 8,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAltIcon />
          <strong>AuthnCapabilities</strong>
          <Label isCompact style={{ marginLeft: 'auto' }}>
            discovery
          </Label>
        </div>
        <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', margin: 0 }}>
          Issuers below are trusted by Authorino at the Kuadrant gateway. Tokens signed by any other
          issuer are rejected before reaching any OSAC API.
        </p>
        <ObjectsTable
          ariaLabel="Trusted token issuers"
          columns={columns}
          rows={org.authn.trusted_token_issuers}
          getRowKey={(iss) => iss}
          variant="compact"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Break-glass (from my-org)
// ---------------------------------------------------------------------------

function BreakGlassTab({ org }: { org: OrgFixture }) {
  interface BgRow {
    username: string
    last_rotated: string
  }
  const columns: ObjectsTableColumn<BgRow>[] = [
    {
      label: 'username',
      dataLabel: 'username',
      render: (b) => <code>{b.username}</code>,
    },
    {
      label: 'password',
      dataLabel: 'password',
      render: () => <code>•••••••• (write-only)</code>,
    },
    {
      label: 'last_rotated',
      dataLabel: 'last_rotated',
      render: (b) => <code style={{ fontSize: 12 }}>{b.last_rotated}</code>,
    },
    {
      isActionCell: true,
      screenReaderText: 'Actions',
      render: () => (
        <Button variant="link" isInline>
          Rotate
        </Button>
      ),
    },
  ]

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          padding: 16,
          border: '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: 8,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LockIcon />
          <strong>BreakGlassCredentials</strong>
          <Label isCompact color="orange" style={{ marginLeft: 'auto' }}>
            emergency only
          </Label>
        </div>
        <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', margin: 0 }}>
          Local realm accounts independent of the external IdP. Use only when{' '}
          <code>{org.idp.id}</code> is unavailable. Every login is audited as an{' '}
          <code>Event</code> of type <code>BREAK_GLASS_USED</code>.
        </p>
        <ObjectsTable
          ariaLabel="Break-glass credentials"
          columns={columns}
          rows={org.break_glass}
          getRowKey={(b) => b.username}
          variant="compact"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TenantDetailPage() {
  const { id: tenantId = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string | number>('overview')

  const org = getOrg(tenantId)

  // Fall back to a minimal fixture if tenant not in our store
  const fallbackOrg: OrgFixture = ORGANIZATIONS[0]
  const currentOrg = org ?? fallbackOrg

  const quota = QUOTAS[tenantId] ?? DEFAULT_QUOTA

  // Derive cross-resource state
  const clusters = DEMO_CLUSTERS.filter((c) => c.metadata.tenant === tenantId)
  const vms = (['northstar', 'evergreen'] as const).includes(tenantId as 'northstar' | 'evergreen')
    ? buildVmsForTenant(tenantId as 'northstar' | 'evergreen')
    : []
  const agents: Agent[] = DEMO_AGENTS.filter((a) => {
    if (!a.clusterRef) return false
    return clusters.some((c) => c.metadata.name === a.clusterRef)
  })

  const usedCores = vms.reduce((a, v) => a + (v.spec.cores ?? 0), 0)
  const usedMem = vms.reduce((a, v) => a + (v.spec.memoryGib ?? 0), 0)

  // Cluster columns
  const clusterColumns: ObjectsTableColumn<Cluster>[] = [
    {
      label: 'Cluster',
      dataLabel: 'Cluster',
      render: (c) => (
        <CustomTableLink onClick={() => navigate(`/clusters/${c.metadata.name}`)}>
          {c.metadata.name}
        </CustomTableLink>
      ),
    },
    {
      label: 'Release',
      dataLabel: 'Release',
      render: (c) => (c.spec.releaseImage ?? '').split(':').pop()?.replace('-multi', '') ?? '—',
    },
    {
      label: 'Workers',
      dataLabel: 'Workers',
      render: (c) =>
        Object.values(c.spec.nodeSets ?? {}).reduce((a: number, n) => a + (n.size ?? 0), 0),
    },
    {
      label: 'State',
      dataLabel: 'State',
      render: (c) => {
        const state = c.status.state.replace('CLUSTER_STATE_', '').toLowerCase()
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot
              status={state === 'ready' ? 'ready' : state === 'failed' ? 'failed' : 'progressing'}
            />
            <span style={{ textTransform: 'capitalize' }}>{state}</span>
          </span>
        )
      },
    },
  ]

  // VM columns
  const vmColumns: ObjectsTableColumn<ComputeInstance>[] = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (v) => (
        <CustomTableLink onClick={() => navigate(`/vms/${v.metadata.name}`)}>
          {v.metadata.name}
        </CustomTableLink>
      ),
    },
    {
      label: 'Cores',
      dataLabel: 'Cores',
      render: (v) => v.spec.cores,
    },
    {
      label: 'Memory',
      dataLabel: 'Memory',
      render: (v) => `${v.spec.memoryGib} GiB`,
    },
    {
      label: 'State',
      dataLabel: 'State',
      render: (v) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot
            status={
              v.status.state === 'running'
                ? 'ready'
                : v.status.state === 'error'
                  ? 'failed'
                  : 'progressing'
            }
          />
          <span style={{ textTransform: 'capitalize' }}>{v.status.state}</span>
        </span>
      ),
    },
  ]

  // Agent columns
  const agentColumns: ObjectsTableColumn<Agent>[] = [
    {
      label: 'Agent ID',
      dataLabel: 'Agent ID',
      render: (a) => (
        <CustomTableLink onClick={() => navigate(`/agents/${a.id}`)}>
          {a.metadata?.name ?? a.id}
        </CustomTableLink>
      ),
    },
    {
      label: 'State',
      dataLabel: 'State',
      render: (a) => {
        const s = a.state.replace('AGENT_STATE_', '').toLowerCase()
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot
              status={
                a.state === 'AGENT_STATE_PROVISIONED'
                  ? 'ready'
                  : a.state === 'AGENT_STATE_UNAVAILABLE'
                    ? 'failed'
                    : 'progressing'
              }
            />
            <span style={{ textTransform: 'capitalize' }}>{s}</span>
          </span>
        )
      },
    },
    {
      label: 'Cluster',
      dataLabel: 'Cluster',
      render: (a) => a.clusterRef ?? '—',
    },
    {
      label: 'Hardware profile',
      dataLabel: 'Hardware profile',
      render: (a) => a.hardwareProfile ?? '—',
    },
  ]

  const idpTone =
    currentOrg.idp.status.phase === 'READY'
      ? 'success'
      : currentOrg.idp.status.phase === 'ERROR'
        ? 'danger'
        : 'warning'

  return (
    <PageSection isFilled>
      <Breadcrumb style={{ marginBottom: 12 }}>
        <BreadcrumbItem>
          <Link to="/provider/organizations">Tenant organizations</Link>
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{currentOrg.name}</BreadcrumbItem>
      </Breadcrumb>

      <PageLayout
        title={currentOrg.name}
        description={`Tenant ${tenantId} · realm ${currentOrg.realm}`}
        actions={
          <>
            <Button variant="secondary">Audit log</Button>
            <Button variant="secondary">Edit quota</Button>
            <Button variant="danger">Suspend</Button>
          </>
        }
      >
        <KpiHeader
          items={[
            {
              label: 'Status',
              value: currentOrg.state.toLowerCase(),
              tone: orgStateToStatus(currentOrg.state) === 'ready' ? 'success' : 'warning',
            },
            {
              label: 'IdP',
              value: currentOrg.idp.kind,
              hint: currentOrg.idp.host,
              tone: idpTone,
            },
            {
              label: 'Clusters',
              value: String(clusters.length),
              hint: `limit ${quota.clusterMax}`,
            },
            { label: 'VMs', value: String(vms.length), hint: `limit ${quota.vmMax}` },
            { label: 'vCPU used', value: `${usedCores} / ${quota.cores}` },
            { label: 'Memory used', value: `${usedMem} / ${quota.memGib} GiB` },
          ]}
        />

        <div style={{ marginTop: 24 }}>
          <Tabs
            activeKey={activeTab}
            onSelect={(_e, k) => setActiveTab(k)}
            aria-label="Tenant detail tabs"
          >
            {/* ── Overview ── */}
            <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
              <OverviewTab tenantId={tenantId} org={currentOrg} />
            </Tab>

            {/* ── Quota ── */}
            <Tab eventKey="quota" title={<TabTitleText>Quota</TabTitleText>}>
              <div style={{ paddingTop: 16, display: 'grid', gap: 12 }}>
                <QuotaBar label="vCPU cores" used={usedCores} max={quota.cores} unit="" />
                <QuotaBar label="Memory" used={usedMem} max={quota.memGib} unit=" GiB" />
                <QuotaBar label="VM instances" used={vms.length} max={quota.vmMax} unit="" />
                <QuotaBar
                  label="CaaS clusters"
                  used={clusters.length}
                  max={quota.clusterMax}
                  unit=""
                />
              </div>
            </Tab>

            {/* ── Clusters ── */}
            <Tab
              eventKey="clusters"
              title={<TabTitleText>Clusters ({clusters.length})</TabTitleText>}
            >
              <div style={{ paddingTop: 16 }}>
                {clusters.length === 0 ? (
                  <Empty msg="No CaaS clusters for this tenant yet." />
                ) : (
                  <ObjectsTable
                    ariaLabel="Tenant clusters"
                    columns={clusterColumns}
                    rows={clusters}
                    getRowKey={(c) => c.id}
                    onRowClick={(c) => navigate(`/clusters/${c.metadata.name}`)}
                    defaultPageSize={10}
                  />
                )}
              </div>
            </Tab>

            {/* ── VMs ── */}
            <Tab
              eventKey="vms"
              title={<TabTitleText>Virtual machines ({vms.length})</TabTitleText>}
            >
              <div style={{ paddingTop: 16 }}>
                {vms.length === 0 ? (
                  <Empty msg="This tenant has no VM workloads." />
                ) : (
                  <ObjectsTable
                    ariaLabel="Tenant VMs"
                    columns={vmColumns}
                    rows={vms}
                    getRowKey={(v) => v.id}
                    onRowClick={(v) => navigate(`/vms/${v.metadata.name}`)}
                    defaultPageSize={10}
                  />
                )}
              </div>
            </Tab>

            {/* ── Agents ── */}
            <Tab
              eventKey="agents"
              title={<TabTitleText>Infrastructure agents ({agents.length})</TabTitleText>}
            >
              <div style={{ paddingTop: 16 }}>
                {agents.length === 0 ? (
                  <Empty msg="No infrastructure agents attached to this tenant's clusters." />
                ) : (
                  <ObjectsTable
                    ariaLabel="Tenant agents"
                    columns={agentColumns}
                    rows={agents}
                    getRowKey={(a) => a.id}
                    onRowClick={(a) => navigate(`/agents/${a.id}`)}
                    defaultPageSize={10}
                  />
                )}
              </div>
            </Tab>

            {/* ── Audit log ── */}
            <Tab eventKey="audit" title={<TabTitleText>Audit log</TabTitleText>}>
              <div style={{ paddingTop: 16 }}>
                <ObjectsTable
                  ariaLabel="Audit log"
                  columns={[
                    { label: 'Timestamp', dataLabel: 'Timestamp', render: (r) => r.ts },
                    { label: 'Actor', dataLabel: 'Actor', render: (r) => <code>{r.actor}</code> },
                    { label: 'Action', dataLabel: 'Action', render: (r) => r.action },
                    {
                      label: 'Resource',
                      dataLabel: 'Resource',
                      render: (r) => <code style={{ fontSize: 12 }}>{r.resource}</code>,
                    },
                  ]}
                  rows={[
                    {
                      ts: '2026-06-05 10:42',
                      actor: 'platform@osac',
                      action: 'quota.update',
                      resource: `cores → ${quota.cores}`,
                    },
                    {
                      ts: '2026-06-04 18:11',
                      actor: `ops@${tenantId}`,
                      action: 'cluster.create',
                      resource: clusters[0]?.metadata.name ?? '—',
                    },
                    {
                      ts: '2026-06-02 09:03',
                      actor: `admin@${tenantId}`,
                      action: 'rbac.assign',
                      resource: `/${tenantId}/platform-admins → tenantAdmin`,
                    },
                    {
                      ts: currentOrg.created_at.split('T')[0],
                      actor: 'platform@osac',
                      action: 'tenant.onboard',
                      resource: `realm ${currentOrg.realm}`,
                    },
                  ]}
                  getRowKey={(r) => r.ts + r.action}
                  variant="compact"
                />
              </div>
            </Tab>

            {/* ── Identity provider (from my-org) ── */}
            <Tab eventKey="identity" title={<TabTitleText>Identity provider</TabTitleText>}>
              <IdentityProviderTab org={currentOrg} />
            </Tab>

            {/* ── Authn capabilities (from my-org) ── */}
            <Tab eventKey="authn" title={<TabTitleText>Authn capabilities</TabTitleText>}>
              <AuthnCapabilitiesTab org={currentOrg} />
            </Tab>

            {/* ── Break-glass (from my-org) ── */}
            <Tab eventKey="bg" title={<TabTitleText>Break-glass</TabTitleText>}>
              <BreakGlassTab org={currentOrg} />
            </Tab>
          </Tabs>
        </div>
      </PageLayout>
    </PageSection>
  )
}
