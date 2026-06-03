/**
 * flow: cluster-service-catalog
 * step: csc_cluster_detail_drawer
 */
import { useState } from 'react'
import {
  Alert,
  Button,
  ClipboardCopy,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  NumberInput,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Cluster, ClusterCatalogItem } from '@osac/api-contracts'
import { ClusterStatusLabel } from './ClusterStatusLabel'
import { UpgradeClusterModal } from './UpgradeClusterModal'
import { useDeleteCluster } from '../../api/useDeleteCluster'
import { downloadKubeconfig } from '../../api/clusterClient'
import { patchCluster } from '../../api/clusterClient'
import { useQueryClient } from '@tanstack/react-query'
import { useAllSubnets, useVirtualNetworks, useSecurityGroups } from '../../api/useNetworking'

interface ClusterDetailDrawerProps {
  cluster: Cluster
  catalogItem: ClusterCatalogItem | undefined
  isOpen: boolean
  onClose: () => void
  mainContent: React.ReactNode
}

function formatDate(ts?: string): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
  } catch {
    return ts
  }
}

export function ClusterDetailDrawer({
  cluster,
  catalogItem,
  isOpen,
  onClose,
  mainContent,
}: ClusterDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [kubeconfigDownloading, setKubeconfigDownloading] = useState(false)
  const [kubeconfigError, setKubeconfigError] = useState<string | null>(null)
  const [scalingKey, setScalingKey] = useState<string | null>(null)
  const [scaleValues, setScaleValues] = useState<Record<string, number>>({})

  const { mutateAsync: deleteCluster, isPending: isDeleting } = useDeleteCluster()
  const qc = useQueryClient()

  const { data: virtualNetworks } = useVirtualNetworks()
  const { data: allSubnets } = useAllSubnets()
  const { data: securityGroups } = useSecurityGroups()

  function resolveVnName(id?: string): string {
    if (!id) return '—'
    return virtualNetworks?.find((v) => v.id === id)?.metadata.name ?? id
  }
  function resolveSubnetName(id?: string): string {
    if (!id) return '—'
    return allSubnets?.find((s) => s.id === id)?.metadata.name ?? id
  }
  function resolveSgName(id: string): string {
    return securityGroups?.find((sg) => sg.id === id)?.metadata.name ?? id
  }

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
      const yaml = await downloadKubeconfig(cluster.id)
      const blob = new Blob([yaml], { type: 'application/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kubeconfig-${cluster.metadata.name}.yaml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setKubeconfigError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setKubeconfigDownloading(false)
    }
  }

  async function handleDelete() {
    await deleteCluster(cluster.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  async function handleScale(nodeSetKey: string, newSize: number) {
    setScalingKey(nodeSetKey)
    try {
      await patchCluster(cluster.id, {
        spec: { nodeSets: { ...cluster.spec.nodeSets, [nodeSetKey]: { size: newSize } } },
      })
      await qc.refetchQueries({ queryKey: ['clusters'] })
    } finally {
      setScalingKey(null)
    }
  }

  const panelContent = (
    <DrawerPanelContent isResizable minSize="480px" defaultSize="600px">
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          {cluster.metadata.name}
        </Title>
        <DrawerActions>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowUpgradeModal(true)}
            isDisabled={!canUpgrade}
            aria-label={canUpgrade ? 'Upgrade cluster' : 'Upgrade not available'}
          >
            Upgrade
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadKubeconfig}
            isDisabled={!canDownloadKubeconfig || kubeconfigDownloading}
            icon={kubeconfigDownloading ? <Spinner size="sm" aria-label="Downloading kubeconfig" /> : undefined}
          >
            {kubeconfigDownloading ? 'Downloading…' : 'Download kubeconfig'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            isDisabled={!canDelete || isDeleting}
          >
            Delete
          </Button>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        {kubeconfigError && (
          <Alert variant="danger" title="Kubeconfig download failed" isInline style={{ marginBottom: '1rem' }}>
            {kubeconfigError}
          </Alert>
        )}
        {showDeleteConfirm && (
          <Alert
            variant="danger"
            title={`Delete cluster "${cluster.metadata.name}"?`}
            isInline
            actionLinks={
              <>
                <Button variant="danger" onClick={handleDelete} isDisabled={isDeleting} size="sm">
                  {isDeleting ? 'Deleting…' : 'Confirm delete'}
                </Button>
                <Button variant="link" onClick={() => setShowDeleteConfirm(false)} size="sm">
                  Cancel
                </Button>
              </>
            }
            style={{ marginBottom: '1rem' }}
          >
            This action cannot be undone.
          </Alert>
        )}

        <Tabs
          activeKey={activeTab}
          onSelect={(_e, k) => setActiveTab(Number(k))}
          aria-label="Cluster detail tabs"
        >
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <DescriptionList style={{ padding: '1rem 0' }}>
              <DescriptionListGroup>
                <DescriptionListTerm>Status</DescriptionListTerm>
                <DescriptionListDescription>
                  <ClusterStatusLabel state={cluster.status.state} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>OCP Version</DescriptionListTerm>
                <DescriptionListDescription>{cluster.status.version ?? '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>API URL</DescriptionListTerm>
                <DescriptionListDescription>
                  <ClipboardCopy isReadOnly isCode aria-label="Copy API URL" isDisabled={!cluster.status.apiUrl}>
                    {cluster.status.apiUrl ?? 'Not available yet'}
                  </ClipboardCopy>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Console URL</DescriptionListTerm>
                <DescriptionListDescription>
                  <ClipboardCopy isReadOnly isCode aria-label="Copy Console URL" isDisabled={!cluster.status.consoleUrl}>
                    {cluster.status.consoleUrl ?? 'Not available yet'}
                  </ClipboardCopy>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Created</DescriptionListTerm>
                <DescriptionListDescription>{formatDate(cluster.metadata.createdAt)}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Catalog item</DescriptionListTerm>
                <DescriptionListDescription>{cluster.spec.catalogItem ?? '—'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.spec.network?.podCidr ?? <em>10.128.0.0/14 (default)</em>}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Service CIDR</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.spec.network?.serviceCidr ?? <em>172.30.0.0/16 (default)</em>}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </Tab>

          <Tab eventKey={1} title={<TabTitleText>Node Sets</TabTitleText>}>
            <Table aria-label="Node sets" style={{ marginTop: '1rem' }}>
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
                            onChange={(e) => setScaleValues((s) => ({ ...s, [key]: Number((e.target as HTMLInputElement).value) }))}
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

          <Tab eventKey={2} title={<TabTitleText>Networking</TabTitleText>}>
            <DescriptionList style={{ padding: '1rem 0' }}>
              <DescriptionListGroup>
                <DescriptionListTerm>Virtual Network</DescriptionListTerm>
                <DescriptionListDescription>{resolveVnName(cluster.spec.network?.virtualNetworkRef)}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Subnet</DescriptionListTerm>
                <DescriptionListDescription>{resolveSubnetName(cluster.spec.network?.subnetRef)}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Security Groups</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.spec.network?.securityGroupRefs?.length
                    ? cluster.spec.network.securityGroupRefs.map((id) => resolveSgName(id)).join(', ')
                    : 'None'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>API Public IP</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.status.network?.apiPublicIp ? (
                    <ClipboardCopy isReadOnly isCode aria-label="Copy API public IP">
                      {cluster.status.network.apiPublicIp}
                    </ClipboardCopy>
                  ) : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Ingress Public IP</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.status.network?.ingressPublicIp ? (
                    <ClipboardCopy isReadOnly isCode aria-label="Copy Ingress public IP">
                      {cluster.status.network.ingressPublicIp}
                    </ClipboardCopy>
                  ) : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>DNS Records</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.status.network?.dnsRecords?.length
                    ? cluster.status.network.dnsRecords.map((r) => <div key={r}>{r}</div>)
                    : 'None configured'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </Tab>

          <Tab eventKey={3} title={<TabTitleText>Storage</TabTitleText>}>
            <DescriptionList style={{ padding: '1rem 0' }}>
              <DescriptionListGroup>
                <DescriptionListTerm>Storage Readiness</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.status.storageReady === true ? (
                    <Label color="green">Ready</Label>
                  ) : cluster.status.storageReady === false ? (
                    <Label color="blue" icon={<Spinner size="sm" aria-label="Storage provisioning" />}>
                      Provisioning
                    </Label>
                  ) : (
                    <Label color="grey">—</Label>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>CSI Driver</DescriptionListTerm>
                <DescriptionListDescription>
                  {cluster.status.storage?.csiDriver ?? '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            <Title headingLevel="h4" size="md" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
              StorageClasses
            </Title>
            {(cluster.status.storage?.storageClasses?.length ?? 0) > 0 ? (
              <Table aria-label="StorageClasses">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Tier</Th>
                    <Th>Default</Th>
                    <Th>Parameters</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(cluster.status.storage?.storageClasses ?? []).map((sc) => (
                    <Tr key={sc.name}>
                      <Td>{sc.name}</Td>
                      <Td>{sc.tier ?? '—'}</Td>
                      <Td>{sc.isDefault ? 'Yes' : 'No'}</Td>
                      <Td>
                        {Object.entries(sc.parameters ?? {})
                          .map(([k, v]) => `${k}=${v}`)
                          .join(', ') || '—'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <p style={{ padding: '0.5rem 0', color: 'var(--pf-v5-global--Color--200)' }}>
                No storage classes available.
              </p>
            )}

            <Title headingLevel="h4" size="md" style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
              VolumeSnapshotClasses
            </Title>
            {(cluster.status.storage?.volumeSnapshotClasses?.length ?? 0) > 0 ? (
              <Table aria-label="VolumeSnapshotClasses">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Driver</Th>
                    <Th>Deletion Policy</Th>
                    <Th>Default</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(cluster.status.storage?.volumeSnapshotClasses ?? []).map((vsc) => (
                    <Tr key={vsc.name}>
                      <Td>{vsc.name}</Td>
                      <Td>{vsc.driver ?? '—'}</Td>
                      <Td>{vsc.deletionPolicy ?? '—'}</Td>
                      <Td>{vsc.isDefault ? 'Yes' : 'No'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <p style={{ padding: '0.5rem 0', color: 'var(--pf-v5-global--Color--200)' }}>
                No snapshot classes available.
              </p>
            )}
          </Tab>

          <Tab eventKey={4} title={<TabTitleText>Conditions</TabTitleText>}>
            {(cluster.status.conditions?.length ?? 0) === 0 ? (
              <p style={{ padding: '1rem 0', color: 'var(--pf-v5-global--Color--200)' }}>
                No conditions reported.
              </p>
            ) : (
              <Table aria-label="Conditions" style={{ marginTop: '1rem' }}>
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
      </DrawerPanelBody>

      {showUpgradeModal && (
        <UpgradeClusterModal
          cluster={cluster}
          catalogItem={catalogItem}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </DrawerPanelContent>
  )

  return (
    <Drawer isExpanded={isOpen} position="right" aria-label={`Cluster details — ${cluster.metadata.name}`}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{mainContent}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}
