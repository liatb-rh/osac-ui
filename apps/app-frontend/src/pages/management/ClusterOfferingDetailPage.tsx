/**
 * flow: provider-administration
 * step: pad_cluster_offering_detail
 * route: /provider/cluster-offerings/:id
 */
import { useState } from 'react'
import { css } from '@emotion/css'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Label,
  PageSection,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Cluster, StorageTier } from '@osac/api-contracts'
import { useClusterCatalogItems } from '../../hooks/useClusterCatalogItems'
import { useClustersList } from '../../hooks/useClustersList'
import { useAgents, useStorageTiers } from '../../hooks/useAgents'
import { OcCard } from '@osac/ui-components'
import { PageHeader } from '../../components/layout'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isGpuTemplate(template?: string) {
  return /gpu/i.test(template ?? '')
}

function maturityOf(template?: string, published?: boolean): 'stable' | 'preview' {
  if (/preview/i.test(template ?? '')) return 'preview'
  return published ? 'stable' : 'preview'
}

function minWorkersOf(fieldDefs: { path: string; default?: unknown }[] = []): number {
  const workerDef = fieldDefs.find((f) => f.path.includes('workers') && f.path.includes('size'))
  const v = (workerDef?.default as Record<string, unknown> | null)?.value
  return typeof v === 'number' ? v : 3
}

function clusterState(c: Cluster): string {
  return c.status.state.replace('CLUSTER_STATE_', '').toLowerCase()
}

function clusterTotalWorkers(c: Cluster): number {
  return Object.values(c.spec.nodeSets ?? {}).reduce((sum, ns) => sum + ns.size, 0)
}

const panelCss = css`
  background: var(--pf-t--global--background--color--primary--default);
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  padding: 20px;
`

const tabContentCss = css`
  padding-top: 16px;
`

const breadcrumbCss = css`
  margin-bottom: 12px;
`

const kpiRowCss = css`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`

const previewAlertCss = css`
  margin-bottom: 16px;
`

const overviewTabCss = css`
  padding-top: 16px;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
`

const codeSmCss = css`
  font-size: 12px;
`

const lifecycleListCss = css`
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
`

const lifecycleItemLabelCss = css`
  color: #5b6b7c;
`

const lifecycleItemValueCss = css`
  float: right;
  font-weight: 500;
`

const emptyClustersCss = css`
  padding: 24px;
  text-align: center;
  color: #5b6b7c;
`

const manifestTabCss = css`
  padding-top: 16px;
`

const linkNameCss = css`
  color: #0066cc;
  font-weight: 600;
`

const labelCapitalizeCss = css`
  text-transform: capitalize;
`

const mutedDashCss = css`
  color: #5b6b7c;
`

// ── Page ──────────────────────────────────────────────────────────────────────

export function ClusterOfferingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<string | number>('overview')

  const { data: allItems, isLoading } = useClusterCatalogItems({ includeUnpublished: true })
  const { data: allClusters } = useClustersList()
  const { data: allTiers } = useStorageTiers()
  const { data: allAgents } = useAgents()

  const item = (allItems ?? []).find((i) => i.id === id)
  const isGpu = isGpuTemplate(item?.template)
  const maturity = maturityOf(item?.template, item?.published)
  const minWorkers = minWorkersOf(item?.fieldDefinitions)
  const versions = item?.allowedVersions ?? []
  const primaryVersion = versions[0] ?? '—'

  // Consuming clusters: those whose spec.catalogItem matches this offering
  const consumingClusters = (allClusters ?? []).filter((c) => c.spec.catalogItem === id)

  // Compatible storage tiers: all available tiers; GPU offerings only pair with NVMe-class tiers
  const compatibleTiers = (allTiers ?? []).filter(
    (t) => t.available && (isGpu ? /nvme|fast/i.test(t.qosClass ?? t.name) : true),
  )

  // Eligible agents: GPU offerings need GPU hardware profiles, others don't
  const eligibleAgents = (allAgents ?? []).filter((a) =>
    isGpu ? /gpu/i.test(a.hardwareProfile ?? '') : !/gpu/i.test(a.hardwareProfile ?? ''),
  )
  const healthyAgents = eligibleAgents.filter(
    (a) => a.state === 'AGENT_STATE_AVAILABLE' || a.state === 'AGENT_STATE_PROVISIONED',
  )

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Loading offering" />
      </PageSection>
    )
  }

  if (!item) {
    return (
      <PageSection>
        <EmptyState titleText={`Offering "${id}" not found`} headingLevel="h2">
          <EmptyStateBody>It may have been removed or the URL is incorrect.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  const manifestYaml = [
    `apiVersion: osac.io/v1`,
    `kind: ClusterOffering`,
    `metadata:`,
    `  name: ${item.id}`,
    `spec:`,
    `  ocpVersion: "${primaryVersion}"`,
    `  releaseImage: quay.io/openshift-release-dev/ocp-release:${primaryVersion}-multi`,
    `  maturity: ${maturity}`,
    `  minWorkerNodes: ${minWorkers}`,
    `  gpu: ${isGpu}`,
    `  network:`,
    `    podCidr: 10.128.0.0/14`,
    `    serviceCidr: 172.30.0.0/16`,
    compatibleTiers.length
      ? `  csi:\n${compatibleTiers.map((t) => `    - name: ${t.storageClassName ?? t.id}\n      tier: ${t.id}`).join('\n')}`
      : `  csi:\n    - name: openshift-cns`,
    `  hostTypes:`,
    eligibleAgents.length
      ? Array.from(new Set(eligibleAgents.map((a) => a.hardwareProfile ?? 'baremetal-standard')))
          .map((h) => `    - ${h}`)
          .join('\n')
      : `    - baremetal-standard`,
  ].join('\n')

  return (
    <PageSection isFilled>
      <Breadcrumb className={breadcrumbCss}>
        <BreadcrumbItem
          render={() => (
            <Button variant="link" isInline onClick={() => navigate('/cluster-offerings')}>
              Cluster offerings
            </Button>
          )}
        />
        <BreadcrumbItem isActive>{item.title}</BreadcrumbItem>
      </Breadcrumb>

      <PageHeader
        title={item.title}
        description={item.description}
        actions={
          <>
            <Button variant="secondary">Disable</Button>
            <Button variant="primary">Edit offering</Button>
          </>
        }
      />

      {/* KPI row */}
      <div className={kpiRowCss}>
        <OcCard
          label="Maturity"
          value={maturity}
          accentColor={
            maturity === 'preview'
              ? 'var(--pf-t--global--color--status--warning--default)'
              : 'var(--pf-t--global--color--status--success--default)'
          }
        />
        <OcCard
          label="OCP version"
          value={primaryVersion}
          hint={versions.length > 1 ? `+${versions.length - 1} more` : undefined}
        />
        <OcCard label="Min worker nodes" value={minWorkers} />
        <OcCard
          label="GPU"
          value={isGpu ? 'Enabled' : 'Disabled'}
          hint={isGpu ? 'NVIDIA operator' : undefined}
        />
        <OcCard
          label="Active clusters"
          value={consumingClusters.length}
          hint={`${consumingClusters.reduce((a, c) => a + clusterTotalWorkers(c), 0)} workers`}
        />
        <OcCard
          label="Eligible agents"
          value={`${healthyAgents.length} / ${eligibleAgents.length}`}
          hint="healthy hosts"
          accentColor={
            healthyAgents.length === eligibleAgents.length
              ? 'var(--pf-t--global--color--status--success--default)'
              : 'var(--pf-t--global--color--status--warning--default)'
          }
        />
      </div>

      {maturity === 'preview' && (
        <Alert
          variant="warning"
          isInline
          title="Preview offering — no production SLA"
          className={previewAlertCss}
        />
      )}

      {/* Tabs */}
      <Tabs activeKey={tab} onSelect={(_, k) => setTab(k)} aria-label="Offering tabs">
        <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
          <div className={overviewTabCss}>
            <Card>
              <CardTitle>Specification</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Identifier</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{item.id}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Template</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{item.template ?? '—'}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>OCP versions</DescriptionListTerm>
                    <DescriptionListDescription>
                      {versions.length ? versions.join(', ') : '—'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Release image</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code className={codeSmCss}>
                        quay.io/openshift-release-dev/ocp-release:{primaryVersion}-multi
                      </code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Maturity</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label isCompact color={maturity === 'preview' ? 'orange' : 'green'}>
                        {maturity}
                      </Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Min worker nodes</DescriptionListTerm>
                    <DescriptionListDescription>{minWorkers}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>GPU support</DescriptionListTerm>
                    <DescriptionListDescription>
                      {isGpu ? 'NVIDIA operator + GPU node pool' : '—'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>10.128.0.0/14</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Service CIDR</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>172.30.0.0/16</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>

            <Card>
              <CardTitle>Lifecycle</CardTitle>
              <CardBody>
                <ul className={lifecycleListCss}>
                  {[
                    { label: 'Published', value: '2026-02-04' },
                    { label: 'Last revision', value: '2026-05-22' },
                    { label: 'Support end', value: '2027-02-04' },
                    { label: 'Next z-stream', value: '2026-06-18' },
                  ].map((row, i, arr) => {
                    const lifecycleItemCss = css`
                      padding: 8px 0;
                      border-bottom: ${i < arr.length - 1 ? '1px dashed #e3e8ee' : 'none'};
                    `
                    return (
                      <li key={row.label} className={lifecycleItemCss}>
                        <span className={lifecycleItemLabelCss}>{row.label}</span>
                        <span className={lifecycleItemValueCss}>{row.value}</span>
                      </li>
                    )
                  })}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab
          eventKey="clusters"
          title={<TabTitleText>Consuming clusters ({consumingClusters.length})</TabTitleText>}
        >
          <div className={tabContentCss}>
            <div className={panelCss}>
              {consumingClusters.length === 0 ? (
                <div className={emptyClustersCss}>No clusters currently use this offering.</div>
              ) : (
                <ClusterTable clusters={consumingClusters} />
              )}
            </div>
          </div>
        </Tab>

        <Tab
          eventKey="storage"
          title={<TabTitleText>Storage tiers ({compatibleTiers.length})</TabTitleText>}
        >
          <div className={tabContentCss}>
            <div className={panelCss}>
              <StorageTable tiers={compatibleTiers} />
            </div>
          </div>
        </Tab>

        <Tab
          eventKey="agents"
          title={<TabTitleText>Eligible agents ({eligibleAgents.length})</TabTitleText>}
        >
          <div className={tabContentCss}>
            <div className={panelCss}>
              <AgentsTable agents={eligibleAgents} />
            </div>
          </div>
        </Tab>

        <Tab eventKey="manifest" title={<TabTitleText>Manifest</TabTitleText>}>
          <div className={manifestTabCss}>
            <ClipboardCopy
              isCode
              hoverTip="Copy"
              clickTip="Copied"
              variant={ClipboardCopyVariant.expansion}
            >
              {manifestYaml}
            </ClipboardCopy>
          </div>
        </Tab>
      </Tabs>
    </PageSection>
  )
}

// ── Sub-tables ─────────────────────────────────────────────────────────────────

function ClusterTable({ clusters }: { clusters: Cluster[] }) {
  return (
    <Table aria-label="Consuming clusters">
      <Thead>
        <Tr>
          <Th>Cluster</Th>
          <Th>Tenant</Th>
          <Th>Version</Th>
          <Th>Workers</Th>
          <Th>State</Th>
        </Tr>
      </Thead>
      <Tbody>
        {clusters.map((c) => {
          const state = clusterState(c)
          const stateColor = state === 'ready' ? 'green' : state === 'failed' ? 'red' : 'blue'
          return (
            <Tr key={c.id}>
              <Td>
                <span className={linkNameCss}>{c.metadata.name}</span>
              </Td>
              <Td>
                <code>{c.metadata.tenants?.[0] ?? '—'}</code>
              </Td>
              <Td>{c.status.version ?? '—'}</Td>
              <Td>{clusterTotalWorkers(c)}</Td>
              <Td>
                <Label isCompact color={stateColor} className={labelCapitalizeCss}>
                  {state}
                </Label>
              </Td>
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}

function StorageTable({ tiers }: { tiers: StorageTier[] }) {
  return (
    <Table aria-label="Compatible storage tiers">
      <Thead>
        <Tr>
          <Th>Tier</Th>
          <Th>QoS class</Th>
          <Th>Storage class</Th>
          <Th>VIP pool</Th>
          <Th>Status</Th>
        </Tr>
      </Thead>
      <Tbody>
        {tiers.map((t) => (
          <Tr key={t.id}>
            <Td>
              <span className={linkNameCss}>{t.name}</span>
            </Td>
            <Td>
              <code className={codeSmCss}>{t.qosClass ?? '—'}</code>
            </Td>
            <Td>
              <code className={codeSmCss}>{t.storageClassName ?? '—'}</code>
            </Td>
            <Td>{t.vipPool ?? '—'}</Td>
            <Td>
              <Label isCompact color={t.available ? 'green' : 'grey'}>
                {t.available ? 'available' : 'disabled'}
              </Label>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
}

function AgentsTable({ agents }: { agents: ReturnType<typeof useAgents>['data'] }) {
  return (
    <Table aria-label="Eligible agents">
      <Thead>
        <Tr>
          <Th>Agent</Th>
          <Th>Hardware profile</Th>
          <Th>Cluster</Th>
          <Th>State</Th>
        </Tr>
      </Thead>
      <Tbody>
        {(agents ?? []).map((a) => {
          const stateLabel = a.state.replace('AGENT_STATE_', '').toLowerCase()
          const stateColor =
            a.state === 'AGENT_STATE_AVAILABLE'
              ? 'green'
              : a.state === 'AGENT_STATE_UNAVAILABLE'
                ? 'red'
                : 'blue'
          return (
            <Tr key={a.id}>
              <Td>
                <span className={linkNameCss}>{a.metadata?.name ?? a.id}</span>
              </Td>
              <Td>
                <code>{a.hardwareProfile ?? '—'}</code>
              </Td>
              <Td>{a.clusterRef ?? <span className={mutedDashCss}>—</span>}</Td>
              <Td>
                <Label isCompact color={stateColor} className={labelCapitalizeCss}>
                  {stateLabel}
                </Label>
              </Td>
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
