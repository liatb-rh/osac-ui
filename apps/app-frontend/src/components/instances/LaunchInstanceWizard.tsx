/**
 * flow: launch-instance
 * step: launch_instance_wizard
 *
 * Type-selector gateway: shows a resource-type picker (vm / cluster / baremetal)
 * then delegates entirely to the dedicated wizard for the chosen type — the same
 * pattern used by baremetal since day one.
 */
import { css } from '@emotion/css'
import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import type { ComputeInstance } from '@osac/api-contracts'
import { BM_IMAGES } from '@osac/api-contracts'
import { RequestBareMetalWizard } from '@osac/ui-components'
import type { BareMetalWizardCatalogItem, BareMetalWizardCreatePayload } from '@osac/ui-components'
import { catalogItemsStore } from '../../pages/services/catalog/catalogItemsStore'
import { useCreateBareMetalInstance } from '../../hooks/useBareMetalInstances'
import { CreateVmWizard } from '../vm/createVmWizard/CreateVmWizard'
import type { CreateVmWizardHandle, DeploymentMode } from '../vm/createVmWizard/CreateVmWizard'
import { CreateClusterModal } from '../clusters/CreateClusterModal'
import { useComputeInstances } from '../../hooks/hooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResourceType = 'vm' | 'cluster' | 'baremetal'

interface WizardState {
  resourceType: ResourceType
  confirmed: boolean
}

const INITIAL: WizardState = { resourceType: 'vm', confirmed: false }

interface LaunchInstanceWizardProps {
  isOpen: boolean
  onClose: () => void
  onProvisioned?: (vm: ComputeInstance) => void
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const stepHeaderCss = css`
  margin-bottom: var(--pf-t--global--spacer--lg);
`

const resourceTypeCardCss = (selected: boolean) => css`
  padding: 16px 20px;
  border-radius: 8px;
  border: 2px solid
    ${selected
      ? 'var(--pf-t--global--border--color--brand--default)'
      : 'var(--pf-t--global--border--color--default)'};
  background: ${selected
    ? 'var(--pf-t--global--background--color--info--default)'
    : 'var(--pf-t--global--background--color--primary--default)'};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  max-width: 280px;
  &:hover {
    border-color: var(--pf-t--global--border--color--brand--hover);
  }
`

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className={stepHeaderCss}>
      <Title headingLevel="h2" size="xl">
        {title}
      </Title>
      <p style={{ marginTop: 4, color: 'var(--pf-t--global--text--color--subtle)', fontSize: '0.9rem' }}>
        {description}
      </p>
    </div>
  )
}

function ResourceTypeStep({
  resourceType,
  onSelect,
}: {
  resourceType: ResourceType
  onSelect: (t: ResourceType) => void
}) {
  const types: { value: ResourceType; label: string; description: string }[] = [
    {
      value: 'vm',
      label: 'Virtual Machine',
      description: 'Provision an individual compute instance with custom OS, CPU, memory and storage.',
    },
    {
      value: 'cluster',
      label: 'OpenShift Cluster',
      description: 'Deploy a managed OpenShift cluster with configurable node sets and networking.',
    },
    {
      value: 'baremetal',
      label: 'Bare Metal',
      description: 'Provision a dedicated physical server from the available bare metal catalog.',
    },
  ]

  return (
    <Stack hasGutter>
      <StackItem>
        <StepHeader
          title="Choose resource type"
          description="Select what you want to provision."
        />
      </StackItem>
      <StackItem>
        <div style={{ display: 'flex', gap: 16 }}>
          {types.map((t) => (
            <div
              key={t.value}
              className={resourceTypeCardCss(resourceType === t.value)}
              onClick={() => onSelect(t.value)}
            >
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.label}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--pf-t--global--text--color--subtle)' }}>
                {t.description}
              </div>
            </div>
          ))}
        </div>
      </StackItem>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export function LaunchInstanceWizard({
  isOpen,
  onClose,
  onProvisioned,
}: LaunchInstanceWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL)
  const createBm = useCreateBareMetalInstance()
  const { data: existingVms = [] } = useComputeInstances()
  const vmRef = useRef<CreateVmWizardHandle>(null)

  const isVm = state.confirmed && state.resourceType === 'vm'
  const isCluster = state.confirmed && state.resourceType === 'cluster'
  const isBm = state.confirmed && state.resourceType === 'baremetal'

  const bmCatalogItems: BareMetalWizardCatalogItem[] = catalogItemsStore
    .getPublished()
    .filter((i) => i.type === 'baremetal')
    .map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      published: i.published,
      fieldDefinitions: i.fieldDefinitions,
    }))

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function handleClose() {
    if (createBm.isPending) return
    onClose()
    setState(INITIAL)
  }

  function handleConfirm() {
    setState((prev) => ({ ...prev, confirmed: true }))
  }

  function handleBmSubmit(payload: BareMetalWizardCreatePayload) {
    createBm.mutate(payload, {
      onSuccess: () => {
        onClose()
        setState(INITIAL)
      },
    })
  }

  function handleVmProvision(vm: ComputeInstance, _meta: { mode: DeploymentMode }) {
    onProvisioned?.(vm)
    setState(INITIAL)
  }

  // Auto-open CreateVmWizard when VM type is confirmed
  useEffect(() => {
    if (isVm && isOpen) {
      vmRef.current?.open()
    }
  }, [isVm, isOpen])

  // --- Delegation ---

  if (isBm) {
    return (
      <RequestBareMetalWizard
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleBmSubmit}
        isSubmitting={createBm.isPending}
        catalogItems={bmCatalogItems}
        availableImages={BM_IMAGES.map((img) => ({ id: img.id, name: img.name }))}
      />
    )
  }

  if (isCluster) {
    return <CreateClusterModal onClose={handleClose} />
  }

  if (isVm) {
    return (
      <CreateVmWizard
        ref={vmRef}
        existingVms={existingVms}
        tenant="northstar"
        onProvision={handleVmProvision}
        onClose={handleClose}
      />
    )
  }

  // --- Type selector ---

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="medium"
      aria-label="Launch instance wizard"
    >
      <ModalHeader
        title="Launch an instance"
        description="Choose the type of resource you want to provision."
      />
      <ModalBody>
        <ResourceTypeStep
          resourceType={state.resourceType}
          onSelect={(t) => update('resourceType', t)}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleConfirm}>
          Continue
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
