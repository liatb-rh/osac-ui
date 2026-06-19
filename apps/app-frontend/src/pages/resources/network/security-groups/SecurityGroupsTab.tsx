/**
 * flow: manage-networks
 * step: net_security_groups_tab
 */
import { useState } from 'react'
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
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import type { SecurityGroup } from '@osac/api-contracts'
import {
  useCreateSecurityGroup,
  useDeleteSecurityGroup,
  useSecurityGroups,
  useVirtualNetworks,
} from '../../../../hooks/useNetworking'
import { SgStateLabel } from './SgStateLabel'
import { RulesEditorModal } from './RulesEditorModal'

const PAGE_SIZE = 10

const toolbarRowCss = css`
  margin-bottom: 1rem;
`

const tableCardCss = css`
  padding: 0;
  overflow: hidden;
`

const modalAlertCss = css`
  margin-bottom: 1rem;
`

export function SecurityGroupsTab() {
  const { data: vns } = useVirtualNetworks()
  const { data: sgs, isLoading, error, refetch } = useSecurityGroups()
  const { mutateAsync: createSg, isPending: creating } = useCreateSecurityGroup()
  const { mutateAsync: deleteSg } = useDeleteSecurityGroup()
  const [page, setPage] = useState(1)

  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', virtualNetworkId: '' })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SecurityGroup | null>(null)
  const [editSg, setEditSg] = useState<SecurityGroup | null>(null)

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
                      items={[
                        { title: 'Edit rules', onClick: () => setEditSg(sg) },
                        { title: 'Delete', onClick: () => setConfirmDelete(sg) },
                      ]}
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

      {editSg && <RulesEditorModal sg={editSg} onClose={() => setEditSg(null)} />}
    </>
  )
}
