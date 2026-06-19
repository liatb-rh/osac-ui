/**
 * flow: manage-networks
 * step: net_subnets_tab
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { css } from '@emotion/css'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { Subnet } from '@osac/api-contracts'
import {
  useAllSubnets,
  useCreateSubnet,
  useDeleteSubnet,
  useSubnets,
  useVirtualNetworks,
} from '../../../../hooks/useNetworking'
import { SubnetStateLabel } from './SubnetStateLabel'

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

export function SubnetsTab() {
  const navigate = useNavigate()
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
                    <Button
                      variant="link"
                      isInline
                      onClick={() => navigate(`/networks/subnets/${s.id}`)}
                    >
                      {s.metadata.name}
                    </Button>
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
