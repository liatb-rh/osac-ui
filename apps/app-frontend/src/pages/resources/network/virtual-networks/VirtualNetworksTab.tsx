/**
 * flow: manage-networks
 * step: net_virtual_networks_tab
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
  Pagination,
  Spinner,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { VirtualNetwork } from '@osac/api-contracts'
import {
  useAllSubnets,
  useCreateVirtualNetwork,
  useDeleteVirtualNetwork,
  useNetworkClasses,
  useSecurityGroups,
  useVirtualNetworks,
} from '../../../../hooks/useNetworking'
import { VnStateLabel } from './VnStateLabel'

const PAGE_SIZE = 10

const toolbarRowCss = css`
  margin-bottom: 1rem;
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

export function VirtualNetworksTab() {
  const navigate = useNavigate()
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
                    <Button
                      variant="link"
                      isInline
                      onClick={() => navigate(`/networks/virtual-networks/${vn.id}`)}
                    >
                      {vn.metadata.name}
                    </Button>
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
