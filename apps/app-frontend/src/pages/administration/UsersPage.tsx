/**
 * flow: manage-tenant-users
 * step: user_list
 * route: /admin/users (tenantAdmin)
 */
import { useState } from 'react'
import {
  Button,
  Checkbox,
  Form,
  FormGroup,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from '@patternfly/react-core'
import { ActionsColumn } from '@patternfly/react-table'
import { UserPlusIcon } from '@patternfly/react-icons/dist/esm/icons/user-plus-icon'
import { CustomTableLink, ObjectsTable, PageLayout } from '@osac/ui-components'
import type { ObjectsTableColumn } from '@osac/ui-components'
import { useSession } from '../../contexts/SessionContext'
import { getOrg, type MockUser } from '../../mocks/organizations-store'

// ---------------------------------------------------------------------------
// Invite user modal
// ---------------------------------------------------------------------------

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (user: MockUser) => void
}

function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'tenantUser' | 'tenantAdmin'>('tenantUser')
  const [roleOpen, setRoleOpen] = useState(false)
  const [requireMfa, setRequireMfa] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)

  function handleSubmit() {
    if (!email || !firstName || !lastName) return
    onInvite({
      id: `u-${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      mfa_enrolled: false,
    })
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('tenantUser')
    onClose()
  }

  const isDisabled = !email || !firstName || !lastName

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      aria-label="Invite user"
    >
      <ModalHeader
        title="Invite user"
        description="Send an invitation to join this tenant workspace."
      />
      <ModalBody>
        <Form>
          <FormGroup label="First name" isRequired fieldId="inv-first">
            <TextInput
              id="inv-first"
              value={firstName}
              onChange={(_, v) => setFirstName(v)}
              placeholder="Jane"
            />
          </FormGroup>
          <FormGroup label="Last name" isRequired fieldId="inv-last">
            <TextInput
              id="inv-last"
              value={lastName}
              onChange={(_, v) => setLastName(v)}
              placeholder="Doe"
            />
          </FormGroup>
          <FormGroup label="Work email" isRequired fieldId="inv-email">
            <TextInput
              id="inv-email"
              type="email"
              value={email}
              onChange={(_, v) => setEmail(v)}
              placeholder="jane@example.com"
            />
          </FormGroup>
          <FormGroup label="Role" fieldId="inv-role">
            <Select
              isOpen={roleOpen}
              onOpenChange={setRoleOpen}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setRoleOpen((v) => !v)} isExpanded={roleOpen}>
                  {role}
                </MenuToggle>
              )}
              selected={role}
              onSelect={(_, v) => {
                setRole(v as 'tenantUser' | 'tenantAdmin')
                setRoleOpen(false)
              }}
            >
              <SelectList>
                <SelectOption value="tenantUser">
                  tenantUser — operate VM workloads
                </SelectOption>
                <SelectOption value="tenantAdmin">
                  tenantAdmin — manage users, quota, network
                </SelectOption>
              </SelectList>
            </Select>
          </FormGroup>
          <FormGroup fieldId="inv-mfa">
            <Checkbox
              id="inv-mfa"
              label="Require MFA enrollment on first sign-in"
              isChecked={requireMfa}
              onChange={(_, v) => setRequireMfa(v)}
            />
          </FormGroup>
          <FormGroup fieldId="inv-mail">
            <Checkbox
              id="inv-mail"
              label="Send invitation email now"
              isChecked={sendEmail}
              onChange={(_, v) => setSendEmail(v)}
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleSubmit} isDisabled={isDisabled}>
          Send invite
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function UsersPage() {
  const { selectedTenant } = useSession()
  const tenantId = selectedTenant ?? 'northstar'

  const orgFixture = getOrg(tenantId)
  const [users, setUsers] = useState<MockUser[]>(orgFixture?.users ?? [])
  const [inviteOpen, setInviteOpen] = useState(false)

  const columns: ObjectsTableColumn<MockUser>[] = [
    {
      label: 'Name',
      dataLabel: 'Name',
      render: (u) => (
        <strong>
          {u.first_name} {u.last_name}
        </strong>
      ),
    },
    {
      label: 'Email',
      dataLabel: 'Email',
      render: (u) => <code style={{ fontSize: '0.85em' }}>{u.email}</code>,
    },
    {
      label: 'Role',
      dataLabel: 'Role',
      render: (u) => (
        <Label isCompact color={u.role === 'tenantAdmin' ? 'blue' : 'grey'}>
          {u.role}
        </Label>
      ),
    },
    {
      label: 'MFA',
      dataLabel: 'MFA',
      render: (u) =>
        u.mfa_enrolled ? (
          <Label isCompact color="green">
            Enrolled
          </Label>
        ) : (
          <Label isCompact color="orange">
            Pending
          </Label>
        ),
    },
    {
      isActionCell: true,
      screenReaderText: 'Actions',
      render: () => (
        <ActionsColumn
          items={[
            { title: 'Change role' },
            { title: 'Reset password' },
            { isSeparator: true },
            { title: 'Remove' },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <PageLayout
        title="Users & Access"
        description="Tenant-scoped identity and role bindings."
        actions={
          <Button
            variant="primary"
            icon={<UserPlusIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite user
          </Button>
        }
      >
        <ObjectsTable
          ariaLabel="Users"
          columns={columns}
          rows={users}
          getRowKey={(u) => u.id}
          defaultPageSize={10}
        />
      </PageLayout>

      <InviteUserModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(u) => setUsers((prev) => [...prev, u])}
      />
    </>
  )
}
