/**
 * flow: cluster-service-catalog
 * step: csc_upgrade_cluster_modal
 */
import { useState } from 'react'
import {
  Alert,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from '@patternfly/react-core'
import type { Cluster, ClusterCatalogItem } from '@osac/api-contracts'
import { useUpgradeCluster } from '../../api/useUpgradeCluster'

interface UpgradeClusterModalProps {
  cluster: Cluster
  catalogItem: ClusterCatalogItem | undefined
  onClose: () => void
}

function semverGt(a: string, b: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [a1, a2 = 0, a3 = 0] = parse(a)
  const [b1, b2 = 0, b3 = 0] = parse(b)
  if (a1 !== b1) return a1 > b1
  if (a2 !== b2) return a2 > b2
  return a3 > b3
}

export function UpgradeClusterModal({ cluster, catalogItem, onClose }: UpgradeClusterModalProps) {
  const currentVersion = cluster.status.version ?? ''
  const allowedVersions = (catalogItem?.allowedVersions ?? []).filter((v) =>
    semverGt(v, currentVersion),
  )

  const [targetVersion, setTargetVersion] = useState<string>(allowedVersions[0] ?? '')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { mutateAsync: upgrade, isPending } = useUpgradeCluster()

  async function handleSubmit() {
    if (!targetVersion) return
    setSubmitError(null)
    try {
      await upgrade({ id: cluster.id, targetVersion })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const title = `Upgrade ${cluster.metadata.name}`

  return (
    <Modal isOpen onClose={onClose} variant="small" aria-labelledby="upgrade-modal-title">
      <ModalHeader title={title} labelId="upgrade-modal-title" />
      <ModalBody>
        {submitError && (
          <Alert
            variant="danger"
            title="Failed to start upgrade"
            isInline
            style={{ marginBottom: '1rem' }}
          >
            {submitError}. Please try again.
          </Alert>
        )}
        <Alert
          variant="warning"
          title="Cluster upgrade may cause brief API downtime"
          isInline
          style={{ marginBottom: '1rem' }}
        >
          Ensure your workloads can tolerate a restart before proceeding.
        </Alert>
        <DescriptionList style={{ marginBottom: '1rem' }}>
          <DescriptionListGroup>
            <DescriptionListTerm>Current version</DescriptionListTerm>
            <DescriptionListDescription>{currentVersion || '—'}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
        {allowedVersions.length === 0 ? (
          <Alert variant="info" title="No upgrade versions available" isInline>
            No newer versions are available for this catalog item.
          </Alert>
        ) : (
          <Form>
            <FormGroup label="Target version" isRequired fieldId="upgrade-target-version">
              <FormSelect
                id="upgrade-target-version"
                value={targetVersion}
                onChange={(_e, v) => setTargetVersion(v)}
                aria-label="Select target OCP version"
                isDisabled={isPending}
              >
                <FormSelectOption value="" label="Select target version" isDisabled />
                {allowedVersions.map((v) => (
                  <FormSelectOption key={v} value={v} label={v} />
                ))}
              </FormSelect>
            </FormGroup>
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={isPending || !targetVersion || allowedVersions.length === 0}
          icon={isPending ? <Spinner size="sm" aria-label="Starting upgrade" /> : undefined}
        >
          {isPending ? 'Starting upgrade…' : 'Upgrade'}
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isPending}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
