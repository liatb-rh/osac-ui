/**
 * flow: cluster-service-catalog
 * step: csc_cluster_detail_drawer
 * route: /clusters/:id
 *
 * Full-page detail view for a single cluster — replaces the side-panel drawer.
 */
import { useState } from 'react'
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
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  PageBreadcrumb,
  PageSection,
  Progress,
  ProgressStep,
  ProgressStepper,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core'
import { ExternalLinkAltIcon } from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Cluster, ClusterCatalogItem } from '@osac/api-contracts'
import { useCluster } from '../../api/useCluster'
import { useClusterCatalogItems } from '../../api/useClusterCatalogItems'
import { downloadKubeconfig, patchCluster } from '../../api/clusterClient'
import { useDeleteCluster } from '../../api/useDeleteCluster'
import { useAllSubnets, useSecurityGroups, useVirtualNetworks } from '../../api/useNetworking'
import { useQueryClient } from '@tanstack/react-query'
import { ClusterStatusLabel } from './ClusterStatusLabel'
import { UpgradeClusterModal } from './UpgradeClusterModal'

function formatDate(ts?: string): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
  } catch {
    return ts
  }
}

// ─── Compute health bar ──────────────────────────────────────────────────────

interface ComputeHealthBarProps {
  nodeSetsSpec: Record<string, { hostType?: string; size: number }>
  nodeSetsStatus: Record<string, { size: number }>
  totalWorkers: number
  runningWorkers: number
}

function workerVariant(running: number, desired: number): 'success' | 'warning' | 'danger' | undefined {
  if (desired === 0) return undefined
  if (running === desired) return 'success'
  if (running === 0) return 'danger'
  return 'warning'
}

function ComputeHealthBar({ nodeSetsSpec, nodeSetsStatus, totalWorkers, runningWorkers }: ComputeHealthBarProps) {
  if (totalWorkers === 0) {
    return <p style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>No node sets defined.</p>
  }

  const overallVariant = workerVariant(runningWorkers, totalWorkers)
  const isHealthy = runningWorkers === totalWorkers
  const isScaling = runningWorkers > 0 && runningWorkers < totalWorkers
  const isDegraded = runningWorkers === 0

  const statusLabel = isHealthy ? (
    <Label color="green" isCompact>Healthy</Label>
  ) : isScaling ? (
    <Label color="yellow" isCompact icon={<Spinner size="sm" aria-label="Scaling" />}>Scaling</Label>
  ) : isDegraded ? (
    <Label color="red" isCompact>Degraded</Label>
  ) : null

  const bigNumberColor = isHealthy
    ? 'var(--pf-t--global--color--status--success--default)'
    : isDegraded
    ? 'var(--pf-t--global--color--status--danger--default)'
    : 'var(--pf-t--global--color--status--warning--default)'

  return (
    <div>
      {/* Total workers stat + overall bar */}
      <Flex
        alignItems={{ default: 'alignItemsBaseline' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        style={{ marginBottom: '0.5rem' }}
      >
        <FlexItem>
          <span
            style={{
              fontSize: 'var(--pf-t--global--font--size--heading--lg)',
              fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
              color: bigNumberColor,
              lineHeight: 1,
            }}
          >
            {runningWorkers}
          </span>
        </FlexItem>
        <FlexItem>
          <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
            / {totalWorkers} workers
          </span>
        </FlexItem>
        <FlexItem>{statusLabel}</FlexItem>
      </Flex>

      <Progress
        value={runningWorkers}
        min={0}
        max={totalWorkers}
        variant={overallVariant}
        size="md"
        measureLocation="none"
        aria-label={`${runningWorkers} of ${totalWorkers} workers running`}
        style={{ marginBottom: '1.5rem' }}
      />

      {/* Per node-set breakdown */}
      {Object.keys(nodeSetsSpec).length > 0 && (
        <>
          <Title
            headingLevel="h4"
            size="md"
            style={{
              marginBottom: '0.75rem',
              color: 'var(--pf-t--global--text--color--subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Node Sets
          </Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {Object.entries(nodeSetsSpec).map(([key, nodeSet]) => {
              const running = nodeSetsStatus[key]?.size ?? 0
              const desired = nodeSet.size
              const variant = workerVariant(running, desired)
              const pct = desired > 0 ? Math.round((running / desired) * 100) : 0

              return (
                <div key={key}>
                  <Flex
                    justifyContent={{ default: 'justifyContentSpaceBetween' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                    style={{ marginBottom: '0.3rem' }}
                  >
                    <FlexItem>
                      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                        <FlexItem>
                          <span style={{ fontWeight: 500 }}>{key}</span>
                        </FlexItem>
                        {nodeSet.hostType && (
                          <FlexItem>
                            <span style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                              {nodeSet.hostType}
                            </span>
                          </FlexItem>
                        )}
                        {running !== desired && (
                          <FlexItem>
                            <Spinner size="sm" aria-label={`Scaling ${key}`} />
                          </FlexItem>
                        )}
                      </Flex>
                    </FlexItem>
                    <FlexItem>
                      <span style={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: running === desired
                              ? 'var(--pf-t--global--color--status--success--default)'
                              : 'var(--pf-t--global--color--status--warning--default)',
                          }}
                        >
                          {running}
                        </span>
                        <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}> / {desired}</span>
                      </span>
                    </FlexItem>
                  </Flex>
                  <Progress
                    value={pct}
                    variant={variant}
                    size="sm"
                    measureLocation="none"
                    aria-label={`Node set ${key}: ${running} of ${desired} running`}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Overview tab ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  cluster: Cluster
  catalogItem: ClusterCatalogItem | undefined
}

const STATUS_BORDER: Record<string, string> = {
  CLUSTER_STATE_READY: 'var(--pf-t--global--color--status--success--default)',
  CLUSTER_STATE_FAILED: 'var(--pf-t--global--color--status--danger--default)',
  CLUSTER_STATE_UPGRADE_FAILED: 'var(--pf-t--global--color--status--danger--default)',
  CLUSTER_STATE_PROGRESSING: 'var(--pf-t--global--color--status--info--default)',
  CLUSTER_STATE_UPGRADING: 'var(--pf-t--global--color--status--info--default)',
  CLUSTER_STATE_UNSPECIFIED: 'var(--pf-t--global--border--color--default)',
}

function UnavailableRow({ label }: { label: string }) {
  return (
    <Flex
      spaceItems={{ default: 'spaceItemsSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
    >
      <FlexItem><LockIcon aria-hidden /></FlexItem>
      <FlexItem><em>{label} not available yet</em></FlexItem>
    </Flex>
  )
}

function OverviewTab({ cluster, catalogItem }: OverviewTabProps) {
  const nodeSetsSpec = cluster.spec.nodeSets ?? {}
  const nodeSetsStatus = cluster.status.nodeSets ?? {}
  const totalWorkers = Object.values(nodeSetsSpec).reduce((s, ns) => s + ns.size, 0)
  const runningWorkers = Object.values(nodeSetsStatus).reduce((s, ns) => s + ns.size, 0)

  const labelEntries = Object.entries(cluster.metadata.labels ?? {})
  const createdBy = cluster.metadata.creators?.[0]
  const statusBorder = STATUS_BORDER[cluster.status.state] ?? STATUS_BORDER.CLUSTER_STATE_UNSPECIFIED

  const activeCondition = cluster.status.conditions?.find(
    (c) =>
      (c.type === 'CLUSTER_CONDITION_TYPE_FAILED' && c.status === 'CONDITION_STATUS_TRUE') ||
      (c.type === 'CLUSTER_CONDITION_TYPE_DEGRADED' && c.status === 'CONDITION_STATUS_TRUE'),
  )

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {activeCondition && (
        <Alert
          isInline
          variant={activeCondition.type.includes('FAILED') ? 'danger' : 'warning'}
          title={activeCondition.reason ?? activeCondition.type.replace('CLUSTER_CONDITION_TYPE_', '')}
          style={{ marginBottom: '1.25rem' }}
        >
          {activeCondition.message}
        </Alert>
      )}

      <Grid hasGutter>
        {/* ── Identity ──────────────────────────────────────────────────── */}
        <GridItem md={5}>
          <Card style={{ borderTop: `3px solid ${statusBorder}`, height: '100%' }}>
            <CardTitle>Identity</CardTitle>
            <CardBody>
              <div style={{ marginBottom: '1rem' }}>
                <ClusterStatusLabel state={cluster.status.state} />
              </div>
              <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>OCP Version</DescriptionListTerm>
                  <DescriptionListDescription>{cluster.status.version ?? '—'}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Template</DescriptionListTerm>
                  <DescriptionListDescription>
                    {catalogItem?.title ?? cluster.spec.template ?? '—'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>{formatDate(cluster.metadata.createdAt)}</DescriptionListDescription>
                </DescriptionListGroup>
                {createdBy && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Created by</DescriptionListTerm>
                    <DescriptionListDescription>{createdBy}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {labelEntries.length > 0 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Labels</DescriptionListTerm>
                    <DescriptionListDescription>
                      <LabelGroup numLabels={6}>
                        {labelEntries.map(([k, v]) => (
                          <Label key={k} color="blue" isCompact>
                            {v ? `${k}=${v}` : k}
                          </Label>
                        ))}
                      </LabelGroup>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        {/* ── Access ────────────────────────────────────────────────────── */}
        <GridItem md={7}>
          <Card style={{ height: '100%' }}>
            <CardTitle>Access</CardTitle>
            <CardBody>
              <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>API URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    {cluster.status.apiUrl ? (
                      <ClipboardCopy
                        isReadOnly
                        isCode
                        hoverTip="Copy API URL"
                        clickTip="Copied"
                        aria-label="Copy API URL"
                      >
                        {cluster.status.apiUrl}
                      </ClipboardCopy>
                    ) : (
                      <UnavailableRow label="API URL" />
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Console URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    {cluster.status.consoleUrl ? (
                      <Flex
                        direction={{ default: 'column' }}
                        spaceItems={{ default: 'spaceItemsSm' }}
                      >
                        <FlexItem>
                          <Button
                            variant="link"
                            isInline
                            icon={<ExternalLinkAltIcon />}
                            iconPosition="end"
                            component="a"
                            href={cluster.status.consoleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open console
                          </Button>
                        </FlexItem>
                        <FlexItem>
                          <ClipboardCopy
                            isReadOnly
                            isCode
                            hoverTip="Copy console URL"
                            clickTip="Copied"
                            aria-label="Copy console URL"
                          >
                            {cluster.status.consoleUrl}
                          </ClipboardCopy>
                        </FlexItem>
                      </Flex>
                    ) : (
                      <UnavailableRow label="Console URL" />
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </CardBody>
          </Card>
        </GridItem>

        {/* ── Compute ───────────────────────────────────────────────────── */}
        <GridItem md={6}>
          <Card style={{ height: '100%' }}>
            <CardTitle>Compute</CardTitle>
            <CardBody>
              <ComputeHealthBar
                nodeSetsSpec={nodeSetsSpec}
                nodeSetsStatus={nodeSetsStatus}
                totalWorkers={totalWorkers}
                runningWorkers={runningWorkers}
              />
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </div>
  )
}

// ─── Storage tab ─────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, 'purple' | 'blue' | 'grey' | 'teal'> = {
  fast: 'purple',
  'tier-fast': 'purple',
  standard: 'blue',
  'tier-standard': 'blue',
  archive: 'grey',
  'tier-archive': 'grey',
}

const TIER_DESCRIPTION: Record<string, string> = {
  fast: 'NVMe-backed · high-performance IOPS',
  'tier-fast': 'NVMe-backed · high-performance IOPS',
  standard: 'SSD-backed · general purpose',
  'tier-standard': 'SSD-backed · general purpose',
  archive: 'Capacity-optimized · cost-effective',
  'tier-archive': 'Capacity-optimized · cost-effective',
}

function pvcSnippet(storageClassName: string): string {
  return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: ${storageClassName}`
}

function tierLabel(tier?: string) {
  if (!tier) return null
  const color = TIER_COLOR[tier] ?? 'teal'
  const display = tier.replace(/^tier-/, '')
  return <Label color={color} isCompact>{display}</Label>
}

function StorageTab({ cluster }: { cluster: Cluster }) {
  const { storageReady, storage } = cluster.status
  const isClusterReady = cluster.status.state === 'CLUSTER_STATE_READY' ||
    cluster.status.state === 'CLUSTER_STATE_UPGRADING' ||
    cluster.status.state === 'CLUSTER_STATE_UPGRADE_FAILED'
  const hasStorageClasses = (storage?.storageClasses?.length ?? 0) > 0


  return (
    <div style={{ padding: '1.5rem 0' }}>

      {/* ── Readiness + CSI driver ─────────────────────────────────────── */}
      <Grid hasGutter style={{ marginBottom: '1.5rem' }}>
        <GridItem md={6}>
          <Card style={{ height: '100%', borderTop: `3px solid ${storageReady ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--border--color--default)'}` }}>
            <CardTitle>Storage Readiness</CardTitle>
            <CardBody>
              <div style={{ marginBottom: '1.25rem' }}>
                {storageReady === true ? (
                  <Label color="green">Ready</Label>
                ) : storageReady === false ? (
                  <Label color="blue" icon={<Spinner size="sm" aria-label="Provisioning" />}>
                    Provisioning
                  </Label>
                ) : (
                  <Label color="grey">Not configured</Label>
                )}
              </div>

              <ProgressStepper aria-label="Storage provisioning stages" isVertical>
                <ProgressStep
                  variant="success"
                  aria-label="Cluster provisioned"
                  description="Compute nodes running"
                >
                  Cluster provisioned
                </ProgressStep>
                <ProgressStep
                  variant={storage?.csiDriver ? 'success' : isClusterReady ? 'info' : 'pending'}
                  isCurrent={isClusterReady && !storage?.csiDriver}
                  aria-label="CSI driver installed"
                  description={storage?.csiDriver ? storage.csiDriver : 'VAST CSI driver pending'}
                >
                  CSI driver installed
                </ProgressStep>
                <ProgressStep
                  variant={hasStorageClasses ? 'success' : storage?.csiDriver ? 'info' : 'pending'}
                  isCurrent={!!storage?.csiDriver && !hasStorageClasses}
                  aria-label="StorageClasses created"
                  description={
                    hasStorageClasses
                      ? `${storage!.storageClasses!.length} class${storage!.storageClasses!.length > 1 ? 'es' : ''} installed`
                      : 'Per-tier classes pending'
                  }
                >
                  StorageClasses created
                </ProgressStep>
                <ProgressStep
                  variant={storageReady === true ? 'success' : hasStorageClasses ? 'info' : 'pending'}
                  isCurrent={hasStorageClasses && storageReady !== true}
                  aria-label="Ready for PVCs"
                  description={storageReady ? 'PVCs can be created' : 'Awaiting confirmation'}
                >
                  Ready for PVCs
                </ProgressStep>
              </ProgressStepper>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem md={6}>
          <Card style={{ height: '100%' }}>
            <CardTitle>CSI Driver</CardTitle>
            <CardBody>
              {storage?.csiDriver ? (
                <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Driver</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code style={{ fontSize: '0.875rem' }}>{storage.csiDriver}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Provider</DescriptionListTerm>
                    <DescriptionListDescription>VAST Data</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Storage type</DescriptionListTerm>
                    <DescriptionListDescription>
                      Networked storage — application data only
                      <br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                        etcd and control plane use local storage
                      </span>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              ) : (
                <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}
                  style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                  <FlexItem><LockIcon aria-hidden /></FlexItem>
                  <FlexItem><em>CSI driver not yet installed</em></FlexItem>
                </Flex>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* ── StorageClasses ────────────────────────────────────────────────── */}
      <Title headingLevel="h3" size="md" style={{ marginBottom: '0.75rem' }}>
        StorageClasses
      </Title>
      <p style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: '1rem' }}>
        Copy the <code>storageClassName</code> or the full PVC manifest to use in your workloads via <code>kubectl</code> or Helm. PVC creation is done outside the OSAC UI.
      </p>

      {hasStorageClasses ? (
        <Grid hasGutter style={{ marginBottom: '1.5rem' }}>
          {(storage!.storageClasses ?? []).map((sc) => (
            <GridItem key={sc.name} md={4} sm={6}>
              <Card>
                <CardTitle>
                  <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'wrap' }}>
                    <FlexItem>
                      <code style={{ fontSize: '0.9rem' }}>{sc.name}</code>
                    </FlexItem>
                    {sc.isDefault && <FlexItem><Label color="yellow" isCompact>Default</Label></FlexItem>}
                    {tierLabel(sc.tier)}
                  </Flex>
                  {sc.tier && TIER_DESCRIPTION[sc.tier] && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--pf-t--global--text--color--subtle)', marginTop: '0.25rem', fontWeight: 'normal' }}>
                      {TIER_DESCRIPTION[sc.tier]}
                    </p>
                  )}
                </CardTitle>
                <CardBody>
                  {Object.keys(sc.parameters ?? {}).length > 0 && (
                    <DescriptionList isCompact columnModifier={{ default: '1Col' }} style={{ marginBottom: '0.875rem' }}>
                      {Object.entries(sc.parameters ?? {}).map(([k, v]) => (
                        <DescriptionListGroup key={k}>
                          <DescriptionListTerm>{k}</DescriptionListTerm>
                          <DescriptionListDescription>{v}</DescriptionListDescription>
                        </DescriptionListGroup>
                      ))}
                    </DescriptionList>
                  )}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      storageClassName
                    </p>
                    <ClipboardCopy isReadOnly isCode hoverTip="Copy class name" clickTip="Copied" aria-label={`Copy storageClassName ${sc.name}`}>
                      {sc.name}
                    </ClipboardCopy>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      PVC manifest
                    </p>
                    <ClipboardCopy isReadOnly isCode isExpanded hoverTip="Copy PVC manifest" clickTip="Copied" aria-label={`Copy PVC manifest for ${sc.name}`}>
                      {pvcSnippet(sc.name)}
                    </ClipboardCopy>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          ))}
        </Grid>
      ) : (
        <div style={{ padding: '1rem 0 1.5rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
          <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem><LockIcon aria-hidden /></FlexItem>
            <FlexItem><em>StorageClasses will appear here once the CSI driver is installed.</em></FlexItem>
          </Flex>
        </div>
      )}

      {/* ── VolumeSnapshotClasses ─────────────────────────────────────────── */}
      <Card>
        <CardTitle>VolumeSnapshotClasses</CardTitle>
        <CardBody style={{ padding: 0 }}>
          {(storage?.volumeSnapshotClasses?.length ?? 0) > 0 ? (
            <Table aria-label="VolumeSnapshotClasses">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Driver</Th>
                  <Th>Deletion policy</Th>
                  <Th>Default</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(storage!.volumeSnapshotClasses ?? []).map((vsc) => (
                  <Tr key={vsc.name}>
                    <Td><code>{vsc.name}</code></Td>
                    <Td>{vsc.driver ?? '—'}</Td>
                    <Td>
                      {vsc.deletionPolicy ? (
                        <Label
                          color={vsc.deletionPolicy === 'Retain' ? 'green' : 'orange'}
                          isCompact
                        >
                          {vsc.deletionPolicy}
                        </Label>
                      ) : '—'}
                    </Td>
                    <Td>{vsc.isDefault ? <Label color="yellow" isCompact>Default</Label> : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <div style={{ padding: '1rem 1.5rem', color: 'var(--pf-t--global--text--color--subtle)', fontStyle: 'italic' }}>
              No snapshot classes available.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: cluster, isLoading, error } = useCluster(id ?? null)
  const { data: catalogItems } = useClusterCatalogItems()
  const { mutateAsync: deleteCluster, isPending: isDeleting } = useDeleteCluster()
  const qc = useQueryClient()

  const { data: virtualNetworks } = useVirtualNetworks()
  const { data: allSubnets } = useAllSubnets()
  const { data: securityGroups } = useSecurityGroups()

  const [activeTab, setActiveTab] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [kubeconfigDownloading, setKubeconfigDownloading] = useState(false)
  const [kubeconfigError, setKubeconfigError] = useState<string | null>(null)
  const [scalingKey, setScalingKey] = useState<string | null>(null)
  const [scaleValues, setScaleValues] = useState<Record<string, number>>({})

  function resolveVnName(vnId?: string): string {
    if (!vnId) return '—'
    return virtualNetworks?.find((v) => v.id === vnId)?.metadata.name ?? vnId
  }
  function resolveSubnetName(subnetId?: string): string {
    if (!subnetId) return '—'
    return allSubnets?.find((s) => s.id === subnetId)?.metadata.name ?? subnetId
  }
  function resolveSgName(sgId: string): string {
    return securityGroups?.find((sg) => sg.id === sgId)?.metadata.name ?? sgId
  }

  if (isLoading) {
    return (
      <PageSection isFilled>
        <Spinner aria-label="Loading cluster details" />
      </PageSection>
    )
  }

  if (error || !cluster) {
    return (
      <PageSection isFilled>
        <Alert variant="danger" title="Failed to load cluster" isInline>
          <Button variant="link" isInline onClick={() => navigate('/clusters')}>
            Back to Clusters
          </Button>
        </Alert>
      </PageSection>
    )
  }

  const catalogItem = (catalogItems ?? []).find((ci) => ci.id === cluster.spec.catalogItem)

  const canUpgrade =
    cluster.status.state === 'CLUSTER_STATE_READY' &&
    (catalogItem?.allowedVersions ?? []).some((v) => {
      const cur = cluster.status.version ?? ''
      const [a1 = 0, a2 = 0, a3 = 0] = v.split('.').map(Number)
      const [b1 = 0, b2 = 0, b3 = 0] = cur.split('.').map(Number)
      return a1 > b1 || (a1 === b1 && a2 > b2) || (a1 === b1 && a2 === b2 && a3 > b3)
    })

  const canDownloadKubeconfig = cluster.status.state === 'CLUSTER_STATE_READY'
  const canDelete =
    cluster.status.state !== 'CLUSTER_STATE_PROGRESSING' &&
    cluster.status.state !== 'CLUSTER_STATE_UPGRADING'

  async function handleDownloadKubeconfig() {
    setKubeconfigError(null)
    setKubeconfigDownloading(true)
    try {
      const yaml = await downloadKubeconfig(cluster!.id)
      const blob = new Blob([yaml], { type: 'application/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kubeconfig-${cluster!.metadata.name}.yaml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setKubeconfigError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setKubeconfigDownloading(false)
    }
  }

  async function handleDelete() {
    await deleteCluster(cluster!.id)
    setShowDeleteConfirm(false)
    navigate('/clusters')
  }

  async function handleScale(nodeSetKey: string, newSize: number) {
    setScalingKey(nodeSetKey)
    try {
      await patchCluster(cluster!.id, {
        spec: { nodeSets: { ...cluster!.spec.nodeSets, [nodeSetKey]: { size: newSize } } },
      })
      await qc.refetchQueries({ queryKey: ['clusters'] })
    } finally {
      setScalingKey(null)
    }
  }

  return (
    <>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem component="button" onClick={() => navigate('/clusters')}>
            Clusters
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{cluster.metadata.name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>

      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          flexWrap={{ default: 'wrap' }}
          gap={{ default: 'gapMd' }}
          style={{ marginBottom: '1rem' }}
        >
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
              <FlexItem>
                <Title headingLevel="h1" size="2xl">
                  {cluster.metadata.name}
                </Title>
              </FlexItem>
              <FlexItem>
                <ClusterStatusLabel state={cluster.status.state} />
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={() => setShowUpgradeModal(true)}
                  isDisabled={!canUpgrade}
                >
                  Upgrade
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="secondary"
                  onClick={handleDownloadKubeconfig}
                  isDisabled={!canDownloadKubeconfig || kubeconfigDownloading}
                  icon={kubeconfigDownloading ? <Spinner size="sm" aria-label="Downloading kubeconfig" /> : undefined}
                >
                  {kubeconfigDownloading ? 'Downloading…' : 'Download kubeconfig'}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  isDisabled={!canDelete || isDeleting}
                >
                  Delete
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>

        {kubeconfigError && (
          <Alert variant="danger" title="Kubeconfig download failed" isInline style={{ marginBottom: '1rem' }}>
            {kubeconfigError}
          </Alert>
        )}
      </PageSection>

      <PageSection isFilled>
        <Tabs
          activeKey={activeTab}
          onSelect={(_e, k) => setActiveTab(Number(k))}
          aria-label="Cluster detail tabs"
        >
          {/* ── Overview ──────────────────────────────────────────────────── */}
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <OverviewTab cluster={cluster} catalogItem={catalogItem} />
          </Tab>

          {/* ── Node Sets ─────────────────────────────────────────────────── */}
          <Tab eventKey={1} title={<TabTitleText>Node Sets</TabTitleText>}>
            <Table aria-label="Node sets" style={{ marginTop: '1.5rem' }}>
              <Thead>
                <Tr>
                  <Th>Node Set</Th>
                  <Th>Host Type</Th>
                  <Th>Desired</Th>
                  <Th>Current</Th>
                  <Th>Scale</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(cluster.spec.nodeSets ?? {}).map(([key, nodeSet]) => {
                  const currentSize = cluster.status.nodeSets?.[key]?.size ?? 0
                  const desiredSize = nodeSet.size
                  const isScaling = scalingKey === key || desiredSize !== currentSize
                  const editVal = scaleValues[key] ?? desiredSize
                  return (
                    <Tr key={key}>
                      <Td>{key}</Td>
                      <Td>{nodeSet.hostType ?? '—'}</Td>
                      <Td>{desiredSize}</Td>
                      <Td>
                        {isScaling && scalingKey !== key
                          ? <><Spinner size="sm" aria-label="Scaling" /> {currentSize}</>
                          : currentSize}
                      </Td>
                      <Td>
                        {scalingKey === key ? (
                          <Spinner size="sm" aria-label={`Scaling ${key}`} />
                        ) : (
                          <NumberInput
                            value={editVal}
                            min={1}
                            onMinus={() => setScaleValues((s) => ({ ...s, [key]: Math.max(1, editVal - 1) }))}
                            onPlus={() => setScaleValues((s) => ({ ...s, [key]: editVal + 1 }))}
                            onChange={(e) =>
                              setScaleValues((s) => ({
                                ...s,
                                [key]: Number((e.target as HTMLInputElement).value),
                              }))
                            }
                            inputProps={{ 'aria-label': `Scale ${key}` }}
                          >
                            <Button
                              variant="control"
                              size="sm"
                              onClick={() => handleScale(key, editVal)}
                              isDisabled={editVal === desiredSize}
                            >
                              Apply
                            </Button>
                          </NumberInput>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Tab>

          {/* ── Networking ────────────────────────────────────────────────── */}
          <Tab eventKey={2} title={<TabTitleText>Networking</TabTitleText>}>
            <Grid hasGutter style={{ padding: '1.5rem 0' }}>

              {/* Public Endpoints — primary, top-left */}
              <GridItem md={6}>
                <Card style={{ height: '100%' }}>
                  <CardTitle>Public Endpoints</CardTitle>
                  <CardBody>
                    <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                      <DescriptionListGroup>
                        <DescriptionListTerm>API Public IP</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.status.network?.apiPublicIp ? (
                            <ClipboardCopy isReadOnly isCode hoverTip="Copy API IP" clickTip="Copied" aria-label="Copy API public IP">
                              {cluster.status.network.apiPublicIp}
                            </ClipboardCopy>
                          ) : (
                            <UnavailableRow label="API public IP" />
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Ingress Public IP</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.status.network?.ingressPublicIp ? (
                            <ClipboardCopy isReadOnly isCode hoverTip="Copy Ingress IP" clickTip="Copied" aria-label="Copy Ingress public IP">
                              {cluster.status.network.ingressPublicIp}
                            </ClipboardCopy>
                          ) : (
                            <UnavailableRow label="Ingress public IP" />
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>DNS Records</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.status.network?.dnsRecords?.length ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {cluster.status.network.dnsRecords.map((r) => (
                                <ClipboardCopy key={r} isReadOnly isCode hoverTip="Copy" clickTip="Copied" aria-label={`Copy DNS record ${r}`}>
                                  {r}
                                </ClipboardCopy>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--pf-t--global--text--color--subtle)', fontStyle: 'italic' }}>
                              None configured
                            </span>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GridItem>

              {/* Tenant Network Topology */}
              <GridItem md={6}>
                <Card style={{ height: '100%' }}>
                  <CardTitle>Tenant Network</CardTitle>
                  <CardBody>
                    <DescriptionList isCompact columnModifier={{ default: '1Col' }}>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Virtual Network</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.spec.network?.virtualNetworkRef ? (
                            <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                              <FlexItem>{resolveVnName(cluster.spec.network.virtualNetworkRef)}</FlexItem>
                              <FlexItem>
                                <Button
                                  variant="link"
                                  isInline
                                  icon={<ExternalLinkAltIcon />}
                                  component="a"
                                  href="/admin/networks"
                                  aria-label="View virtual networks"
                                />
                              </FlexItem>
                            </Flex>
                          ) : (
                            <Label color="grey" isCompact>Not configured</Label>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Subnet</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.spec.network?.subnetRef ? (
                            resolveSubnetName(cluster.spec.network.subnetRef)
                          ) : (
                            <Label color="grey" isCompact>Not configured</Label>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Security Groups</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.spec.network?.securityGroupRefs?.length ? (
                            <LabelGroup numLabels={8}>
                              {cluster.spec.network.securityGroupRefs.map((sgId) => (
                                <Label key={sgId} color="blue" isCompact>
                                  {resolveSgName(sgId)}
                                </Label>
                              ))}
                            </LabelGroup>
                          ) : (
                            <Label color="grey" isCompact>None</Label>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GridItem>

              {/* Cluster SDN — internal config, de-emphasised */}
              <GridItem md={6}>
                <Card>
                  <CardTitle>
                    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>Cluster SDN</FlexItem>
                      <FlexItem>
                        <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--pf-t--global--text--color--subtle)' }}>
                          Internal addresses — immutable after cluster creation
                        </span>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <DescriptionList isCompact columnModifier={{ default: '2Col' }}>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Pod network CIDR</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.spec.network?.podCidr ?? (
                            <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                              10.128.0.0/14 <em>(default)</em>
                            </span>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Service network CIDR</DescriptionListTerm>
                        <DescriptionListDescription>
                          {cluster.spec.network?.serviceCidr ?? (
                            <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                              172.30.0.0/16 <em>(default)</em>
                            </span>
                          )}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </CardBody>
                </Card>
              </GridItem>

            </Grid>
          </Tab>

          {/* ── Storage ───────────────────────────────────────────────────── */}
          <Tab eventKey={3} title={<TabTitleText>Storage</TabTitleText>}>
            <StorageTab cluster={cluster} />
          </Tab>

          {/* ── Conditions ────────────────────────────────────────────────── */}
          <Tab eventKey={4} title={<TabTitleText>Conditions</TabTitleText>}>
            {(cluster.status.conditions?.length ?? 0) === 0 ? (
              <p style={{ padding: '1.5rem 0', color: 'var(--pf-v5-global--Color--200)' }}>
                No conditions reported.
              </p>
            ) : (
              <Table aria-label="Conditions" style={{ marginTop: '1.5rem' }}>
                <Thead>
                  <Tr>
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Reason</Th>
                    <Th>Message</Th>
                    <Th>Last Transition</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(cluster.status.conditions ?? []).map((c, i) => (
                    <Tr key={i}>
                      <Td>{c.type.replace('CLUSTER_CONDITION_TYPE_', '')}</Td>
                      <Td>
                        {c.status === 'CONDITION_STATUS_TRUE'
                          ? 'True'
                          : c.status === 'CONDITION_STATUS_FALSE'
                          ? 'False'
                          : 'Unknown'}
                      </Td>
                      <Td>{c.reason ?? '—'}</Td>
                      <Td>{c.message ?? '—'}</Td>
                      <Td>{formatDate(c.lastTransitionTime)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Tab>
        </Tabs>
      </PageSection>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        variant="small"
        aria-labelledby="delete-cluster-modal-title"
      >
        <ModalHeader
          title={`Delete cluster "${cluster.metadata.name}"?`}
          labelId="delete-cluster-modal-title"
        />
        <ModalBody>This action cannot be undone.</ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleDelete} isDisabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Confirm delete'}
          </Button>
          <Button variant="link" onClick={() => setShowDeleteConfirm(false)} isDisabled={isDeleting}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {showUpgradeModal && (
        <UpgradeClusterModal
          cluster={cluster}
          catalogItem={catalogItem}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  )
}
