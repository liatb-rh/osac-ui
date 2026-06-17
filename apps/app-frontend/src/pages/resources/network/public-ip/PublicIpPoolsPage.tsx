/**
 * flow: tenant-administration
 * step: tad_public_ip_pools
 * route: /resources/network/catalog/public-ips
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Flex,
  FlexItem,
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
  Title,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import type { PublicIP, PublicIPPool, PublicIPPoolExtended } from '@osac/api-contracts'
import { ObjectsTable, PageHeader } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { useComputeInstances } from '../../../../hooks/hooks'
import {
  useAllocatePublicIP,
  useAttachPublicIP,
  useDeletePublicIP,
  useDetachPublicIP,
  usePublicIPPools,
  usePublicIPs,
} from '../../../../hooks/useNetworking'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PoolStateLabel({ state }: { state?: string }) {
  if (state === 'READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'PENDING')
    return (
      <Label color="orange" isCompact>
        Pending
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      {state ?? 'Unknown'}
    </Label>
  )
}

function PublicIpStateLabel({ state }: { state?: string }) {
  if (state === 'PUBLIC_IP_STATE_ATTACHED')
    return (
      <Label color="green" isCompact>
        Attached
      </Label>
    )
  if (state === 'PUBLIC_IP_STATE_ALLOCATED')
    return (
      <Label color="blue" isCompact>
        Allocated
      </Label>
    )
  if (
    state === 'PUBLIC_IP_STATE_PENDING' ||
    state === 'PUBLIC_IP_STATE_ATTACHING' ||
    state === 'PUBLIC_IP_STATE_RELEASING'
  )
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="transitioning" />}>
        Pending
      </Label>
    )
  if (state === 'PUBLIC_IP_STATE_FAILED')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      {state ?? 'Unknown'}
    </Label>
  )
}

// ---------------------------------------------------------------------------
// My Public IPs section
// ---------------------------------------------------------------------------

interface MyPublicIpsSectionProps {
  pools: PublicIPPool[]
}

function MyPublicIpsSection({ pools }: MyPublicIpsSectionProps) {
  const { data: publicIPs = [], isLoading, error, refetch } = usePublicIPs()
  const { data: vms = [] } = useComputeInstances()
  const { mutateAsync: allocate, isPending: allocating } = useAllocatePublicIP()
  const { mutateAsync: attach, isPending: attaching } = useAttachPublicIP()
  const { mutateAsync: detach } = useDetachPublicIP()
  const { mutateAsync: release } = useDeletePublicIP()

  const [allocateOpen, setAllocateOpen] = useState(false)
  const [allocateName, setAllocateName] = useState('')
  const [allocatePoolId, setAllocatePoolId] = useState('')
  const [allocateError, setAllocateError] = useState<string | null>(null)

  const [attachOpen, setAttachOpen] = useState(false)
  const [attachIp, setAttachIp] = useState<PublicIP | null>(null)
  const [attachVmId, setAttachVmId] = useState('')
  const [attachError, setAttachError] = useState<string | null>(null)

  const [confirmRelease, setConfirmRelease] = useState<PublicIP | null>(null)

  function poolName(id: string) {
    return pools.find((p) => p.id === id)?.metadata.name ?? id
  }
  function vmName(id?: string) {
    if (!id) return '—'
    return vms.find((v) => v.id === id)?.metadata.name ?? id
  }

  async function handleAllocate() {
    setAllocateError(null)
    try {
      await allocate({ name: allocateName, poolId: allocatePoolId })
      setAllocateOpen(false)
      setAllocateName('')
      setAllocatePoolId('')
    } catch (e) {
      setAllocateError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function handleAttach() {
    if (!attachIp || !attachVmId) return
    setAttachError(null)
    try {
      await attach({ id: attachIp.id, computeInstanceId: attachVmId })
      setAttachOpen(false)
      setAttachIp(null)
      setAttachVmId('')
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const columns: ObjectsTableColumn<PublicIP>[] = [
    { label: 'Name', render: (ip) => <strong>{ip.metadata.name}</strong> },
    {
      label: 'Address',
      render: (ip) => (ip.status.address ? <code>{ip.status.address}</code> : <em>Pending…</em>),
    },
    { label: 'Pool', render: (ip) => poolName(ip.spec.pool) },
    { label: 'State', render: (ip) => <PublicIpStateLabel state={ip.status.state} /> },
    { label: 'Attached to', render: (ip) => vmName(ip.spec.computeInstance) },
    {
      isActionCell: true,
      render: (ip) => (
        <ActionsColumn
          items={[
            {
              title: 'Attach to VM',
              isDisabled: ip.status.state !== 'PUBLIC_IP_STATE_ALLOCATED',
              onClick: () => {
                setAttachIp(ip)
                setAttachVmId('')
                setAttachError(null)
                setAttachOpen(true)
              },
            },
            {
              title: 'Detach',
              isDisabled: ip.status.state !== 'PUBLIC_IP_STATE_ATTACHED',
              onClick: () => detach(ip.id),
            },
            {
              title: 'Release',
              isDisabled: ip.status.state === 'PUBLIC_IP_STATE_ATTACHED',
              onClick: () => setConfirmRelease(ip),
            },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        style={{ marginBottom: '0.75rem' }}
      >
        <FlexItem>
          <Title headingLevel="h2" size="md">
            My public IPs
          </Title>
        </FlexItem>
        <FlexItem>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAllocateName('')
              setAllocatePoolId(pools[0]?.id ?? '')
              setAllocateError(null)
              setAllocateOpen(true)
            }}
          >
            Allocate IP
          </Button>
        </FlexItem>
      </Flex>

      {isLoading && <Spinner aria-label="Loading public IPs" size="md" />}
      {error && (
        <Alert variant="danger" title="Failed to load public IPs" isInline>
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {!isLoading && !error && (
        <ObjectsTable
          ariaLabel="My public IPs"
          rows={publicIPs}
          getRowKey={(ip) => ip.id}
          columns={columns}
        />
      )}

      {/* Allocate modal */}
      <Modal
        isOpen={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        variant="small"
        aria-labelledby="allocate-ip-modal-title"
      >
        <ModalHeader title="Allocate public IP" labelId="allocate-ip-modal-title" />
        <ModalBody>
          {allocateError && (
            <Alert
              variant="danger"
              title="Allocation failed"
              isInline
              style={{ marginBottom: '1rem' }}
            >
              {allocateError}
            </Alert>
          )}
          <Form>
            <FormGroup label="Name" fieldId="alloc-name" isRequired>
              <input
                id="alloc-name"
                className="pf-v6-c-form-control"
                value={allocateName}
                onChange={(e) => setAllocateName(e.target.value)}
                placeholder="e.g. my-web-ip"
              />
            </FormGroup>
            <FormGroup label="Pool" fieldId="alloc-pool" isRequired>
              <FormSelect
                id="alloc-pool"
                value={allocatePoolId}
                onChange={(_e, v) => setAllocatePoolId(v)}
                aria-label="Select pool"
              >
                {pools.map((p) => (
                  <FormSelectOption key={p.id} value={p.id} label={p.metadata.name} />
                ))}
              </FormSelect>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleAllocate}
            isDisabled={allocating || !allocateName.trim() || !allocatePoolId}
            icon={allocating ? <Spinner size="sm" aria-label="Allocating" /> : undefined}
          >
            {allocating ? 'Allocating…' : 'Allocate'}
          </Button>
          <Button variant="link" onClick={() => setAllocateOpen(false)} isDisabled={allocating}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Attach modal */}
      <Modal
        isOpen={attachOpen}
        onClose={() => setAttachOpen(false)}
        variant="small"
        aria-labelledby="attach-ip-modal-title"
      >
        <ModalHeader
          title={`Attach ${attachIp?.metadata.name ?? ''} to VM`}
          labelId="attach-ip-modal-title"
        />
        <ModalBody>
          {attachError && (
            <Alert variant="danger" title="Attach failed" isInline style={{ marginBottom: '1rem' }}>
              {attachError}
            </Alert>
          )}
          <Form>
            <FormGroup label="Virtual Machine" fieldId="attach-vm" isRequired>
              <FormSelect
                id="attach-vm"
                value={attachVmId}
                onChange={(_e, v) => setAttachVmId(v)}
                aria-label="Select virtual machine"
              >
                <FormSelectOption value="" label="Select a virtual machine" />
                {vms.map((vm) => (
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
          <Button variant="link" onClick={() => setAttachOpen(false)} isDisabled={attaching}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Release confirm */}
      {confirmRelease && (
        <Modal
          isOpen
          onClose={() => setConfirmRelease(null)}
          variant="small"
          aria-labelledby="release-ip-modal-title"
        >
          <ModalHeader title="Release public IP?" labelId="release-ip-modal-title" />
          <ModalBody>
            Release <strong>{confirmRelease.metadata.name}</strong> (
            {confirmRelease.status.address ?? 'no address yet'})? This returns it to the pool.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={async () => {
                await release(confirmRelease.id)
                setConfirmRelease(null)
              }}
            >
              Release
            </Button>
            <Button variant="link" onClick={() => setConfirmRelease(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PublicIpPoolsPage() {
  const navigate = useNavigate()
  const { data: pools = [] } = usePublicIPPools()
  const { data: publicIPs = [] } = usePublicIPs()

  const extPools = pools as PublicIPPoolExtended[]

  const columns: ObjectsTableColumn<PublicIPPoolExtended>[] = [
    { label: 'Name', render: (p) => <strong>{p.metadata.name}</strong> },
    { label: 'CIDR', render: (p) => <code>{p.spec.cidr ?? '—'}</code> },
    { label: 'Zone', render: (p) => p.zone ?? '—' },
    { label: 'Status', render: (p) => <PoolStateLabel state={p.status.state} /> },
    {
      label: 'User groups',
      render: (p) => String((p.groupAssignments ?? []).length),
    },
    {
      label: 'My allocations',
      render: (p) => String(publicIPs.filter((ip) => ip.spec.pool === p.id).length),
    },
  ]

  return (
    <PageSection isFilled>
      <PageHeader
        title="Public IPs"
        description="View available public IP pools and manage your allocated IP addresses."
      />

      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <Title headingLevel="h2" size="md" style={{ marginBottom: '0.75rem' }}>
          Public IP pools
        </Title>
        <ObjectsTable
          ariaLabel="Public IP pools"
          rows={extPools}
          getRowKey={(p) => p.id}
          columns={columns}
          onRowClick={(p) => navigate(`/resources/network/catalog/public-ips/${p.id}`)}
        />
      </div>

      <MyPublicIpsSection pools={pools} />
    </PageSection>
  )
}
