/**
 * flow: tenant-administration
 * step: tad_public_ips
 */
import { useState } from 'react'
import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { PublicIP } from '@osac/api-contracts'
import { useComputeInstances } from '../../api/hooks'
import {
  useAllocatePublicIP,
  useAttachPublicIP,
  useDeletePublicIP,
  useDetachPublicIP,
  usePublicIPPools,
  usePublicIPs,
} from '../../api/useNetworking'
import { PageHeader } from '../../components/layout'

// ---------------------------------------------------------------------------
// State label
// ---------------------------------------------------------------------------

function PipStateLabel({ state }: { state: string }) {
  if (state === 'PUBLIC_IP_STATE_ATTACHED') return <Label color="green" isCompact>Attached</Label>
  if (state === 'PUBLIC_IP_STATE_ALLOCATED') return <Label color="blue" isCompact>Allocated</Label>
  if (state === 'PUBLIC_IP_STATE_ATTACHING') return <Label color="orange" isCompact icon={<Spinner size="sm" aria-label="attaching" />}>Attaching</Label>
  if (state === 'PUBLIC_IP_STATE_RELEASING') return <Label color="orange" isCompact icon={<Spinner size="sm" aria-label="releasing" />}>Releasing</Label>
  if (state === 'PUBLIC_IP_STATE_PENDING') return <Label color="grey" isCompact icon={<Spinner size="sm" aria-label="pending" />}>Pending</Label>
  if (state === 'PUBLIC_IP_STATE_FAILED') return <Label color="red" isCompact>Failed</Label>
  return <Label color="grey" isCompact>Unknown</Label>
}

function isTransitioning(state: string) {
  return state === 'PUBLIC_IP_STATE_ATTACHING' || state === 'PUBLIC_IP_STATE_RELEASING' || state === 'PUBLIC_IP_STATE_PENDING'
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AdminPublicIPsPage() {
  const { data: ips, isLoading, error, refetch } = usePublicIPs()
  const { data: pools } = usePublicIPPools()
  const { data: vms } = useComputeInstances()
  const { mutateAsync: allocate, isPending: allocating } = useAllocatePublicIP()
  const { mutateAsync: attach, isPending: attaching } = useAttachPublicIP()
  const { mutateAsync: detach } = useDetachPublicIP()
  const { mutateAsync: deletePip } = useDeletePublicIP()

  const [allocateModal, setAllocateModal] = useState(false)
  const [attachModal, setAttachModal] = useState<PublicIP | null>(null)
  const [confirmDeletePip, setConfirmDeletePip] = useState<PublicIP | null>(null)
  const [allocateForm, setAllocateForm] = useState({ name: '', poolId: '' })
  const [attachVmId, setAttachVmId] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  function vmName(id: string) {
    return (vms ?? []).find((v) => v.id === id)?.metadata.name ?? id
  }

  async function handleAllocate() {
    setSubmitError(null)
    try {
      await allocate({ name: allocateForm.name, poolId: allocateForm.poolId })
      setAllocateModal(false)
      setAllocateForm({ name: '', poolId: '' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function handleAttach() {
    if (!attachModal || !attachVmId) return
    setSubmitError(null)
    try {
      await attach({ id: attachModal.id, computeInstanceId: attachVmId })
      setAttachModal(null)
      setAttachVmId('')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  function rowActions(pip: PublicIP) {
    const actions = []
    if (pip.status.state === 'PUBLIC_IP_STATE_ALLOCATED') {
      actions.push({ title: 'Attach to VM', onClick: () => { setAttachModal(pip); setAttachVmId('') } })
    }
    if (pip.status.state === 'PUBLIC_IP_STATE_ATTACHED') {
      actions.push({ title: 'Detach', onClick: async () => { await detach(pip.id) } })
    }
    actions.push({
      title: 'Delete',
      isDisabled: isTransitioning(pip.status.state),
      onClick: () => setConfirmDeletePip(pip),
    })
    return actions
  }

  return (
    <PageSection isFilled>
      <PageHeader
        title="Public IPs"
        description="Allocate and manage public IP addresses for your workloads."
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button variant="primary" onClick={() => setAllocateModal(true)}>Allocate IP</Button>
      </div>

      {isLoading && <Spinner aria-label="Loading public IPs" />}
      {error && <Alert variant="danger" title="Failed to load public IPs" isInline><Button variant="link" isInline onClick={() => refetch()}>Retry</Button></Alert>}
      {!isLoading && !error && (ips ?? []).length === 0 && (
        <EmptyState>
          <EmptyStateBody>No public IPs allocated. Click Allocate IP to get started.</EmptyStateBody>
        </EmptyState>
      )}
      {!isLoading && !error && (ips ?? []).length > 0 && (
        <Table aria-label="Public IPs">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Address</Th>
              <Th>Pool</Th>
              <Th>State</Th>
              <Th>Attached To</Th>
              <Th aria-label="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {(ips ?? []).map((pip) => (
              <Tr key={pip.id}>
                <Td dataLabel="Name">{pip.metadata.name}</Td>
                <Td dataLabel="Address">{pip.status.address ?? '—'}</Td>
                <Td dataLabel="Pool">{pip.spec.pool}</Td>
                <Td dataLabel="State"><PipStateLabel state={pip.status.state} /></Td>
                <Td dataLabel="Attached To">
                  {pip.spec.computeInstance ? vmName(pip.spec.computeInstance) : '—'}
                </Td>
                <Td isActionCell>
                  <ActionsColumn items={rowActions(pip)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Allocate modal */}
      <Modal isOpen={allocateModal} onClose={() => setAllocateModal(false)} variant="small" aria-labelledby="allocate-pip-modal-title">
        <ModalHeader title="Allocate public IP" labelId="allocate-pip-modal-title" />
        <ModalBody>
          {submitError && <Alert variant="danger" title="Allocate failed" isInline style={{ marginBottom: '1rem' }}>{submitError}</Alert>}
          <Form>
            <FormGroup label="Name" isRequired fieldId="pip-name">
              <TextInput id="pip-name" value={allocateForm.name} onChange={(_e, v) => setAllocateForm((f) => ({ ...f, name: v }))} isRequired />
            </FormGroup>
            <FormGroup label="Pool" isRequired fieldId="pip-pool">
              <FormSelect id="pip-pool" value={allocateForm.poolId} onChange={(_e, v) => setAllocateForm((f) => ({ ...f, poolId: v }))}>
                <FormSelectOption value="" label="Select a pool" isDisabled />
                {(pools ?? []).map((p) => (
                  <FormSelectOption key={p.id} value={p.id} label={`${p.metadata.name} (${p.spec.cidr ?? 'unknown CIDR'})`} />
                ))}
              </FormSelect>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleAllocate}
            isDisabled={allocating || !allocateForm.name || !allocateForm.poolId}
            icon={allocating ? <Spinner size="sm" aria-label="Allocating" /> : undefined}
          >
            {allocating ? 'Allocating…' : 'Allocate'}
          </Button>
          <Button variant="link" onClick={() => setAllocateModal(false)} isDisabled={allocating}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Attach modal */}
      {attachModal && (
        <Modal isOpen onClose={() => setAttachModal(null)} variant="small" aria-labelledby="attach-pip-modal-title">
          <ModalHeader title={`Attach ${attachModal.metadata.name} to VM`} labelId="attach-pip-modal-title" />
          <ModalBody>
            {submitError && <Alert variant="danger" title="Attach failed" isInline style={{ marginBottom: '1rem' }}>{submitError}</Alert>}
            <Form>
              <FormGroup label="Compute Instance" isRequired fieldId="pip-attach-vm">
                <FormSelect id="pip-attach-vm" value={attachVmId} onChange={(_e, v) => setAttachVmId(v)}>
                  <FormSelectOption value="" label="Select a VM" isDisabled />
                  {(vms ?? []).map((vm) => (
                    <FormSelectOption key={vm.id} value={vm.id} label={vm.metadata.name} />
                  ))}
                </FormSelect>
              </FormGroup>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={handleAttach}
              isDisabled={attaching || !attachVmId}
              icon={attaching ? <Spinner size="sm" aria-label="Attaching" /> : undefined}
            >
              {attaching ? 'Attaching…' : 'Attach'}
            </Button>
            <Button variant="link" onClick={() => setAttachModal(null)} isDisabled={attaching}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDeletePip && (
        <Modal isOpen onClose={() => setConfirmDeletePip(null)} variant="small" aria-labelledby="del-pip-modal-title">
          <ModalHeader title="Release public IP?" labelId="del-pip-modal-title" />
          <ModalBody>
            Release <strong>{confirmDeletePip.status.address ?? confirmDeletePip.metadata.name}</strong>? The address will be returned to the pool.
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={async () => { await deletePip(confirmDeletePip.id); setConfirmDeletePip(null) }}>Release</Button>
            <Button variant="link" onClick={() => setConfirmDeletePip(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </PageSection>
  )
}
