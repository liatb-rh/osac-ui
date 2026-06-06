/**
 * flow: cluster-service-catalog
 * step: csc_cluster_detail_drawer
 * route: /clusters/:id
 *
 * Full-page detail view for a single cluster — replaces the side-panel drawer.
 */
import { css } from '@emotion/css'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageBreadcrumb,
  PageSection,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core'
import { ArrowCircleUpIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-circle-up-icon'
import { DownloadIcon } from '@patternfly/react-icons/dist/esm/icons/download-icon'
import { TrashIcon } from '@patternfly/react-icons/dist/esm/icons/trash-icon'
import { OcKpiHeader } from '@osac/ui-components'
import { useCluster } from '../../../hooks/useCluster'
import { useClusterCatalogItems } from '../../../hooks/useClusterCatalogItems'
import { downloadKubeconfig } from '../../../api/clusterClient'
import { useDeleteCluster } from '../../../hooks/useDeleteCluster'
import { useVirtualNetworks } from '../../../hooks/useNetworking'
import { ClusterStatusLabel } from '../../../components/clusters/ClusterStatusLabel'
import { UpgradeClusterModal } from '../../../components/clusters/UpgradeClusterModal'
import { PageHeader } from '../../../components/layout'
import {
  ClusterNetworkingTab,
  ClusterOverviewTab,
  ClusterStorageTab,
} from '../../../components/clusters/tabs'

const kubeconfigErrorAlertCss = css`
  margin-top: 1rem;
`

const kpiTopMarginCss = css`
  margin-top: var(--pf-t--global--spacer--lg);
`

export function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: cluster, isLoading, error } = useCluster(id ?? null)
  const { data: catalogItems } = useClusterCatalogItems()
  const { mutateAsync: deleteCluster, isPending: isDeleting } = useDeleteCluster()
  const { data: virtualNetworks } = useVirtualNetworks()

  const [activeTab, setActiveTab] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [kubeconfigDownloading, setKubeconfigDownloading] = useState(false)
  const [kubeconfigError, setKubeconfigError] = useState<string | null>(null)

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

  const totalWorkers = Object.values(cluster.spec.nodeSets ?? {}).reduce(
    (sum, ns) => sum + ns.size,
    0,
  )

  function resolveVnName(vnId?: string): string {
    if (!vnId) return '—'
    return virtualNetworks?.find((v) => v.id === vnId)?.metadata.name ?? vnId
  }

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
        <PageHeader
          title={cluster.metadata.name}
          description={[
            cluster.status.version ? `OpenShift ${cluster.status.version}` : null,
            totalWorkers ? `${totalWorkers} workers` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          actions={
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button
                  variant="secondary"
                  icon={
                    kubeconfigDownloading ? (
                      <Spinner size="sm" aria-label="Downloading" />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={handleDownloadKubeconfig}
                  isDisabled={!canDownloadKubeconfig || kubeconfigDownloading}
                >
                  {kubeconfigDownloading ? 'Downloading…' : 'kubeconfig'}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="secondary"
                  icon={<ArrowCircleUpIcon />}
                  onClick={() => setShowUpgradeModal(true)}
                  isDisabled={!canUpgrade}
                >
                  Upgrade
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  variant="danger"
                  icon={<TrashIcon />}
                  onClick={() => setShowDeleteConfirm(true)}
                  isDisabled={!canDelete || isDeleting}
                >
                  Delete
                </Button>
              </FlexItem>
            </Flex>
          }
        />

        {kubeconfigError && (
          <Alert
            variant="danger"
            title="Kubeconfig download failed"
            isInline
            className={kubeconfigErrorAlertCss}
          >
            {kubeconfigError}
          </Alert>
        )}

        {/* KPI row */}
        <OcKpiHeader
          className={kpiTopMarginCss}
          items={[
            {
              label: 'Cluster state',
              value: <ClusterStatusLabel state={cluster.status.state} />,
              tone:
                cluster.status.state === 'CLUSTER_STATE_READY'
                  ? 'success'
                  : cluster.status.state === 'CLUSTER_STATE_FAILED' ||
                      cluster.status.state === 'CLUSTER_STATE_UPGRADE_FAILED'
                    ? 'danger'
                    : cluster.status.state === 'CLUSTER_STATE_PROGRESSING' ||
                        cluster.status.state === 'CLUSTER_STATE_UPGRADING'
                      ? 'warning'
                      : 'muted',
            },
            { label: 'OCP version', value: cluster.status.version ?? '—', hint: 'control plane' },
            { label: 'Workers', value: String(totalWorkers || '—'), hint: 'worker nodes' },
            {
              label: 'Virtual network',
              value: resolveVnName(cluster.spec.network?.virtualNetworkRef),
            },
            {
              label: 'Storage',
              value:
                cluster.status.storageReady === true
                  ? 'Ready'
                  : cluster.status.storageReady === false
                    ? 'Provisioning'
                    : '—',
              hint: 'VAST CSI',
              tone:
                cluster.status.storageReady === true
                  ? 'success'
                  : cluster.status.storageReady === false
                    ? 'warning'
                    : 'muted',
            },
          ]}
        />
      </PageSection>

      <PageSection isFilled>
        <Tabs
          activeKey={activeTab}
          onSelect={(_e, k) => setActiveTab(Number(k))}
          aria-label="Cluster detail tabs"
        >
          <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>}>
            <ClusterOverviewTab cluster={cluster} catalogItem={catalogItem} />
          </Tab>
          {/* <Tab eventKey={1} title={<TabTitleText>Node Sets</TabTitleText>}>
            <ClusterNodeSetsTab cluster={cluster} />
          </Tab> */}
          <Tab eventKey={2} title={<TabTitleText>Networking</TabTitleText>}>
            <ClusterNetworkingTab cluster={cluster} />
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>Storage</TabTitleText>}>
            <ClusterStorageTab cluster={cluster} />
          </Tab>
          {/* <Tab eventKey={4} title={<TabTitleText>Conditions</TabTitleText>}>
            <ClusterConditionsTab cluster={cluster} />
          </Tab> */}
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
          <Button
            variant="link"
            onClick={() => setShowDeleteConfirm(false)}
            isDisabled={isDeleting}
          >
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
