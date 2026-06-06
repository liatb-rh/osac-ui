/**
 * flow: tenant-administration
 * step: tad_networks_management
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FC, MouseEvent } from 'react'
import { css } from '@emotion/css'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
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
  Pagination,
  Spinner,
  Tab,
  TabTitleText,
  Tabs,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Edge, Node } from '@patternfly/react-topology'
import {
  DagreLayout,
  DefaultNode,
  GRAPH_LAYOUT_END_EVENT,
  GraphComponent,
  Model,
  ModelKind,
  TopologyControlBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  observer,
  useVisualizationController,
} from '@patternfly/react-topology'
import '@patternfly/react-topology/dist/esm/css/topology-components.css'
import type { SecurityGroup, Subnet, VirtualNetwork } from '@osac/api-contracts'
import { useComputeInstances } from '../../hooks/hooks'
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
} from '../../hooks/useNetworking'
import { PageHeader } from '../../components/layout'

type ActiveTab = 0 | 1 | 2 | 3

interface Props {
  onOpenVmDetail?: (vmId: string) => void
}

const PAGE_SIZE = 10

const toolbarRowCss = css`
  margin-bottom: 1rem;
`

const filterSelectCss = css`
  max-width: 300px;
`

const tableCardCss = css`
  padding: 0;
  overflow: hidden;
`

const codeSmallCss = css`
  font-size: 0.85rem;
`

const modalAlertCss = css`
  margin-bottom: 1rem;
`

const topoNodeGroupCss = css`
  cursor: default;
`

const topoNodeRectCss = css`
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.07));
`

const topologyEmptyStateCss = css`
  margin-top: 2rem;
`

const tabContentCss = css`
  padding-top: 1rem;
`

const topologyHeaderCss = css`
  margin-bottom: 0.75rem;
  gap: 1rem;
`

const vnSelectCss = css`
  min-width: 180px;
`

const topologyCanvasCss = css`
  height: 480px;
  border: 1px solid var(--pf-t--global--border--color--default);
  border-radius: var(--pf-t--global--border--radius--medium);
  overflow: hidden;
  background: var(--pf-t--global--background--color--secondary--default);
`

const tabHeadingCss = css`
  margin-bottom: 0.75rem;
`

// ---------------------------------------------------------------------------
// State labels
// ---------------------------------------------------------------------------

function VnStateLabel({ state }: { state: string }) {
  if (state === 'VIRTUAL_NETWORK_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'VIRTUAL_NETWORK_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'VIRTUAL_NETWORK_STATE_FAILED')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      Unknown
    </Label>
  )
}

function SubnetStateLabel({ state }: { state: string }) {
  if (state === 'SUBNET_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'SUBNET_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'SUBNET_STATE_FAILED')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  if (state === 'SUBNET_STATE_DELETING')
    return (
      <Label color="orange" isCompact>
        Deleting
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      Unknown
    </Label>
  )
}

function SgStateLabel({ state }: { state: string }) {
  if (state === 'SECURITY_GROUP_STATE_READY')
    return (
      <Label color="green" isCompact>
        Ready
      </Label>
    )
  if (state === 'SECURITY_GROUP_STATE_PENDING')
    return (
      <Label color="blue" isCompact icon={<Spinner size="sm" aria-label="pending" />}>
        Pending
      </Label>
    )
  if (state === 'SECURITY_GROUP_STATE_FAILED')
    return (
      <Label color="red" isCompact>
        Failed
      </Label>
    )
  return (
    <Label color="grey" isCompact>
      Unknown
    </Label>
  )
}

// ---------------------------------------------------------------------------
// Virtual Networks tab  (osac-pilot style + pagination)
// ---------------------------------------------------------------------------

function VirtualNetworksTab() {
  const { data: vns, isLoading, error, refetch } = useVirtualNetworks()
  const { data: networkClasses } = useNetworkClasses()
  const { data: allSubnets } = useAllSubnets()
  const { data: securityGroups } = useSecurityGroups()
  const { mutateAsync: createVN, isPending: creating } = useCreateVirtualNetwork()
  const { mutateAsync: deleteVN } = useDeleteVirtualNetwork()

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', ipv4Cidr: '', ipv6Cidr: '', networkClass: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<VirtualNetwork | null>(null)
  const [page, setPage] = useState(1)

  const allVns = vns ?? []
  const totalItems = allVns.length
  const pageVns = allVns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function subnetCount(vnId: string) {
    return (allSubnets ?? []).filter((s) => s.spec.virtualNetwork === vnId).length
  }
  function sgCount(vnId: string) {
    return (securityGroups ?? []).filter((sg) => sg.spec.virtualNetwork === vnId).length
  }

  async function handleCreate() {
    setSubmitError(null)
    try {
      await createVN({
        name: form.name,
        ipv4Cidr: form.ipv4Cidr || undefined,
        ipv6Cidr: form.ipv6Cidr || undefined,
        networkClass: form.networkClass || undefined,
      })
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
      <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className={toolbarRowCss}>
        <FlexItem>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            New virtual network
          </Button>
        </FlexItem>
      </Flex>

      {isLoading && <Spinner aria-label="Loading virtual networks" />}
      {error && (
        <Alert variant="danger" title="Failed to load virtual networks" isInline>
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}

      {!isLoading && !error && allVns.length === 0 && (
        <EmptyState>
          <EmptyStateBody>
            No virtual networks. Click New virtual network to get started.
          </EmptyStateBody>
        </EmptyState>
      )}

      {!isLoading && !error && allVns.length > 0 && (
        <Card className={tableCardCss}>
          <Table aria-label="Virtual Networks" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>State</Th>
                <Th>CIDR</Th>
                <Th>Subnets</Th>
                <Th>Security groups</Th>
                <Th aria-label="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {pageVns.map((vn) => (
                <Tr key={vn.id}>
                  <Td dataLabel="Name">
                    <strong>{vn.metadata.name}</strong>
                  </Td>
                  <Td dataLabel="State">
                    <VnStateLabel state={vn.status.state} />
                  </Td>
                  <Td dataLabel="CIDR">
                    <code className={codeSmallCss}>
                      {vn.spec.ipv4Cidr ?? vn.spec.ipv6Cidr ?? '—'}
                    </code>
                  </Td>
                  <Td dataLabel="Subnets">
                    <Label isCompact>{subnetCount(vn.id)}</Label>
                  </Td>
                  <Td dataLabel="Security groups">
                    <Label isCompact color="blue">
                      {sgCount(vn.id)}
                    </Label>
                  </Td>
                  <Td isActionCell>
                    <ActionsColumn
                      items={[{ title: 'Delete', onClick: () => setConfirmDelete(vn) }]}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {totalItems > PAGE_SIZE && (
            <Pagination
              itemCount={totalItems}
              perPage={PAGE_SIZE}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              variant="bottom"
              isCompact
            />
          )}
        </Card>
      )}

      {/* Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        variant="small"
        aria-labelledby="create-vn-modal-title"
      >
        <ModalHeader title="New virtual network" labelId="create-vn-modal-title" />
        <ModalBody>
          {submitError && (
            <Alert variant="danger" title="Create failed" isInline className={modalAlertCss}>
              {submitError}
            </Alert>
          )}
          <Form>
            <FormGroup label="Name" isRequired fieldId="vn-name">
              <TextInput
                id="vn-name"
                value={form.name}
                onChange={(_e, v) => setForm((f) => ({ ...f, name: v }))}
                isRequired
              />
            </FormGroup>
            <FormGroup label="Network Class" fieldId="vn-nc">
              <FormSelect
                id="vn-nc"
                value={form.networkClass}
                onChange={(_e, v) => setForm((f) => ({ ...f, networkClass: v }))}
              >
                <FormSelectOption value="" label="Use default" />
                {(networkClasses ?? []).map((nc) => (
                  <FormSelectOption key={nc.id} value={nc.id} label={nc.title} />
                ))}
              </FormSelect>
            </FormGroup>
            <ExpandableSection toggleText="CIDR configuration">
              <FormGroup label="IPv4 CIDR" fieldId="vn-ipv4">
                <TextInput
                  id="vn-ipv4"
                  value={form.ipv4Cidr}
                  onChange={(_e, v) => setForm((f) => ({ ...f, ipv4Cidr: v }))}
                  placeholder="10.0.0.0/16"
                />
              </FormGroup>
              <FormGroup label="IPv6 CIDR" fieldId="vn-ipv6">
                <TextInput
                  id="vn-ipv6"
                  value={form.ipv6Cidr}
                  onChange={(_e, v) => setForm((f) => ({ ...f, ipv6Cidr: v }))}
                  placeholder="fd00::/48"
                />
                <HelperText>
                  <HelperTextItem>Leave both empty to use network class defaults.</HelperTextItem>
                </HelperText>
              </FormGroup>
            </ExpandableSection>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleCreate}
            isDisabled={creating || !form.name}
            icon={creating ? <Spinner size="sm" aria-label="Creating" /> : undefined}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setModalOpen(false)} isDisabled={creating}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal
          isOpen
          onClose={() => setConfirmDelete(null)}
          variant="small"
          aria-labelledby="del-vn-modal-title"
        >
          <ModalHeader title="Delete virtual network?" labelId="del-vn-modal-title" />
          <ModalBody>
            <Alert
              variant="warning"
              isInline
              title="This will remove all subnets and security groups attached to this network."
              className={modalAlertCss}
            />
            Deleting <strong>{confirmDelete.metadata.name}</strong> cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>
              Delete network
            </Button>
            <Button variant="link" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
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
  const [page, setPage] = useState(1)
  const { data: subnets, isLoading, error, refetch } = useSubnets(filterVnId || undefined)
  const { data: allSubnets } = useAllSubnets()
  const { mutateAsync: createSubnet, isPending: creating } = useCreateSubnet()
  const { mutateAsync: deleteSubnet } = useDeleteSubnet()

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', virtualNetworkId: '', ipv4Cidr: '', ipv6Cidr: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Subnet | null>(null)

  const allDisplay = filterVnId ? (subnets ?? []) : (allSubnets ?? [])
  const totalItems = allDisplay.length
  const pageSubnets = allDisplay.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleCreate() {
    setSubmitError(null)
    try {
      await createSubnet({
        name: form.name,
        virtualNetworkId: form.virtualNetworkId,
        ipv4Cidr: form.ipv4Cidr || undefined,
        ipv6Cidr: form.ipv6Cidr || undefined,
      })
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
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        className={toolbarRowCss}
      >
        <FlexItem>
          <FormSelect
            value={filterVnId}
            onChange={(_e, v) => {
              setFilterVnId(v)
              setPage(1)
            }}
            aria-label="Filter by virtual network"
            className={filterSelectCss}
          >
            <FormSelectOption value="" label="All virtual networks" />
            {(vns ?? []).map((vn) => (
              <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
            ))}
          </FormSelect>
        </FlexItem>
        <FlexItem>
          <Button
            variant="primary"
            onClick={() => {
              setForm((f) => ({ ...f, virtualNetworkId: filterVnId }))
              setModalOpen(true)
            }}
          >
            Create subnet
          </Button>
        </FlexItem>
      </Flex>

      {isLoading && filterVnId && <Spinner aria-label="Loading subnets" />}
      {error && (
        <Alert variant="danger" title="Failed to load subnets" isInline>
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {!isLoading && allDisplay.length === 0 && (
        <EmptyState>
          <EmptyStateBody>
            No subnets{filterVnId ? ' for the selected virtual network' : ''}.
          </EmptyStateBody>
        </EmptyState>
      )}
      {allDisplay.length > 0 && (
        <Card className={tableCardCss}>
          <Table aria-label="Subnets" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Virtual Network</Th>
                <Th>IPv4 CIDR</Th>
                <Th>IPv6 CIDR</Th>
                <Th>State</Th>
                <Th aria-label="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {pageSubnets.map((s) => (
                <Tr key={s.id}>
                  <Td dataLabel="Name">
                    <strong>{s.metadata.name}</strong>
                  </Td>
                  <Td dataLabel="Virtual Network">{vnName(s.spec.virtualNetwork)}</Td>
                  <Td dataLabel="IPv4 CIDR">
                    <code className={codeSmallCss}>{s.spec.ipv4Cidr ?? '—'}</code>
                  </Td>
                  <Td dataLabel="IPv6 CIDR">
                    <code className={codeSmallCss}>{s.spec.ipv6Cidr ?? '—'}</code>
                  </Td>
                  <Td dataLabel="State">
                    <SubnetStateLabel state={s.status.state} />
                  </Td>
                  <Td isActionCell>
                    <ActionsColumn
                      items={[{ title: 'Delete', onClick: () => setConfirmDelete(s) }]}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {totalItems > PAGE_SIZE && (
            <Pagination
              itemCount={totalItems}
              perPage={PAGE_SIZE}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              variant="bottom"
              isCompact
            />
          )}
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        variant="small"
        aria-labelledby="create-subnet-modal-title"
      >
        <ModalHeader title="Create subnet" labelId="create-subnet-modal-title" />
        <ModalBody>
          {submitError && (
            <Alert variant="danger" title="Create failed" isInline className={modalAlertCss}>
              {submitError}
            </Alert>
          )}
          <Form>
            <FormGroup label="Name" isRequired fieldId="subnet-name">
              <TextInput
                id="subnet-name"
                value={form.name}
                onChange={(_e, v) => setForm((f) => ({ ...f, name: v }))}
                isRequired
              />
            </FormGroup>
            <FormGroup label="Virtual Network" isRequired fieldId="subnet-vn">
              <FormSelect
                id="subnet-vn"
                value={form.virtualNetworkId}
                onChange={(_e, v) => setForm((f) => ({ ...f, virtualNetworkId: v }))}
              >
                <FormSelectOption value="" label="Select a virtual network" isDisabled />
                {(vns ?? []).map((vn) => (
                  <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
                ))}
              </FormSelect>
            </FormGroup>
            <FormGroup label="IPv4 CIDR" fieldId="subnet-ipv4">
              <TextInput
                id="subnet-ipv4"
                value={form.ipv4Cidr}
                onChange={(_e, v) => setForm((f) => ({ ...f, ipv4Cidr: v }))}
                placeholder="10.0.1.0/24"
              />
            </FormGroup>
            <FormGroup label="IPv6 CIDR" fieldId="subnet-ipv6">
              <TextInput
                id="subnet-ipv6"
                value={form.ipv6Cidr}
                onChange={(_e, v) => setForm((f) => ({ ...f, ipv6Cidr: v }))}
                placeholder="fd00::1:0/112"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleCreate}
            isDisabled={creating || !form.name || !form.virtualNetworkId}
            icon={creating ? <Spinner size="sm" aria-label="Creating" /> : undefined}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setModalOpen(false)} isDisabled={creating}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {confirmDelete && (
        <Modal
          isOpen
          onClose={() => setConfirmDelete(null)}
          variant="small"
          aria-labelledby="del-subnet-modal-title"
        >
          <ModalHeader title="Delete subnet?" labelId="del-subnet-modal-title" />
          <ModalBody>
            Delete subnet <strong>{confirmDelete.metadata.name}</strong>?
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteSubnet(confirmDelete.id)
                setConfirmDelete(null)
              }}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
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
  const [page, setPage] = useState(1)

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', virtualNetworkId: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SecurityGroup | null>(null)

  const allSgs = sgs ?? []
  const totalItems = allSgs.length
  const pageSgs = allSgs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
      <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className={toolbarRowCss}>
        <FlexItem>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Create security group
          </Button>
        </FlexItem>
      </Flex>

      {isLoading && <Spinner aria-label="Loading security groups" />}
      {error && (
        <Alert variant="danger" title="Failed to load security groups" isInline>
          <Button variant="link" isInline onClick={() => refetch()}>
            Retry
          </Button>
        </Alert>
      )}
      {!isLoading && !error && allSgs.length === 0 && (
        <EmptyState>
          <EmptyStateBody>
            No security groups. Click Create security group to get started.
          </EmptyStateBody>
        </EmptyState>
      )}
      {!isLoading && !error && allSgs.length > 0 && (
        <Card className={tableCardCss}>
          <Table aria-label="Security Groups" variant="compact">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Virtual Network</Th>
                <Th>Ingress Rules</Th>
                <Th>Egress Rules</Th>
                <Th>State</Th>
                <Th aria-label="Actions" />
              </Tr>
            </Thead>
            <Tbody>
              {pageSgs.map((sg) => (
                <Tr key={sg.id}>
                  <Td dataLabel="Name">
                    <strong>{sg.metadata.name}</strong>
                  </Td>
                  <Td dataLabel="Virtual Network">{vnName(sg.spec.virtualNetwork)}</Td>
                  <Td dataLabel="Ingress Rules">{(sg.spec.ingress ?? []).length}</Td>
                  <Td dataLabel="Egress Rules">{(sg.spec.egress ?? []).length}</Td>
                  <Td dataLabel="State">
                    <SgStateLabel state={sg.status.state} />
                  </Td>
                  <Td isActionCell>
                    <ActionsColumn
                      items={[{ title: 'Delete', onClick: () => setConfirmDelete(sg) }]}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {totalItems > PAGE_SIZE && (
            <Pagination
              itemCount={totalItems}
              perPage={PAGE_SIZE}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              variant="bottom"
              isCompact
            />
          )}
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        variant="small"
        aria-labelledby="create-sg-modal-title"
      >
        <ModalHeader title="Create security group" labelId="create-sg-modal-title" />
        <ModalBody>
          {submitError && (
            <Alert variant="danger" title="Create failed" isInline className={modalAlertCss}>
              {submitError}
            </Alert>
          )}
          <Form>
            <FormGroup label="Name" isRequired fieldId="sg-name">
              <TextInput
                id="sg-name"
                value={form.name}
                onChange={(_e, v) => setForm((f) => ({ ...f, name: v }))}
                isRequired
              />
            </FormGroup>
            <FormGroup label="Virtual Network" isRequired fieldId="sg-vn">
              <FormSelect
                id="sg-vn"
                value={form.virtualNetworkId}
                onChange={(_e, v) => setForm((f) => ({ ...f, virtualNetworkId: v }))}
              >
                <FormSelectOption value="" label="Select a virtual network" isDisabled />
                {(vns ?? []).map((vn) => (
                  <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
                ))}
              </FormSelect>
              <HelperText>
                <HelperTextItem>
                  Firewall rules can be managed via API after creation.
                </HelperTextItem>
              </HelperText>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleCreate}
            isDisabled={creating || !form.name || !form.virtualNetworkId}
            icon={creating ? <Spinner size="sm" aria-label="Creating" /> : undefined}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
          <Button variant="link" onClick={() => setModalOpen(false)} isDisabled={creating}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {confirmDelete && (
        <Modal
          isOpen
          onClose={() => setConfirmDelete(null)}
          variant="small"
          aria-labelledby="del-sg-modal-title"
        >
          <ModalHeader title="Delete security group?" labelId="del-sg-modal-title" />
          <ModalBody>
            Delete security group <strong>{confirmDelete.metadata.name}</strong>?
          </ModalBody>
          <ModalFooter>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteSg(confirmDelete.id)
                setConfirmDelete(null)
              }}
            >
              Delete
            </Button>
            <Button variant="link" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Topology tab — @patternfly/react-topology (osac-pilot column layout)
// ---------------------------------------------------------------------------

const NODE_W = 164
const NODE_H = 50

interface TopoNodeData {
  description: string
  nodeType: 'vnet' | 'subnet' | 'vm'
}

const DOT_COLOR: Record<string, string> = {
  vnet: '#0066cc',
  subnet: '#3e8635',
  vm: '#f0ab00',
}

/** Card-style node matching osac-pilot: dot + name + CIDR/IP */
const OsacTopoNode: FC<{ element: Node }> = observer(({ element }) => {
  const data = element.getData() as TopoNodeData
  const { width, height } = element.getDimensions()
  const pos = element.getPosition()
  const dot = DOT_COLOR[data.nodeType] ?? '#0066cc'

  return (
    <g
      transform={`translate(${pos.x - width / 2}, ${pos.y - height / 2})`}
      className={topoNodeGroupCss}
    >
      <rect
        width={width}
        height={height}
        rx={8}
        ry={8}
        fill="white"
        stroke="#cfe1f5"
        strokeWidth={1.5}
        className={topoNodeRectCss}
      />
      <circle cx={16} cy={height / 2} r={5} fill={dot} />
      <text x={30} y={height / 2 - 6} fontSize={12} fontWeight={600} fill="#0b1b2b">
        {element.getLabel()}
      </text>
      <text x={30} y={height / 2 + 10} fontSize={11} fill="#6a6e73">
        {data.description}
      </text>
    </g>
  )
})

/** Light-blue edge matching osac-pilot SVG lines */
const OsacTopoEdge: FC<{ element: Edge }> = observer(({ element }) => {
  const start = element.getStartPoint()
  const end = element.getEndPoint()
  const bends = element.getBendpoints()

  let d = `M ${start.x},${start.y}`
  bends.forEach((p) => {
    d += ` L ${p.x},${p.y}`
  })
  d += ` L ${end.x},${end.y}`

  return <path d={d} stroke="#cfe1f5" strokeWidth={2} fill="none" />
})

/** Build topology model for one VN: VN → Subnets → VMs (matched by subnet name) */
function buildTopologyModel(
  vn: VirtualNetwork,
  subnets: Subnet[],
  vms: ReturnType<typeof useComputeInstances>['data'],
): Model {
  const nodes: Model['nodes'] = []
  const edges: Model['edges'] = []
  const allVms = vms ?? []

  const vnSubnets = subnets.filter((s) => s.spec.virtualNetwork === vn.id)

  nodes.push({
    id: `vn-${vn.id}`,
    type: 'vnet',
    label: vn.metadata.name,
    width: NODE_W,
    height: NODE_H,
    data: {
      description: vn.spec.ipv4Cidr ?? vn.spec.ipv6Cidr ?? '',
      nodeType: 'vnet',
    } satisfies TopoNodeData,
  })

  for (const sn of vnSubnets) {
    nodes.push({
      id: `sn-${sn.id}`,
      type: 'subnet',
      label: sn.metadata.name,
      width: NODE_W,
      height: NODE_H,
      data: {
        description: sn.spec.ipv4Cidr ?? sn.spec.ipv6Cidr ?? '',
        nodeType: 'subnet',
      } satisfies TopoNodeData,
    })
    edges.push({
      id: `e-vn-sn-${sn.id}`,
      type: 'edge',
      source: `vn-${vn.id}`,
      target: `sn-${sn.id}`,
    })

    // Match VMs by subnet name (mock data uses subnet name, not id)
    const snVms = allVms.filter((vm) => vm.spec.subnet === sn.metadata.name)
    for (const vm of snVms) {
      nodes.push({
        id: `vm-${vm.id}`,
        type: 'vm',
        label: vm.metadata.name,
        width: NODE_W,
        height: NODE_H,
        data: {
          description: `VM · ${vm.status.ipAddress ?? '—'}`,
          nodeType: 'vm',
        } satisfies TopoNodeData,
      })
      edges.push({
        id: `e-sn-vm-${vm.id}`,
        type: 'edge',
        source: `sn-${sn.id}`,
        target: `vm-${vm.id}`,
      })
    }
  }

  return {
    graph: { id: 'g1', type: ModelKind.graph, layout: 'Dagre' },
    nodes,
    edges,
  }
}

function TopologyInner({ model }: { model: Model }) {
  const controller = useVisualizationController()
  const [layoutDone, setLayoutDone] = useState(false)

  useEffect(() => {
    controller.fromModel(model, false)
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, () => setLayoutDone(true))
    controller.getGraph().layout()
  }, [controller, model])

  const controlButtons = createTopologyControlButtons({
    ...defaultControlButtonsOptions,
    zoomInCallback: () => controller.getGraph().scaleBy(4 / 3),
    zoomOutCallback: () => controller.getGraph().scaleBy(3 / 4),
    fitToScreenCallback: () => controller.getGraph().fit(80),
    resetViewCallback: () => {
      controller.getGraph().reset()
      controller.getGraph().layout()
    },
  })

  return (
    <TopologyView controlBar={<TopologyControlBar controlButtons={controlButtons} />}>
      <VisualizationSurface state={{ layoutDone }} />
    </TopologyView>
  )
}

function NetworkTopologyTab() {
  const { data: vns = [] } = useVirtualNetworks()
  const { data: allSubnets = [] } = useAllSubnets()
  const { data: vms } = useComputeInstances()
  const [selectedVnId, setSelectedVnId] = useState<string>('')

  const activeVn = vns.find((vn) => vn.id === (selectedVnId || vns[0]?.id))

  const model = useMemo(
    () => (activeVn ? buildTopologyModel(activeVn, allSubnets, vms) : null),
    [activeVn, allSubnets, vms],
  )

  const controller = useMemo(() => {
    const c = new Visualization()
    c.registerLayoutFactory(
      (_type, graph) =>
        new DagreLayout(graph, {
          rankdir: 'LR',
          ranksep: 100,
          nodesep: 40,
          marginx: 30,
          marginy: 30,
        }),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.registerComponentFactory((_kind, type): any => {
      if (type === ModelKind.graph) return GraphComponent
      if (type === 'edge') return OsacTopoEdge
      if (type === 'vnet' || type === 'subnet' || type === 'vm') return OsacTopoNode
      return DefaultNode
    })
    return c
  }, [])

  if (vns.length === 0) {
    return (
      <EmptyState className={topologyEmptyStateCss}>
        <EmptyStateBody>No virtual networks found. Create one to view the topology.</EmptyStateBody>
      </EmptyState>
    )
  }

  return (
    <div className={tabContentCss}>
      <Flex alignItems={{ default: 'alignItemsCenter' }} className={topologyHeaderCss}>
        <FlexItem>
          <Title headingLevel="h3" size="md">
            Topology{activeVn ? ` — ${activeVn.metadata.name}` : ''}
          </Title>
        </FlexItem>
        {vns.length > 1 && (
          <FlexItem>
            <FormSelect
              value={selectedVnId || vns[0]?.id}
              onChange={(_e, val) => setSelectedVnId(val)}
              aria-label="Select virtual network"
              className={vnSelectCss}
            >
              {vns.map((vn) => (
                <FormSelectOption key={vn.id} value={vn.id} label={vn.metadata.name} />
              ))}
            </FormSelect>
          </FlexItem>
        )}
      </Flex>
      <div className={topologyCanvasCss}>
        {model && (
          <VisualizationProvider controller={controller}>
            <TopologyInner model={model} />
          </VisualizationProvider>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function NetworksPage({ onOpenVmDetail: _onOpenVmDetail }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(0)

  const handleTabSelect = useCallback((_e: MouseEvent, key: string | number) => {
    setActiveTab(key as ActiveTab)
  }, [])

  return (
    <PageSection isFilled>
      <PageHeader
        title="Networks"
        description="Virtual networks, subnets, and topology for your tenant."
      />
      <Tabs activeKey={activeTab} onSelect={handleTabSelect} aria-label="Networks tabs">
        <Tab eventKey={0} title={<TabTitleText>Topology</TabTitleText>}>
          <div className={tabContentCss}>
            <Title headingLevel="h3" size="md" className={tabHeadingCss}>
              Network topology
            </Title>
            <NetworkTopologyTab />
          </div>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Virtual Networks</TabTitleText>}>
          <div className={tabContentCss}>
            <VirtualNetworksTab />
          </div>
        </Tab>
        <Tab eventKey={2} title={<TabTitleText>Subnets</TabTitleText>}>
          <div className={tabContentCss}>
            <SubnetsTab />
          </div>
        </Tab>
        <Tab eventKey={3} title={<TabTitleText>Security Groups</TabTitleText>}>
          <div className={tabContentCss}>
            <SecurityGroupsTab />
          </div>
        </Tab>
      </Tabs>
    </PageSection>
  )
}
