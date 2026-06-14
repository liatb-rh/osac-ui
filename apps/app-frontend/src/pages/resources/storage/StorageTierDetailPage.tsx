/**
 * flow: provider-administration
 * step: pad_storage_tier_detail
 * route: /resources/storage/storage-tiers/:id
 */
import { css, cx } from '@emotion/css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
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
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  PageSection,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { EditIcon } from '@patternfly/react-icons/dist/esm/icons/edit-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { ActionRow, PageHeader, StatCard } from '@osac/ui-components'
import { useDeleteStorageTier, useStorageTiers } from '../../../hooks/useAgents'
import { MOCK_CONSUMERS, tierMeta } from './storageTierUtils'

const tabContentCss = css`
  padding-top: 16px;
`

const panelCss = css`
  background: var(--pf-t--global--background--color--primary--default);
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  padding: 20px;
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

const overviewGridCss = css`
  padding-top: 16px;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
`

const conditionsListCss = css`
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
`

const conditionItemBaseCss = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
`

const conditionItemBorderCss = css`
  border-bottom: 1px dashed #e3e8ee;
`

const conditionTypeCodeCss = css`
  font-size: 11px;
`

const csiNoteCss = css`
  margin-top: 12px;
  font-size: 13px;
  color: #5b6b7c;
`

const emptyConsumersCss = css`
  padding: 24px;
  text-align: center;
  color: #5b6b7c;
`

const storageClassCodeCss = css`
  font-size: 12px;
`

export function StorageTierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<string | number>('overview')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { mutate: deleteTier, isPending: isDeleting } = useDeleteStorageTier()

  const { data: tiers, isLoading } = useStorageTiers()
  const tier = (tiers ?? []).find((t) => t.id === id)

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Loading tier" />
      </PageSection>
    )
  }

  if (!tier) {
    return (
      <PageSection>
        <EmptyState titleText={`Tier "${id}" not found`} headingLevel="h2">
          <EmptyStateBody>It may have been removed or the URL is incorrect.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    )
  }

  const meta = tierMeta(tier)
  const consumers = MOCK_CONSUMERS[(tier.qosClass ?? '').toLowerCase()] ?? []
  const totalPvcs = consumers.reduce((a, c) => a + c.pvcs, 0)
  const usedPct = meta.capacityTib > 0 ? Math.round((meta.usedTib / meta.capacityTib) * 100) : 0
  const sampleTenant = consumers[0]?.tenant ?? 'northstar'
  const scTemplate = tier.storageClassName ?? `tenant-{tenant}-${tier.id}`
  const sc = scTemplate.replace('{tenant}', sampleTenant)
  const vscTemplate = scTemplate + '-snap'
  const viewPrefix = `/tenants/{tenant}/${tier.id}`

  const scYaml = [
    `apiVersion: storage.k8s.io/v1`,
    `kind: StorageClass`,
    `metadata:`,
    `  name: ${sc}`,
    `provisioner: ${meta.csiDriver}`,
    `reclaimPolicy: ${meta.reclaimPolicy}`,
    `volumeBindingMode: ${meta.volumeBindingMode}`,
    `allowVolumeExpansion: ${meta.allowVolumeExpansion}`,
    `parameters:`,
    `  view_policy: ${tier.id}`,
    `  protocol: ${meta.protocol}`,
    `  vast_cluster: ${meta.vastCluster}`,
    `  view: ${viewPrefix.replace('{tenant}', sampleTenant)}`,
  ].join('\n')

  const conditions = [
    { type: 'TIER_CONDITION_BACKEND_HEALTHY', ok: true },
    { type: 'TIER_CONDITION_CSI_INSTALLED', ok: true },
    { type: 'TIER_CONDITION_STORAGECLASS_RECONCILED', ok: consumers.length > 0 },
    { type: 'TIER_CONDITION_QUOTA_AVAILABLE', ok: usedPct < 90 },
  ]

  return (
    <PageSection isFilled>
      <Breadcrumb className={breadcrumbCss}>
        <BreadcrumbItem
          render={() => (
            <Button variant="link" isInline onClick={() => navigate('/resources/storage/storage-tiers')}>
              Storage Tiers
            </Button>
          )}
        />
        <BreadcrumbItem isActive>{tier.name}</BreadcrumbItem>
      </Breadcrumb>

      <PageHeader
        title={tier.name}
        description={meta.description}
        actions={
          <Button variant="secondary" icon={<EditIcon />}>
            Edit tier
          </Button>
        }
      />

      {/* KPI row */}
      <div className={kpiRowCss}>
        <StatCard
          label="Status"
          value={tier.available ? 'Available' : 'Disabled'}
          tone={tier.available ? 'success' : 'danger'}
        />
        <StatCard label="IOPS" value={meta.iops} hint="per view" />
        <StatCard label="Throughput" value={`${meta.throughputGbps} GB/s`} hint="sustained" />
        <StatCard label="Latency" value={meta.latency} hint="p99" />
        <StatCard
          label="Capacity"
          value={`${meta.usedTib} / ${meta.capacityTib} TiB`}
          hint={`${usedPct}% used`}
          tone={usedPct > 80 ? 'warning' : 'default'}
        />
        <StatCard
          label="Consumers"
          value={totalPvcs}
          hint={`${consumers.length} tenant${consumers.length !== 1 ? 's' : ''}`}
        />
      </div>

      <Tabs activeKey={tab} onSelect={(_, k) => setTab(k)} aria-label="Tier detail tabs">
        {/* ── Overview ── */}
        <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
          <div className={overviewGridCss}>
            <Card>
              <CardTitle>Specification</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Tier ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{tier.id}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Media</DescriptionListTerm>
                    <DescriptionListDescription>{meta.media}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Default</DescriptionListTerm>
                    <DescriptionListDescription>
                      {meta.isDefault ? 'Yes — assigned to new tenant clusters' : 'No'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Encryption</DescriptionListTerm>
                    <DescriptionListDescription>{meta.encryption}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Replication</DescriptionListTerm>
                    <DescriptionListDescription>{meta.replication}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>StorageClass</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{tier.storageClassName ?? scTemplate}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>VolumeSnapshotClass</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{vscTemplate}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>CSI driver</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{meta.csiDriver}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Labels</DescriptionListTerm>
                    <DescriptionListDescription>
                      <LabelGroup>
                        <Label color="blue">media={meta.media.split(' ')[0].toLowerCase()}</Label>
                        <Label color="purple">protocol={meta.protocol}</Label>
                        <Label color="grey">backend={meta.vastCluster}</Label>
                      </LabelGroup>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>

            <Card>
              <CardTitle>Tier API conditions</CardTitle>
              <CardBody>
                <ul className={conditionsListCss}>
                  {conditions.map((c, i) => (
                    <li
                      key={c.type}
                      className={cx(
                        conditionItemBaseCss,
                        i < conditions.length - 1 && conditionItemBorderCss,
                      )}
                    >
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

        {/* ── Backend ── */}
        <Tab eventKey="backend" title={<TabTitleText>Backend</TabTitleText>}>
          <div className={tabContentCss}>
            <Card>
              <CardTitle>VAST view binding</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>VAST cluster</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{meta.vastCluster}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Protocol</DescriptionListTerm>
                    <DescriptionListDescription>{meta.protocol}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>VIP Pool</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{tier.vipPool ?? '—'}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>View prefix</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{viewPrefix}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Example view ({sampleTenant})</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{viewPrefix.replace('{tenant}', sampleTenant)}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* ── CSI ── */}
        <Tab eventKey="csi" title={<TabTitleText>CSI / StorageClass</TabTitleText>}>
          <div className={tabContentCss}>
            <Card>
              <CardTitle>
                Per-tenant manifest (example: <code>{sampleTenant}</code>)
              </CardTitle>
              <CardBody>
                <ClipboardCopy
                  isCode
                  hoverTip="Copy"
                  clickTip="Copied"
                  variant={ClipboardCopyVariant.expansion}
                >
                  {scYaml}
                </ClipboardCopy>
                <div className={csiNoteCss}>
                  VolumeSnapshotClass installed alongside:{' '}
                  <code>{vscTemplate.replace('{tenant}', sampleTenant)}</code>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* ── Consumers ── */}
        <Tab
          eventKey="consumers"
          title={<TabTitleText>Consumers ({consumers.length})</TabTitleText>}
        >
          <div className={tabContentCss}>
            <div className={panelCss}>
              {consumers.length === 0 ? (
                <div className={emptyConsumersCss}>No tenants are consuming this tier yet.</div>
              ) : (
                <Table aria-label="Consumers">
                  <Thead>
                    <Tr>
                      <Th>Tenant</Th>
                      <Th>Clusters</Th>
                      <Th>PVCs</Th>
                      <Th>Used</Th>
                      <Th>StorageClass</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {consumers.map((c) => (
                      <Tr key={c.tenant}>
                        <Td>
                          <strong>{c.tenant}</strong>
                        </Td>
                        <Td>{c.clusters.join(', ')}</Td>
                        <Td>{c.pvcs}</Td>
                        <Td>{c.usedTib} TiB</Td>
                        <Td>
                          <code className={storageClassCodeCss}>
                            {scTemplate.replace('{tenant}', c.tenant)}
                          </code>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </div>
        </Tab>

        {/* ── Activity ── */}
        <Tab eventKey="activity" title={<TabTitleText>Activity</TabTitleText>}>
          <div className={tabContentCss}>
            <div className={panelCss}>
              <Table aria-label="Activity log">
                <Thead>
                  <Tr>
                    <Th>When</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Result</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>2026-06-05 09:14</Td>
                    <Td>system</Td>
                    <Td>Reconciled StorageClass on dev-ocp</Td>
                    <Td>
                      <Label color="green" isCompact>
                        success
                      </Label>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>2026-06-03 17:02</Td>
                    <Td>platform@osac</Td>
                    <Td>Increased capacity by 80 TiB</Td>
                    <Td>
                      <Label color="green" isCompact>
                        success
                      </Label>
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>2026-05-22 11:30</Td>
                    <Td>platform@osac</Td>
                    <Td>Installed CSI driver {meta.csiDriver}</Td>
                    <Td>
                      <Label color="green" isCompact>
                        success
                      </Label>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </div>
          </div>
        </Tab>
      </Tabs>

      <ActionRow
        tone="danger"
        title="Delete tier"
        body={
          consumers.length > 0
            ? `This tier has ${consumers.length} active consumer(s). Remove all consumers before deleting.`
            : 'Permanently remove this storage tier and its configuration.'
        }
        cta="Delete tier"
        icon={<TrashIcon />}
        disabled={consumers.length > 0}
        onClick={() => setDeleteOpen(true)}
      />

      <Modal
        variant={ModalVariant.small}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        aria-label="Confirm delete tier"
      >
        <ModalHeader title="Delete storage tier?" />
        <ModalBody>
          Are you sure you want to delete <strong>{tier.name}</strong>? This action cannot be
          undone.
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            isLoading={isDeleting}
            isDisabled={isDeleting}
            onClick={() =>
              deleteTier(tier.id, {
                onSuccess: () => navigate('/resources/storage/storage-tiers'),
              })
            }
          >
            Delete
          </Button>
          <Button variant="link" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </PageSection>
  )
}
