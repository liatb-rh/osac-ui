/**
 * flow: tenant-administration
 * step: tad_networks_management
 */
import { useCallback, useState } from 'react'
import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { SecurityGroup, Subnet, VirtualNetwork } from '@osac/api-contracts'
import { NetworkTopologyPage } from '@osac/ui-components'
import { useComputeInstances } from '../../api/hooks'
import {
  useAllSubnets,
  useCreateSecurityGroup,
  useCreateSubnet,
  useCreateVirtualNetwork,
  useDeleteSecurityGroup,
  useDeleteSubnet,
  useDeleteVirtualNetwork,
  useNetworkClasses,
  useSecurityGroups,
  useSubnets,
  useVirtualNetworks,
} from '../../api/useNetworking'
import { PageHeader } from '../../components/layout'

type ActiveTab = 0 | 1 | 2 | 3

interface Props {
  onOpenVmDetail?: (vmId: string) => void
}

// ---------------------------------------------------------------------------
// VN state label
// ---------------------------------------------------------------------------

function VnStateLabel({ state }: { state: string }) {
  if (state === 'VIRTUAL_NETWORK_STATE_READY') return <Label color="green" isCompact>Ready</Label>
  if (state === 'VIRTUAL_NETWORK_STATE_PENDING') return <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>Pending</Label>
  if (state === 'VIRTUAL_NETWORK_STATE_FAILED') return <Label color="red" isCompact>Failed</Label>
  return <Label color="grey" isCompact>Unknown</Label>
}

function SubnetStateLabel({ state }: { state: string }) {
  if (state === 'SUBNET_STATE_READY') return <Label color="green" isCompact>Ready</Label>
  if (state === 'SUBNET_STATE_PENDING') return <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>Pending</Label>
  if (state === 'SUBNET_STATE_FAILED') return <Label color="red" isCompact>Failed</Label>
  if (state === 'SUBNET_STATE_DELETING') return <Label color="orange" isCompact>Deleting</Label>
  return <Label color="grey" isCompact>Unknown</Label>
}

function SgStateLabel({ state }: { state: string }) {
  if (state === 'SECURITY_GROUP_STATE_READY') return <Label color="green" isCompact>Ready</Label>
  if (state === 'SECURITY_GROUP_STATE_PENDING') return <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>Pending</Label>
  if (state === 'SECURITY_GROUP_STATE_FAILED') return <Label color="red" isCompact>Failed</Label>
  return <Label color="grey" isCompact>Unknown</Label>
}

// ---------------------------------------------------------------------------
// Virtual Networks tab
// ---------------------------------------------------------------------------

function VirtualNetworksTab() {
  const { data: vns, isLoading, error, refetch } = useVirtualNetworks()
  const { data: networkClasses } = useNetworkClasses()
  const { mutateAsync: createVN, isPending: creating } = useCreateVirtualNetwork()
  const { mutateAsync: deleteVN } = useDeleteVirtualNetwork()

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', ipv4Cidr: '', ipv6Cidr: '', networkClass: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<VirtualNetwork | null>(null)

  async function handleCreate() {
    setSubmitError(null)
    try {
      await createVN({ name: form.name, ipv4Cidr: form.ipv4Cidr || undefined, ipv6Cidr: form.ipv6Cidr || undefined, networkClass: form.networkClass || undefined })
      setModalOpen(false)
      setForm({ name: '', ipv4Cidr: '', ipv6Cidr: '', networkClass: '' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function handleDelete(vn: VirtualNetwork) {
    await deleteVN(vn.id)
    setConfirmDelete(null)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button variant="primary" onClick={() => setModalOpen(true)}>Create virtual network</Button>
      </div>

      {isLoading && <Spinner aria-label="Loading virtual networks" />}
      {error && <Alert variant="danger" title="Failed to load virtual networks" isInline><Button variant="link" isInline onClick={() => refetch()}>Retry</Button></Alert>}
      {!isLoading && !error && (vns ?? []).length === 0 && (
        <EmptyState><EmptyStateBody>No virtual networks. Click Create virtual network to get started.</EmptyStateBody></EmptyState>
      )}
      {!isLoading && !error && (vns ?? []).length > 0 && (
        <Table aria-label="Virtual Networks">
          <Thead><Tr><Th>Name</Th><Th>IPv4 CIDR</Th><Th>IPv6 CIDR</Th><Th>Network Class</Th><Th>State</Th><Th aria-label="Actions" /></Tr></Thead>
          <Tbody>
            {(vns ?? []).map((vn) => (
              <Tr key={vn.id}>
                <Td dataLabel="Name">{vn.metadata.name}</Td>
                <Td dataLabel="IPv4 CIDR">{vn.spec.ipv4Cidr ?? '—'}</Td>
                <Td dataLabel="IPv6 CIDR">{vn.spec.ipv6Cidr ?? '—'}</Td>
                <Td dataLabel="Network Class">{vn.spec.networkClass ?? '—'}</Td>
                <Td dataLabel="State"><VnStateLabel state={vn.status.state} /></Td>
                <Td isActionCell>
                  <ActionsColumn items={[{ title: 'Delete', onClick: () => setConfirmDelete(vn) }]} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Create modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} variant="small" aria-labelledby="create-vn-modal-title">
        <ModalHeader title="Create virtual network" labelId="create-vn-modal-title" />
        <ModalBody>
          {submitError && <Alert variant="danger" title="Create failed" isInline style={{ marginBottom: '1rem' }}>{submitError}</Alert>}
          <Form>
            <FormGroup label="Name" isRequired fieldId="vn-name">
              <TextInput id="vn-name" value={form.name} onChange={(_e, v) => setForm((f) => ({ ...f, name: v }))} isRequired />
            </FormGroup>
            <FormGroup label="Network Class" fieldId="vn-nc">
              <FormSelect id="vn-nc" value={form.networkClass} onChange={(_e, v) => setForm((f) => ({ ...f, networkClass: v }))}>
                <FormSelectOption value="" label="Use default" />
                {(networkClasses ?? []).map((nc) => <FormSelectOption key={nc.id} value={nc.id} label={nc.title} />)}
              </FormSelect>
            </FormGroup>
            <ExpandableSection toggleText="CIDR configuration">
              <FormGroup label="IPv4 CIDR" fieldId="vn-ipv4">
                <TextInput id="vn-ipv4" value={form.ipv4Cidr} onChange={(_e, v) => setForm((f) => ({ ...f, ipv4Cidr: v }))} placeholder="10.0.0.0/16" />
              </FormGroup>
              <FormGroup label="IPv6 CIDR" fieldId="vn-ipv6">
                <TextInput id="vn-ipv6" value={form.ipv6Cidr} onChange={(_e, v) => setForm((f) => ({ ...f, ipv6Cidr: v }))} placeholder="fd00::/48" />
                <HelperText><HelperTextItem>Leave both empty to use network class defaults.</HelperTextItem></HelperText>
              </FormGroup>
            </ExpandableSection>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleCreate} isDisabled={creating || !form.name} icon={creating ? <Spinner size="sm" aria-label="Creating" /> : undefined}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setModalOpen(false)} isDisabled={creating}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} variant="small" aria-labelledby="del-vn-modal-title">
          <ModalHeader title="Delete virtual network?" labelId="del-vn-modal-title" />
          <ModalBody>Deleting <strong>{confirmDelete.metadata.name}</strong> will also delete its subnets and security groups.</ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>Delete</Button>
            <Button variant="link" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Subnets tab
// ---------------------------------------------------------------------------

function SubnetsTab() {
  const { data: vns } = useVirtualNetworks()
  const [filterVnId, setFilterVnId] = useState('')
  const { data: subnets, isLoading, error, refetch } = useSubnets(filterVnId || undefined)
  const { data: allSubnets } = useAllSubnets()
  const { mutateAsync: createSubnet, isPending: creating } = useCreateSubnet()
  const { mutateAsync: deleteSubnet } = useDeleteSubnet()

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', virtualNetworkId: '', ipv4Cidr: '', ipv6Cidr: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Subnet | null>(null)

  const displaySubnets = filterVnId ? (subnets ?? []) : (allSubnets ?? [])

  async function handleCreate() {
    setSubmitError(null)
    try {
      await createSubnet({ name: form.name, virtualNetworkId: form.virtualNetworkId, ipv4Cidr: form.ipv4Cidr || undefined, ipv6Cidr: form.ipv6Cidr || undefined })
      setModalOpen(false)
      setForm({ name: '', virtualNetworkId: filterVnId, ipv4Cidr: '', ipv6Cidr: '' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  function vnName(id: string) {
    return (vns ?? []).find((v) => v.id === id)?.metadata.name ?? id
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', justifyContent: 'space-between' }}>
        <FormSelect value={filterVnId} onChange={(_e, v) => setFilterVnId(v)} aria-label="Filter by virtual network" style={{ maxWidth: '300px' }}>
          <FormSelectOption value="" label="All virtual networks" />
          {(vns ?? []).map((vn) => <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />)}
        </FormSelect>
        <Button variant="primary" onClick={() => { setForm((f) => ({ ...f, virtualNetworkId: filterVnId })); setModalOpen(true) }}>Create subnet</Button>
      </div>

      {(isLoading && filterVnId) && <Spinner aria-label="Loading subnets" />}
      {error && <Alert variant="danger" title="Failed to load subnets" isInline><Button variant="link" isInline onClick={() => refetch()}>Retry</Button></Alert>}
      {!isLoading && displaySubnets.length === 0 && (
        <EmptyState><EmptyStateBody>No subnets{filterVnId ? ' for the selected virtual network' : ''}.</EmptyStateBody></EmptyState>
      )}
      {displaySubnets.length > 0 && (
        <Table aria-label="Subnets">
          <Thead><Tr><Th>Name</Th><Th>Virtual Network</Th><Th>IPv4 CIDR</Th><Th>IPv6 CIDR</Th><Th>State</Th><Th aria-label="Actions" /></Tr></Thead>
          <Tbody>
            {displaySubnets.map((s) => (
              <Tr key={s.id}>
                <Td dataLabel="Name">{s.metadata.name}</Td>
                <Td dataLabel="Virtual Network">{vnName(s.spec.virtualNetwork)}</Td>
                <Td dataLabel="IPv4 CIDR">{s.spec.ipv4Cidr ?? '—'}</Td>
                <Td dataLabel="IPv6 CIDR">{s.spec.ipv6Cidr ?? '—'}</Td>
                <Td dataLabel="State"><SubnetStateLabel state={s.status.state} /></Td>
                <Td isActionCell>
                  <ActionsColumn items={[{ title: 'Delete', onClick: () => setConfirmDelete(s) }]} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} variant="small" aria-labelledby="create-subnet-modal-title">
        <ModalHeader title="Create subnet" labelId="create-subnet-modal-title" />
        <ModalBody>
          {submitError && <Alert variant="danger" title="Create failed" isInline style={{ marginBottom: '1rem' }}>{submitError}</Alert>}
          <Form>
            <FormGroup label="Name" isRequired fieldId="subnet-name">
              <TextInput id="subnet-name" value={form.name} onChange={(_e, v) => setForm((f) => ({ ...f, name: v }))} isRequired />
            </FormGroup>
            <FormGroup label="Virtual Network" isRequired fieldId="subnet-vn">
              <FormSelect id="subnet-vn" value={form.virtualNetworkId} onChange={(_e, v) => setForm((f) => ({ ...f, virtualNetworkId: v }))}>
                <FormSelectOption value="" label="Select a virtual network" isDisabled />
                {(vns ?? []).map((vn) => <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />)}
              </FormSelect>
            </FormGroup>
            <FormGroup label="IPv4 CIDR" fieldId="subnet-ipv4">
              <TextInput id="subnet-ipv4" value={form.ipv4Cidr} onChange={(_e, v) => setForm((f) => ({ ...f, ipv4Cidr: v }))} placeholder="10.0.1.0/24" />
            </FormGroup>
            <FormGroup label="IPv6 CIDR" fieldId="subnet-ipv6">
              <TextInput id="subnet-ipv6" value={form.ipv6Cidr} onChange={(_e, v) => setForm((f) => ({ ...f, ipv6Cidr: v }))} placeholder="fd00::1:0/112" />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleCreate} isDisabled={creating || !form.name || !form.virtualNetworkId} icon={creating ? <Spinner size="sm" aria-label="Creating" /> : undefined}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setModalOpen(false)} isDisabled={creating}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} variant="small" aria-labelledby="del-subnet-modal-title">
          <ModalHeader title="Delete subnet?" labelId="del-subnet-modal-title" />
          <ModalBody>Delete subnet <strong>{confirmDelete.metadata.name}</strong>?</ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={async () => { await deleteSubnet(confirmDelete.id); setConfirmDelete(null) }}>Delete</Button>
            <Button variant="link" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Security Groups tab
// ---------------------------------------------------------------------------

function SecurityGroupsTab() {
  const { data: vns } = useVirtualNetworks()
  const { data: sgs, isLoading, error, refetch } = useSecurityGroups()
  const { mutateAsync: createSg, isPending: creating } = useCreateSecurityGroup()
  const { mutateAsync: deleteSg } = useDeleteSecurityGroup()

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', virtualNetworkId: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SecurityGroup | null>(null)

  async function handleCreate() {
    setSubmitError(null)
    try {
      await createSg({ name: form.name, virtualNetworkId: form.virtualNetworkId })
      setModalOpen(false)
      setForm({ name: '', virtualNetworkId: '' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  function vnName(id: string) {
    return (vns ?? []).find((v) => v.id === id)?.metadata.name ?? id
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button variant="primary" onClick={() => setModalOpen(true)}>Create security group</Button>
      </div>

      {isLoading && <Spinner aria-label="Loading security groups" />}
      {error && <Alert variant="danger" title="Failed to load security groups" isInline><Button variant="link" isInline onClick={() => refetch()}>Retry</Button></Alert>}
      {!isLoading && !error && (sgs ?? []).length === 0 && (
        <EmptyState><EmptyStateBody>No security groups. Click Create security group to get started.</EmptyStateBody></EmptyState>
      )}
      {!isLoading && !error && (sgs ?? []).length > 0 && (
        <Table aria-label="Security Groups">
          <Thead><Tr><Th>Name</Th><Th>Virtual Network</Th><Th>Ingress Rules</Th><Th>Egress Rules</Th><Th>State</Th><Th aria-label="Actions" /></Tr></Thead>
          <Tbody>
            {(sgs ?? []).map((sg) => (
              <Tr key={sg.id}>
                <Td dataLabel="Name">{sg.metadata.name}</Td>
                <Td dataLabel="Virtual Network">{vnName(sg.spec.virtualNetwork)}</Td>
                <Td dataLabel="Ingress Rules">{(sg.spec.ingress ?? []).length}</Td>
                <Td dataLabel="Egress Rules">{(sg.spec.egress ?? []).length}</Td>
                <Td dataLabel="State"><SgStateLabel state={sg.status.state} /></Td>
                <Td isActionCell>
                  <ActionsColumn items={[{ title: 'Delete', onClick: () => setConfirmDelete(sg) }]} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} variant="small" aria-labelledby="create-sg-modal-title">
        <ModalHeader title="Create security group" labelId="create-sg-modal-title" />
        <ModalBody>
          {submitError && <Alert variant="danger" title="Create failed" isInline style={{ marginBottom: '1rem' }}>{submitError}</Alert>}
          <Form>
            <FormGroup label="Name" isRequired fieldId="sg-name">
              <TextInput id="sg-name" value={form.name} onChange={(_e, v) => setForm((f) => ({ ...f, name: v }))} isRequired />
            </FormGroup>
            <FormGroup label="Virtual Network" isRequired fieldId="sg-vn">
              <FormSelect id="sg-vn" value={form.virtualNetworkId} onChange={(_e, v) => setForm((f) => ({ ...f, virtualNetworkId: v }))}>
                <FormSelectOption value="" label="Select a virtual network" isDisabled />
                {(vns ?? []).map((vn) => <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />)}
              </FormSelect>
              <HelperText><HelperTextItem>Firewall rules can be managed via API after creation.</HelperTextItem></HelperText>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleCreate} isDisabled={creating || !form.name || !form.virtualNetworkId} icon={creating ? <Spinner size="sm" aria-label="Creating" /> : undefined}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setModalOpen(false)} isDisabled={creating}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} variant="small" aria-labelledby="del-sg-modal-title">
          <ModalHeader title="Delete security group?" labelId="del-sg-modal-title" />
          <ModalBody>Delete security group <strong>{confirmDelete.metadata.name}</strong>?</ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={async () => { await deleteSg(confirmDelete.id); setConfirmDelete(null) }}>Delete</Button>
            <Button variant="link" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AdminNetworksPage({ onOpenVmDetail }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(0)
  const { data: vms = [] } = useComputeInstances()

  const handleTabSelect = useCallback((_e: React.MouseEvent, key: string | number) => {
    setActiveTab(key as ActiveTab)
  }, [])

  return (
    <PageSection isFilled>
      <PageHeader
        title="Networks"
        description="Manage virtual networks, subnets, and security groups for your organization."
      />
      <Tabs activeKey={activeTab} onSelect={handleTabSelect} aria-label="Networks tabs">
        <Tab eventKey={0} title={<TabTitleText>Virtual Networks</TabTitleText>}>
          <div style={{ paddingTop: '1rem' }}>
            <VirtualNetworksTab />
          </div>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Subnets</TabTitleText>}>
          <div style={{ paddingTop: '1rem' }}>
            <SubnetsTab />
          </div>
        </Tab>
        <Tab eventKey={2} title={<TabTitleText>Security Groups</TabTitleText>}>
          <div style={{ paddingTop: '1rem' }}>
            <SecurityGroupsTab />
          </div>
        </Tab>
        <Tab eventKey={3} title={<TabTitleText>Topology</TabTitleText>}>
          <div style={{ paddingTop: '1rem' }}>
            <Title headingLevel="h3" size="md" style={{ marginBottom: '0.75rem' }}>
              Network topology
            </Title>
            <NetworkTopologyPage vms={vms} onOpenVirtualMachineDetail={onOpenVmDetail} />
          </div>
        </Tab>
      </Tabs>
    </PageSection>
  )
}
